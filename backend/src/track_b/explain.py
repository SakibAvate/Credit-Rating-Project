"""SHAP explanations for Track B."""
import numpy as np
import pandas as pd
import shap
from . import config
from ..customer_explanations import build_customer_explanation

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

def customer_explanations_for_row(
    row_shap,
    columns,
    row_values,
    n=config.TOP_N_REASONS,
) -> list[dict]:
    """
    Build structured, customer-friendly explanations
    for the most important SHAP features for one applicant.
    """

    order = np.argsort(-np.abs(row_shap))[:n]

    explanations = []

    for idx in order:
        feature = columns[idx]
        value = row_values[idx]
        impact = float(row_shap[idx])

        explanation = build_customer_explanation(
            track="TRACK_B",
            feature=feature,
            value=value,
            impact=impact,
        )

        explanations.append(explanation)

    return explanations
