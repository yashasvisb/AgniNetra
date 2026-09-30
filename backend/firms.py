import os
from io import StringIO

import pandas as pd
import requests
from dotenv import load_dotenv

load_dotenv()

FIRMS_MAP_KEY = os.getenv("FIRMS_MAP_KEY")


def get_live_fires():
    # Imported here so the grid already loaded in predictor.py is reused
    from predictor import feature_engine

    # Area format: west,south,east,north (Odisha only)
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

    odisha = data[
        (data["latitude"] >= 17.8) &
        (data["latitude"] <= 22.6) &
        (data["longitude"] >= 81.3) &
        (data["longitude"] <= 87.5)
    ].copy()

    if odisha.empty:
        return []

    # Keep only fires that are really inside Odisha
    mask = feature_engine.inside_coverage(
        odisha["latitude"].values,
        odisha["longitude"].values,
    )
    odisha = odisha[mask].copy()

    if odisha.empty:
        return []

    odisha["acq_date"] = pd.to_datetime(odisha["acq_date"])
    odisha["year"] = odisha["acq_date"].dt.year
    odisha["month"] = odisha["acq_date"].dt.month
    odisha["day_of_year"] = odisha["acq_date"].dt.dayofyear

    # Timestamps and empty values cannot be turned into JSON
    odisha["acq_date"] = odisha["acq_date"].dt.strftime("%Y-%m-%d")
    odisha = odisha.astype(object).where(odisha.notna(), None)

    return odisha.to_dict(orient="records")