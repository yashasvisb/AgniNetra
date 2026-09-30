import os
import gdown

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
ML_TEST_DIR = os.path.join(BACKEND_DIR, "..", "ML_TEST")

# filename -> Google Drive file ID
BIG_FILES = {
    "LandCover_2022_500m.csv": "1Q8VsqoeOPrAA9r37RSyq2rasR9urhKJj",
    "LandCover_2023_500m.csv": "1UGSX6zQQiNbeQynFn5Mr5hIIMsENjDsu",
    "LandCover_2024_500m.csv": "1EvQHN-zRgJKfHi5cDZOSlV9iRV_dM1Ty",
    "Odisha_S2_Indices_AllYears_wide.csv": "1nx7AGaA-mZ_E0FCkJDj1XHlickMpECIT",
}


def ensure_ml_files():
    """Download any big ML file that is missing (skips files already on disk)."""
    os.makedirs(ML_TEST_DIR, exist_ok=True)

    for name, file_id in BIG_FILES.items():
        path = os.path.join(ML_TEST_DIR, name)

        if os.path.exists(path):
            continue

        print(f"Downloading {name} from Google Drive...")
        gdown.download(id=file_id, output=path, quiet=False)

        if not os.path.exists(path):
            raise RuntimeError(
                f"Could not download {name}. Check that the Drive file "
                f"is shared as 'Anyone with the link' and the ID is correct."
            )