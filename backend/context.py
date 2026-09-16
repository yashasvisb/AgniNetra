import pandas as pd
import numpy as np
from scipy.spatial import cKDTree
from pyproj import Transformer


# ---------------------------------------------------------
# Load Odisha contextual grid
# ---------------------------------------------------------

GRID_PATH = "/Users/ysb/Downloads/Odisha_Wide_Contextual_Risk_Grid_with_NDVI_NDWI_NDBI.csv"

print("Loading Odisha contextual grid...")
grid = pd.read_csv(GRID_PATH)

print(f"Context grid loaded: {len(grid):,} locations")


# ---------------------------------------------------------
# Coordinate conversion
# Training data uses EPSG:32644
# ---------------------------------------------------------

transformer = Transformer.from_crs(
    "EPSG:4326",
    "EPSG:32644",
    always_xy=True
)

grid_x, grid_y = transformer.transform(
    grid["longitude"].values,
    grid["latitude"].values
)

grid_tree = cKDTree(
    np.column_stack([grid_x, grid_y])
)


# ---------------------------------------------------------
# Find nearest contextual location
# ---------------------------------------------------------

def get_context(latitude, longitude):

    x, y = transformer.transform(
        longitude,
        latitude
    )

    distance, index = grid_tree.query(
        [x, y],
        k=1
    )

    row = grid.iloc[index]

    return row, float(distance)


def get_gis_layer(layer_name, max_points=2500):
    """
    Return a lightweight sampled GIS layer from the
    Odisha-wide contextual grid.

    The full grid contains 668k+ locations, so only a
    representative sample is returned to the frontend.
    """

    layer_columns = {
        "ndvi": "NDVI",
        "ndwi": "NDWI",
        "ndbi": "NDBI",
        "no2": "NO2_anomaly",
        "so2": "SO2_anomaly",
        "co": "CO_anomaly",
        "ch4": "CH4_anomaly",
        "persistence": "historical_fire_count",
        "landcover": "DW_dominant_2024",
    }

    if layer_name not in layer_columns:
        raise ValueError(
            f"Unknown GIS layer: {layer_name}"
        )

    value_column = layer_columns[layer_name]

    required_columns = [
        "latitude",
        "longitude",
        value_column,
    ]

    layer_data = grid[
        required_columns
    ].dropna(
        subset=[
            "latitude",
            "longitude",
            value_column,
        ]
    )

    # Deterministic sampling so the displayed
    # layer does not randomly change every request.
    if len(layer_data) > max_points:
        layer_data = layer_data.sample(
            n=max_points,
            random_state=42
        )

    return [
        {
            "latitude": float(row["latitude"]),
            "longitude": float(row["longitude"]),
            "value": float(row[value_column]),
        }
        for _, row in layer_data.iterrows()
    ]