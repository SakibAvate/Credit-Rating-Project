"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Wallet,
  User,
  TrendingUp,
  Landmark,
  Activity,
  CircleDollarSign,
  CreditCard,
  PiggyBank,
  AlertTriangle,
} from "lucide-react";

import Sidebar from "@/components/Sidebar";
import {
  predictTrackB,
  TrackBAssessmentInput,
  CreditAssessmentResult,
} from "@/lib/api";


export default function AlternativeAssessment() {
  const [formData, setFormData] = useState({
    applicantId: "",

    monthlyIncome: "",
    incomeStability: "",

    avgMonthlyBalance: "",
    minMonthlyBalance: "",

    monthlyExpense: "",
    emiAmount: "",

    bounceRate6m: 0,

    savingsTrend: "",

    transactionVolatility: 30,

    salaryCreditFrequency: "",
  });

  const [result, setResult] =
    useState<CreditAssessmentResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  /* ============================================================
     CALCULATED VALUES
     ============================================================ */

  const calculated = useMemo(() => {
    const income = Number(formData.monthlyIncome) || 0;
    const expense = Number(formData.monthlyExpense) || 0;
    const emi = Number(formData.emiAmount) || 0;

    const emiRatio =
      income > 0
        ? emi / income
        : 0;

    const cashFlowSurplus =
      income - expense - emi;

    /*
     * Track B training data clipped savings_rate
     * to approximately -0.20 to 0.50.
     */
    const rawSavingsRate =
      income > 0
        ? cashFlowSurplus / income
        : 0;

    const savingsRate = Math.max(
      -0.2,
      Math.min(0.5, rawSavingsRate)
    );

    return {
      emiRatio,
      cashFlowSurplus,
      savingsRate,
    };
  }, [
    formData.monthlyIncome,
    formData.monthlyExpense,
    formData.emiAmount,
  ]);


  /* ============================================================
     FORM SUBMISSION
     ============================================================ */

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError("");
    setResult(null);

    const income = Number(formData.monthlyIncome);
    const expense = Number(formData.monthlyExpense);
    const emi = Number(formData.emiAmount);
    const avgBalance = Number(formData.avgMonthlyBalance);
    const minBalance = Number(formData.minMonthlyBalance);

    if (!formData.applicantId.trim()) {
      setError("Please enter an Applicant ID.");
      return;
    }

    if (!formData.incomeStability) {
      setError("Please select income stability.");
      return;
    }

    if (!formData.savingsTrend) {
      setError("Please select a savings trend.");
      return;
    }

    if (!formData.salaryCreditFrequency) {
      setError("Please select salary credit frequency.");
      return;
    }

    if (income <= 0) {
      setError("Monthly income must be greater than zero.");
      return;
    }

    if (expense < 0 || emi < 0) {
      setError("Expense and EMI cannot be negative.");
      return;
    }

    if (emi > income) {
      setError(
        "EMI amount cannot be greater than monthly income."
      );
      return;
    }

    if (avgBalance < 0 || minBalance < 0) {
      setError(
        "Account balances cannot be negative."
      );
      return;
    }

    if (minBalance > avgBalance) {
      setError(
        "Minimum monthly balance cannot be greater than average monthly balance."
      );
      return;
    }

    const incomeStabilityMap: Record<string, number> = {
      Low: 0.30,
      Medium: 0.60,
      High: 0.85,
    };

    const savingsTrendMap: Record<string, number> = {
      Declining: -0.50,
      Stable: 0,
      Growing: 0.50,
    };

    const salaryFrequencyMap: Record<string, number> = {
      Rare: 0.50,
      Occasional: 0.75,
      Regular: 1.00,
    };

    const payload: TrackBAssessmentInput = {
      applicant_id: formData.applicantId.trim(),
      monthly_income: income,

      income_stability:
        incomeStabilityMap[
          formData.incomeStability
        ],

      avg_monthly_balance: avgBalance,

      min_monthly_balance: minBalance,

      monthly_expense: expense,

      emi_amount: emi,

      emi_to_income_ratio:
        calculated.emiRatio,

      bounce_rate_6m:
        formData.bounceRate6m / 100,

      savings_rate:
        calculated.savingsRate,

      savings_trend:
        savingsTrendMap[
          formData.savingsTrend
        ],

      transaction_volatility:
        formData.transactionVolatility / 100,

      cash_flow_surplus:
        calculated.cashFlowSurplus,

      salary_credit_frequency:
        salaryFrequencyMap[
          formData.salaryCreditFrequency
        ],
    };

    try {
      setLoading(true);

      const response =
        await predictTrackB(payload);

      setResult(response);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to complete the assessment."
      );
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="min-w-0 flex-1 p-8">
        <div className="mx-auto max-w-5xl">

          {/* ==================================================
              BACK
              ================================================== */}

          <Link
            href="/single-assessment"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft size={18} />
            Back to applicant type
          </Link>


          {/* ==================================================
              HEADER
              ================================================== */}

          <div className="mt-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Wallet size={28} />
            </div>

            <p className="mt-6 text-sm font-semibold text-blue-600">
              TRACK B · ALTERNATIVE DATA
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Alternative Data Assessment
            </h1>

            <p className="mt-3 max-w-3xl text-slate-500">
              Assess applicants without traditional credit bureau
              history using income stability, banking behaviour,
              savings patterns and repayment indicators.
            </p>
          </div>


          {/* ==================================================
              FORM
              ================================================== */}

          <form
            onSubmit={handleSubmit}
            className="mt-10 space-y-6"
          >

            {/* ==================================================
                APPLICANT INFORMATION
                ================================================== */}

            <FormSection
              icon={<User size={20} />}
              title="Applicant Information"
              description="Basic identification for this assessment."
            >
              <InputField
                label="Applicant ID"
                name="applicantId"
                placeholder="Example: B-1001"
                value={formData.applicantId}
                onChange={(value) =>
                  setFormData({
                    ...formData,
                    applicantId: value,
                  })
                }
                required
              />
            </FormSection>


            {/* ==================================================
                INCOME PROFILE
                ================================================== */}

            <FormSection
              icon={<CircleDollarSign size={20} />}
              title="Income & Financial Profile"
              description="Basic monthly financial information used to assess affordability and cash flow."
            >

              <div className="grid gap-8 md:grid-cols-2">

                <InputField
                  label="Monthly Income"
                  name="monthlyIncome"
                  type="number"
                  min="1"
                  placeholder="Example: 50000"
                  value={formData.monthlyIncome}
                  onChange={(value) =>
                    setFormData({
                      ...formData,
                      monthlyIncome: value,
                    })
                  }
                  required
                />


                <div>
                  <label className="mb-3 block text-sm font-medium text-slate-700">
                    Income Stability
                  </label>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      {
                        value: "Low",
                        description: "Income varies frequently",
                      },
                      {
                        value: "Medium",
                        description: "Income is moderately stable",
                      },
                      {
                        value: "High",
                        description: "Income is highly consistent",
                      },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            incomeStability:
                              option.value,
                          })
                        }
                        className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${
                          formData.incomeStability ===
                          option.value
                            ? "border-blue-600 bg-blue-50 text-blue-700"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {option.value}
                      </button>
                    ))}
                  </div>
                </div>


                <InputField
                  label="Monthly Expense"
                  name="monthlyExpense"
                  type="number"
                  min="0"
                  placeholder="Example: 30000"
                  value={formData.monthlyExpense}
                  onChange={(value) =>
                    setFormData({
                      ...formData,
                      monthlyExpense: value,
                    })
                  }
                  required
                />


                <InputField
                  label="Monthly EMI"
                  name="emiAmount"
                  type="number"
                  min="0"
                  placeholder="Example: 8000"
                  value={formData.emiAmount}
                  onChange={(value) =>
                    setFormData({
                      ...formData,
                      emiAmount: value,
                    })
                  }
                  required
                />


                <InputField
                  label="Average Monthly Balance"
                  name="avgMonthlyBalance"
                  type="number"
                  min="0"
                  placeholder="Example: 40000"
                  value={formData.avgMonthlyBalance}
                  onChange={(value) =>
                    setFormData({
                      ...formData,
                      avgMonthlyBalance: value,
                    })
                  }
                  required
                />


                <InputField
                  label="Minimum Monthly Balance"
                  name="minMonthlyBalance"
                  type="number"
                  min="0"
                  placeholder="Example: 15000"
                  value={formData.minMonthlyBalance}
                  onChange={(value) =>
                    setFormData({
                      ...formData,
                      minMonthlyBalance: value,
                    })
                  }
                  required
                />

              </div>


              {/* Calculated values */}

              <div className="mt-6 grid gap-4 md:grid-cols-3">

                <CalculatedField
                  label="EMI-to-Income Ratio"
                  value={`${(
                    calculated.emiRatio * 100
                  ).toFixed(1)}%`}
                />

                <CalculatedField
                  label="Cash Flow Surplus"
                  value={`₹${calculated.cashFlowSurplus.toLocaleString(
                    "en-IN"
                  )}`}
                />

                <CalculatedField
                  label="Savings Rate"
                  value={`${(
                    calculated.savingsRate * 100
                  ).toFixed(1)}%`}
                />

              </div>

            </FormSection>


            {/* ==================================================
                PAYMENT BEHAVIOUR
                ================================================== */}

            <FormSection
              icon={<CreditCard size={20} />}
              title="Payment Behaviour"
              description="Indicators describing repayment reliability and regularity of incoming salary credits."
            >

              <div className="space-y-8">

                <SliderField
                  label="Bounce Rate — Last 6 Months"
                  value={formData.bounceRate6m}
                  suffix="%"
                  min={0}
                  max={100}
                  onChange={(value) =>
                    setFormData({
                      ...formData,
                      bounceRate6m: value,
                    })
                  }
                />


                <div>
                  <label className="mb-3 block text-sm font-medium text-slate-700">
                    Salary Credit Frequency
                  </label>

                  <div className="grid gap-3 md:grid-cols-3">

                    {[
                      {
                        value: "Rare",
                        description:
                          "Salary credits are inconsistent",
                      },
                      {
                        value: "Occasional",
                        description:
                          "Salary credits occur periodically",
                      },
                      {
                        value: "Regular",
                        description:
                          "Salary is credited consistently",
                      },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            salaryCreditFrequency:
                              option.value,
                          })
                        }
                        className={`rounded-xl border p-4 text-left transition ${
                          formData.salaryCreditFrequency ===
                          option.value
                            ? "border-blue-600 bg-blue-50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <h3 className="font-semibold text-slate-900">
                          {option.value}
                        </h3>

                        <p className="mt-1 text-sm leading-5 text-slate-500">
                          {option.description}
                        </p>
                      </button>
                    ))}

                  </div>
                </div>

              </div>

            </FormSection>


            {/* ==================================================
                SAVINGS BEHAVIOUR
                ================================================== */}

            <FormSection
              icon={<PiggyBank size={20} />}
              title="Savings Behaviour"
              description="Indicates whether the applicant's savings position is improving, stable or declining."
            >

              <div className="grid gap-4 md:grid-cols-3">

                {[
                  {
                    value: "Declining",
                    title: "Declining",
                    description:
                      "Savings are reducing over time",
                  },
                  {
                    value: "Stable",
                    title: "Stable",
                    description:
                      "Savings remain relatively consistent",
                  },
                  {
                    value: "Growing",
                    title: "Growing",
                    description:
                      "Savings are increasing over time",
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        savingsTrend:
                          option.value,
                      })
                    }
                    className={`rounded-xl border p-5 text-left transition ${
                      formData.savingsTrend ===
                      option.value
                        ? "border-blue-600 bg-blue-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <h3 className="font-semibold text-slate-900">
                      {option.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {option.description}
                    </p>
                  </button>
                ))}

              </div>

            </FormSection>


            {/* ==================================================
                TRANSACTION BEHAVIOUR
                ================================================== */}

            <FormSection
              icon={<Activity size={20} />}
              title="Transaction Behaviour"
              description="Measures how consistent or variable the applicant's financial transaction behaviour is."
            >

              <SliderField
                label="Transaction Volatility"
                value={formData.transactionVolatility}
                suffix="%"
                min={0}
                max={100}
                onChange={(value) =>
                  setFormData({
                    ...formData,
                    transactionVolatility:
                      value,
                  })
                }
              />

            </FormSection>


            {/* ==================================================
                INFORMATION NOTE
                ================================================== */}

            <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-4">

              <p className="text-sm leading-6 text-blue-800">

                <span className="font-semibold">
                  Track B Model:
                </span>{" "}

                Alternative-data credit scoring for applicants
                with limited or no traditional credit history.
                The model uses consented financial behaviour
                indicators rather than traditional bureau history.

              </p>

            </div>


            {/* ==================================================
                ERROR
                ================================================== */}

            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">

                <AlertTriangle
                  size={20}
                  className="mt-0.5 shrink-0 text-red-600"
                />

                <p className="text-sm leading-6 text-red-700">
                  {error}
                </p>

              </div>
            )}


            {/* ==================================================
                SUBMIT
                ================================================== */}

            <div className="flex justify-end pt-2">

              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >

                {loading
                  ? "Analyzing..."
                  : "Analyze Applicant"}

                {!loading && (
                  <ArrowRight size={18} />
                )}

              </button>

            </div>

          </form>


          {/* ==================================================
              RESULT
              ================================================== */}

          {result && (
            <ResultCard result={result} />
          )}

        </div>
      </main>
    </div>
  );
}


