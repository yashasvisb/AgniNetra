from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json

from firms import get_live_fires
from predictor import predict_event
from live_predictor import predict_live_fire

from context import get_gis_layer
app = FastAPI(
    title="Agni Netra API",
    description="AI-based fire event classification backend",
    version="1.0.0"
)


# =========================
# CORS
# =========================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "http://localhost:5176",
        "http://127.0.0.1:5176",
         "https://agni-netra-psi.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================
# BASIC ROUTES
# =========================

@app.get("/")
def home():
    return {
        "message": "Agni Netra API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


# =========================
# STANDARD MODEL PREDICTION
# =========================

class PredictionRequest(BaseModel):
    data: dict


@app.post("/predict")
def predict(request: PredictionRequest):
    return predict_event(request.data)


# =========================
# TEST MODEL
# =========================

@app.get("/test-prediction")
def test_prediction():

    with open("sample_input_and_output.json", "r") as f:
        sample = json.load(f)

    result = predict_event(
        sample["sample_input_row"]
    )

    return result


# =========================
# NASA FIRMS LIVE DATA
# =========================

@app.get("/live-fires")
def live_fires():

    fires = get_live_fires()

    return {
        "count": len(fires),
        "fires": fires
    }


# =========================
# LIVE FIRE PREDICTION
# =========================
@app.post("/predict-live")
def predict_live(fire: dict):

    try:

        result = predict_live_fire(fire)

        return {
            "success": True,

            "fire": fire,

            # ML source classification
            "prediction": result["prediction"],

            # Transparent contextual industrial assessment
            "industrial_association": (
                result["industrial_association"]
            ),

            # Gas-related atmospheric assessment
            "gas_assessment": (
                result["gas_assessment"]
            ),

            # Satellite + environmental + thermal evidence
            "supporting_evidence": (
                result["supporting_evidence"]
            ),

            # Distance between FIRMS detection
            # and contextual grid location
            "context_distance_m": (
                result["context_distance_m"]
            ),

            # Fire response priority — CRITICAL/HIGH/MODERATE/LOW
            "priority": (
                result["priority"]
            )

        }

    except Exception as e:

        return {
            "success": False,
            "error": str(e)
        }

    # =========================
# GIS LAYERS
# =========================

@app.get("/gis-layer/{layer_name}")
def gis_layer(layer_name: str):

    try:

        data = get_gis_layer(
            layer_name,
            max_points=2500
        )

        return {
            "success": True,
            "layer": layer_name,
            "count": len(data),
            "points": data
        }

    except Exception as e:

        return {
            "success": False,
            "error": str(e)
        }