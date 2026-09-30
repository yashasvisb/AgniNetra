import os
import math
import pandas as pd

from routing import get_route


# ---------------------------------------------------------
# Configuration
# ---------------------------------------------------------

STATION_FILE = os.path.join(
    os.path.dirname(__file__),
    "data",
    "Odisha_Fire_Stations_345_Cleaned.csv"
)


# ---------------------------------------------------------
# Load fire-station dataset
# ---------------------------------------------------------

stations_df = pd.read_csv(STATION_FILE)

# Keep only rows with valid coordinates
stations_df = stations_df.dropna(
    subset=["LATITUDE", "LONGITUDE"]
).copy()


# ---------------------------------------------------------
# Haversine distance
# ---------------------------------------------------------

def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Straight-line distance between two coordinates in kilometres.
    """

    R = 6371.0  # Earth radius in km

    lat1 = math.radians(lat1)
    lon1 = math.radians(lon1)
    lat2 = math.radians(lat2)
    lon2 = math.radians(lon2)

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    )

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


# ---------------------------------------------------------
# Find nearby candidate stations
# ---------------------------------------------------------

def find_nearest_stations(fire_lat, fire_lon, num_candidates=5):
    """
    Find the geographically closest fire stations.

    This is only a preliminary filter.
    Actual road travel time is calculated afterwards.
    """

    stations = stations_df.copy()

    stations["straight_line_distance_km"] = stations.apply(
        lambda row: haversine_distance(
            fire_lat,
            fire_lon,
            row["LATITUDE"],
            row["LONGITUDE"]
        ),
        axis=1
    )

    stations = stations.sort_values("straight_line_distance_km")

    return stations.head(num_candidates)


# ---------------------------------------------------------
# Find fastest emergency response station
# ---------------------------------------------------------

def find_best_station(fire_lat, fire_lon, num_candidates=5):
    """
    Check several nearby stations and return the one with the
    shortest Mapbox driving-traffic ETA.
    """

    candidates = find_nearest_stations(
        fire_lat,
        fire_lon,
        num_candidates
    )

    results = []

    for _, station in candidates.iterrows():

        try:

            route = get_route(
                start_lat=float(station["LATITUDE"]),
                start_lon=float(station["LONGITUDE"]),
                end_lat=float(fire_lat),
                end_lon=float(fire_lon)
            )

            # int(), str() and float() convert numpy/pandas types into
            # plain Python types so FastAPI can always turn them into JSON.
            results.append({
                "station_id": int(station["STATION_ID"]),
                "station_name": str(station["STATION_NAME"]),
                "district": str(station["DISTRICT"]),
                "coordinate_status": str(
                    station.get("COORDINATE_STATUS", "UNKNOWN")
                ),
                "station_latitude": float(station["LATITUDE"]),
                "station_longitude": float(station["LONGITUDE"]),
                "straight_line_distance_km": round(
                    float(station["straight_line_distance_km"]),
                    2
                ),
                "road_distance_km": route["distance_km"],
                "eta_minutes": route["duration_minutes"],
                "geometry": route["geometry"]
            })

        except Exception as e:

            print(
                f"Routing failed for "
                f"{station['STATION_NAME']}: {e}"
            )

    if not results:
        raise Exception(
            "Could not calculate a route from any candidate station."
        )

    # Lowest ETA = best emergency response option
    results.sort(key=lambda x: x["eta_minutes"])

    return {
        "recommended_station": results[0],
        "alternatives": results[1:],
        "candidates_checked": len(results)
    }