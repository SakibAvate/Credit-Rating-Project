"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";

import {
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  History,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";

import Sidebar from "@/components/Sidebar";

const API_URL = "http://127.0.0.1:8000";
const PAGE_SIZE = 50;

type TrackFilter = "ALL" | "TRACK_A" | "TRACK_B";
type DecisionFilter = "ALL" | "APPROVE" | "REFER" | "REJECT";

type Assessment = {
  id: string;
  applicant_id: string | number | null;
  track: string;
  pred_default_prob: number;
  creditworthiness_score: number;
  rating: string;
  decision: string;
  scored_by: string;
  top_reasons?: string | null;
  source?: string;
  batch_id?: string | null;
  created_at: string;
};

type HistoryResponse = {
  items: Assessment[];
  total: number;
  skip: number;
  limit: number;
};

export default function AssessmentHistory() {
  const [items, setItems] = useState<Assessment[]>([]);
  const [total, setTotal] = useState(0);

  const [track, setTrack] =
    useState<TrackFilter>("ALL");

  const [decision, setDecision] =
    useState<DecisionFilter>("ALL");

  const [search, setSearch] = useState("");

  const [page, setPage] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ============================================================
  // LOAD HISTORY
  // ============================================================

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        skip: String(page * PAGE_SIZE),
        limit: String(PAGE_SIZE),
      });

      if (track !== "ALL") {
        params.set("track", track);
      }

      if (decision !== "ALL") {
        params.set("decision", decision);
      }

      if (search.trim()) {
        params.set("search", search.trim());
      }

      const response = await fetch(
        `${API_URL}/api/history?${params.toString()}`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        let message =
          "Unable to load assessment history.";

        try {
          const data = await response.json();

          if (typeof data.detail === "string") {
            message = data.detail;
          } else if (data.detail?.message) {
            message = data.detail.message;
          }
        } catch {
          // Keep default error message.
        }

        throw new Error(message);
      }

      const data: HistoryResponse =
        await response.json();

      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setItems([]);
      setTotal(0);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load assessment history."
      );
    } finally {
      setLoading(false);
    }
  }, [decision, page, search, track]);

  // ============================================================
  // INITIAL LOAD / FILTER LOAD
  // ============================================================

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // ============================================================
  // PAGINATION
  // ============================================================

  const totalPages = Math.max(
    1,
    Math.ceil(total / PAGE_SIZE)
  );

  const handleTrackChange = (
    value: TrackFilter
  ) => {
    setTrack(value);
    setPage(0);
  };

  const handleDecisionChange = (
    value: DecisionFilter
  ) => {
    setDecision(value);
    setPage(0);
  };

  const handleSearch = () => {
    setPage(0);
    loadHistory();
  };

  // ============================================================
  // FORMATTING
  // ============================================================

  const formatProbability = (value: number) => {
    if (!Number.isFinite(value)) {
      return "—";
    }

    return `${(value * 100).toFixed(2)}%`;
  };

  const formatScore = (value: number) => {
    if (!Number.isFinite(value)) {
      return "—";
    }

    return Math.round(value).toString();
  };

  const formatDate = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleString();
  };

  const decisionClass = (value: string) => {
    if (value === "APPROVE") {
      return "bg-emerald-100 text-emerald-700";
    }

    if (value === "REJECT") {
      return "bg-red-100 text-red-700";
    }

    return "bg-amber-100 text-amber-700";
  };

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="min-w-0 flex-1 p-8">
        <div className="mx-auto max-w-7xl">

          {/* ====================================================
              BACK TO DASHBOARD
          ==================================================== */}

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft size={18} />
            Back to dashboard
          </Link>

          {/* ====================================================
              HEADER
          ==================================================== */}

          <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <History size={27} />
              </div>

              <p className="mt-6 text-sm font-semibold text-emerald-600">
                ASSESSMENT HISTORY
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                Assessment History
              </h1>

              <p className="mt-3 max-w-2xl text-slate-500">
                View completed Track A and Track B
                credit decisions stored by RiskLens.
              </p>

            </div>

            {/* Refresh button */}

            <button
              type="button"
              onClick={loadHistory}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={17}
                className={
                  loading ? "animate-spin" : ""
                }
              />

              Refresh
            </button>

          </div>

          {/* ====================================================
              FILTERS
          ==================================================== */}

          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr_auto] lg:items-end">

              {/* Search */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Search Applicant ID
                </label>

                <div className="flex rounded-xl border border-slate-300 bg-white focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100">

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        handleSearch();
                      }
                    }}
                    placeholder="Example: A-1001 or TB000001"
                    className="min-w-0 flex-1 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none"
                  />

                  <button
                    type="button"
                    onClick={handleSearch}
                    className="px-4 text-slate-500 transition hover:text-emerald-600"
                    aria-label="Search"
                  >
                    <Search size={18} />
                  </button>

                </div>

              </div>

              {/* Track */}

              <FilterSelect
                label="Track"
                value={track}
                onChange={(value) =>
                  handleTrackChange(
                    value as TrackFilter
                  )
                }
                options={[
                  ["ALL", "All Tracks"],
                  ["TRACK_A", "Track A"],
                  ["TRACK_B", "Track B"],
                ]}
              />

              {/* Decision */}

              <FilterSelect
                label="Decision"
                value={decision}
                onChange={(value) =>
                  handleDecisionChange(
                    value as DecisionFilter
                  )
                }
                options={[
                  ["ALL", "All Decisions"],
                  ["APPROVE", "Approve"],
                  ["REFER", "Refer"],
                  ["REJECT", "Reject"],
                ]}
              />

              {/* Count */}

              <div className="text-sm text-slate-500">

                <span className="font-semibold text-slate-900">
                  {total.toLocaleString()}
                </span>{" "}

                record
                {total === 1 ? "" : "s"}

              </div>

            </div>

          </section>

          {/* ====================================================
              ERROR
          ==================================================== */}

          {error && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">

              <AlertCircle
                size={19}
                className="mt-0.5 shrink-0"
              />

              <span>{error}</span>

            </div>
          )}

          {/* ====================================================
              RESULTS TABLE
          ==================================================== */}

          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            {loading ? (

              <div className="flex min-h-72 items-center justify-center gap-3 text-sm text-slate-500">

                <Loader2
                  size={20}
                  className="animate-spin"
                />

                Loading assessment history...

              </div>

            ) : items.length === 0 ? (

              <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <History size={25} />
                </div>

                <h2 className="mt-4 text-lg font-bold text-slate-900">
                  No assessments found
                </h2>

                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Completed assessments will appear
                  here once the history database is
                  connected and an assessment has been
                  processed.
                </p>

              </div>

            ) : (

              <>

                {/* =================================================
                    TABLE
                ================================================= */}

                <div className="overflow-x-auto">

                  <table className="min-w-full text-left text-sm">

                    <thead className="bg-slate-50">

                      <tr>

                        <TableHeader>
                          Applicant ID
                        </TableHeader>

                        <TableHeader>
                          Track
                        </TableHeader>

                        <TableHeader>
                          Default Prob
                        </TableHeader>

                        <TableHeader>
                          Credit Score
                        </TableHeader>

                        <TableHeader>
                          Rating
                        </TableHeader>

                        <TableHeader>
                          Decision
                        </TableHeader>

                        <TableHeader>
                          Source
                        </TableHeader>

                        <TableHeader>
                          Date
                        </TableHeader>

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-slate-100">

                      {items.map((item) => (

                        <tr
                          key={item.id}
                          className="transition hover:bg-slate-50"
                        >

                          {/* Applicant ID */}

                          <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-900">
                            {item.applicant_id ?? "—"}
                          </td>

                          {/* Track */}

                          <td className="whitespace-nowrap px-5 py-4">

                            <span
                              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                                item.track === "TRACK_A"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-blue-50 text-blue-700"
                              }`}
                            >
                              {item.track}
                            </span>

                          </td>

                          {/* Probability */}

                          <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                            {formatProbability(
                              item.pred_default_prob
                            )}
                          </td>

                          {/* Score */}

                          <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-900">
                            {formatScore(
                              item.creditworthiness_score
                            )}
                          </td>

                          {/* Rating */}

                          <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-900">
                            {item.rating}
                          </td>

                          {/* Decision */}

                          <td className="whitespace-nowrap px-5 py-4">

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${decisionClass(
                                item.decision
                              )}`}
                            >
                              {item.decision}
                            </span>

                          </td>

                          {/* Source */}

                          <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                            {item.source === "bulk"
                              ? "Bulk"
                              : "Single"}
                          </td>

                          {/* Date */}

                          <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                            {formatDate(
                              item.created_at
                            )}
                          </td>

                        </tr>

                      ))}

                    </tbody>

                  </table>

                </div>

                {/* =================================================
                    PAGINATION
                ================================================= */}

                <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

                  <p className="text-xs text-slate-500">

                    Showing{" "}

                    {page * PAGE_SIZE + 1}
                    –

                    {Math.min(
                      (page + 1) * PAGE_SIZE,
                      total
                    )}{" "}

                    of{" "}

                    {total.toLocaleString()}

                  </p>

                  <div className="flex items-center gap-2">

                    <button
                      type="button"
                      disabled={
                        page === 0 || loading
                      }
                      onClick={() =>
                        setPage(
                          (current) =>
                            current - 1
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft size={15} />
                      Previous
                    </button>

                    <span className="px-2 text-xs font-semibold text-slate-600">
                      Page {page + 1} of{" "}
                      {totalPages}
                    </span>

                    <button
                      type="button"
                      disabled={
                        page >=
                          totalPages - 1 ||
                        loading
                      }
                      onClick={() =>
                        setPage(
                          (current) =>
                            current + 1
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                      <ChevronRight size={15} />
                    </button>

                  </div>

                </div>

              </>

            )}

          </section>

        </div>
      </main>
    </div>
  );
}

// ============================================================
// FILTER SELECT
// ============================================================

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <div>

      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
      >

        {options.map(
          ([optionValue, optionLabel]) => (
            <option
              key={optionValue}
              value={optionValue}
            >
              {optionLabel}
            </option>
          )
        )}

      </select>

    </div>
  );
}

// ============================================================
// TABLE HEADER
// ============================================================

function TableHeader({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <th className="whitespace-nowrap border-b border-slate-200 px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
      {children}
    </th>
  );
}