"""
Categorical encoding for Track A.

    NAME_EDUCATION_TYPE   -> ordinal (has a natural ranking)
    NAME_INCOME_TYPE      -> one-hot (nominal, low cardinality)
    NAME_FAMILY_STATUS    -> one-hot (nominal, low cardinality)
    everything else       -> passthrough (already numeric)
"""

import pandas as pd
import joblib
from sklearn.preprocessing import OrdinalEncoder, OneHotEncoder
from sklearn.compose import ColumnTransformer

import config


def get_numeric_cols(columns) -> list:
    return [c for c in columns if c not in config.ORDINAL_COLS + config.ONEHOT_COLS]


def build_preprocessor(numeric_cols: list) -> ColumnTransformer:
    return ColumnTransformer(
        transformers=[
            ("ordinal", OrdinalEncoder(categories=[config.EDUCATION_ORDER],
                                        handle_unknown="use_encoded_value",
                                        unknown_value=-1),
             config.ORDINAL_COLS),
            ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False),
             config.ONEHOT_COLS),
            ("numeric", "passthrough", numeric_cols),
        ]
    )


def _feature_names(preprocessor: ColumnTransformer, numeric_cols: list) -> list:
    return (
        config.ORDINAL_COLS
        + list(preprocessor.named_transformers_["onehot"]
               .get_feature_names_out(config.ONEHOT_COLS))
        + numeric_cols
    )


def fit_transform(X_train: pd.DataFrame, X_test: pd.DataFrame):
    """
    Fit the encoder on X_train ONLY (no leakage) and transform both sets.
    Returns encoded train/test DataFrames with readable column names, plus
    the fitted preprocessor (save it -- you need it again at inference time).
    """
    numeric_cols = get_numeric_cols(X_train.columns)
    preprocessor = build_preprocessor(numeric_cols)

    X_train_enc = preprocessor.fit_transform(X_train)
    X_test_enc = preprocessor.transform(X_test)

    feature_names = _feature_names(preprocessor, numeric_cols)
    X_train_df = pd.DataFrame(X_train_enc, columns=feature_names, index=X_train.index)
    X_test_df = pd.DataFrame(X_test_enc, columns=feature_names, index=X_test.index)
    return X_train_df, X_test_df, preprocessor


def transform_new(preprocessor: ColumnTransformer, X_new: pd.DataFrame) -> pd.DataFrame:
    """Transform new/inference-time data with an already-fitted preprocessor."""
    numeric_cols = get_numeric_cols(X_new.columns)
    X_enc = preprocessor.transform(X_new)
    feature_names = _feature_names(preprocessor, numeric_cols)
    return pd.DataFrame(X_enc, columns=feature_names, index=X_new.index)


def save_preprocessor(preprocessor, path: str = config.PREPROCESSOR_PATH) -> None:
    joblib.dump(preprocessor, path)


def load_preprocessor(path: str = config.PREPROCESSOR_PATH):
    return joblib.load(path)


def save_feature_columns(columns, path: str = config.FEATURE_COLUMNS_PATH) -> None:
    """Persist the raw (pre-encoding) column names the model expects as input."""
    joblib.dump(list(columns), path)


def load_feature_columns(path: str = config.FEATURE_COLUMNS_PATH) -> list:
    return joblib.load(path)


def get_field_options(preprocessor: ColumnTransformer) -> dict:
    """
    Valid category values for the ordinal/one-hot columns, read straight off
    the fitted preprocessor. Used by the API's /model/info endpoint so the
    frontend can render dropdowns instead of free-text inputs.
    """
    onehot_encoder = preprocessor.named_transformers_["onehot"]
    options = {config.ORDINAL_COLS[0]: list(config.EDUCATION_ORDER)}
    for col, categories in zip(config.ONEHOT_COLS, onehot_encoder.categories_):
        options[col] = list(categories)
    return options
