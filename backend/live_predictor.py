import json
import os
import sys
import pandas as pd

# ============================================================
# PATHS
# ============================================================

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
ML_TEST_DIR = os.path.join(
    BACKEND_DIR,
    "..",
    "ML_TEST"
)

EVENT_MODEL_PATH = os.path.join(
    ML_TEST_DIR,
    "event_classifier.cbm"
)

CRITICALITY_MODEL_PATH = os.path.join(
    ML_TEST_DIR,
    "criticality_model.cbm"
)

SCHEMA_PATH = os.path.join(
    ML_TEST_DIR,
    "feature_schema.json"
)

# ============================================================
# IMPORT FEATURE ENGINE
# ============================================================

if ML_TEST_DIR not in sys.path:
    sys.path.insert(0, ML_TEST_DIR)

from feature_engineering import FeatureEngine
from catboost import CatBoostClassifier


# ============================================================
# LOAD CATBOOST MODELS
# ============================================================

print("Loading AgniNetra CatBoost models...")

event_model = CatBoostClassifier()
event_model.load_model(EVENT_MODEL_PATH)

criticality_model = CatBoostClassifier()
criticality_model.load_model(CRITICALITY_MODEL_PATH)

print("CatBoost models loaded successfully!")


# ============================================================
# LOAD FEATURE ENGINE
# ============================================================

print("Loading AgniNetra FeatureEngine...")

feature_engine = FeatureEngine(ML_TEST_DIR)

print("FeatureEngine loaded successfully!")


# ============================================================
# LOAD FEATURE SCHEMA
# ============================================================

with open(SCHEMA_PATH, "r") as f:
    schema = json.load(f)


# ============================================================
# FEATURE HELPERS
# ============================================================

def get_feature_columns(model_type):

    key = (
        "event_class_features"
        if model_type == "event"
        else "criticality_features"
    )

    if key in schema:
        return schema[key]

    if "features" in schema:
        return schema["features"]

    raise KeyError(
        f"Feature schema does not contain "
        f"'{key}' or 'features'"
    )


def safe_float(value, default=0.0):

    try:

        if value is None:
            return default

        value = float(value)

        if pd.isna(value):
            return default

        return value

    except Exception:

        return default


# ============================================================
# CATBOOST PREDICTION
# ============================================================

def predict_event(input_data):

    required = [
        "latitude",
        "longitude",
        "year",
        "bright_ti4",
        "bright_ti5",
        "frp",
        "confidence",
        "daynight",
        "scan",
        "track",
        "month",
        "day_of_year",
    ]

    missing = [
        x
        for x in required
        if x not in input_data
    ]

    if missing:

        raise ValueError(
            f"Missing required FIRMS fields: {missing}"
        )

    # --------------------------------------------------------
    # INPUT
    # --------------------------------------------------------

    lat = float(
        input_data["latitude"]
    )

    lon = float(
        input_data["longitude"]
    )

    year = int(
        input_data["year"]
    )

    # --------------------------------------------------------
    # FEATURE ENGINEERING
    # --------------------------------------------------------

    row = feature_engine.build_feature_row(

        lat=lat,

        lon=lon,

        year=year,

        bright_ti4=float(
            input_data["bright_ti4"]
        ),

        bright_ti5=float(
            input_data["bright_ti5"]
        ),

        frp=float(
            input_data["frp"]
        ),

        confidence=str(
            input_data["confidence"]
        ),

        daynight=str(
            input_data["daynight"]
        ),

        scan=float(
            input_data["scan"]
        ),

        track=float(
            input_data["track"]
        ),

        month=int(
            input_data["month"]
        ),

        day_of_year=int(
            input_data["day_of_year"]
        ),

        land_cover_class=input_data.get(
            "land_cover_class",
            None
        )
    )

    # ========================================================
    # EVENT MODEL
    # ========================================================

    event_columns = get_feature_columns(
        "event"
    )

    event_df = pd.DataFrame([row])

    missing_event = [
        c
        for c in event_columns
        if c not in event_df.columns
    ]

    if missing_event:

        raise ValueError(
            f"Missing event model features: "
            f"{missing_event}"
        )

    event_df = event_df[
        event_columns
    ]

    event_prediction = event_model.predict(
        event_df
    )[0][0]

    event_probabilities_raw = (
        event_model.predict_proba(
            event_df
        )[0]
    )

    event_classes = event_model.classes_

    event_probabilities = {

        str(event_classes[i]):
        float(
            event_probabilities_raw[i]
        )

        for i in range(
            len(event_classes)
        )
    }

    event_confidence = float(
        max(event_probabilities_raw)
    )

    # ========================================================
    # CRITICALITY MODEL
    # ========================================================

    criticality_columns = (
        get_feature_columns(
            "criticality"
        )
    )

    criticality_df = pd.DataFrame([row])

    missing_criticality = [

        c

        for c in criticality_columns

        if c not in criticality_df.columns
    ]

    if missing_criticality:

        raise ValueError(
            "Missing criticality model features: "
            f"{missing_criticality}"
        )

    criticality_df = criticality_df[
        criticality_columns
    ]

    criticality_prediction = (
        criticality_model.predict(
            criticality_df
        )[0][0]
    )

    criticality_probabilities_raw = (
        criticality_model.predict_proba(
            criticality_df
        )[0]
    )

    criticality_classes = (
        criticality_model.classes_
    )

    criticality_probabilities = {

        str(criticality_classes[i]):
        float(
            criticality_probabilities_raw[i]
        )

        for i in range(
            len(criticality_classes)
        )
    }

    return {

        "predicted_class":
            str(event_prediction),

        "confidence":
            event_confidence,

        "probabilities":
            event_probabilities,

        "criticality":
            str(criticality_prediction),

        "criticality_probabilities":
            criticality_probabilities,

        "features":
            row,
    }


