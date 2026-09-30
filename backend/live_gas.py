import os
import io
import json
import time
import threading
from datetime import datetime, timedelta, timezone
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import requests
import tifffile
from dotenv import load_dotenv

load_dotenv()

TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
PROCESS_URL = "https://sh.dataspace.copernicus.eu/process/v1"
CLIENT_ID = os.getenv("COPERNICUS_CLIENT_ID")
CLIENT_SECRET = os.getenv("COPERNICUS_CLIENT_SECRET")

GASES = ["NO2", "SO2", "CO"]          # CH4 stays historical ML context only
BASELINE_YEARS = (2022, 2023, 2024)
WINDOW_OFFSETS_DAYS = (-10, 0, 10)    # around today's calendar date
WINDOW_LEN_DAYS = 7
LIVE_DAYS_BACK = 5
CELL_DEG = 0.5
HALF = CELL_DEG / 2
MIN_VALID_PIXELS = 40                 # of 400
MIN_BASELINE_SAMPLES = 4
UNIT = "mol/m2"

CACHE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "gas_baseline_cache.json")
_cache_lock = threading.Lock()
_token_lock = threading.Lock()
_token = {"value": None, "exp": 0.0}

STATUS_RANK = {"Normal": 0, "Elevated": 1, "Anomalous": 2}


# ---------- auth ----------

def _get_token():
    with _token_lock:
        if _token["value"] and time.time() < _token["exp"] - 60:
            return _token["value"]
        r = requests.post(
            TOKEN_URL,
            data={
                "grant_type": "client_credentials",
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
            },
            timeout=30,
        )
        r.raise_for_status()
        j = r.json()
        _token["value"] = j["access_token"]
        _token["exp"] = time.time() + float(j.get("expires_in", 1800))
        return _token["value"]


# ---------- Sentinel-5P fetch ----------

def _fetch_mean(gas, cell_lat, cell_lon, t_from, t_to):
    """Return (mean, n_valid) or (None, n_valid) if not enough valid pixels."""
    evalscript = f"""
//VERSION=3
function setup() {{
  return {{ input: ["{gas}", "dataMask"], output: {{ bands: 2, sampleType: "FLOAT32" }} }};
}}
function evaluatePixel(s) {{ return [s.{gas}, s.dataMask]; }}
"""
    body = {
        "input": {
            "bounds": {
                "bbox": [cell_lon - HALF, cell_lat - HALF, cell_lon + HALF, cell_lat + HALF],
                "properties": {"crs": "http://www.opengis.net/def/crs/EPSG/0/4326"},
            },
            "data": [{
                "type": "sentinel-5p-l2",
                "dataFilter": {"timeRange": {"from": t_from, "to": t_to}},
                "processing": {"minQa": 50},
            }],
        },
        "output": {
            "width": 20, "height": 20,
            "responses": [{"identifier": "default", "format": {"type": "image/tiff"}}],
        },
        "evalscript": evalscript,
    }

    r = None
    for attempt in range(3):
        r = requests.post(
            PROCESS_URL,
            headers={"Authorization": f"Bearer {_get_token()}"},
            json=body,
            timeout=120,
        )
        if r.status_code in (429, 500, 502, 503, 504):
            time.sleep(2 * (attempt + 1))
            continue
        break

    if r.status_code != 200:
        raise RuntimeError(f"Sentinel Hub HTTP {r.status_code}: {r.text[:200]}")

    arr = tifffile.imread(io.BytesIO(r.content)).astype("float32")
    if arr.ndim == 3 and arr.shape[0] == 2 and arr.shape[-1] != 2:
        arr = np.moveaxis(arr, 0, -1)
    vals, mask = arr[..., 0], arr[..., 1]
    valid = (mask > 0) & np.isfinite(vals)
    n = int(valid.sum())
    if n < MIN_VALID_PIXELS:
        return None, n
    return float(vals[valid].mean()), n


# ---------- baseline (2022-2024, same season) ----------

