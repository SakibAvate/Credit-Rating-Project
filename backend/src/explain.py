"""
SHAP explanations: global feature importance + per-applicant top reasons.
"""

import numpy as np
import pandas as pd
import shap

import config

from .customer_explanations import build_customer_explanation

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

def customer_explanations_for_row(
    row_shap,
    columns,
    row_values,
    n: int = config.TOP_N_REASONS,
) -> list[dict]:
    """
    Build customer-friendly explanations while avoiding repetitive
    explanations from the same feature family.

    The original SHAP ranking is NOT changed.
    The n parameter still controls the number of customer explanations.
    We simply look slightly further down the existing SHAP ranking when
    a repeated feature family would otherwise dominate the cards.
    """
    if n <= 0:
        return []

    order = np.argsort(-np.abs(row_shap))

    # Look beyond the first n SHAP features so that repeated
    # EXT_SOURCE features do not dominate the customer-facing view.
    candidate_count = min(len(order), max(n * 4, 10))

    explanations = []
    used_groups = set()

    def feature_group(feature: str) -> str:
        # EXT_SOURCE_1/2/3 all represent the same customer-facing
        # concept, so show only the strongest one by default.
        if feature in {
            "EXT_SOURCE_1",
            "EXT_SOURCE_2",
            "EXT_SOURCE_3",
        }:
            return "external_credit_information"

        # One-hot variants of the same category belong together.
        if feature.startswith("NAME_EDUCATION_TYPE_"):
            return "education"

        if feature.startswith("NAME_INCOME_TYPE_"):
            return "income_type"

        if feature.startswith("NAME_FAMILY_STATUS_"):
            return "family_status"

        return feature

    # First pass: select the strongest contribution from each
    # customer-facing feature group.
    for idx in order[:candidate_count]:
        feature = columns[idx]
        group = feature_group(feature)

        if group in used_groups:
            continue

        value = row_values[idx]
        impact = float(row_shap[idx])

        explanation = build_customer_explanation(
            track="TRACK_A",
            feature=feature,
            value=value,
            impact=impact,
        )

        explanations.append(explanation)
        used_groups.add(group)

        if len(explanations) >= n:
            break

    # Safety fallback: if there are not enough distinct groups,
    # fill the remaining slots using the original SHAP order.
    if len(explanations) < n:
        selected_features = {
            explanation["feature"]
            for explanation in explanations
        }

        for idx in order:
            feature = columns[idx]

            if feature in selected_features:
                continue

            value = row_values[idx]
            impact = float(row_shap[idx])

            explanation = build_customer_explanation(
                track="TRACK_A",
                feature=feature,
                value=value,
                impact=impact,
            )

            explanations.append(explanation)
            selected_features.add(feature)

            if len(explanations) >= n:
                break

    return explanations


def top_reasons_batch(shap_values: np.ndarray, X_sample: pd.DataFrame,
                       n: int = config.TOP_N_REASONS) -> list:
    columns = X_sample.columns.to_numpy()
    return [
        top_reasons_for_row(shap_values[i], columns, X_sample.iloc[i].to_numpy(), n)
        for i in range(len(X_sample))
    ]
