import json
import os
import sys
import pandas as pd

# ============================================================
# PATHS
# ============================================================

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
ML_TEST_DIR = os.path.join(BACKEND_DIR, "..", "ML_TEST")

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

import feature_engineering
print("USING:", feature_engineering.__file__)

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


# ============================================================
# PREDICTION
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
        x for x in required
        if x not in input_data
    ]

    if missing:
        raise ValueError(
            f"Missing required FIRMS fields: {missing}"
        )

    # --------------------------------------------------------
    # INPUT VALUES
    # --------------------------------------------------------

    lat = float(input_data["latitude"])
    lon = float(input_data["longitude"])
    year = int(input_data["year"])

    # --------------------------------------------------------
    # GENERATE COMPLETE FEATURE ROW
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
        c for c in event_columns
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
        float(event_probabilities_raw[i])
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
        c for c in criticality_columns
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

    # ========================================================
    # FINAL RESULT
    # ========================================================

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