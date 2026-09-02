"""
Customer-friendly explanations for SHAP model outputs.

This module translates technical model features into plain-language
explanations suitable for RiskLens customers.

The underlying SHAP values and model predictions are NOT changed.
"""

from __future__ import annotations

from typing import Any


# ============================================================
# TRACK B FEATURE DEFINITIONS
# ============================================================

TRACK_B_FEATURES = {
    "monthly_income": {
        "title": "Your monthly income",
        "label": "Your monthly income",
        "details": (
            "This is the amount of money you normally receive each month. "
            "A steady income can make it easier to keep up with loan payments."
        ),
    },
    "income_stability": {
        "title": "How steady your income is",
        "label": "Income consistency",
        "details": (
            "This looks at how consistent your income is from month to month. "
            "More consistent income generally makes future payments easier to plan."
        ),
    },
    "avg_monthly_balance": {
        "title": "Money normally kept in your account",
        "label": "Typical account balance",
        "details": (
            "This is the average amount of money usually kept in your account. "
            "A healthier balance can provide more room for regular payments."
        ),
    },
    "min_monthly_balance": {
        "title": "Your lowest account balance",
        "label": "Lowest account balance",
        "details": (
            "This shows how low your account balance usually gets. "
            "Keeping some money available can make it easier to handle upcoming payments."
        ),
    },
    "monthly_expense": {
        "title": "Your monthly spending",
        "label": "Monthly spending",
        "details": (
            "This is the money you normally spend each month. "
            "We compare spending with income to understand how much money may be available for repayments."
        ),
    },
    "emi_amount": {
        "title": "Your existing monthly loan payments",
        "label": "Existing loan payments",
        "details": (
            "This is the amount you already pay toward loans or EMIs each month. "
            "Higher existing payments can leave less income available for a new loan."
        ),
    },
    "emi_to_income_ratio": {
        "title": "How much of your income goes to loan payments",
        "label": "Loan payment share of income",
        "details": (
            "This compares your existing loan payments with your income. "
            "A smaller share generally means more of your income is available for other needs."
        ),
    },
    "bounce_rate_6m": {
        "title": "Your payment history",
        "label": "Payment reliability",
        "details": (
            "We look at how often scheduled payments were returned or bounced "
            "during the last 6 months. Fewer payment bounces generally indicate more reliable payment activity."
        ),
    },
    "savings_rate": {
        "title": "How much money you are able to save",
        "label": "Savings level",
        "details": (
            "This shows how much of your incoming money remains after regular spending. "
            "Being able to keep some money aside can provide a financial cushion."
        ),
    },
    "savings_trend": {
        "title": "Whether your savings are improving",
        "label": "Savings trend",
        "details": (
            "This looks at whether the amount you are able to save has generally "
            "been increasing or decreasing over time."
        ),
    },
    "transaction_volatility": {
        "title": "How steady your account activity is",
        "label": "Account activity stability",
        "details": (
            "This looks at how much your account activity changes over time. "
            "More predictable activity can make your financial behaviour easier to assess."
        ),
    },
    "cash_flow_surplus": {
        "title": "Money left after your regular expenses",
        "label": "Money left after expenses",
        "details": (
            "This is the money remaining after regular expenses and other outgoing payments. "
            "A positive amount means more money is coming in than going out."
        ),
    },
    "salary_credit_frequency": {
        "title": "How regularly your salary comes in",
        "label": "Salary deposit regularity",
        "details": (
            "Regular salary deposits can show that you have a consistent source of income "
            "coming into your account."
        ),
    },
}


# ============================================================
# TRACK A FEATURE DEFINITIONS
# ============================================================

