"""
Generate a synthetic Track B dataset for hackathon prototyping.

Simulates consented bank/UPI transaction behaviour for thin-file applicants
(first-time borrowers, students, gig workers). Features are correlated with
default risk via a transparent logistic rule so the trained model has signal.

NOT for production — real Track B would need consented data and observed outcomes.
"""

import os

import numpy as np
import pandas as pd

import config_track_b as cfg


def _sigmoid(x: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-x))


def generate_synthetic_dataset(n_rows: int = cfg.SYNTHETIC_N_ROWS,
                               random_state: int = cfg.RANDOM_STATE) -> pd.DataFrame:
    rng = np.random.default_rng(random_state)

    monthly_income = rng.lognormal(mean=10.6, sigma=0.45, size=n_rows).clip(12000, 180000)
    income_stability = rng.beta(5, 2, size=n_rows) * 0.6 + rng.uniform(0.2, 0.4, size=n_rows)
    income_stability = income_stability.clip(0.1, 1.0)

    monthly_expense = monthly_income * rng.uniform(0.45, 0.85, size=n_rows)
    emi_amount = monthly_income * rng.uniform(0.0, 0.35, size=n_rows)
    emi_to_income_ratio = emi_amount / monthly_income

    avg_monthly_balance = monthly_income * rng.uniform(0.1, 1.2, size=n_rows)
    min_monthly_balance = avg_monthly_balance * rng.uniform(0.05, 0.6, size=n_rows)

    bounce_rate_6m = rng.beta(1.5, 12, size=n_rows)
    savings_rate = ((monthly_income - monthly_expense - emi_amount) / monthly_income).clip(-0.2, 0.5)
    savings_trend = rng.normal(0, 0.35, size=n_rows).clip(-1, 1)
    transaction_volatility = rng.beta(2, 5, size=n_rows)
    cash_flow_surplus = monthly_income - monthly_expense - emi_amount
    salary_credit_frequency = rng.choice([0.5, 0.75, 1.0, 1.0, 1.0], size=n_rows)

    # Transparent risk rule — higher score => higher default probability.
    risk_score = (
        -0.9 * (monthly_income / 50000)
        - 1.4 * income_stability
        - 0.7 * (avg_monthly_balance / 40000)
        + 1.8 * emi_to_income_ratio
        + 3.5 * bounce_rate_6m
        - 1.2 * savings_rate
        - 0.8 * savings_trend
        + 1.5 * transaction_volatility
        - 0.6 * (cash_flow_surplus / 20000)
        - 0.9 * salary_credit_frequency
        + rng.normal(0, 0.35, size=n_rows)
    )
    default_prob = _sigmoid(risk_score + 0.2)
    target = rng.binomial(1, default_prob.clip(0.02, 0.65))

    df = pd.DataFrame({
        cfg.ID_COL: [f"B{i:06d}" for i in range(1, n_rows + 1)],
        "monthly_income": np.round(monthly_income, 2),
        "income_stability": np.round(income_stability, 4),
        "avg_monthly_balance": np.round(avg_monthly_balance, 2),
        "min_monthly_balance": np.round(min_monthly_balance, 2),
        "monthly_expense": np.round(monthly_expense, 2),
        "emi_amount": np.round(emi_amount, 2),
        "emi_to_income_ratio": np.round(emi_to_income_ratio, 4),
        "bounce_rate_6m": np.round(bounce_rate_6m, 4),
        "savings_rate": np.round(savings_rate, 4),
        "savings_trend": np.round(savings_trend, 4),
        "transaction_volatility": np.round(transaction_volatility, 4),
        "cash_flow_surplus": np.round(cash_flow_surplus, 2),
        "salary_credit_frequency": salary_credit_frequency,
        cfg.TARGET_COL: target,
    })
    return df


def write_synthetic_dataset(path: str = cfg.RAW_DATA_PATH,
                            n_rows: int = cfg.SYNTHETIC_N_ROWS) -> str:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    df = generate_synthetic_dataset(n_rows=n_rows)
    df.to_csv(path, index=False)
    default_rate = df[cfg.TARGET_COL].mean()
    print(f"Wrote {len(df):,} synthetic Track B rows to {path}")
    print(f"Default rate: {default_rate:.1%}")
    return path