/* ==============================================================
   FORM SECTION
   ============================================================== */

function FormSection({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

      <div className="flex items-start gap-4">

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          {icon}
        </div>

        <div>
          <h2 className="font-semibold text-slate-900">
            {title}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>
        </div>

      </div>

      <div className="mt-6">
        {children}
      </div>

    </section>
  );
}


/* ==============================================================
   INPUT
   ============================================================== */

function InputField({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  required = false,
  min,
}: {
  label: string;
  type?: string;
  name: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  min?: string;
}) {
  return (
    <div>

      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        type={type}
        placeholder={placeholder}
        value={value}
        min={min}
        onChange={(e) =>
          onChange(e.target.value)
        }
        required={required}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
      />

    </div>
  );
}


/* ==============================================================
   SLIDER
   ============================================================== */

function SliderField({
  label,
  value,
  suffix,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>

      <div className="mb-4 flex items-center justify-between">

        <label className="text-sm font-medium text-slate-700">
          {label}
        </label>

        <span className="rounded-lg bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
          {value}
          {suffix}
        </span>

      </div>

      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) =>
          onChange(
            Number(e.target.value)
          )
        }
        className="w-full accent-blue-600"
      />

      <div className="mt-2 flex justify-between text-xs text-slate-400">
        <span>
          {min}
          {suffix}
        </span>

        <span>
          {max}
          {suffix}
        </span>
      </div>

    </div>
  );
}


