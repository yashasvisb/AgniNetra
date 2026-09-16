import math
import numpy as np

from context import get_context
from predictor import predict_event


# ============================================================
# HELPERS
# ============================================================

def safe_float(value, default=0.0):
    try:
        if value is None:
            return default

        result = float(value)

        if np.isnan(result) or np.isinf(result):
            return default

        return result

    except (TypeError, ValueError):
        return default


def safe_int(value, default=0):
    try:
        if value is None:
            return default

        return int(float(value))

    except (TypeError, ValueError):
        return default


# ============================================================
# BUILD LIVE FEATURES
# ============================================================

def build_live_features(fire):

    latitude = safe_float(
        fire.get("latitude")
    )

    longitude = safe_float(
        fire.get("longitude")
    )

    # --------------------------------------------------------
    # CONTEXT
    # --------------------------------------------------------

    context, distance = get_context(
        latitude,
        longitude
    )

    # --------------------------------------------------------
    # FIRMS TEMPORAL FEATURES
    # --------------------------------------------------------

    acq_time = safe_int(
        fire.get("acq_time", 0)
    )

    acq_date = str(
        fire.get(
            "acq_date",
            "2024-01-01"
        )
    )

    try:
        source_year = int(
            acq_date[:4]
        )
    except ValueError:
        source_year = 2024

    try:
        month = int(
            acq_date[5:7]
        )
    except ValueError:
        month = 1

    try:
        day_of_year = (
            np.datetime64(acq_date)
            - np.datetime64(
                f"{source_year}-01-01"
            )
        ).astype(int) + 1

    except Exception:
        day_of_year = 1

    # --------------------------------------------------------
    # THERMAL FEATURES
    # --------------------------------------------------------

    bright_ti4 = safe_float(
        fire.get("bright_ti4", 0)
    )

    bright_ti5 = safe_float(
        fire.get("bright_ti5", 0)
    )

    frp = safe_float(
        fire.get("frp", 0)
    )

    frp_log = math.log1p(
        max(frp, 0)
    )

    scan = safe_float(
        fire.get("scan", 0)
    )

    track = safe_float(
        fire.get("track", 0)
    )

    # --------------------------------------------------------
    # SEASONAL FEATURES
    # --------------------------------------------------------

    month_sin = math.sin(
        2 * math.pi * month / 12
    )

    month_cos = math.cos(
        2 * math.pi * month / 12
    )

    # --------------------------------------------------------
    # DAY / NIGHT
    # --------------------------------------------------------

    daynight = str(
        fire.get(
            "daynight",
            ""
        )
    ).upper()

    daynight_binary = (
        1
        if daynight == "D"
        else 0
    )

    # --------------------------------------------------------
    # PROJECT COORDINATES
    # --------------------------------------------------------

    from pyproj import Transformer

    transformer = Transformer.from_crs(
        "EPSG:4326",
        "EPSG:32644",
        always_xy=True
    )

    x_m, y_m = transformer.transform(
        longitude,
        latitude
    )

    # --------------------------------------------------------
    # CONTEXT YEAR
    # --------------------------------------------------------

    year = 2024

    # --------------------------------------------------------
    # ATMOSPHERIC VALUES
    # --------------------------------------------------------

    ch4_value = safe_float(
        context.get(
            "CH4",
            0
        )
    )

    ch4_anomaly = safe_float(
        context.get(
            "CH4_anomaly",
            0
        )
    )

    # --------------------------------------------------------
    # FEATURES
    # --------------------------------------------------------

    features = {

        # ----------------------------------------------------
        # FIRMS
        # ----------------------------------------------------

        "acq_time":
            acq_time,

        "source_year":
            source_year,

        "month":
            month,

        "day_of_year":
            int(day_of_year),

        "latitude":
            latitude,

        "longitude":
            longitude,

        "bright_ti4":
            bright_ti4,

        "bright_ti5":
            bright_ti5,

        "frp":
            frp,

        "frp_log":
            frp_log,

        "scan":
            scan,

        "track":
            track,

        "month_sin":
            month_sin,

        "month_cos":
            month_cos,

        "daynight_binary":
            daynight_binary,

        "x_m":
            x_m,

        "y_m":
            y_m,

        # ----------------------------------------------------
        # INDUSTRIAL CONTEXT
        # ----------------------------------------------------

        "dist_to_industry_m":
            safe_float(
                context.get(
                    "dist_to_industry_m",
                    999999
                )
            ),

        "nearest_industry_high_heat":
            safe_float(
                context.get(
                    "nearest_industry_high_heat",
                    0
                )
            ),

        "industry_count_1km":
            safe_float(
                context.get(
                    "industry_count_1km",
                    0
                )
            ),

        "industry_count_5km":
            safe_float(
                context.get(
                    "industry_count_5km",
                    0
                )
            ),

        # ----------------------------------------------------
        # OSM
        # ----------------------------------------------------

        "dist_to_osm_facility_m":
            safe_float(
                context.get(
                    "dist_to_osm_facility_m",
                    999999
                )
            ),

        "osm_count_1km":
            safe_float(
                context.get(
                    "osm_count_1km",
                    0
                )
            ),

        "osm_count_5km":
            safe_float(
                context.get(
                    "osm_count_5km",
                    0
                )
            ),

        # ----------------------------------------------------
        # SENTINEL-2
        # ----------------------------------------------------

        "NDVI":
            safe_float(
                context.get(
                    "NDVI",
                    0
                )
            ),

        "NDWI":
            safe_float(
                context.get(
                    "NDWI",
                    0
                )
            ),

        "NDBI":
            safe_float(
                context.get(
                    "NDBI",
                    0
                )
            ),

        # ----------------------------------------------------
        # DYNAMIC WORLD
        # ----------------------------------------------------

        "grid_DW_bare":
            safe_float(
                context.get(
                    f"DW_bare_{year}",
                    0
                )
            ),

        "grid_DW_built":
            safe_float(
                context.get(
                    f"DW_built_{year}",
                    0
                )
            ),

        "grid_DW_crops":
            safe_float(
                context.get(
                    f"DW_crops_{year}",
                    0
                )
            ),

        "grid_DW_flooded_vegetation":
            safe_float(
                context.get(
                    f"DW_flooded_vegetation_{year}",
                    0
                )
            ),

        "grid_DW_grass":
            safe_float(
                context.get(
                    f"DW_grass_{year}",
                    0
                )
            ),

        "grid_DW_shrub":
            safe_float(
                context.get(
                    f"DW_shrub_{year}",
                    0
                )
            ),

        "grid_DW_trees":
            safe_float(
                context.get(
                    f"DW_trees_{year}",
                    0
                )
            ),

        "grid_DW_water":
            safe_float(
                context.get(
                    f"DW_water_{year}",
                    0
                )
            ),

        # ----------------------------------------------------
        # ATMOSPHERIC INDICATORS
        # ----------------------------------------------------

        "CO":
            safe_float(
                context.get(
                    "CO",
                    0
                )
            ),

        "NO2":
            safe_float(
                context.get(
                    "NO2",
                    0
                )
            ),

        "SO2":
            safe_float(
                context.get(
                    "SO2",
                    0
                )
            ),

        "CH4":
            ch4_value,

        "ch4_available":
            0
            if np.isnan(
                safe_float(
                    context.get(
                        "CH4",
                        0
                    )
                )
            )
            else 1,

        # ----------------------------------------------------
        # HISTORICAL CONTEXT
        # ----------------------------------------------------

        "persistence_count":
            safe_float(
                context.get(
                    "historical_fire_count",
                    0
                )
            ),

        "CO_anomaly":
            safe_float(
                context.get(
                    "CO_anomaly",
                    0
                )
            ),

        "NO2_anomaly":
            safe_float(
                context.get(
                    "NO2_anomaly",
                    0
                )
            ),

        "SO2_anomaly":
            safe_float(
                context.get(
                    "SO2_anomaly",
                    0
                )
            ),

        "CH4_anomaly":
            ch4_anomaly,

        "industrial_anomaly_score":
            safe_float(
                context.get(
                    "background_industrial_risk",
                    0
                )
            ),

        # ----------------------------------------------------
        # CATEGORICAL FEATURES
        # ----------------------------------------------------

        "confidence":
            str(
                fire.get(
                    "confidence",
                    "n"
                )
            ),

        "nearest_industry_sector":
            "Unknown",

        "nearest_osm_feature_type":
            "Unknown",

        "grid_DW_dominant":
            str(
                context.get(
                    f"DW_dominant_{year}",
                    "Unknown"
                )
            ),
    }

    return features, distance


