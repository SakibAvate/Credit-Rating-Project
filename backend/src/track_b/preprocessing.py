"""Preprocessing for Track B (numeric alternative-financial features)."""
import joblib
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from . import config


def build_preprocessor():
    return Pipeline([("imputer", SimpleImputer(strategy="median"))])


def fit_transform(X_train, X_test):
    pre = build_preprocessor()
    a = pre.fit_transform(X_train)
    b = pre.transform(X_test)
    cols = list(X_train.columns)
    return pd.DataFrame(a, columns=cols, index=X_train.index), pd.DataFrame(b, columns=cols, index=X_test.index), pre


def transform_new(preprocessor, X_new):
    X_new = X_new.reindex(columns=config.FEATURE_COLUMNS)
    return pd.DataFrame(preprocessor.transform(X_new), columns=config.FEATURE_COLUMNS, index=X_new.index)


def save_preprocessor(pre):
    joblib.dump(pre, config.PREPROCESSOR_PATH)


def load_preprocessor():
    return joblib.load(config.PREPROCESSOR_PATH)


def save_feature_columns(cols):
    joblib.dump(list(cols), config.FEATURE_COLUMNS_PATH)


def load_feature_columns():
    return joblib.load(config.FEATURE_COLUMNS_PATH)