TRACK_A_FEATURES = {
    "NAME_EDUCATION_TYPE": {
        "title": "Your education background",
        "label": "Education background",
        "details": (
            "Your education background is considered as one part of your application. "
            "It is assessed together with your income, credit history and other financial information."
        ),
    },
    "NAME_INCOME_TYPE": {
        "title": "Your source of income",
        "label": "Income source",
        "details": (
            "Your source of income helps describe how you earn your income. "
            "It is considered together with your income level and other application information."
        ),
    },
    "NAME_FAMILY_STATUS": {
        "title": "Your household situation",
        "label": "Household situation",
        "details": (
            "Your household situation is considered as part of the overall application. "
            "It is assessed together with your financial and credit information."
        ),
    },
    "EXT_SOURCE_1": {
        "title": "Your credit profile information",
        "label": "Credit profile information",
        "details": (
            "This is credit-related information provided by an external source. "
            "It gives the assessment another view of your credit profile."
        ),
    },
    "EXT_SOURCE_2": {
        "title": "Your credit profile information",
        "label": "Credit profile information",
        "details": (
            "This is credit-related information provided by an external source. "
            "It gives the assessment another view of your credit profile."
        ),
    },
    "EXT_SOURCE_3": {
        "title": "Your credit profile information",
        "label": "Credit profile information",
        "details": (
            "This is credit-related information provided by an external source. "
            "It gives the assessment another view of your credit profile."
        ),
    },
    "AMT_CREDIT": {
        "title": "How much you want to borrow",
        "label": "Requested loan amount",
        "details": (
            "This is the amount of credit you are asking for. "
            "The requested amount is considered together with your income and other financial information."
        ),
    },
    "AMT_INCOME_TOTAL": {
        "title": "Your income",
        "label": "Income",
        "details": (
            "This is the income reported in your application. "
            "Income helps us understand how comfortably you may be able to manage repayments."
        ),
    },
    "AMT_ANNUITY": {
        "title": "Your expected loan payment",
        "label": "Expected loan payment",
        "details": (
            "This is the expected regular payment for the loan. "
            "It helps show how manageable the payment may be compared with your income."
        ),
    },
    "credit_income_ratio": {
        "title": "How much you want to borrow compared with your income",
        "label": "Loan-to-income level",
        "details": (
            "This compares the amount you want to borrow with your income. "
            "A smaller loan relative to income generally means the requested borrowing is easier to manage."
        ),
    },
    "annuity_income_ratio": {
        "title": "How much of your income goes to loan payments",
        "label": "Payment-to-income level",
        "details": (
            "This compares the expected loan payment with your income. "
            "A smaller share generally means more of your income remains available for other needs."
        ),
    },
    "age_years": {
        "title": "Your age",
        "label": "Age",
        "details": (
            "Age is one of the basic details considered in the assessment. "
            "It is considered together with the other information in your application."
        ),
    },
    "employment_years": {
        "title": "How long you have been working",
        "label": "Employment history",
        "details": (
            "This represents how long you have been employed. "
            "A longer and stable work history can provide more information about income stability."
        ),
    },
    "CNT_CHILDREN": {
        "title": "Your number of children",
        "label": "Number of children",
        "details": (
            "This is the number of children recorded in your application. "
            "It is considered as one part of the overall picture of your financial situation."
        ),
    },
    "bureau_count": {
        "title": "How much credit history is available",
        "label": "Credit history records",
        "details": (
            "This represents how many credit records are available in your credit history. "
            "More history can give the assessment more information about past borrowing."
        ),
    },
    "active_count": {
        "title": "Your current credit accounts",
        "label": "Active credit accounts",
        "details": (
            "This is the number of credit accounts that are currently active. "
            "It helps show how much credit you currently have."
        ),
    },
    "closed_count": {
        "title": "Credit accounts you have completed",
        "label": "Closed credit accounts",
        "details": (
            "This is the number of credit accounts you have already closed. "
            "It provides information about your previous borrowing history."
        ),
    },
    "has_bureau_history": {
        "title": "Your available credit history",
        "label": "Credit history availability",
        "details": (
            "This indicates whether credit-history information was available for your application."
        ),
    },
    "credit_history_years": {
        "title": "How long you have had credit history",
        "label": "Length of credit history",
        "details": (
            "This represents the length of the available credit history. "
            "A longer history can provide more information about past borrowing and payments."
        ),
    },
    "credit_type_nunique": {
        "title": "Different types of credit you have used",
        "label": "Types of credit",
        "details": (
            "This represents the different types of credit products shown in your available history."
        ),
    },
    "overdue_mean": {
        "title": "Your typical overdue amount",
        "label": "Average overdue amount",
        "details": (
            "This represents the average amount that was overdue in the available credit history. "
            "Lower overdue amounts generally indicate fewer repayment concerns."
        ),
    },
    "overdue_max": {
        "title": "Your highest overdue amount",
        "label": "Highest overdue amount",
        "details": (
            "This represents the largest overdue amount found in the available credit history."
        ),
    },
    "overdue_loan_count": {
        "title": "Loans with overdue payments",
        "label": "Overdue loans",
        "details": (
            "This is the number of loans with overdue payments in the available credit history. "
            "Fewer overdue loans generally indicate more reliable repayment activity."
        ),
    },
    "overdue_ratio": {
        "title": "How often your payments were overdue",
        "label": "Overdue payment level",
        "details": (
            "This compares overdue activity with your overall credit activity. "
            "A lower level generally indicates fewer overdue payments."
        ),
    },
    "max_overdue_amt": {
        "title": "Your largest overdue amount",
        "label": "Largest overdue amount",
        "details": (
            "This represents the largest overdue amount recorded in the available credit history."
        ),
    },
    "credit_sum_overdue_sum": {
        "title": "Your total overdue amount",
        "label": "Total overdue amount",
        "details": (
            "This represents the total amount associated with overdue credit activity in the available history."
        ),
    },
    "prolong_sum": {
        "title": "Loan extensions in your history",
        "label": "Loan extensions",
        "details": (
            "This reflects loan extensions recorded in the available credit history. "
            "It gives additional information about previous borrowing behaviour."
        ),
    },
    "debt_sum": {
        "title": "Your outstanding debt",
        "label": "Outstanding debt",
        "details": (
            "This represents the total amount of debt that is still outstanding in the available credit history. "
            "It helps show your existing repayment commitments."
        ),
    },
    "debt_mean": {
        "title": "Your average outstanding debt",
        "label": "Average outstanding debt",
        "details": (
            "This represents the average outstanding debt across the available credit records."
        ),
    },
    "credit_sum_total": {
        "title": "Your total credit amount",
        "label": "Total credit amount",
        "details": (
            "This represents the total amount of credit shown in the available credit history."
        ),
    },
    "credit_sum_mean": {
        "title": "Your average credit amount",
        "label": "Average credit amount",
        "details": (
            "This represents the average credit amount across the available credit records."
        ),
    },
    "credit_utilization": {
        "title": "How much of your available credit you are using",
        "label": "Credit usage",
        "details": (
            "This compares your outstanding debt with the total credit available to you. "
            "Using a smaller share of available credit generally indicates less reliance on existing credit."
        ),
    },
    "bureau_annuity_sum": {
        "title": "Your existing loan payments",
        "label": "Existing loan payments",
        "details": (
            "This represents the regular payment obligations shown in your available credit history. "
            "It helps show how much you may already be committed to repayments."
        ),
    },
    "bureau_annuity_income_ratio": {
        "title": "How much of your income goes to existing loan payments",
        "label": "Existing payment burden",
        "details": (
            "This compares your existing payment obligations with your income. "
            "A smaller share generally means more income remains available for other needs."
        ),
    },
    "employment_years_missing": {
        "title": "Your employment information",
        "label": "Employment information",
        "details": (
            "This indicates whether employment-history information was available for your application."
        ),
    },
}


