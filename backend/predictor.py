import json
import joblib
import pandas as pd

MODEL_PATH = "models/xgboost_pipeline.joblib"
FEATURES_PATH = "docs/feature_columns_in_order.json"
LABELS_PATH = "docs/target_label_mapping.json"

# -----------------------------
# Load trained model
# -----------------------------

print("Loading XGBoost model...")
model = joblib.load(MODEL_PATH)
print("Model loaded successfully!")

# -----------------------------
# Load feature configuration
# -----------------------------

with open(FEATURES_PATH, "r") as f:
    feature_data = json.load(f)

feature_columns = feature_data["all_features_in_order"]

# -----------------------------
# Load target label mapping
# -----------------------------

with open(LABELS_PATH, "r") as f:
    label_mapping = json.load(f)

index_to_label = {
    int(value): key
    for key, value in label_mapping.items()
}

# -----------------------------
# Prediction function
# -----------------------------

def predict_event(input_data: dict):

    # Convert input dictionary to one-row DataFrame
    df = pd.DataFrame([input_data])

    # Check for missing features
    missing_features = [
        feature
        for feature in feature_columns
        if feature not in df.columns
    ]

    if missing_features:
        raise ValueError(
            f"Missing required features: {missing_features}"
        )

    # Keep EXACT same feature order used during training
    df = df[feature_columns]

    # Convert categorical columns to strings
    categorical_features = feature_data["categorical_features"]

    for feature in categorical_features:
        if feature in df.columns:
            df[feature] = df[feature].astype(str)

    # -----------------------------
    # Run prediction
    # -----------------------------
    prediction = model.predict(df)[0]

    probabilities = model.predict_proba(df)[0]

    predicted_class = index_to_label[int(prediction)]

    # Remove Persistent Thermal Source from displayed probabilities
    filtered_probabilities = [
        probabilities[i]
        for i in range(len(probabilities))
        if index_to_label[i].strip().lower()
        != "persistent thermal source"
    ]

    probability_dict = {
        index_to_label[i]: float(probabilities[i])
        for i in range(len(probabilities))
        if index_to_label[i].strip().lower()
        != "persistent thermal source"
    }

    # Highest probability among displayed classes
    confidence = (
        float(max(filtered_probabilities))
        if filtered_probabilities
        else 0.0
    )

    return {
        "predicted_class": predicted_class,
        "confidence": confidence,
        "probabilities": probability_dict
    }