# ============================================================
# INDUSTRIAL ASSOCIATION
# ============================================================

def assess_industrial_association(
    context
):

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
    # INDUSTRIAL PROXIMITY
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
    # HIGH HEAT FACILITY
    # --------------------------------------------------------

    if high_heat >= 1:

        evidence.append(
            "High-heat industrial facility nearby"
        )

        strong_signals += 1

    # --------------------------------------------------------
    # BACKGROUND INDUSTRIAL RISK
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
    # FINAL ASSOCIATION
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

    year = 2024

    dominant = str(
        context.get(
            f"DW_dominant_{year}",
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
    """
    Transparent contextual assessment.

    This is NOT a gas-leak detector
    and does not confirm a leak.
    """

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
    # THERMAL EVENT
    # --------------------------------------------------------

    if frp >= 5:

        evidence.append(
            f"Thermal event detected: "
            f"FRP {frp:.2f} MW"
        )

        gas_score += 1

    # --------------------------------------------------------
    # CLASSIFICATION
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
    """
    Transparent decision-support prioritization.

    Score is internal and is NOT a probability.
    """

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

    # ========================================================
    # 1. MODEL CLASSIFICATION
    # ========================================================

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

    # ========================================================
    # 2. MODEL CONFIDENCE
    # ========================================================

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

    # ========================================================
    # 3. INDUSTRIAL CONTEXT
    # ========================================================

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

    # ========================================================
    # 4. GAS / ATMOSPHERIC
    # ========================================================

    if (
        gas_assessment_text
        == "POSSIBLE GAS-RELATED EVENT"
    ):

        score += 3

        reasons.append(
            "Multiple atmospheric indicators are elevated"
        )

    elif (
        gas_assessment_text
        == "INCONCLUSIVE"
    ):

        score += 1

        reasons.append(
            "Some atmospheric indicators are elevated"
        )

    # ========================================================
    # 5. THERMAL INTENSITY
    # ========================================================

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

    # ========================================================
    # 6. HISTORICAL PERSISTENCE
    # ========================================================

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

    # ========================================================
    # FINAL PRIORITY
    # ========================================================

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
# MAIN LIVE PREDICTION
# ============================================================

def predict_live_fire(fire):

    # ========================================================
    # BUILD FEATURES
    # ========================================================

    features, distance = (
        build_live_features(fire)
    )

    # ========================================================
    # ML SOURCE CLASSIFICATION
    # ========================================================

    prediction = predict_event(
        features
    )

    # ========================================================
    # CONTEXT
    # ========================================================

    latitude = safe_float(
        fire.get("latitude")
    )

    longitude = safe_float(
        fire.get("longitude")
    )

    context, _ = get_context(
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
    # ENVIRONMENTAL / GIS EVIDENCE
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
    # FILTER PROBABILITIES
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
    # DECISION SUPPORT
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
    # RESPONSE
    # ========================================================

    return {
    "analyzed": True,

    "prediction": {
        "predicted_class": prediction["predicted_class"],
        "confidence": prediction["confidence"],
        "probabilities": filtered_probabilities,
    },

    "industrial_association": industrial_association,

    "gas_assessment": gas_assessment,

    "supporting_evidence": supporting_evidence,

    "context_distance_m": distance,

    "priority": {
        "level": priority["level"],
        "reasons": priority["reasons"],
        "score": priority["score"],
    },
}