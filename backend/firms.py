import os
from io import StringIO

import numpy as np
import pandas as pd
import requests
from dotenv import load_dotenv
from sklearn.neighbors import BallTree

load_dotenv()

FIRMS_MAP_KEY = os.getenv("FIRMS_MAP_KEY")

# ---------------------------------------------------------
# Odisha coverage check
# Uses the land-cover grid, which only covers Odisha.
# ---------------------------------------------------------

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
LAND_COVER_PATH = os.path.join(
    BACKEND_DIR, "..", "ML_TEST", "LandCover_2024_500m.csv"
)

EARTH_R = 6371000
MAX_DIST_M = 1000

_odisha_tree = None

try:
    _grid = pd.read_csv(LAND_COVER_PATH, usecols=["latitude", "longitude"])
    _odisha_tree = BallTree(
        np.radians(_grid[["latitude", "longitude"]].values),
        metric="haversine",
    )
    print(f"Odisha coverage grid loaded: {len(_grid):,} cells")
except Exception as e:
    print(f"WARNING: could not load Odisha coverage grid ({e}). "
          f"Falling back to bounding box only.")


def _inside_odisha(df):
    """True for fires that lie on the Odisha grid."""
    if df.empty or _odisha_tree is None:
        return pd.Series(True, index=df.index)

    pts = np.radians(df[["latitude", "longitude"]].values)
    dist, _ = _odisha_tree.query(pts, k=1)
    return pd.Series(dist[:, 0] * EARTH_R <= MAX_DIST_M, index=df.index)


def get_live_fires():
    # Area format: west,south,east,north  (Odisha only)
    url = (
        f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/"
        f"{FIRMS_MAP_KEY}/VIIRS_SNPP_NRT/"
        f"81.3,17.8,87.5,22.6/2"
    )

    response = requests.get(url, timeout=30)
    response.raise_for_status()

    data = pd.read_csv(StringIO(response.text))

    if data.empty:
        return []

    data = data.dropna(subset=["latitude", "longitude"])

    # Rough rectangle first
    odisha = data[
        (data["latitude"] >= 17.8) &
        (data["latitude"] <= 22.6) &
        (data["longitude"] >= 81.3) &
        (data["longitude"] <= 87.5)
    ].copy()

    if odisha.empty:
        return []

    # Then keep only fires that are really inside Odisha
    odisha = odisha[_inside_odisha(odisha)].copy()

    if odisha.empty:
        return []

    # Temporal features required by the ML model
    odisha["acq_date"] = pd.to_datetime(odisha["acq_date"])
    odisha["year"] = odisha["acq_date"].dt.year
    odisha["month"] = odisha["acq_date"].dt.month
    odisha["day_of_year"] = odisha["acq_date"].dt.dayofyear

    # acq_date is a Timestamp, which cannot be turned into JSON
    odisha["acq_date"] = odisha["acq_date"].dt.strftime("%Y-%m-%d")

    # Empty values cannot be turned into JSON either
    odisha = odisha.astype(object).where(odisha.notna(), None)

    return odisha.to_dict(orient="records")