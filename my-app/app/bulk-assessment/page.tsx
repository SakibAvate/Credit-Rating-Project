"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  Building2,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  RotateCcw,
} from "lucide-react";

import Sidebar from "@/components/Sidebar";

type AssessmentTrack = "TRACK_A" | "TRACK_B";

type ResultRow = {
  [key: string]: string;
};

const API_URL = "http://127.0.0.1:8000";

/*
 * ------------------------------------------------------------
 * REQUIRED CSV COLUMNS
 * ------------------------------------------------------------
 *
 * These are the RAW columns expected in the uploaded CSV.
 *
 * Important:
 * Track A categorical fields are supplied in their original
 * form. The backend is responsible for encoding them before
 * sending the data to the model.
 *
 * applicant_id is optional because the backend also supports
 * CSV files without an ID column.
 */

/*
 * ------------------------------------------------------------
 * TRACK A
 * ------------------------------------------------------------
 *
 * Track A expects the original categorical columns:
 *
 * NAME_EDUCATION_TYPE
 * NAME_INCOME_TYPE
 * NAME_FAMILY_STATUS
 *
 * NOT the one-hot encoded columns such as:
 *
 * NAME_INCOME_TYPE_Working
 * NAME_FAMILY_STATUS_Married
 *
 * The backend handles that encoding.
 */

const TRACK_A_COLUMNS = [
  "EXT_SOURCE_1",
  "EXT_SOURCE_2",
  "EXT_SOURCE_3",
  "AMT_CREDIT",
  "AMT_INCOME_TOTAL",
  "AMT_ANNUITY",
  "credit_income_ratio",
  "annuity_income_ratio",
  "age_years",
  "employment_years",
  "NAME_EDUCATION_TYPE",
  "NAME_INCOME_TYPE",
  "NAME_FAMILY_STATUS",
  "CNT_CHILDREN",
  "bureau_count",
  "active_count",
  "closed_count",
  "has_bureau_history",
  "credit_history_years",
  "credit_type_nunique",
  "overdue_mean",
  "overdue_max",
  "overdue_loan_count",
  "overdue_ratio",
  "max_overdue_amt",
  "credit_sum_overdue_sum",
  "prolong_sum",
  "debt_sum",
  "debt_mean",
  "credit_sum_total",
  "credit_sum_mean",
  "credit_utilization",
  "bureau_annuity_sum",
  "bureau_annuity_income_ratio",
  "employment_years_missing",
];
/*
 * ------------------------------------------------------------
 * TRACK B
 * ------------------------------------------------------------
 */

const TRACK_B_COLUMNS = [
  "monthly_income",
  "income_stability",
  "avg_monthly_balance",
  "min_monthly_balance",
  "monthly_expense",
  "emi_amount",
  "emi_to_income_ratio",
  "bounce_rate_6m",
  "savings_rate",
  "savings_trend",
  "transaction_volatility",
  "cash_flow_surplus",
  "salary_credit_frequency",
];

/*
 * ------------------------------------------------------------
 * CSV HELPERS
 * ------------------------------------------------------------
 */

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());

  return values;
}

function parseCSV(text: string): ResultRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = parseCSVLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);

    const row: ResultRow = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row;
  });
}

function parseCSVPreview(
  text: string,
  maxRows: number
): ResultRow[] {
  const lines: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length && lines.length < maxRows + 1; i++) {
    const char = text[i];

    if (char === '"') {
      if (insideQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && text[i + 1] === "\n") {
        i++;
      }

      if (current.trim()) {
        lines.push(current);
      }

      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim() && lines.length < maxRows + 1) {
    lines.push(current);
  }

  if (lines.length < 2) {
    return [];
  }

  const headers = parseCSVLine(lines[0]);

  return lines.slice(1, maxRows + 1).map((line) => {
    const values = parseCSVLine(line);
    const row: ResultRow = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row;
  });
}