# ============================================================
# INDUSTRIAL ASSOCIATION
# ============================================================

def assess_industrial_association(context):

    distance_to_industry = safe_float(
        context.get(
            "dist_to_industry_m",
            999999
        )
    )

    industry_count_1km = safe_float(
        context.get(
            "industry_count_1km",
            0
        )
    )

    industry_count_5km = safe_float(
        context.get(
            "industry_count_5km",
            0
        )
    )

    high_heat = safe_float(
        context.get(
            "nearest_industry_high_heat",
            0
        )
    )

    background_risk = safe_float(
        context.get(
            "background_industrial_risk",
            0
        )
    )

    evidence = []

    strong_signals = 0

    # --------------------------------------------------------
    # PROXIMITY
    # --------------------------------------------------------

    if distance_to_industry <= 1000:

        evidence.append(
            f"Nearest industrial facility: "
            f"{distance_to_industry:.0f} m"
        )

        strong_signals += 1

    elif distance_to_industry <= 5000:

        evidence.append(
            f"Industrial facility within "
            f"{distance_to_industry / 1000:.1f} km"
        )

    # --------------------------------------------------------
    # INDUSTRIAL DENSITY
    # --------------------------------------------------------

    if industry_count_1km >= 1:

        evidence.append(
            f"{industry_count_1km:.0f} industrial "
            f"facility within 1 km"
        )

        strong_signals += 1

    if industry_count_5km > 0:

        evidence.append(
            f"{industry_count_5km:.0f} industrial "
            f"facilities within 5 km"
        )

    # --------------------------------------------------------
    # HIGH HEAT
    # --------------------------------------------------------

    if high_heat >= 1:

        evidence.append(
            "High-heat industrial facility nearby"
        )

        strong_signals += 1

    # --------------------------------------------------------
    # BACKGROUND RISK
    # --------------------------------------------------------

    if background_risk >= 0.25:

        evidence.append(
            "High background industrial context"
        )

        strong_signals += 1

    elif background_risk >= 0.15:

        evidence.append(
            "Moderate background industrial context"
        )

    # --------------------------------------------------------
    # FINAL
    # --------------------------------------------------------

    if strong_signals >= 2:

        association = "High"

    elif (
        strong_signals == 1
        or background_risk >= 0.15
    ):

        association = "Moderate"

    else:

        association = "Low"

    if not evidence:

        evidence.append(
            "Limited industrial contextual evidence"
        )

    return {

        "level":
            association,

        "evidence":
            evidence,

        "context_score":
            round(
                background_risk * 100,
                1
            ),
    }


# ============================================================
# SOURCE EVIDENCE
# ============================================================

