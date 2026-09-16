import os
import requests
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

FIRMS_MAP_KEY = os.getenv("FIRMS_MAP_KEY")


def get_live_fires():
    url = (
        f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/"
        f"{FIRMS_MAP_KEY}/VIIRS_SNPP_NRT/"
        f"54,5.5,102,40/2"
    )

    response = requests.get(url, timeout=30)
    response.raise_for_status()

    data = pd.read_csv(
        pd.io.common.StringIO(response.text)
    )

    # Odisha approximate geographic bounds
    odisha = data[
        (data["latitude"] >= 17.8) &
        (data["latitude"] <= 22.6) &
        (data["longitude"] >= 81.3) &
        (data["longitude"] <= 87.5)
    ].copy()

    return odisha.to_dict(orient="records")