# ============================================================
# HELPERS
# ============================================================

def _feature_definition(track: str, feature: str) -> dict[str, str]:
    """Return the customer-facing definition for a model feature."""

    definitions = (
        TRACK_B_FEATURES
        if track.upper() == "TRACK_B"
        else TRACK_A_FEATURES
    )

    if feature in definitions:
        return definitions[feature]

    # Handle one-hot categorical Track A columns.
    if feature.startswith("NAME_EDUCATION_TYPE_"):
        value = feature.replace(
            "NAME_EDUCATION_TYPE_", ""
        ).replace("_", " ")

        return {
            "title": "Your education",
            "label": "Education",
            "details": (
                f"Your application records your education category as "
                f"{value.lower()}. This is considered together with the other "
                "information in your application."
            ),
        }

    if feature.startswith("NAME_INCOME_TYPE_"):
        value = feature.replace(
            "NAME_INCOME_TYPE_", ""
        ).replace("_", " ")

        return {
            "title": "Your income source",
            "label": "Income source",
            "details": (
                f"Your application records your income category as "
                f"{value.lower()}. This helps describe the source of your income."
            ),
        }

    if feature.startswith("NAME_FAMILY_STATUS_"):
        value = feature.replace(
            "NAME_FAMILY_STATUS_", ""
        ).replace("_", " ")

        return {
            "title": "Your household situation",
            "label": "Household situation",
            "details": (
                f"Your application records your family status as "
                f"{value.lower()}. This is considered as part of the overall application."
            ),
        }

    # Safe fallback for future model features.
    readable = feature.replace("_", " ").strip().capitalize()

    return {
        "title": readable,
        "label": readable,
        "details": (
            "This information was considered as one part of your overall "
            "credit assessment."
        ),
    }