def build_source_evidence(
    fire,
    context
):

    evidence = []

    # --------------------------------------------------------
    # THERMAL
    # --------------------------------------------------------

    frp = safe_float(
        fire.get(
            "frp",
            0
        )
    )

    evidence.append(
        f"Thermal intensity (FRP): "
        f"{frp:.2f} MW"
    )

    # --------------------------------------------------------
    # PERSISTENCE
    # --------------------------------------------------------

    persistence = safe_float(
        context.get(
            "historical_fire_count",
            0
        )
    )

    if persistence > 0:

        evidence.append(
            f"Historical thermal detections nearby: "
            f"{persistence:.0f}"
        )

    # --------------------------------------------------------
    # LAND COVER
    # --------------------------------------------------------

    dominant = str(
        context.get(
            "DW_dominant_2024",
            "Unknown"
        )
    )

    land_cover_labels = {

        "0": "Water",
        "1": "Trees",
        "2": "Grass",
        "3": "Flooded vegetation",
        "4": "Crops",
        "5": "Shrub and scrub",
        "6": "Built-up",
        "7": "Bare",
        "8": "Snow and ice",
    }

    dominant_clean = (
        dominant
        .replace(
            ".0",
            ""
        )
    )

    land_cover = land_cover_labels.get(
        dominant_clean,
        "Unknown"
    )

    evidence.append(
        f"Land cover: {land_cover}"
    )

    # --------------------------------------------------------
    # SPECTRAL INDICES
    # --------------------------------------------------------

    evidence.append(
        f"NDVI: "
        f"{safe_float(context.get('NDVI', 0)):.3f}"
    )

    evidence.append(
        f"NDWI: "
        f"{safe_float(context.get('NDWI', 0)):.3f}"
    )

    evidence.append(
        f"NDBI: "
        f"{safe_float(context.get('NDBI', 0)):.3f}"
    )

    # --------------------------------------------------------
    # ATMOSPHERIC ANOMALIES
    # --------------------------------------------------------

    atmospheric = []

    no2_anomaly = safe_float(
        context.get(
            "NO2_anomaly",
            0
        )
    )

    so2_anomaly = safe_float(
        context.get(
            "SO2_anomaly",
            0
        )
    )

    co_anomaly = safe_float(
        context.get(
            "CO_anomaly",
            0
        )
    )

    ch4_anomaly = safe_float(
        context.get(
            "CH4_anomaly",
            0
        )
    )

    if no2_anomaly > 1:

        atmospheric.append(
            f"NO₂ anomaly: "
            f"{no2_anomaly:.2f}×"
        )

    if so2_anomaly > 1:

        atmospheric.append(
            f"SO₂ anomaly: "
            f"{so2_anomaly:.2f}×"
        )

    if co_anomaly > 1:

        atmospheric.append(
            f"CO anomaly: "
            f"{co_anomaly:.2f}×"
        )

    if ch4_anomaly > 1:

        atmospheric.append(
            f"CH₄ anomaly: "
            f"{ch4_anomaly:.2f}×"
        )

    if atmospheric:

        evidence.extend(
            atmospheric
        )

    else:

        evidence.append(
            "No strong atmospheric anomaly above baseline"
        )

    return evidence


# ============================================================
# GAS ASSESSMENT
# ============================================================

