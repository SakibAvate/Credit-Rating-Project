import pandas as pd
from sklearn.model_selection import train_test_split
from . import config


def load_raw_data(path=config.DATA_PATH):
    df = pd.read_csv(path)
    required = [config.ID_COL, config.TARGET_COL] + config.FEATURE_COLUMNS
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Track B dataset is missing columns: {missing}")
    if df[config.TARGET_COL].isna().any():
        raise ValueError("Track B target contains missing values")
    return df[required].copy()


def train_test_split_raw(df, test_size=config.TEST_SIZE, random_state=config.RANDOM_STATE):
    tr, te = train_test_split(df, test_size=test_size, random_state=random_state, stratify=df[config.TARGET_COL])
    return tr.reset_index(drop=True), te.reset_index(drop=True)
