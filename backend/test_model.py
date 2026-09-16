import joblib

MODEL_PATH = "models/xgboost_pipeline.joblib"

print("Loading XGBoost model...")

model = joblib.load(MODEL_PATH)

print("Model loaded successfully!")
print()
print("Model type:")
print(type(model))