def assess_gas_related_event(
    fire,
    context
):

    ch4 = safe_float(
        context.get(
            "CH4_anomaly",
            0
        )
    )

    co = safe_float(
        context.get(
            "CO_anomaly",
            0
        )
    )

    no2 = safe_float(
        context.get(
            "NO2_anomaly",
            0
        )
    )

    so2 = safe_float(
        context.get(
            "SO2_anomaly",
            0
        )
    )

    frp = safe_float(
        fire.get(
            "frp",
            0
        )
    )

    thresholds = {

        "CO_moderate": 1.36,
        "CO_strong": 1.69,

        "NO2_moderate": 1.50,
        "NO2_strong": 4.54,

        "SO2_moderate": 1.80,
        "SO2_strong": 3.75,

        "CH4_moderate": 1.49,
        "CH4_strong": 2.12,
    }

    evidence = []

    gas_score = 0

    # --------------------------------------------------------
    # CH4
    # --------------------------------------------------------

    if ch4 >= thresholds["CH4_strong"]:

        evidence.append(
            f"Strong CH₄ anomaly: "
            f"{ch4:.2f}× baseline"
        )

        gas_score += 3

    elif ch4 >= thresholds["CH4_moderate"]:

        evidence.append(
            f"Elevated CH₄ anomaly: "
            f"{ch4:.2f}× baseline"
        )

        gas_score += 2

    # --------------------------------------------------------
    # CO
    # --------------------------------------------------------

    if co >= thresholds["CO_strong"]:

        evidence.append(
            f"Strong CO anomaly: "
            f"{co:.2f}× baseline"
        )

        gas_score += 2

    elif co >= thresholds["CO_moderate"]:

        evidence.append(
            f"Elevated CO anomaly: "
            f"{co:.2f}× baseline"
        )

        gas_score += 1

    # --------------------------------------------------------
    # NO2
    # --------------------------------------------------------

    if no2 >= thresholds["NO2_strong"]:

        evidence.append(
            f"Strong NO₂ anomaly: "
            f"{no2:.2f}× baseline"
        )

        gas_score += 2

    elif no2 >= thresholds["NO2_moderate"]:

        evidence.append(
            f"Elevated NO₂ anomaly: "
            f"{no2:.2f}× baseline"
        )

        gas_score += 1

    # --------------------------------------------------------
    # SO2
    # --------------------------------------------------------

    if so2 >= thresholds["SO2_strong"]:

        evidence.append(
            f"Strong SO₂ anomaly: "
            f"{so2:.2f}× baseline"
        )

        gas_score += 2

    elif so2 >= thresholds["SO2_moderate"]:

        evidence.append(
            f"Elevated SO₂ anomaly: "
            f"{so2:.2f}× baseline"
        )

        gas_score += 1

    # --------------------------------------------------------
    # THERMAL
    # --------------------------------------------------------

    if frp >= 5:

        evidence.append(
            f"Thermal event detected: "
            f"FRP {frp:.2f} MW"
        )

        gas_score += 1

    # --------------------------------------------------------
    # ASSESSMENT
    # --------------------------------------------------------

    if gas_score >= 4:

        assessment = (
            "POSSIBLE GAS-RELATED EVENT"
        )

    elif gas_score >= 2:

        assessment = "INCONCLUSIVE"

    else:

        assessment = (
            "NO STRONG GAS-LEAK INDICATION"
        )

    if not evidence:

        evidence.append(
            "No strong atmospheric indicators detected"
        )

    return {

        "assessment":
            assessment,

        "evidence":
            evidence,

        "score":
            gas_score,
    }


# ============================================================
# FIRE PRIORITY
# ============================================================

