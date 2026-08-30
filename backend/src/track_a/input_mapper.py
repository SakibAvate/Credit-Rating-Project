"""
Convert the user-friendly Track A assessment form into the exact
feature structure expected by the trained Track A model.

The model was trained on 35 features. The frontend does not need
to expose every engineered feature directly.

Features that can be calculated from user input are calculated here.
Features for which the user has no information are represented as NaN.
XGBoost can handle missing numeric values.
"""

from __future__ import annotations

import math
from typing import Any


def _float(value: Any, default: float = float("nan")) -> float:
    """Safely convert a value to float."""
    if value is None or value == "":
        return default

    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _safe_ratio(
    numerator: float,
    denominator: float,
) -> float:
    """Calculate a ratio without division-by-zero errors."""
    if math.isnan(numerator) or math.isnan(denominator) or denominator == 0:
        return float("nan")

    return numerator / denominator


def build_track_a_payload(form: dict[str, Any]) -> dict[str, Any]:
    """
    Convert frontend form values into the 35 raw features expected
    by the Track A model.

    The frontend can send a smaller, human-friendly set of fields.
    """
    print("\n========== MAPPER DEBUG ==========")
    print("FORM RECEIVED BY MAPPER:")
    print(form)
    print("==================================\n")
    annual_income = _float(form.get("annualIncome"))
    requested_loan = _float(form.get("requestedLoan"))

    annuity = _float(form.get("annualAnnuity"))

    active_accounts = _float(form.get("activeCreditAccounts"))
    closed_accounts = _float(form.get("closedCreditAccounts"))

    outstanding_debt = _float(form.get("outstandingDebt"))

    overdue_amount = _float(form.get("overdueAmount"), 0.0)
    overdue_accounts = _float(form.get("overdueAccounts"), 0.0)

    total_credit_amount = _float(
        form.get("totalCreditAmount")
    )

    # ---------------------------------------------------------
    # Derived financial ratios
    # ---------------------------------------------------------

    credit_income_ratio = _safe_ratio(
        requested_loan,
        annual_income,
    )

    annuity_income_ratio = _safe_ratio(
        annuity,
        annual_income,
    )

    # ---------------------------------------------------------
    # Derived bureau values
    # ---------------------------------------------------------

    bureau_count = (
        active_accounts + closed_accounts
        if not math.isnan(active_accounts)
        and not math.isnan(closed_accounts)
        else float("nan")
    )

    has_bureau_history = (
        1
        if not math.isnan(bureau_count) and bureau_count > 0
        else 0
        if not math.isnan(bureau_count)
        else float("nan")
    )

    credit_utilization = _safe_ratio(
        outstanding_debt,
        total_credit_amount,
    )

    overdue_ratio = _safe_ratio(
        overdue_accounts,
        bureau_count,
    )

    # ---------------------------------------------------------
    # Build exact model input
    # ---------------------------------------------------------

    payload = {
        # External credit scores
        "EXT_SOURCE_1": _float(form.get("extSource1")),
        "EXT_SOURCE_2": _float(form.get("extSource2")),
        "EXT_SOURCE_3": _float(form.get("extSource3")),

        # Main financial variables
        "AMT_CREDIT": requested_loan,
        "AMT_INCOME_TOTAL": annual_income,
        "AMT_ANNUITY": annuity,

        # Derived financial ratios
        "credit_income_ratio": credit_income_ratio,
        "annuity_income_ratio": annuity_income_ratio,

        # Personal information
        "age_years": _float(form.get("ageYears")),
        "employment_years": _float(form.get("employmentYears")),

        "NAME_EDUCATION_TYPE": form.get(
            "education",
            "Higher education",
        ),

        "NAME_INCOME_TYPE": form.get(
            "incomeType",
            "Working",
        ),

        "NAME_FAMILY_STATUS": form.get(
            "familyStatus",
            "Married",
        ),

        "CNT_CHILDREN": _float(
            form.get("children"),
            0.0,
        ),

        # Bureau summary
        "bureau_count": bureau_count,
        "active_count": active_accounts,
        "closed_count": closed_accounts,
        "has_bureau_history": has_bureau_history,

        "credit_history_years": _float(
            form.get("creditHistoryYears")
        ),

        "credit_type_nunique": _float(
            form.get("creditTypeCount")
        ),

        # Overdue information
        "overdue_mean": overdue_amount,
        "overdue_max": overdue_amount,
        "overdue_loan_count": overdue_accounts,
        "overdue_ratio": overdue_ratio,
        "max_overdue_amt": overdue_amount,

        "credit_sum_overdue_sum": _float(
            form.get("totalOverdueAmount"),
            0.0,
        ),

        "prolong_sum": _float(
            form.get("prolongedLoans"),
            0.0,
        ),

        # Debt
        "debt_sum": outstanding_debt,

        "debt_mean": _safe_ratio(
            outstanding_debt,
            bureau_count,
        ),

        # Credit totals
        "credit_sum_total": total_credit_amount,

        "credit_sum_mean": _safe_ratio(
            total_credit_amount,
            bureau_count,
        ),

        "credit_utilization": credit_utilization,

        # Bureau annuity
        "bureau_annuity_sum": _float(
            form.get("bureauAnnuity"),
            0.0,
        ),

        "bureau_annuity_income_ratio": _safe_ratio(
            _float(form.get("bureauAnnuity"), 0.0),
            annual_income,
        ),

        # Missingness indicator
        "employment_years_missing": (
            1
            if form.get("employmentYears") in (None, "")
            else 0
        ),
    }

    return payload