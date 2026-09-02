"use client";

import {
  predictTrackA,
  type CreditAssessmentInput,
  type CreditAssessmentResult,
} from "@/lib/api";

import { useState } from "react";
import Link from "next/link";

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CircleDollarSign,
  CreditCard,
  User,
} from "lucide-react";

import Sidebar from "@/components/Sidebar";

export default function BureauAssessment() {
  const [formData, setFormData] = useState({
    applicantId: "",

    // =====================================================
    // Applicant information
    // =====================================================

    ageYears: "",
    employmentYears: "",
    education: "Higher education",
    incomeType: "Working",
    familyStatus: "Married",
    children: "0",

    // =====================================================
    // Financial information
    // =====================================================

    annualIncome: "",
    requestedLoan: "",
    annualAnnuity: "",

    // =====================================================
    // External credit scores
    // =====================================================

    extSource1: "",
    extSource2: "",
    extSource3: "",

    // =====================================================
    // Credit bureau history
    // =====================================================

    activeCreditAccounts: "",
    closedCreditAccounts: "",
    creditHistoryYears: "",
    creditTypeCount: "",
    outstandingDebt: "",
    totalCreditAmount: "",
    bureauAnnuity: "",

    // =====================================================
    // Overdue / payment history
    // =====================================================

    overdueAmount: "0",
    overdueAccounts: "0",
    totalOverdueAmount: "0",
    prolongedLoans: "0",
  });

  const [result, setResult] =
    useState<CreditAssessmentResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // =======================================================
  // Handle both input and select changes
  // =======================================================

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =======================================================
  // Safely convert a form value to number
  // =======================================================

  const toNumber = (value: string, fallback = 0) => {
    const number = Number(value);

    return Number.isFinite(number) ? number : fallback;
  };

  // =======================================================
  // Validate user input before sending to backend
  // =======================================================

  const validateForm = (): string | null => {
    // -------------------------------------------------------
    // Applicant ID
    // -------------------------------------------------------

    if (!formData.applicantId.trim()) {
      return "Applicant ID is required.";
    }

    // -------------------------------------------------------
    // Applicant information
    // -------------------------------------------------------

    const age = toNumber(formData.ageYears);

    if (!formData.ageYears) {
      return "Age is required.";
    }

    if (age < 18 || age > 100) {
      return "Age must be between 18 and 100 years.";
    }

    if (formData.employmentYears !== "") {
      const employmentYears = toNumber(
        formData.employmentYears
      );

      if (employmentYears < 0) {
        return "Employment years cannot be negative.";
      }

      if (employmentYears > age) {
        return "Employment years cannot be greater than the applicant's age.";
      }
    }

    const children = toNumber(formData.children);

    if (children < 0) {
      return "Number of children cannot be negative.";
    }

    // -------------------------------------------------------
    // Financial information
    // -------------------------------------------------------

    const annualIncome = toNumber(formData.annualIncome);
    const requestedLoan = toNumber(formData.requestedLoan);
    const annualAnnuity = toNumber(formData.annualAnnuity);

    if (annualIncome <= 0) {
      return "Annual income must be greater than 0.";
    }

    if (requestedLoan <= 0) {
      return "Requested loan amount must be greater than 0.";
    }

    if (annualAnnuity <= 0) {
      return "Annual annuity must be greater than 0.";
    }

    // -------------------------------------------------------
    // External credit scores
    // -------------------------------------------------------

    const extSource1 = toNumber(formData.extSource1);
    const extSource2 = toNumber(formData.extSource2);
    const extSource3 = toNumber(formData.extSource3);

    if (
      extSource1 < 0 ||
      extSource1 > 1 ||
      extSource2 < 0 ||
      extSource2 > 1 ||
      extSource3 < 0 ||
      extSource3 > 1
    ) {
      return "External credit scores must be between 0 and 1.";
    }

    // -------------------------------------------------------
    // Credit bureau history
    // -------------------------------------------------------

    const activeAccounts = toNumber(
      formData.activeCreditAccounts
    );

    const closedAccounts = toNumber(
      formData.closedCreditAccounts
    );

    const creditHistoryYears = toNumber(
      formData.creditHistoryYears
    );

    const creditTypeCount = toNumber(
      formData.creditTypeCount
    );

    const outstandingDebt = toNumber(
      formData.outstandingDebt
    );

    const totalCreditAmount = toNumber(
      formData.totalCreditAmount
    );

    const bureauAnnuity = toNumber(
      formData.bureauAnnuity
    );

    if (activeAccounts < 0) {
      return "Active credit accounts cannot be negative.";
    }

    if (closedAccounts < 0) {
      return "Closed credit accounts cannot be negative.";
    }

    if (creditHistoryYears < 0) {
      return "Credit history years cannot be negative.";
    }

    if (creditTypeCount < 0) {
      return "Credit type count cannot be negative.";
    }

    if (outstandingDebt < 0) {
      return "Outstanding debt cannot be negative.";
    }

    if (totalCreditAmount < 0) {
      return "Total credit amount cannot be negative.";
    }

    if (bureauAnnuity < 0) {
      return "Bureau annuity cannot be negative.";
    }

    const bureauCount =
      activeAccounts + closedAccounts;

    // -------------------------------------------------------
    // Payment / overdue history
    // -------------------------------------------------------

    const overdueAmount = toNumber(
      formData.overdueAmount
    );

    const overdueAccounts = toNumber(
      formData.overdueAccounts
    );

    const totalOverdueAmount = toNumber(
      formData.totalOverdueAmount
    );

    const prolongedLoans = toNumber(
      formData.prolongedLoans
    );

    if (overdueAmount < 0) {
      return "Overdue amount cannot be negative.";
    }

    if (overdueAccounts < 0) {
      return "Overdue accounts cannot be negative.";
    }

    if (totalOverdueAmount < 0) {
      return "Total overdue amount cannot be negative.";
    }

    if (prolongedLoans < 0) {
      return "Prolonged loans cannot be negative.";
    }

    if (overdueAccounts > bureauCount) {
      return "Overdue accounts cannot exceed the total number of bureau accounts.";
    }

    // -------------------------------------------------------
    // Debt / credit consistency
    // -------------------------------------------------------

    if (
      totalCreditAmount > 0 &&
      outstandingDebt > totalCreditAmount
    ) {
      return "Outstanding debt cannot be greater than total credit amount.";
    }

    return null;
  };

  // =======================================================
  // Submit assessment
  // =======================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setResult(null);

    // =====================================================
    // Validate before doing any calculations
    // =====================================================

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      // ===================================================
      // Convert form values to numbers
      // ===================================================

      const annualIncome = toNumber(
        formData.annualIncome
      );

      const requestedLoan = toNumber(
        formData.requestedLoan
      );

      const annualAnnuity = toNumber(
        formData.annualAnnuity
      );

      const activeAccounts = toNumber(
        formData.activeCreditAccounts
      );

      const closedAccounts = toNumber(
        formData.closedCreditAccounts
      );

      const outstandingDebt = toNumber(
        formData.outstandingDebt
      );

      const totalCreditAmount = toNumber(
        formData.totalCreditAmount
      );

      const bureauAnnuity = toNumber(
        formData.bureauAnnuity
      );

      const overdueAmount = toNumber(
        formData.overdueAmount
      );

      const overdueAccounts = toNumber(
        formData.overdueAccounts
      );

      const totalOverdueAmount = toNumber(
        formData.totalOverdueAmount
      );

      const prolongedLoans = toNumber(
        formData.prolongedLoans
      );

      // ===================================================
      // Derived bureau values
      // ===================================================

      const bureauCount =
        activeAccounts + closedAccounts;

      const hasBureauHistory =
        bureauCount > 0 ? 1 : 0;

      // ===================================================
      // Derived financial ratios
      // ===================================================

      const creditIncomeRatio =
        annualIncome > 0
          ? requestedLoan / annualIncome
          : 0;

      const annuityIncomeRatio =
        annualIncome > 0
          ? annualAnnuity / annualIncome
          : 0;

      // ===================================================
      // Derived overdue ratio
      // ===================================================

      const overdueRatio =
        bureauCount > 0
          ? overdueAccounts / bureauCount
          : 0;

      // ===================================================
      // Derived debt / credit values
      // ===================================================

      const debtMean =
        bureauCount > 0
          ? outstandingDebt / bureauCount
          : 0;

      const creditSumMean =
        bureauCount > 0
          ? totalCreditAmount / bureauCount
          : 0;

      const creditUtilization =
        totalCreditAmount > 0
          ? outstandingDebt / totalCreditAmount
          : 0;

      // ===================================================
      // Derived bureau annuity ratio
      // ===================================================

      const bureauAnnuityIncomeRatio =
        annualIncome > 0
          ? bureauAnnuity / annualIncome
          : 0;

      // ===================================================
      // Exact Track A model payload
      // ===================================================

      const data: CreditAssessmentInput = {
        // -------------------------------------------------
        // External credit scores
        // -------------------------------------------------

        EXT_SOURCE_1: toNumber(
          formData.extSource1
        ),

        EXT_SOURCE_2: toNumber(
          formData.extSource2
        ),

        EXT_SOURCE_3: toNumber(
          formData.extSource3
        ),

        // -------------------------------------------------
        // Financial information
        // -------------------------------------------------

        AMT_CREDIT: requestedLoan,

        AMT_INCOME_TOTAL: annualIncome,

        AMT_ANNUITY: annualAnnuity,

        // -------------------------------------------------
        // Derived financial ratios
        // -------------------------------------------------

        credit_income_ratio:
          creditIncomeRatio,

        annuity_income_ratio:
          annuityIncomeRatio,

        // -------------------------------------------------
        // Applicant information
        // -------------------------------------------------

        age_years: toNumber(
          formData.ageYears
        ),

        employment_years:
          formData.employmentYears === ""
            ? 0
            : toNumber(
              formData.employmentYears
            ),

        NAME_EDUCATION_TYPE:
          formData.education,

        NAME_INCOME_TYPE:
          formData.incomeType,

        NAME_FAMILY_STATUS:
          formData.familyStatus,

        CNT_CHILDREN: toNumber(
          formData.children
        ),

        // -------------------------------------------------
        // Credit bureau history
        // -------------------------------------------------

        bureau_count:
          bureauCount,

        active_count:
          activeAccounts,

        closed_count:
          closedAccounts,

        has_bureau_history:
          hasBureauHistory,

        credit_history_years:
          toNumber(
            formData.creditHistoryYears
          ),

        credit_type_nunique:
          toNumber(
            formData.creditTypeCount
          ),

        // -------------------------------------------------
        // Overdue information
        // -------------------------------------------------

        overdue_mean:
          overdueAmount,

        overdue_max:
          overdueAmount,

        overdue_loan_count:
          overdueAccounts,

        overdue_ratio:
          overdueRatio,

        max_overdue_amt:
          overdueAmount,

        credit_sum_overdue_sum:
          totalOverdueAmount,

        prolong_sum:
          prolongedLoans,

        // -------------------------------------------------
        // Debt
        // -------------------------------------------------

        debt_sum:
          outstandingDebt,

        debt_mean:
          debtMean,

        // -------------------------------------------------
        // Credit totals
        // -------------------------------------------------

        credit_sum_total:
          totalCreditAmount,

        credit_sum_mean:
          creditSumMean,

        credit_utilization:
          creditUtilization,

        // -------------------------------------------------
        // Bureau annuity
        // -------------------------------------------------

        bureau_annuity_sum:
          bureauAnnuity,

        bureau_annuity_income_ratio:
          bureauAnnuityIncomeRatio,

        // -------------------------------------------------
        // Missingness indicator
        // -------------------------------------------------

        employment_years_missing:
          formData.employmentYears === ""
            ? 1
            : 0,
      };

      // ===================================================
      // Debug payload
      // ===================================================

      console.log(
        "TRACK A PAYLOAD:",
        data
      );

      // ===================================================
      // Send to FastAPI
      // ===================================================

      const response =
        await predictTrackA(data);

      // ===================================================
      // Display model response
      // ===================================================

      setResult(response);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to complete the credit assessment."
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

          {/* =================================================
              BACK LINK
          ================================================= */}

          <Link
            href="/single-assessment"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft size={18} />
            Back to applicant type
          </Link>

          {/* =================================================
              PAGE HEADER
          ================================================= */}

          <div className="mt-8">

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Building2 size={28} />
            </div>

            <p className="mt-6 text-sm font-semibold text-emerald-600">
              TRACK A · BUREAU DATA
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Credit History Assessment
            </h1>

            <p className="mt-3 max-w-2xl text-slate-500">
              Enter the applicant&apos;s available bureau and
              financial information. The Track A model will
              evaluate their credit risk.
            </p>

          </div>

          {/* =================================================
              FORM
          ================================================= */}

          <form
            onSubmit={handleSubmit}
            className="mt-10 space-y-6"
          >

            {/* =================================================
                APPLICANT INFORMATION
            ================================================= */}

            <FormSection
              icon={<User size={20} />}
              title="Applicant Information"
              description="Basic information about the applicant."
            >
              <div className="grid gap-5 md:grid-cols-2">

                <InputField
                  label="Applicant ID"
                  name="applicantId"
                  placeholder="Example: A-1001"
                  value={formData.applicantId}
                  onChange={handleChange}
                  required
                />

                <InputField
                  label="Age"
                  name="ageYears"
                  type="number"
                  min="18"
                  max="100"
                  placeholder="Example: 30"
                  value={formData.ageYears}
                  onChange={handleChange}
                  required
                />

                <InputField
                  label="Employment Years"
                  name="employmentYears"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Example: 5"
                  value={formData.employmentYears}
                  onChange={handleChange}
                />

                <InputField
                  label="Number of Children"
                  name="children"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Example: 1"
                  value={formData.children}
                  onChange={handleChange}
                  required
                />

                <SelectField
                  label="Education"
                  name="education"
                  value={formData.education}
                  onChange={handleChange}
                  options={[
                    "Lower secondary",
                    "Secondary / secondary special",
                    "Incomplete higher",
                    "Higher education",
                    "Academic degree",
                  ]}
                />

                <SelectField
                  label="Income Type"
                  name="incomeType"
                  value={formData.incomeType}
                  onChange={handleChange}
                  options={[
                    "Businessman",
                    "Commercial associate",
                    "Maternity leave",
                    "Pensioner",
                    "State servant",
                    "Student",
                    "Unemployed",
                    "Working",
                  ]}
                />

                <SelectField
                  label="Family Status"
                  name="familyStatus"
                  value={formData.familyStatus}
                  onChange={handleChange}
                  options={[
                    "Civil marriage",
                    "Married",
                    "Separated",
                    "Single / not married",
                    "Unknown",
                    "Widow",
                  ]}
                />

              </div>
            </FormSection>

            {/* =================================================
                FINANCIAL INFORMATION
            ================================================= */}

            <FormSection
              icon={<CircleDollarSign size={20} />}
              title="Financial Information"
              description="Income and requested credit information."
            >
              <div className="grid gap-5 md:grid-cols-3">

                <InputField
                  label="Annual Income"
                  name="annualIncome"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Example: 600000"
                  value={formData.annualIncome}
                  onChange={handleChange}
                  required
                />

                <InputField
                  label="Requested Loan Amount"
                  name="requestedLoan"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Example: 400000"
                  value={formData.requestedLoan}
                  onChange={handleChange}
                  required
                />

                <InputField
                  label="Annual Annuity"
                  name="annualAnnuity"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Example: 25000"
                  value={formData.annualAnnuity}
                  onChange={handleChange}
                  required
                />

              </div>

              <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-sm text-slate-600">
                  Credit-to-income and annuity-to-income
                  ratios are calculated automatically from
                  the information provided.
                </p>
              </div>

            </FormSection>

            {/* =================================================
                EXTERNAL CREDIT SCORES
            ================================================= */}

            <FormSection
              icon={<CreditCard size={20} />}
              title="External Credit Scores"
              description="External credit indicators used by the Track A model."
            >
              <div className="grid gap-5 md:grid-cols-3">

                <InputField
                  label="External Source Score 1"
                  name="extSource1"
                  type="number"
                  min="0"
                  max="1"
                  step="any"
                  placeholder="0.00 – 1.00"
                  value={formData.extSource1}
                  onChange={handleChange}
                  required
                />

                <InputField
                  label="External Source Score 2"
                  name="extSource2"
                  type="number"
                  min="0"
                  max="1"
                  step="any"
                  placeholder="0.00 – 1.00"
                  value={formData.extSource2}
                  onChange={handleChange}
                  required
                />

                <InputField
                  label="External Source Score 3"
                  name="extSource3"
                  type="number"
                  min="0"
                  max="1"
                  step="any"
                  placeholder="0.00 – 1.00"
                  value={formData.extSource3}
                  onChange={handleChange}
                  required
                />

              </div>

              <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-sm text-slate-600">
                  Enter values between 0 and 1. Higher
                  external scores generally indicate stronger
                  creditworthiness.
                </p>
              </div>

            </FormSection>

            {/* =================================================
                CREDIT BUREAU HISTORY
            ================================================= */}

            <FormSection
              icon={<Building2 size={20} />}
              title="Credit Bureau History"
              description="Summary of the applicant's existing credit history."
            >
              <div className="grid gap-5 md:grid-cols-3">

                <InputField
                  label="Active Credit Accounts"
                  name="activeCreditAccounts"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Example: 3"
                  value={formData.activeCreditAccounts}
                  onChange={handleChange}
                  required
                />

                <InputField
                  label="Closed Credit Accounts"
                  name="closedCreditAccounts"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Example: 2"
                  value={formData.closedCreditAccounts}
                  onChange={handleChange}
                  required
                />

                <InputField
                  label="Credit History (Years)"
                  name="creditHistoryYears"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Example: 6"
                  value={formData.creditHistoryYears}
                  onChange={handleChange}
                  required
                />

                <InputField
                  label="Credit Type Count"
                  name="creditTypeCount"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Example: 3"
                  value={formData.creditTypeCount}
                  onChange={handleChange}
                  required
                />

                <InputField
                  label="Outstanding Debt"
                  name="outstandingDebt"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Example: 180000"
                  value={formData.outstandingDebt}
                  onChange={handleChange}
                  required
                />

                <InputField
                  label="Total Credit Amount"
                  name="totalCreditAmount"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Example: 400000"
                  value={formData.totalCreditAmount}
                  onChange={handleChange}
                  required
                />

                <InputField
                  label="Bureau Annuity"
                  name="bureauAnnuity"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Example: 15000"
                  value={formData.bureauAnnuity}
                  onChange={handleChange}
                  required
                />

              </div>

              <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-sm text-slate-600">
                  Bureau count, credit utilization, debt
                  averages and other derived bureau features
                  are calculated automatically.
                </p>
              </div>

            </FormSection>

            {/* =================================================
                OVERDUE / PAYMENT HISTORY
            ================================================= */}

            <FormSection
              icon={<CreditCard size={20} />}
              title="Payment & Overdue History"
              description="Information about overdue accounts and previous payment issues."
            >
              <div className="grid gap-5 md:grid-cols-2">

                <InputField
                  label="Overdue Amount"
                  name="overdueAmount"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Example: 0"
                  value={formData.overdueAmount}
                  onChange={handleChange}
                  required
                />

                <InputField
                  label="Overdue Accounts"
                  name="overdueAccounts"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Example: 0"
                  value={formData.overdueAccounts}
                  onChange={handleChange}
                  required
                />

                <InputField
                  label="Total Overdue Amount"
                  name="totalOverdueAmount"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Example: 0"
                  value={formData.totalOverdueAmount}
                  onChange={handleChange}
                  required
                />

                <InputField
                  label="Prolonged Loans"
                  name="prolongedLoans"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Example: 0"
                  value={formData.prolongedLoans}
                  onChange={handleChange}
                  required
                />

              </div>
            </FormSection>

            {/* =================================================
                MODEL INFORMATION
            ================================================= */}

            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-5 py-4">
              <p className="text-sm leading-6 text-emerald-800">
                <span className="font-semibold">
                  Track A Model:
                </span>{" "}
                Bureau-based credit scoring. The system
                combines financial information, external credit
                indicators and bureau history to estimate
                credit risk.
              </p>
            </div>

            {/* =================================================
                ERROR MESSAGE
            ================================================= */}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
                <p className="text-sm font-medium text-red-700">
                  {error}
                </p>
              </div>
            )}

            {/* =================================================
                SUBMIT BUTTON
            ================================================= */}

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

          {/* =================================================
              MODEL RESPONSE
          ================================================= */}

          {result && (
            <div className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50 p-8">

              <h2 className="text-lg font-bold text-emerald-700">
                MODEL RESPONSE
              </h2>

              <div className="mt-6 grid gap-6 md:grid-cols-4">

                <ResultItem
                  label="Default Probability"
                  value={`${(
                    result.pred_default_prob * 100
                  ).toFixed(2)}%`}
                />

                <ResultItem
                  label="Creditworthiness Score"
                  value={Math.round(
                    result.creditworthiness_score
                  ).toString()}
                />

                <ResultItem
                  label="Rating"
                  value={result.rating}
                />

                <ResultItem
                  label="Decision"
                  value={result.decision}
                />

              </div>

              {/* =================================================
                  CUSTOMER-FRIENDLY RISK EXPLANATIONS
              ================================================= */}
              {result.customer_explanations &&
                result.customer_explanations.length > 0 && (
                  <div className="mt-8 border-t border-emerald-200 pt-6">
                    <div>
                      {/* <h3 className="text-base font-bold text-slate-800">
                        Why this assessment received this result
                      </h3> */}

                      <h2 className="text-lg font-bold text-slate-800">
                        These are the main factors that influenced the assessment.
                      </h2>
                    </div>

                    <div className="mt-5 space-y-4">
                      {result.customer_explanations.map(
                        (explanation, index) => (
                          <details
                            key={`${explanation.feature}-${index}`}
                            className="group rounded-xl border border-slate-200 bg-white"
                          >
                            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-5">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-semibold text-slate-900">
                                    {explanation.title}
                                  </p>

                                  <span
                                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${explanation.direction ===
                                        "decreases_risk"
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-red-50 text-red-700"
                                      }`}
                                  >
                                    {explanation.effect}
                                  </span>
                                </div>

                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                  {explanation.summary}
                                </p>

                                <p className="mt-2 text-xs font-medium text-slate-400">
                                  Value: {explanation.value}
                                </p>
                              </div>

                              <span className="mt-1 shrink-0 text-xs font-semibold text-slate-400 transition group-open:rotate-180">
                                ▼
                              </span>
                            </summary>

                            <div className="border-t border-slate-100 px-5 pb-5 pt-4">
                              <p className="text-sm leading-6 text-slate-600">
                                {explanation.details}
                              </p>

                              <div className="mt-4 rounded-lg bg-slate-50 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  Technical detail
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  Feature: {explanation.feature}
                                  {" · "}
                                  SHAP impact:{" "}
                                  {explanation.impact >= 0 ? "+" : ""}
                                  {explanation.impact.toFixed(3)}
                                </p>
                              </div>
                            </div>
                          </details>
                        )
                      )}
                    </div>
                  </div>
                )}

              {/* =================================================
                  EXISTING TECHNICAL SHAP — PRESERVED
              ================================================= */}
              {result.top_reasons && (
                <div className="mt-8 border-t border-emerald-200 pt-6">

                  <h3 className="text-sm font-bold text-slate-600">
                    TOP RISK REASONS
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-slate-700">
                    {result.top_reasons}
                  </p>

                </div>
              )}

            </div>
          )}

        </div>
      </main>
    </div>
  );
}

/* =========================================================
   RESULT ITEM
========================================================= */

function ResultItem({
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

/* =========================================================
   FORM SECTION
========================================================= */

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

/* =========================================================
   INPUT FIELD
========================================================= */

function InputField({
  label,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  required = false,
  step,
  min,
  max,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
  required?: boolean;
  step?: string;
  min?: string;
  max?: string;
}) {
  return (
    <div>

      <label
        htmlFor={name}
        className="mb-2 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        step={step}
        min={min}
        max={max}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
      />

    </div>
  );
}

/* =========================================================
   SELECT FIELD
========================================================= */

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => void;
  options: string[];
}) {
  return (
    <div>

      <label
        htmlFor={name}
        className="mb-2 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>

      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
      >
        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {option}
          </option>
        ))}
      </select>

    </div>
  );
}