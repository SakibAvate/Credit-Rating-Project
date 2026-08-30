const API_URL = "http://127.0.0.1:8000";

/* ============================================================
   TRACK A
   ============================================================ */

export interface CreditAssessmentInput {
  EXT_SOURCE_1: number;
  EXT_SOURCE_2: number;
  EXT_SOURCE_3: number;
  AMT_CREDIT: number;
  AMT_INCOME_TOTAL: number;
  AMT_ANNUITY: number;
  credit_income_ratio: number;
  annuity_income_ratio: number;
  age_years: number;
  employment_years: number;

  NAME_EDUCATION_TYPE: string;
  NAME_INCOME_TYPE: string;
  NAME_FAMILY_STATUS: string;

  CNT_CHILDREN: number;
  bureau_count: number;
  active_count: number;
  closed_count: number;
  has_bureau_history: number;
  credit_history_years: number;
  credit_type_nunique: number;
  overdue_mean: number;
  overdue_max: number;
  overdue_loan_count: number;
  overdue_ratio: number;
  max_overdue_amt: number;
  credit_sum_overdue_sum: number;
  prolong_sum: number;
  debt_sum: number;
  debt_mean: number;
  credit_sum_total: number;
  credit_sum_mean: number;
  credit_utilization: number;
  bureau_annuity_sum: number;
  bureau_annuity_income_ratio: number;
  employment_years_missing: number;
}

export interface CreditAssessmentResult {
  pred_default_prob: number;
  creditworthiness_score: number;
  rating: string;
  decision: string;
  scored_by: string;
  top_reasons: string | null;
}

export async function predictTrackA(
  data: CreditAssessmentInput
): Promise<CreditAssessmentResult> {
  const response = await fetch(`${API_URL}/api/predict`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Credit assessment failed");
  }

  return response.json();
}


/* ============================================================
   TRACK B
   ============================================================ */

export interface TrackBAssessmentInput {
    applicant_id: string;
  monthly_income: number;
  income_stability: number;

  avg_monthly_balance: number;
  min_monthly_balance: number;

  monthly_expense: number;
  emi_amount: number;

  emi_to_income_ratio: number;
  bounce_rate_6m: number;

  savings_rate: number;
  savings_trend: number;

  transaction_volatility: number;
  cash_flow_surplus: number;

  salary_credit_frequency: number;
}

export async function predictTrackB(
  data: TrackBAssessmentInput
): Promise<CreditAssessmentResult> {
  const response = await fetch(`${API_URL}/api/track-b/predict`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let message = "Track B credit assessment failed";

    try {
      const errorData = await response.json();

      if (typeof errorData?.detail === "string") {
        message = errorData.detail;
      }
    } catch {
      // Keep the default error message.
    }

    throw new Error(message);
  }

  return response.json();
}