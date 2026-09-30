"""
AgniNetra feature engineering (memory-lean version).

Same features as before, but:
  - only the needed CSV columns are loaded
  - big grids are stored as compact arrays
  - lookups are precomputed once at startup
"""

import gc
from collections import Counter

import numpy as np
import pandas as pd
from sklearn.neighbors import BallTree

EARTH_R = 6371000  # meters

LC_NAMES = ['water', 'trees', 'grass', 'flooded_vegetation', 'crops', 'shrub', 'built', 'bare']
LC_LABELS = {0: 'Water', 1: 'Trees', 2: 'Grass', 3: 'Flooded Vegetation',
             4: 'Crops', 5: 'Shrub & Scrub', 6: 'Built-up Area', 7: 'Bare Ground'}
LC_FILES = {2022: 'LandCover_2022_500m.csv',
            2023: 'LandCover_2023_500m.csv',
            2024: 'LandCover_2024_500m.csv'}
LC_MAX_DIST_M = 1000

TRAIN_YEARS = (2022, 2023, 2024)
GASES = ('CH4', 'CO', 'NO2', 'SO2')
GAS_FILES = {
    'CH4': 'AgniNetra_CH4_2022_2024_1km.csv',
    'CO': 'AgniNetra_CO_2022_2024_1km.csv',
    'NO2': 'AgniNetra_NO2_2022_2024_1km.csv',
    'SO2': 'AgniNetra_SO2_2022_2024_1km.csv',
}
S2_INDICES = ('NDVI', 'NDWI', 'NDBI')
CLUSTER_DEG = 0.01
PERSISTENT_THRESHOLD = 6


def _rad(lat, lon):
    return np.radians(np.column_stack([lat, lon]).astype(np.float64))


