import os
import requests
from dotenv import load_dotenv

# Load variables from backend/.env
load_dotenv()

MAPBOX_TOKEN = os.getenv("MAPBOX_TOKEN")


def get_route(
    start_lat: float,
    start_lon: float,
    end_lat: float,
    end_lon: float
):
    """
    Get a driving route from the fire station to the detected fire.

    start = fire station
    end   = detected fire
    """

    if not MAPBOX_TOKEN:
        raise ValueError("MAPBOX_TOKEN is not set in backend/.env")

    # Mapbox expects coordinates as longitude,latitude
    coordinates = f"{start_lon},{start_lat};{end_lon},{end_lat}"

    url = (
        f"https://api.mapbox.com/directions/v5/mapbox/"
        f"driving-traffic/{coordinates}"
    )

    params = {
        "access_token": MAPBOX_TOKEN,
        "overview": "full",
        "geometries": "geojson"
    }

    response = requests.get(url, params=params, timeout=20)

    if response.status_code != 200:
        raise Exception(
            f"Mapbox routing error {response.status_code}: "
            f"{response.text}"
        )

    data = response.json()

    if not data.get("routes"):
        raise Exception("No route found by Mapbox.")

    route = data["routes"][0]

    return {
        "distance_km": round(route["distance"] / 1000, 2),
        "duration_minutes": round(route["duration"] / 60, 2),
        "geometry": route["geometry"]
    }