"""
AgniNetra feature engineering — reproduces every non-FIRMS feature used to
train event_classifier.cbm and criticality_model.cbm, for any new lat/lon/date.

Reference data required (bundled alongside this file):
  - Odisha_S2_Indices_AllYears_wide.csv
  - AgniNetra_CH4_2022_2024_1km.csv
  - AgniNetra_CO_2022_2024_1km.csv
  - AgniNetra_NO2_2022_2024_1km.csv
  - AgniNetra_SO2_2022_2024_1km.csv
  - OSM_and_Industries_final_data.csv
  - MASTER_v2_TRAIN_temporal_clean.csv
  - LandCover_2022_500m.csv, LandCover_2023_500m.csv, LandCover_2024_500m.csv
"""

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


def _to_rad(df, lat='latitude', lon='longitude'):
    return np.radians(df[[lat, lon]].values)


class FeatureEngine:
    def __init__(self, base_path):
        self.base = base_path

        # Sentinel-2 indices grid (all years, wide format)
        self.s2 = pd.read_csv(f"{base_path}/Odisha_S2_Indices_AllYears_wide.csv")
        self.s2_tree = BallTree(_to_rad(self.s2), metric='haversine')

        # Gas grids: separate tree per gas
        self.gas_grids = {}
        self.gas_trees = {}
        self.gas_stats = {}
        for gas, fname in [('CH4', 'AgniNetra_CH4_2022_2024_1km.csv'),
                           ('CO', 'AgniNetra_CO_2022_2024_1km.csv'),
                           ('NO2', 'AgniNetra_NO2_2022_2024_1km.csv'),
                           ('SO2', 'AgniNetra_SO2_2022_2024_1km.csv')]:
            g = pd.read_csv(f"{base_path}/{fname}")
            self.gas_grids[gas] = g
            self.gas_trees[gas] = BallTree(_to_rad(g), metric='haversine')
            self.gas_stats[gas] = {y: (g[f'{gas}_{y}'].mean(), g[f'{gas}_{y}'].std())
                                   for y in TRAIN_YEARS}

        # Industrial facilities
        self.facilities = pd.read_csv(f"{base_path}/OSM_and_Industries_final_data.csv")

        # Historical FIRMS detections, for persistence lookup
        self.history = pd.read_csv(f"{base_path}/MASTER_v2_TRAIN_temporal_clean.csv")

        # Dynamic World land-cover grids, one tree per year
        self.lc_trees = {}
        self.lc_probs = {}
        for y, fname in LC_FILES.items():
            cols = ['latitude', 'longitude'] + [f'DW_{n}_{y}' for n in LC_NAMES]
            g = pd.read_csv(f"{base_path}/{fname}", usecols=cols)
            self.lc_trees[y] = BallTree(_to_rad(g), metric='haversine')
            self.lc_probs[y] = g[[f'DW_{n}_{y}' for n in LC_NAMES]].values

    # ---------------- Sentinel-2 ----------------
    def get_sentinel_indices(self, lat, lon, year):
        pt = np.radians([[lat, lon]])
        dist, idx = self.s2_tree.query(pt, k=1)
        row = self.s2.iloc[idx[0][0]]

        # Use the closest available year (2026 -> 2024)
        available_years = [
            y for y in TRAIN_YEARS
            if f'NDVI_{y}' in row.index
            and f'NDWI_{y}' in row.index
            and f'NDBI_{y}' in row.index
        ]

        if not available_years:
            raise ValueError("No valid Sentinel-2 index years available")

        s2_year = min(available_years, key=lambda y: abs(y - int(year)))

        return {
            'NDVI': row[f'NDVI_{s2_year}'],
            'NDWI': row[f'NDWI_{s2_year}'],
            'NDBI': row[f'NDBI_{s2_year}'],
            's2_dist_m': dist[0][0] * EARTH_R
        }

    # ---------------- Gases ----------------
    def get_gas_values(self, lat, lon, year, live_values=None):
        """
        2022-2024: historical value (same as training).
        Any other year (e.g. 2026): the 3-year baseline of that grid cell is used,
        or a live reading if live_values={'CH4':..,'CO':..,'NO2':..,'SO2':..} is given.
        """
        pt = np.radians([[lat, lon]])
        year = int(year)
        is_training_year = year in TRAIN_YEARS
        out = {}

        for gas in ('CH4', 'CO', 'NO2', 'SO2'):
            dist, idx = self.gas_trees[gas].query(pt, k=1)
            cell = self.gas_grids[gas].iloc[idx[0][0]]
            cols = [f'{gas}_{y}' for y in TRAIN_YEARS]
            baseline = float(cell[cols].mean())

            has_live = bool(live_values) and gas in live_values

            if has_live:
                val = float(live_values[gas])
            elif is_training_year:
                val = float(cell[f'{gas}_{year}'])
            else:
                val = baseline

            if is_training_year and not has_live:
                mu, sd = self.gas_stats[gas][year]
            else:
                pooled = self.gas_grids[gas][cols].values.ravel()
                mu, sd = np.nanmean(pooled), np.nanstd(pooled)

            out[gas] = val
            out[f'{gas}_z'] = (val - mu) / sd if sd else 0.0
            out[f'{gas}_baseline'] = baseline

        return out

    # ---------------- Facility proximity ----------------
    def get_facility_features(self, lat, lon, year):
        cum_fac = self.facilities[self.facilities['year'] <= year]
        if len(cum_fac) == 0:
            return {'dist_to_facility_m': np.nan, 'facility_count_1km': 0, 'facility_count_5km': 0}
        tree = BallTree(_to_rad(cum_fac), metric='haversine')
        pt = np.radians([[lat, lon]])
        dist, idx = tree.query(pt, k=1)
        c1 = tree.query_radius(pt, r=1000 / EARTH_R, count_only=True)[0]
        c5 = tree.query_radius(pt, r=5000 / EARTH_R, count_only=True)[0]
        return {
            'dist_to_facility_m': dist[0][0] * EARTH_R,
            'facility_count_1km': int(c1),
            'facility_count_5km': int(c5)
        }

    # ---------------- Persistence ----------------
    def get_persistence(self, lat, lon, cluster_size_deg=0.01, persistent_threshold=6):
        clat = round(lat / cluster_size_deg) * cluster_size_deg
        clon = round(lon / cluster_size_deg) * cluster_size_deg
        hist_clat = (self.history['latitude'] / cluster_size_deg).round() * cluster_size_deg
        hist_clon = (self.history['longitude'] / cluster_size_deg).round() * cluster_size_deg
        count = int(((hist_clat == clat) & (hist_clon == clon)).sum())
        return {
            'persistence_count': count,
            'is_persistent': int(count >= persistent_threshold)
        }

    # ---------------- Land cover ----------------
        # ---------------- Land cover ----------------
    def get_land_cover(self, lat, lon, year):
        y = min(LC_FILES, key=lambda k: abs(k - int(year)))
        dist, idx = self.lc_trees[y].query(np.radians([[lat, lon]]), k=1)
        dist_m = float(dist[0][0] * EARTH_R)

        # Always use the nearest grid cell, even for points outside Odisha.
        # CatBoost cannot accept None in a categorical column.
        cls = int(np.argmax(self.lc_probs[y][idx[0][0]]))

        return {
            'land_cover_class': cls,
            'land_cover_label': LC_LABELS[cls],
            'lc_dist_m': dist_m,
            'outside_coverage': dist_m > LC_MAX_DIST_M,
        }

    # ---------------- Full feature row ----------------
        # ---------------- Full feature row ----------------
    def build_feature_row(self, lat, lon, year, bright_ti4, bright_ti5, frp,
                          confidence, daynight, scan, track, month, day_of_year,
                          land_cover_class=None, live_gas_values=None):
        if land_cover_class is None:
            land_cover_class = self.get_land_cover(lat, lon, year)['land_cover_class']

        # Safety net: categorical columns must never be None
        if land_cover_class is None:
            land_cover_class = 4  # Crops, the most common class
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