class FeatureEngine:
    def __init__(self, base_path):
        self.base = base_path

        # ---------- Sentinel-2 indices ----------
        s2_value_cols = [f'{i}_{y}' for i in S2_INDICES for y in TRAIN_YEARS]
        s2_wanted = set(['latitude', 'longitude'] + s2_value_cols)
        s2 = pd.read_csv(
            f"{base_path}/Odisha_S2_Indices_AllYears_wide.csv",
            usecols=lambda c: c in s2_wanted,
            dtype={c: 'float32' for c in s2_value_cols},
        )
        self.s2_tree = BallTree(_rad(s2['latitude'].values, s2['longitude'].values),
                                metric='haversine')
        self.s2_vals = {c: s2[c].to_numpy() for c in s2_value_cols if c in s2.columns}
        del s2
        gc.collect()

        # ---------- Gases ----------
        self.gas_trees = {}
        self.gas_year_vals = {}
        self.gas_baseline = {}
        self.gas_stats = {}
        self.gas_pooled = {}
        for gas, fname in GAS_FILES.items():
            cols = [f'{gas}_{y}' for y in TRAIN_YEARS]
            wanted = set(['latitude', 'longitude'] + cols)
            g = pd.read_csv(f"{base_path}/{fname}", usecols=lambda c: c in wanted)
            self.gas_trees[gas] = BallTree(_rad(g['latitude'].values, g['longitude'].values),
                                           metric='haversine')
            self.gas_year_vals[gas] = {y: g[f'{gas}_{y}'].to_numpy() for y in TRAIN_YEARS}
            self.gas_baseline[gas] = g[cols].mean(axis=1).to_numpy()
            self.gas_stats[gas] = {y: (g[f'{gas}_{y}'].mean(), g[f'{gas}_{y}'].std())
                                   for y in TRAIN_YEARS}
            pooled = g[cols].to_numpy()
            self.gas_pooled[gas] = (float(np.nanmean(pooled)), float(np.nanstd(pooled)))
            del g, pooled
        gc.collect()

        # ---------- Industrial facilities ----------
        fac_wanted = {'latitude', 'longitude', 'year'}
        self.facilities = pd.read_csv(
            f"{base_path}/OSM_and_Industries_final_data.csv",
            usecols=lambda c: c in fac_wanted,
        )
        self._fac_trees = {}  # cache: year -> BallTree

        # ---------- Historical FIRMS detections (persistence) ----------
        h = pd.read_csv(
            f"{base_path}/MASTER_v2_TRAIN_temporal_clean.csv",
            usecols=['latitude', 'longitude'],
        ).dropna()
        ilat = np.rint(h['latitude'].to_numpy() / CLUSTER_DEG).astype(np.int64)
        ilon = np.rint(h['longitude'].to_numpy() / CLUSTER_DEG).astype(np.int64)
        self.persistence_counts = Counter(zip(ilat.tolist(), ilon.tolist()))
        del h, ilat, ilon
        gc.collect()

        # ---------- Land cover (store only the winning class) ----------
        self.lc_trees = {}
        self.lc_class = {}
        for y, fname in LC_FILES.items():
            prob_cols = [f'DW_{n}_{y}' for n in LC_NAMES]
            g = pd.read_csv(f"{base_path}/{fname}",
                            usecols=['latitude', 'longitude'] + prob_cols)
            self.lc_trees[y] = BallTree(_rad(g['latitude'].values, g['longitude'].values),
                                        metric='haversine')
            self.lc_class[y] = np.argmax(g[prob_cols].to_numpy(), axis=1).astype(np.int8)
            del g
            gc.collect()

    # ---------------- Coverage check (used by firms.py) ----------------
    def inside_coverage(self, lats, lons):
        """True for points that lie on the Odisha land-cover grid."""
        dist, _ = self.lc_trees[2024].query(_rad(lats, lons), k=1)
        return (dist[:, 0] * EARTH_R) <= LC_MAX_DIST_M

    # ---------------- Sentinel-2 ----------------
    def get_sentinel_indices(self, lat, lon, year):
        dist, idx = self.s2_tree.query(np.radians([[lat, lon]]), k=1)
        i = idx[0][0]

        available_years = [
            y for y in TRAIN_YEARS
            if all(f'{n}_{y}' in self.s2_vals for n in S2_INDICES)
        ]
        if not available_years:
            raise ValueError("No valid Sentinel-2 index years available")

        # Closest available year (2026 -> 2024)
        s2_year = min(available_years, key=lambda y: abs(y - int(year)))

        return {
            'NDVI': float(self.s2_vals[f'NDVI_{s2_year}'][i]),
            'NDWI': float(self.s2_vals[f'NDWI_{s2_year}'][i]),
            'NDBI': float(self.s2_vals[f'NDBI_{s2_year}'][i]),
            's2_dist_m': float(dist[0][0] * EARTH_R),
        }

    # ---------------- Gases ----------------
    def get_gas_values(self, lat, lon, year, live_values=None):
        """
        2022-2024: historical value (same as training).
        Other years (e.g. 2026): the 3-year baseline of that grid cell is used,
        or a live reading if live_values={'CH4':..,'CO':..,'NO2':..,'SO2':..} is given.
        """
        pt = np.radians([[lat, lon]])
        year = int(year)
        is_training_year = year in TRAIN_YEARS
        out = {}

        for gas in GASES:
            _, idx = self.gas_trees[gas].query(pt, k=1)
            i = idx[0][0]
            baseline = float(self.gas_baseline[gas][i])

            has_live = bool(live_values) and gas in live_values

            if has_live:
                val = float(live_values[gas])
            elif is_training_year:
                val = float(self.gas_year_vals[gas][year][i])
            else:
                val = baseline

            if is_training_year and not has_live:
                mu, sd = self.gas_stats[gas][year]
            else:
                mu, sd = self.gas_pooled[gas]

            out[gas] = val
            out[f'{gas}_z'] = (val - mu) / sd if sd else 0.0
            out[f'{gas}_baseline'] = baseline

        return out

    # ---------------- Facility proximity ----------------
    def _facility_tree(self, year):
        year = int(year)
        if year not in self._fac_trees:
            cum = self.facilities[self.facilities['year'] <= year]
            if len(cum) == 0:
                self._fac_trees[year] = None
            else:
                self._fac_trees[year] = BallTree(
                    _rad(cum['latitude'].values, cum['longitude'].values),
                    metric='haversine')
        return self._fac_trees[year]

    def get_facility_features(self, lat, lon, year):
        tree = self._facility_tree(year)
        if tree is None:
            return {'dist_to_facility_m': np.nan, 'facility_count_1km': 0, 'facility_count_5km': 0}
        pt = np.radians([[lat, lon]])
        dist, _ = tree.query(pt, k=1)
        c1 = tree.query_radius(pt, r=1000 / EARTH_R, count_only=True)[0]
        c5 = tree.query_radius(pt, r=5000 / EARTH_R, count_only=True)[0]
        return {
            'dist_to_facility_m': float(dist[0][0] * EARTH_R),
            'facility_count_1km': int(c1),
            'facility_count_5km': int(c5),
        }

    # ---------------- Persistence ----------------
    def get_persistence(self, lat, lon):
        key = (int(round(lat / CLUSTER_DEG)), int(round(lon / CLUSTER_DEG)))
        count = int(self.persistence_counts.get(key, 0))
        return {
            'persistence_count': count,
            'is_persistent': int(count >= PERSISTENT_THRESHOLD),
        }

    # ---------------- Land cover ----------------
    def get_land_cover(self, lat, lon, year):
        y = min(LC_FILES, key=lambda k: abs(k - int(year)))
        dist, idx = self.lc_trees[y].query(np.radians([[lat, lon]]), k=1)
        dist_m = float(dist[0][0] * EARTH_R)

        # Always use the nearest cell (CatBoost cannot take None here)
        cls = int(self.lc_class[y][idx[0][0]])

        return {
            'land_cover_class': cls,
            'land_cover_label': LC_LABELS[cls],
            'lc_dist_m': dist_m,
            'outside_coverage': dist_m > LC_MAX_DIST_M,
        }

    # ---------------- Full feature row ----------------
    def build_feature_row(self, lat, lon, year, bright_ti4, bright_ti5, frp,
                          confidence, daynight, scan, track, month, day_of_year,
                          land_cover_class=None, live_gas_values=None):
        if land_cover_class is None:
            land_cover_class = self.get_land_cover(lat, lon, year)['land_cover_class']

        # Safety net: categorical columns must never be None
        if land_cover_class is None:
            land_cover_class = 4
        if confidence is None:
            confidence = 'n'
        if daynight is None:
            daynight = 'D'

        row = {
            'land_cover_class': land_cover_class,
            'bright_ti4': bright_ti4, 'bright_ti5': bright_ti5,
            'confidence': confidence, 'daynight': daynight,
            'scan': scan, 'track': track, 'month': month, 'day_of_year': day_of_year,
        }
        row.update(self.get_sentinel_indices(lat, lon, year))
        row.update(self.get_gas_values(lat, lon, year, live_values=live_gas_values))
        row.update(self.get_facility_features(lat, lon, year))
        row.update(self.get_persistence(lat, lon))
        row['frp'] = frp
        row['frp_log'] = np.log1p(frp)
        return row


def select_model_columns(row, schema_path, model_type="event"):
    """Select and order exactly the columns a model was trained on."""
    import json
    with open(schema_path) as f:
        schema = json.load(f)

    key = "event_class_features" if model_type == "event" else "criticality_features"
    if key in schema:
        cols = schema[key]
    elif "features" in schema:
        cols = schema["features"]
    else:
        raise KeyError(f"feature_schema.json has neither '{key}' nor 'features'; keys: {list(schema)}")
    return pd.DataFrame([row])[cols]