def assess_fire_priority(
    prediction,
    industrial_association,
    gas_assessment,
    fire,
    context
):

    score = 0

    reasons = []

    predicted_class = str(
        prediction.get(
            "predicted_class",
            ""
        )
    ).lower()

    confidence = safe_float(
        prediction.get(
            "confidence",
            0
        )
    )

    industrial_level = str(
        industrial_association.get(
            "level",
            ""
        )
    ).lower()

    gas_assessment_text = str(
        gas_assessment.get(
            "assessment",
            ""
        )
    ).upper()

    frp = safe_float(
        fire.get(
            "frp",
            0
        )
    )

    persistence = safe_float(
        context.get(
            "historical_fire_count",
            0
        )
    )

    # --------------------------------------------------------
    # CLASSIFICATION
    # --------------------------------------------------------

    if "industrial" in predicted_class:

        score += 4

        reasons.append(
            "AI classified the event as industrial"
        )

    elif (
        "forest" in predicted_class
        or "vegetation" in predicted_class
        or "natural" in predicted_class
    ):

        score += 2

        reasons.append(
            "AI classified the event as a natural/vegetation fire"
        )

    else:

        score += 1

        reasons.append(
            "AI classification indicates a non-industrial thermal event"
        )

    # --------------------------------------------------------
    # CONFIDENCE
    # --------------------------------------------------------

    if confidence >= 0.80:

        score += 2

        reasons.append(
            "High model confidence"
        )

    elif confidence >= 0.60:

        score += 1

        reasons.append(
            "Moderate model confidence"
        )

    # --------------------------------------------------------
    # INDUSTRIAL CONTEXT
    # --------------------------------------------------------

    if industrial_level == "high":

        score += 3

        reasons.append(
            "Strong industrial context near the detection"
        )

    elif industrial_level == "moderate":

        score += 1

        reasons.append(
            "Moderate industrial context near the detection"
        )

    # --------------------------------------------------------
    # GAS
    # --------------------------------------------------------

    if gas_assessment_text == (
        "POSSIBLE GAS-RELATED EVENT"
    ):

        score += 3

        reasons.append(
            "Multiple atmospheric indicators are elevated"
        )

    elif gas_assessment_text == "INCONCLUSIVE":

        score += 1

        reasons.append(
            "Some atmospheric indicators are elevated"
        )

    # --------------------------------------------------------
    # FRP
    # --------------------------------------------------------

    if frp >= 50:

        score += 3

        reasons.append(
            f"Very high thermal intensity ({frp:.1f} MW)"
        )

    elif frp >= 20:

        score += 2

        reasons.append(
            f"High thermal intensity ({frp:.1f} MW)"
        )

    elif frp >= 5:

        score += 1

        reasons.append(
            f"Elevated thermal intensity ({frp:.1f} MW)"
        )

    # --------------------------------------------------------
    # PERSISTENCE
    # --------------------------------------------------------

    if persistence >= 100:

        score += 2

        reasons.append(
            "High historical fire persistence in the surrounding grid"
        )

    elif persistence >= 20:

        score += 1

        reasons.append(
            "Repeated historical thermal detections nearby"
        )

    # --------------------------------------------------------
    # FINAL PRIORITY
    # --------------------------------------------------------

    if score >= 10:

        priority = "CRITICAL"

    elif score >= 7:

        priority = "HIGH"

    elif score >= 4:

        priority = "MODERATE"

    else:

        priority = "LOW"

    return {

        "level":
            priority,

        "reasons":
            reasons,

        "score":
            score,
    }


# ============================================================
# LIVE FIRE PREDICTION
# ============================================================

def predict_live_fire(fire):

    # ========================================================
    # ML PREDICTION
    # ========================================================

    prediction = predict_event(
        fire
    )

    # ========================================================
    # CONTEXT
    # ========================================================

    latitude = safe_float(
        fire.get(
            "latitude"
        )
    )

    longitude = safe_float(
        fire.get(
            "longitude"
        )
    )

    from context import get_context

    context, distance = get_context(
        latitude,
        longitude
    )

    # ========================================================
    # INDUSTRIAL ASSOCIATION
    # ========================================================

    industrial_association = (
        assess_industrial_association(
            context
        )
    )

    # ========================================================
    # SOURCE EVIDENCE
    # ========================================================

    supporting_evidence = (
        build_source_evidence(
            fire,
            context
        )
    )

    # ========================================================
    # GAS ASSESSMENT
    # ========================================================

    gas_assessment = (
        assess_gas_related_event(
            fire,
            context
        )
    )

    # ========================================================
    # PROBABILITY FILTER
    # ========================================================

    filtered_probabilities = {

        label: probability

        for label, probability
        in prediction[
            "probabilities"
        ].items()

        if probability >= 0.001
    }

    # ========================================================
    # PRIORITY
    # ========================================================

    priority = assess_fire_priority(

        prediction=prediction,

        industrial_association=
            industrial_association,

        gas_assessment=
            gas_assessment,

        fire=fire,

        context=context,
    )

    # ========================================================
    # FINAL RESPONSE
    # ========================================================

    return {

        "analyzed":
            True,

        "prediction": {

            "predicted_class":
                prediction[
                    "predicted_class"
                ],

            "confidence":
                prediction[
                    "confidence"
                ],

            "probabilities":
                filtered_probabilities,

            "criticality":
                prediction[
                    "criticality"
                ],

            "criticality_probabilities":
                prediction[
                    "criticality_probabilities"
                ],
        },

        "industrial_association":
            industrial_association,

        "gas_assessment":
            gas_assessment,

        "supporting_evidence":
            supporting_evidence,

        "context_distance_m":
            distance,

        "priority":
            {

                "level":
                    priority[
                        "level"
                    ],

                "reasons":
                    priority[
                        "reasons"
                    ],

                "score":
                    priority[
                        "score"
                    ],
            },
    }