def format_feature_value(
    feature: str,
    value: Any,
) -> str:
    """Convert a model value into a readable display value."""

    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return str(value)

    percentage_features = {
        "bounce_rate_6m",
        "savings_rate",
        "savings_trend",
        "emi_to_income_ratio",
        "salary_credit_frequency",
        "credit_utilization",
        "overdue_ratio",
        "annuity_income_ratio",
        "bureau_annuity_income_ratio",
        "credit_income_ratio",
    }

    if feature in percentage_features:
        return f"{numeric * 100:.1f}%"

    if feature in {
        "monthly_income",
        "avg_monthly_balance",
        "min_monthly_balance",
        "monthly_expense",
        "emi_amount",
        "cash_flow_surplus",
        "AMT_CREDIT",
        "AMT_INCOME_TOTAL",
        "AMT_ANNUITY",
        "debt_sum",
        "debt_mean",
        "credit_sum_total",
        "credit_sum_mean",
        "bureau_annuity_sum",
        "overdue_mean",
        "overdue_max",
        "max_overdue_amt",
        "credit_sum_overdue_sum",
    }:
        return f"{numeric:,.2f}"

    if numeric.is_integer():
        return str(int(numeric))

    return f"{numeric:.3g}"


def _impact_strength(impact: float) -> str:
    """Turn a SHAP magnitude into a simple customer-facing label."""

    magnitude = abs(float(impact))

    if magnitude >= 1.0:
        return "Strong influence"
    if magnitude >= 0.5:
        return "Moderate influence"
    return "Some influence"


def build_customer_explanation(
    *,
    track: str,
    feature: str,
    value: Any,
    impact: float,
) -> dict[str, Any]:
    """
    Build one customer-facing explanation.

    The model prediction and raw SHAP impact are never changed.
    Only the wording shown to the customer is made easier to understand.
    """

    definition = _feature_definition(track, feature)
    increases_risk = impact > 0

    if increases_risk:
        direction = "increases_risk"
        effect = "May increase your risk"
        summary = (
            f"This part of your application is working against you "
            f"in this assessment. It is pushing the estimated risk higher."
        )
        customer_action = (
            "This does not mean you will be unable to repay. "
            "It simply means this factor had a negative effect on this assessment."
        )
    else:
        direction = "decreases_risk"
        effect = "Helps your application"
        summary = (
            f"This part of your application is working in your favour "
            f"and is helping lower the estimated risk."
        )
        customer_action = (
            "This factor had a positive effect on your assessment."
        )

    return {
        "feature": feature,
        "title": definition["title"],
        "summary": summary,
        "details": definition["details"],
        "customer_action": customer_action,
        "value": format_feature_value(feature, value),
        "raw_value": value,
        "impact": float(impact),
        "direction": direction,
        "effect": effect,
        "impact_strength": _impact_strength(impact),
    }