function escapeCSVValue(value: string): string {
  if (
    value.includes(",") ||
    value.includes('"') ||
    value.includes("\n")
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function csvToBlob(text: string): Blob {
  return new Blob([text], {
    type: "text/csv;charset=utf-8;",
  });
}

/*
 * ------------------------------------------------------------
 * COMPONENT
 * ------------------------------------------------------------
 */

export default function BulkAssessment() {
  const [track, setTrack] = useState<AssessmentTrack>("TRACK_A");

  const [file, setFile] = useState<File | null>(null);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);

  const [results, setResults] = useState<ResultRow[]>([]);

  const [resultCSV, setResultCSV] = useState("");

  const [processedCount, setProcessedCount] = useState(0);

  /*
   * ----------------------------------------------------------
   * TRACK CHANGE
   * ----------------------------------------------------------
   */

  const handleTrackChange = (selectedTrack: AssessmentTrack) => {
    setTrack(selectedTrack);

    setError("");
    setSuccess("");
    setResults([]);
    setResultCSV("");
    setProcessedCount(0);
  };

  /*
   * ----------------------------------------------------------
   * FILE SELECTION
   * ----------------------------------------------------------
   */

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setError("");
    setSuccess("");
    setResults([]);
    setResultCSV("");
    setProcessedCount(0);

    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setError("Please upload a CSV file.");
      setFile(null);
      return;
    }

    if (selectedFile.size === 0) {
      setError("The selected CSV file is empty.");
      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  /*
   * ----------------------------------------------------------
   * CLIENT-SIDE CSV VALIDATION
   * ----------------------------------------------------------
   */

  const readCSVHeader = async (selectedFile: File) => {
    const CHUNK_SIZE = 64 * 1024;
    let offset = 0;
    let text = "";

    while (offset < selectedFile.size) {
      const chunk = selectedFile.slice(
        offset,
        Math.min(offset + CHUNK_SIZE, selectedFile.size)
      );

      text += await chunk.text();

      const newlineIndex = text.search(/\r?\n/);

      if (newlineIndex !== -1) {
        return text.slice(0, newlineIndex);
      }

      offset += CHUNK_SIZE;

      // A CSV header this large is almost certainly malformed.
      if (text.length > 1024 * 1024) {
        throw new Error(
          "Could not find a valid CSV header row."
        );
      }
    }

    return text;
  };

  const validateCSVColumns = async (
    selectedFile: File,
    selectedTrack: AssessmentTrack
  ) => {
    // IMPORTANT: do not call selectedFile.text().
    // The uploaded Track A file can be ~100 MB.
    // Only read enough bytes to obtain the header.
    const headerLine = await readCSVHeader(selectedFile);

    if (!headerLine.trim()) {
      throw new Error("The CSV does not contain a header row.");
    }

    const headers = parseCSVLine(
      headerLine.replace(/^\uFEFF/, "")
    ).map((header) => header.trim());

    const requiredColumns =
      selectedTrack === "TRACK_A"
        ? TRACK_A_COLUMNS
        : TRACK_B_COLUMNS;

    const missingColumns = requiredColumns.filter(
      (column) => !headers.includes(column)
    );

    if (missingColumns.length > 0) {
      throw new Error(
        `Missing required ${
          selectedTrack === "TRACK_A" ? "Track A" : "Track B"
        } columns: ${missingColumns.join(", ")}`
      );
    }

    // The browser only validates the header. The backend validates
    // and counts the actual applicant rows while processing chunks.
    return true;
  };

  /*
   * ----------------------------------------------------------
   * BULK PREDICTION
   * ----------------------------------------------------------
   */

  const handleProcess = async () => {
    if (!file) {
      setError("Please upload a CSV file first.");
      return;
    }

    setError("");
    setSuccess("");
    setResults([]);
    setResultCSV("");
    setProcessedCount(0);
    setIsProcessing(true);

    try {
      /*
       * Step 1:
       * Validate the CSV locally before sending it to FastAPI.
       */

      const applicantCount = await validateCSVColumns(
        file,
        track
      );

      /*
       * Keep applicantCount available for validation/debugging.
       * The final processed count comes from the backend response.
       */

      if (applicantCount <= 0) {
        throw new Error(
          "The CSV does not contain any applicant records."
        );
      }

      /*
       * Step 2:
       * Build multipart/form-data request.
       */

      const formData = new FormData();

      formData.append("file", file);

      /*
       * Step 3:
       * Select the correct backend endpoint.
       */

      const endpoint =
        track === "TRACK_A"
          ? `${API_URL}/api/predict/batch`
          : `${API_URL}/api/track-b/predict/batch`;

      /*
       * Step 4:
       * Send CSV to FastAPI.
       */

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      /*
       * Step 5:
       * Handle backend errors.
       */

      if (!response.ok) {
        let errorMessage = "Bulk assessment failed.";

        try {
          const errorData = await response.json();

          if (typeof errorData.detail === "string") {
            errorMessage = errorData.detail;
          } else if (errorData.detail?.message) {
            errorMessage = errorData.detail.message;

            if (errorData.detail.missing_fields) {
              errorMessage += ` Missing fields: ${errorData.detail.missing_fields.join(
                ", "
              )}`;
            }
          }
        } catch {
          // Keep the default error message.
        }

        throw new Error(errorMessage);
      }

      /*
       * Step 6:
       * Backend returns the scored CSV.
       */

      const csvText = await response.text();

      if (!csvText.trim()) {
        throw new Error(
          "The backend returned an empty result."
        );
      }

      /*
       * Step 7:
       * Keep the complete CSV for download, but only parse a small
       * preview for the table. Rendering tens of thousands of rows
       * in the browser would make the page unresponsive.
       */

      const previewResults = parseCSVPreview(csvText, 100);
      const headerOnly = previewResults.length === 0;

      if (headerOnly) {
        throw new Error(
          "The backend returned no applicant results."
        );
      }

      const processedHeader = response.headers.get(
        "X-Processed-Count"
      );

      const backendCount = processedHeader
        ? Number(processedHeader)
        : NaN;

      const count =
        Number.isFinite(backendCount) && backendCount > 0
          ? backendCount
          : previewResults.length;

      setResultCSV(csvText);
      setResults(previewResults);
      setProcessedCount(count);

      setSuccess(
        `Successfully assessed ${count} applicant${
          count === 1 ? "" : "s"
        }. Showing the first ${Math.min(100, count)} results below.`
      );
    } catch (err) {
      console.error("Bulk assessment error:", err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Something went wrong while processing the CSV."
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  /*
   * ----------------------------------------------------------
   * DOWNLOAD RESULTS
   * ----------------------------------------------------------
   */

  const handleDownload = () => {
    if (!resultCSV) {
      return;
    }

    const blob = csvToBlob(resultCSV);

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download =
      track === "TRACK_A"
        ? "track_a_scored.csv"
        : "track_b_scored.csv";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  /*
   * ----------------------------------------------------------
   * RESET
   * ----------------------------------------------------------
   */

  const handleReset = () => {
    setFile(null);
    setError("");
    setSuccess("");
    setResults([]);
    setResultCSV("");
    setProcessedCount(0);

    const input = document.getElementById(
      "csv-upload"
    ) as HTMLInputElement | null;

    if (input) {
      input.value = "";
    }
  };

  /*
   * ----------------------------------------------------------
   * RESULT TABLE HELPERS
   * ----------------------------------------------------------
   */

  const resultHeaders =
    results.length > 0
      ? Object.keys(results[0])
      : [];

  const formatHeader = (header: string) => {
    return header
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatCell = (
    header: string,
    value: string
  ) => {
    if (
      header === "pred_default_prob" &&
      value !== ""
    ) {
      const numericValue = Number(value);

      if (!Number.isNaN(numericValue)) {
        return `${(numericValue * 100).toFixed(2)}%`;
      }
    }

    if (
      header === "creditworthiness_score" &&
      value !== ""
    ) {
      const numericValue = Number(value);

      if (!Number.isNaN(numericValue)) {
        return Math.round(numericValue).toString();
      }
    }

    return value;
  };

  /*
   * ----------------------------------------------------------
   * RENDER
   * ----------------------------------------------------------
   */

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="min-w-0 flex-1 p-8">
        <div className="mx-auto max-w-6xl">

          {/* Back to dashboard */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft size={18} />
            Back to dashboard
          </Link>

          {/* Header */}
          <div className="mt-8">
            <p className="text-sm font-semibold text-emerald-600">
              BULK ASSESSMENT
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Assess Multiple Applicants
            </h1>

            <p className="mt-3 max-w-2xl text-slate-500">
              Upload a CSV file containing multiple applicants
              and run credit risk assessments in one operation.
            </p>
          </div>

          {/* ------------------------------------------------ */}
          {/* TRACK SELECTION                                  */}
          {/* ------------------------------------------------ */}

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                1. Select Assessment Track
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Choose the model that matches the data available
                for your applicants.
              </p>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">

              {/* Track A */}
              <button
                type="button"
                onClick={() =>
                  handleTrackChange("TRACK_A")
                }
                disabled={isProcessing}
                className={`rounded-2xl border p-6 text-left transition ${
                  track === "TRACK_A"
                    ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100"
                    : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-slate-50"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Building2 size={24} />
                  </div>

                  {track === "TRACK_A" && (
                    <CheckCircle2
                      size={22}
                      className="text-emerald-600"
                    />
                  )}
                </div>

                <p className="mt-5 text-sm font-semibold text-emerald-600">
                  TRACK A · BUREAU DATA
                </p>

                <h3 className="mt-2 text-lg font-bold text-slate-900">
                  Credit History Assessment
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Use when applicants have traditional credit
                  bureau, financial and repayment information.
                </p>
              </button>

              {/* Track B */}
              <button
                type="button"
                onClick={() =>
                  handleTrackChange("TRACK_B")
                }
                disabled={isProcessing}
                className={`rounded-2xl border p-6 text-left transition ${
                  track === "TRACK_B"
                    ? "border-blue-400 bg-blue-50 ring-2 ring-blue-100"
                    : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Wallet size={24} />
                  </div>

                  {track === "TRACK_B" && (
                    <CheckCircle2
                      size={22}
                      className="text-blue-600"
                    />
                  )}
                </div>

                <p className="mt-5 text-sm font-semibold text-blue-600">
                  TRACK B · ALTERNATIVE DATA
                </p>

                <h3 className="mt-2 text-lg font-bold text-slate-900">
                  Alternative Data Assessment
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Use when traditional bureau history is limited
                  or unavailable and alternative financial
                  behaviour data is available.
                </p>
              </button>

            </div>
          </div>

          {/* ------------------------------------------------ */}
          {/* FILE UPLOAD                                      */}
          {/* ------------------------------------------------ */}

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                2. Upload Applicant Data
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Upload a CSV containing the applicants you want
                to assess.
              </p>
            </div>

            <div className="mt-6">
              <label
                htmlFor="csv-upload"
                className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition ${
                  isProcessing
                    ? "cursor-not-allowed border-slate-200 bg-slate-100"
                    : "border-slate-300 bg-slate-50 hover:border-emerald-300 hover:bg-emerald-50"
                }`}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                  <Upload size={26} />
                </div>

                <p className="mt-5 text-sm font-semibold text-slate-900">
                  Click to upload a CSV file
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  CSV files only
                </p>

                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  disabled={isProcessing}
                  className="hidden"
                />
              </label>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle
                  size={18}
                  className="mt-0.5 shrink-0"
                />

                <span>{error}</span>
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0"
                />

                <span>{success}</span>
              </div>
            )}

            {/* Selected file */}
            {file && (
              <div className="mt-5 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-emerald-600">
                    <FileSpreadsheet size={22} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {file.name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>

                <CheckCircle2
                  size={22}
                  className="text-emerald-600"
                />
              </div>
            )}
          </div>

          {/* ------------------------------------------------ */}
          {/* INFORMATION                                     */}
          {/* ------------------------------------------------ */}

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <FileSpreadsheet size={21} />
              </div>

              <div>
                <h2 className="font-bold text-slate-900">
                  What happens next?
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  RiskLens will validate the applicant data,
                  send the records to the selected credit risk
                  model, and return a result for each applicant.
                </p>

                <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                    CSV Validation
                  </span>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                    Risk Prediction
                  </span>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                    Score
                  </span>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                    Rating
                  </span>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                    Decision
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------ */}
          {/* ACTION BUTTONS                                  */}
          {/* ------------------------------------------------ */}

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            {file && !isProcessing && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <RotateCcw size={17} />
                Clear
              </button>
            )}

            <button
              type="button"
              disabled={!file || isProcessing}
              onClick={handleProcess}
              className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 ${
                track === "TRACK_A"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                  Processing...
                </>
              ) : (
                <>
                  Validate & Continue
                  <ArrowLeft
                    size={17}
                    className="rotate-180"
                  />
                </>
              )}
            </button>
          </div>

          {/* ------------------------------------------------ */}
          {/* PROCESSING STATUS                                */}
          {/* ------------------------------------------------ */}

          {isProcessing && (
            <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-blue-600">
                  <Loader2
                    size={22}
                    className="animate-spin"
                  />
                </div>

                <div>
                  <h2 className="font-bold text-slate-900">
                    Processing assessment...
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    RiskLens is validating and scoring your
                    applicants using{" "}
                    <span className="font-semibold">
                      {track === "TRACK_A"
                        ? "Track A"
                        : "Track B"}
                    </span>
                    .
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------ */}
          {/* RESULTS                                         */}
          {/* ------------------------------------------------ */}

          {results.length > 0 && !isProcessing && (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">

              {/* Result header */}
              <div className="flex flex-col gap-4 border-b border-slate-200 p-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <p
                    className={`text-sm font-semibold ${
                      track === "TRACK_A"
                        ? "text-emerald-600"
                        : "text-blue-600"
                    }`}
                  >
                    {track === "TRACK_A"
                      ? "TRACK A"
                      : "TRACK B"}{" "}
                    · RESULTS
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-slate-900">
                    Assessment Results
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {processedCount} applicant
                    {processedCount === 1 ? "" : "s"} assessed
                    successfully.
                    {processedCount > results.length && (
                      <> Showing the first {results.length}.</>
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <Download size={18} />
                  Download Results CSV
                </button>
              </div>

              {/* Result table */}
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">

                  <thead className="bg-slate-50">
                    <tr>
                      {resultHeaders.map((header) => (
                        <th
                          key={header}
                          className="whitespace-nowrap border-b border-slate-200 px-5 py-4 font-semibold text-slate-700"
                        >
                          {formatHeader(header)}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {results.map((row, rowIndex) => (
                      <tr
                        key={rowIndex}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                      >
                        {resultHeaders.map((header) => {
                          const value = row[header];

                          const isDecision =
                            header === "decision";

                          const isRating =
                            header === "rating";

                          return (
                            <td
                              key={`${rowIndex}-${header}`}
                              className="whitespace-nowrap px-5 py-4 text-slate-600"
                            >
                              {isDecision ? (
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                                    value === "APPROVE"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : value === "REJECT"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-amber-100 text-amber-700"
                                  }`}
                                >
                                  {value}
                                </span>
                              ) : isRating ? (
                                <span className="font-bold text-slate-900">
                                  {value}
                                </span>
                              ) : (
                                formatCell(header, value)
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>

                </table>
              </div>

              {/* Result footer */}
              <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
                <div className="flex flex-col gap-2 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
                  <span>
                    Scored by{" "}
                    <span className="font-semibold text-slate-700">
                      {track}
                    </span>
                  </span>

                  <span>
                    {processedCount} result
                    {processedCount === 1 ? "" : "s"} returned
                  </span>
                </div>
              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
}