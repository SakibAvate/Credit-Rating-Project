"""
SHAP explanations: global feature importance + per-applicant top reasons.
"""

import numpy as np
import pandas as pd
import shap

import config


def build_explainer(model):
    return shap.TreeExplainer(model)


def compute_shap_values(explainer, X: pd.DataFrame, sample_n: int = config.SHAP_SAMPLE_N):
    """Only score a sample -- SHAP on the full test set can be slow."""
    n = min(sample_n, len(X))
    X_sample = X.iloc[:n]
    shap_values = explainer.shap_values(X_sample)
    return X_sample, shap_values


def global_importance(shap_values: np.ndarray, columns) -> pd.Series:
    return (
        pd.Series(np.abs(shap_values).mean(axis=0), index=columns)
        .sort_values(ascending=False)
    )


def top_reasons_for_row(row_shap, columns, row_values, n: int = config.TOP_N_REASONS) -> str:
    order = np.argsort(-np.abs(row_shap))[:n]
    reasons = []
    for idx in order:
        feat = columns[idx]
        val = row_values[idx]
        contrib = row_shap[idx]
        direction = "increases risk" if contrib > 0 else "decreases risk"
        reasons.append(f"{feat}={val:.3g} ({direction}, impact={contrib:+.3f})")
    return "; ".join(reasons)


def top_reasons_batch(shap_values: np.ndarray, X_sample: pd.DataFrame,
                       n: int = config.TOP_N_REASONS) -> list:
    columns = X_sample.columns.to_numpy()
    return [
        top_reasons_for_row(shap_values[i], columns, X_sample.iloc[i].to_numpy(), n)
        for i in range(len(X_sample))
    ]