/* ==============================================================
   CALCULATED FIELD
   ============================================================== */

function CalculatedField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">

      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-semibold text-slate-900">
        {value}
      </p>

    </div>
  );
}


/* ==============================================================
   RESULT CARD
   ============================================================== */

function ResultCard({
  result,
}: {
  result: CreditAssessmentResult;
}) {
  const probability =
    result.pred_default_prob * 100;

  return (
    <section className="mt-8 rounded-2xl border border-blue-200 bg-blue-50/60 p-8 shadow-sm">

      <div className="flex items-center justify-between">

        <div>
          <p className="text-sm font-semibold text-blue-600">
            TRACK B · MODEL RESPONSE
          </p>

          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            Assessment Result
          </h2>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
          <Wallet size={24} />
        </div>

      </div>


      <div className="mt-8 grid gap-6 md:grid-cols-4">

        <ResultMetric
          label="Default Probability"
          value={`${probability.toFixed(2)}%`}
        />

        <ResultMetric
          label="Creditworthiness Score"
          value={String(
            Math.round(
              result.creditworthiness_score
            )
          )}
        />

        <ResultMetric
          label="Rating"
          value={result.rating}
        />

        <ResultMetric
          label="Decision"
          value={result.decision}
        />

      </div>


      {result.customer_explanations &&
        result.customer_explanations.length > 0 && (
          <div className="mt-8 border-t border-blue-200 pt-6">
            <h3 className="text-lg font-bold text-slate-900">
              Why this assessment received this result
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              These are the main factors that influenced the assessment.
            </p>

            <div className="mt-5 space-y-4">
              {result.customer_explanations.map(
                (explanation, index) => (
                  <details
                    key={`${explanation.feature}-${index}`}
                    className="rounded-2xl border border-slate-200 bg-white p-5"
                  >
                    <summary className="cursor-pointer list-none">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <h4 className="text-lg font-bold text-slate-900">
                            {explanation.title}
                          </h4>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              explanation.direction ===
                              "decreases_risk"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {explanation.direction ===
                            "decreases_risk"
                              ? "Helps your application"
                              : "May increase your risk"}
                          </span>
                        </div>

                        <span className="text-slate-400">
                          ▼
                        </span>
                      </div>
                    </summary>

                    <div className="mt-4">
                      <p className="text-sm leading-6 text-slate-700">
                        {explanation.summary}
                      </p>

                      <p className="mt-3 text-sm font-medium text-slate-500">
                        Value:{" "}
                        <span className="font-semibold text-slate-700">
                          {explanation.value}
                        </span>
                      </p>

                      <div className="mt-4 border-t border-slate-100 pt-4">
                        <p className="text-sm leading-6 text-slate-600">
                          {explanation.details}
                        </p>

                        <div className="mt-4 rounded-xl bg-slate-50 p-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                            Technical detail
                          </p>

                          <p className="mt-2 text-xs text-slate-600">
                            Feature: {explanation.feature}
                          </p>

                          <p className="mt-1 text-xs text-slate-600">
                            SHAP impact:{" "}
                            {explanation.impact >= 0 ? "+" : ""}
                            {explanation.impact.toFixed(3)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </details>
                )
              )}
            </div>
          </div>
        )}

      {result.top_reasons && (
        <div className="mt-8 border-t border-blue-200 pt-6">

          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">
            Top Risk Reasons
          </h3>

          <p className="mt-4 text-sm leading-7 text-slate-700">
            {result.top_reasons}
          </p>

        </div>
      )}

    </section>
  );
}


/* ==============================================================
   RESULT METRIC
   ============================================================== */

function ResultMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>

      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-900">
        {value}
      </p>

    </div>
  );
}