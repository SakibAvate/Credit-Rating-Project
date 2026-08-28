"""
Load raw data and produce a single, leakage-safe train/test split.

The original two-script version split SK_ID_CURR separately from the
feature matrix (two independent train_test_split calls, relying on
identical random_state/shape to stay aligned). Splitting the RAW
dataframe once -- with SK_ID_CURR and TARGET still attached -- removes
that fragility: IDs, features and target can never drift out of sync.
"""

import pandas as pd
from sklearn.model_selection import train_test_split

import config


def load_raw_data(path: str = config.RAW_DATA_PATH) -> pd.DataFrame:
    return pd.read_csv(path)


def train_test_split_raw(df: pd.DataFrame,
                          test_size: float = config.TEST_SIZE,
                          random_state: int = config.RANDOM_STATE):
    """
    Split the RAW dataframe (before encoding) into train/test, stratified
    on TARGET. Returns train_df, test_df -- each still containing
    SK_ID_CURR and TARGET so nothing needs to be re-derived downstream.
    """
    train_df, test_df = train_test_split(
        df,
        test_size=test_size,
        random_state=random_state,
        stratify=df[config.TARGET_COL],
    )
    return train_df.reset_index(drop=True), test_df.reset_index(drop=True)
