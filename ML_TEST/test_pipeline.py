import os
import pandas as pd
from catboost import CatBoostClassifier
from feature_engineering import FeatureEngine, select_model_columns

BASE_PATH = os.path.dirname(os.path.abspath(__file__))

print("=" * 60)
print("AGNINETRA REAL FIRMS CATBOOST PIPELINE TEST")
print("=" * 60)


# ---------------------------------------------------------
# 1. LOAD FEATURE ENGINE
# ---------------------------------------------------------

print("\n[1/6] Loading FeatureEngine...")

engine = FeatureEngine(BASE_PATH)

print("✓ FeatureEngine loaded")


# ---------------------------------------------------------
# 2. LOAD ONE REAL FIRMS ROW
# ---------------------------------------------------------

print("\n[2/6] Loading real FIRMS row...")

firms = pd.read_csv(
    os.path.join(BASE_PATH, "MASTER_v2_TRAIN_temporal_clean.csv")
)

# Use the first real FIRMS record
fire = firms.iloc[0]

print("✓ Real FIRMS row loaded")

print("\nInput FIRMS event:")
print(f"Fire ID:     {fire['fire_id']}")
print(f"Date:        {fire['acq_date']}")
print(f"Location:    {fire['latitude']}, {fire['longitude']}")
print(f"FRP:         {fire['frp']}")
print(f"Confidence:  {fire['confidence']}")
print(f"Day/Night:   {fire['daynight']}")


# ---------------------------------------------------------
# 3. GENERATE FEATURES FROM REAL FIRMS INPUT
# ---------------------------------------------------------

print("\n[3/6] Generating features from real FIRMS event...")

row = engine.build_feature_row(
    lat=float(fire["latitude"]),
    lon=float(fire["longitude"]),
    year=int(fire["year"]),

    bright_ti4=float(fire["bright_ti4"]),
    bright_ti5=float(fire["bright_ti5"]),
    frp=float(fire["frp"]),

    confidence=fire["confidence"],
    daynight=fire["daynight"],

    scan=float(fire["scan"]),
    track=float(fire["track"]),

    month=int(fire["month"]),
    day_of_year=int(fire["day_of_year"])
)

print("✓ Features generated")


# ---------------------------------------------------------
# 4. PREPARE MODEL INPUTS
# ---------------------------------------------------------

print("\n[4/6] Preparing CatBoost inputs...")

schema_path = os.path.join(
    BASE_PATH,
    "feature_schema.json"
)

event_X = select_model_columns(
    row,
    schema_path,
    "event"
)

criticality_X = select_model_columns(
    row,
    schema_path,
    "criticality"
)

print(f"✓ Event features:       {event_X.shape}")
print(f"✓ Criticality features: {criticality_X.shape}")


# ---------------------------------------------------------
# 5. CHECK FEATURES
# ---------------------------------------------------------

print("\nChecking generated model features...")

print("\nEvent features:")
print(event_X.to_string(index=False))

print("\nCriticality features:")
print(criticality_X.to_string(index=False))


print("\nMissing values:")

event_missing = event_X.isnull().sum()
criticality_missing = criticality_X.isnull().sum()

print("\nEvent:")
print(event_missing[event_missing > 0])

print("\nCriticality:")
print(criticality_missing[criticality_missing > 0])

if event_X.isnull().any().any():
    raise ValueError("Event model contains missing values!")

if criticality_X.isnull().any().any():
    raise ValueError("Criticality model contains missing values!")

print("\n✓ No missing model features")


# ---------------------------------------------------------
# 6. LOAD MODELS + PREDICT
# ---------------------------------------------------------

print("\n[5/6] Loading CatBoost models...")

event_model = CatBoostClassifier()
event_model.load_model(
    os.path.join(BASE_PATH, "event_classifier.cbm")
)

criticality_model = CatBoostClassifier()
criticality_model.load_model(
    os.path.join(BASE_PATH, "criticality_model.cbm")
)

print("✓ Both models loaded")


print("\n[6/6] Running predictions...")

event_prediction = event_model.predict(event_X)
event_probability = event_model.predict_proba(event_X)

criticality_prediction = criticality_model.predict(
    criticality_X
)

criticality_probability = criticality_model.predict_proba(
    criticality_X
)


# ---------------------------------------------------------
# RESULTS
# ---------------------------------------------------------

print("\n" + "=" * 60)
print("REAL FIRMS TEST RESULT")
print("=" * 60)

print("\nOriginal training label:")
print(fire["event_class"])

print("\nCatBoost event prediction:")
print(event_prediction[0][0])

print("\nEvent probabilities:")
print(event_probability[0])

print("\nOriginal criticality:")
print(fire["criticality"])

print("\nCatBoost criticality prediction:")
print(criticality_prediction[0][0])

print("\nCriticality probabilities:")
print(criticality_probability[0])


print("\n" + "=" * 60)
print("REAL FIRMS PIPELINE TEST COMPLETED")
print("=" * 60)