def _baseline_windows(now):
    windows = []
    for y in BASELINE_YEARS:
        try:
            center = datetime(y, now.month, now.day)
        except ValueError:            # Feb 29
            center = datetime(y, now.month, 28)
        for off in WINDOW_OFFSETS_DAYS:
            start = center + timedelta(days=off - WINDOW_LEN_DAYS // 2)
            end = start + timedelta(days=WINDOW_LEN_DAYS) - timedelta(seconds=1)
            windows.append((
                start.strftime("%Y-%m-%dT%H:%M:%SZ"),
                end.strftime("%Y-%m-%dT%H:%M:%SZ"),
            ))
    return windows


def _load_cache():
    try:
        with open(CACHE_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return {}


def _save_cache(cache):
    try:
        with open(CACHE_FILE, "w") as f:
            json.dump(cache, f)
    except Exception:
        pass  # read-only disk is fine, we just lose caching


def _get_baseline(cell_lat, cell_lon, now):
    period = (now.timetuple().tm_yday - 1) // 15
    key = f"{cell_lat}_{cell_lon}_p{period}"

    with _cache_lock:
        cache = _load_cache()
        if key in cache:
            return cache[key], True

    windows = _baseline_windows(now)
    jobs = [(g, w) for g in GASES for w in windows]

    def run(job):
        gas, (t_from, t_to) = job
        try:
            mean, _ = _fetch_mean(gas, cell_lat, cell_lon, t_from, t_to)
            return gas, mean
        except Exception:
            return gas, None

    with ThreadPoolExecutor(max_workers=6) as ex:
        results = list(ex.map(run, jobs))

    baseline = {}
    for gas in GASES:
        samples = [m for g, m in results if g == gas and m is not None]
        if len(samples) >= MIN_BASELINE_SAMPLES:
            baseline[gas] = {
                "mean": float(np.mean(samples)),
                "std": float(np.std(samples, ddof=1)),
                "n": len(samples),
            }
        else:
            baseline[gas] = {"mean": None, "std": None, "n": len(samples)}

    # Only cache if at least one gas has a usable baseline
    if any(v["mean"] is not None for v in baseline.values()):
        with _cache_lock:
            cache = _load_cache()
            cache[key] = baseline
            _save_cache(cache)

    return baseline, False


# ---------- public function ----------

def _status(z):
    if z < 2:
        return "Normal"
    if z < 3:
        return "Elevated"
    return "Anomalous"


def get_gas_anomaly(lat, lon):
    now = datetime.now(timezone.utc)
    cell_lat = round(lat * 2) / 2
    cell_lon = round(lon * 2) / 2

    baseline, from_cache = _get_baseline(cell_lat, cell_lon, now)

    t_to = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    t_from = (now - timedelta(days=LIVE_DAYS_BACK)).strftime("%Y-%m-%dT%H:%M:%SZ")

    gases_out = {}
    worst = None

    for gas in GASES:
        b = baseline.get(gas, {})
        entry = {
            "unit": UNIT,
            "baseline_mean": b.get("mean"),
            "baseline_std": b.get("std"),
            "baseline_samples": b.get("n", 0),
            "live_value": None,
            "z_score": None,
            "status": None,
            "note": None,
        }

        try:
            live, n_valid = _fetch_mean(gas, cell_lat, cell_lon, t_from, t_to)
        except Exception as e:
            entry["status"] = "Unavailable"
            entry["note"] = f"Live fetch failed: {e}"
            gases_out[gas] = entry
            continue

        if live is None:
            entry["status"] = "Unavailable"
            entry["note"] = f"Too few valid pixels in latest overpass ({n_valid})"
        elif b.get("mean") is None or not b.get("std"):
            entry["live_value"] = live
            entry["status"] = "Insufficient baseline"
            entry["note"] = "Not enough same-season 2022-2024 samples for this area"
        else:
            z = (live - b["mean"]) / b["std"]
            entry["live_value"] = live
            entry["z_score"] = round(z, 2)
            entry["status"] = _status(z)
            if worst is None or STATUS_RANK[entry["status"]] > STATUS_RANK[worst]:
                worst = entry["status"]

        gases_out[gas] = entry

    return {
        "available": worst is not None,
        "overall_status": worst or "Unavailable",
        "cell_center": {"lat": cell_lat, "lon": cell_lon},
        "cell_size_deg": CELL_DEG,
        "observation": f"latest available Sentinel-5P overpass (last {LIVE_DAYS_BACK} days)",
        "baseline_method": (
            "Same-season 2022-2024 Sentinel-5P windows (mean and std), "
            "compared with the current API value"
        ),
        "baseline_from_cache": from_cache,
        "gases": gases_out,
    }


if __name__ == "__main__":
    import sys
    la = float(sys.argv[1]) if len(sys.argv) > 1 else 20.30
    lo = float(sys.argv[2]) if len(sys.argv) > 2 else 85.82
    t0 = time.time()
    print(json.dumps(get_gas_anomaly(la, lo), indent=2))
    print(f"\nElapsed: {time.time() - t0:.1f}s")