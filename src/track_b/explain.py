"""SHAP explanations for Track B."""
import numpy as np
import pandas as pd
import shap
from . import config


def build_explainer(model):
    return shap.TreeExplainer(model)


def _as_array(values):
    if hasattr(values, "values"):
        values = values.values
    if isinstance(values, list):
        values = values[-1]
    return np.asarray(values)


def compute_shap_values(explainer, X, sample_n=config.SHAP_SAMPLE_N):
    xs = X.iloc[:min(sample_n, len(X))]
    return xs, _as_array(explainer.shap_values(xs))


def global_importance(values, columns):
    values = _as_array(values)
    return pd.Series(np.abs(values).mean(axis=0), index=columns).sort_values(ascending=False)


def top_reasons_batch(values, X, n=config.TOP_N_REASONS):
    values = _as_array(values)
    cols = X.columns.to_numpy()
    out = []
    for i in range(len(X)):
        order = np.argsort(-np.abs(values[i]))[:n]
        parts = []
        for j in order:
            direction = "increases risk" if values[i, j] > 0 else "decreases risk"
            parts.append(f"{cols[j]}={X.iloc[i, j]:.3g} ({direction}, impact={values[i, j]:+.3f})")
        out.append("; ".join(parts))
    return out
