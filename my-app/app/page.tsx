"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldCheck,
  Upload,
  UserRoundSearch,
  Users,
  XCircle,
} from "lucide-react";

import Sidebar from "@/components/Sidebar";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type DashboardAssessment = {
  id: string;
  applicant_id: string | number | null;
  track: string | null;
  score: number | null;
  decision: string | null;
  status: string;
  created_at: string | null;
};

type DashboardResponse = {
  total_assessments: number;
  approved: { count: number; percentage: number };
  referred: { count: number; percentage: number };
  rejected: { count: number; percentage: number };
  recent_assessments: DashboardAssessment[];
};

const emptyDashboard: DashboardResponse = {
  total_assessments: 0,
  approved: { count: 0, percentage: 0 },
  referred: { count: 0, percentage: 0 },
  rejected: { count: 0, percentage: 0 },
  recent_assessments: [],
};

function formatTrack(track: string | null) {
  if (!track) return "—";
  return track
    .replace(/_/g, " ")
    .replace(/\bTRACK A\b/i, "Track A")
    .replace(/\bTRACK B\b/i, "Track B");
}

function formatDecision(decision: string | null) {
  if (!decision) return "—";
  return decision === "APPROVE" ? "APPROVED" : decision;
}

function formatScore(score: number | null) {
  return typeof score === "number" && Number.isFinite(score)
    ? Math.round(score).toString()
    : "—";
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Sparkline({ tone }: { tone: "blue" | "green" | "amber" | "red" }) {
  const paths = {
    blue: "M0 25 C18 18 22 32 39 25 S60 17 77 25 S98 32 115 22 S135 15 153 25 S175 32 192 20",
    green: "M0 22 C18 14 27 30 44 23 S66 16 82 24 S103 30 120 20 S141 14 158 22 S177 27 192 17",
    amber: "M0 23 C18 16 25 29 41 22 S63 18 80 24 S101 31 119 21 S141 16 158 24 S178 28 192 18",
    red: "M0 24 C17 17 26 31 43 23 S64 16 81 24 S102 30 120 22 S140 17 158 24 S177 31 192 19",
  };

  const strokes = {
    blue: "#3b82f6",
    green: "#10b981",
    amber: "#f59e0b",
    red: "#ef4444",
  };

  return (
    <svg
      viewBox="0 0 192 36"
      preserveAspectRatio="none"
      className="mt-4 h-7 w-full"
      aria-hidden="true"
    >
      <path
        d={paths[tone]}
        fill="none"
        stroke={strokes[tone]}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Home() {
  const [dashboard, setDashboard] =
    useState<DashboardResponse>(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setError(null);

      const response = await fetch(`${API_URL}/api/dashboard`, {
        cache: "no-store",
      });

      if (!response.ok) {
        let message = "Unable to load dashboard data.";

        try {
          const data = await response.json();
          if (typeof data.detail === "string") {
            message = data.detail;
          } else if (data.detail?.message) {
            message = data.detail.message;
          }
        } catch {
          // Keep default message.
        }

        throw new Error(message);
      }

      const data: DashboardResponse = await response.json();

      setDashboard({
        ...emptyDashboard,
        ...data,
        approved: {
          ...emptyDashboard.approved,
          ...(data.approved ?? {}),
        },
        referred: {
          ...emptyDashboard.referred,
          ...(data.referred ?? {}),
        },
        rejected: {
          ...emptyDashboard.rejected,
          ...(data.rejected ?? {}),
        },
        recent_assessments: data.recent_assessments ?? [],
      });

      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();

    const interval = window.setInterval(loadDashboard, 15000);
    return () => window.clearInterval(interval);
  }, [loadDashboard]);

  const total = dashboard.total_assessments;
  const approvedPct = dashboard.approved.percentage;
  const referredPct = dashboard.referred.percentage;
  const rejectedPct = dashboard.rejected.percentage;

  const decisionTotal = useMemo(
    () =>
      dashboard.approved.count +
      dashboard.referred.count +
      dashboard.rejected.count,
    [dashboard]
  );

  const recentAssessments = dashboard.recent_assessments ?? [];

  const metricCards = [
    {
      title: "Total assessments",
      value: total.toLocaleString(),
      detail: "Applications processed",
      icon: Users,
      tone: "blue" as const,
      bg: "bg-blue-50/60",
      iconBg: "bg-blue-100/80 text-blue-600",
    },
    {
      title: "Approved",
      value: `${approvedPct}%`,
      detail: `${dashboard.approved.count} applicants`,
      icon: CheckCircle2,
      tone: "green" as const,
      bg: "bg-emerald-50/55",
      iconBg: "bg-emerald-100/80 text-emerald-600",
    },
    {
      title: "Referred",
      value: `${referredPct}%`,
      detail: `${dashboard.referred.count} applicants`,
      icon: Clock3,
      tone: "amber" as const,
      bg: "bg-amber-50/55",
      iconBg: "bg-amber-100/80 text-amber-600",
    },
    {
      title: "Rejected",
      value: `${rejectedPct}%`,
      detail: `${dashboard.rejected.count} applicants`,
      icon: XCircle,
      tone: "red" as const,
      bg: "bg-red-50/55",
      iconBg: "bg-red-100/80 text-red-600",
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#f3f7f8] text-slate-950">
      <Sidebar />

      <main className="min-w-0 flex-1 px-4 pb-14 pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1420px]">

          {/* HERO */}
          <header className="relative mb-5 min-h-[190px] overflow-hidden rounded-[26px] border border-emerald-100/80 bg-gradient-to-br from-[#f7fbfa] via-[#eef8f5] to-[#dff4ec] px-6 py-7 shadow-[0_10px_35px_rgba(15,23,42,0.055)] sm:px-8 sm:py-8">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <svg
                className="absolute -right-4 top-0 h-full w-[58%] opacity-50"
                viewBox="0 0 700 250"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M0 160 C170 45 290 65 410 120 S590 185 730 65"
                  stroke="#ccefe4"
                  strokeWidth="1.5"
                />
                <path
                  d="M30 190 C190 75 300 82 425 135 S600 190 730 95"
                  stroke="#dbeafe"
                  strokeWidth="1.5"
                />
                <path
                  d="M70 215 C210 120 330 110 445 150 S620 205 730 125"
                  stroke="#e2e8f0"
                  strokeWidth="1.5"
                />
              </svg>

              <div className="absolute right-[25%] top-6 hidden h-24 w-24 rotate-6 rounded-[24px] bg-emerald-100/40 blur-2xl sm:block" />
              <div className="absolute right-[27%] top-8 hidden sm:block">
                <div className="flex h-24 w-24 items-center justify-center rounded-[22px] border border-emerald-200/70 bg-emerald-100/35 shadow-sm backdrop-blur">
                  <ShieldCheck
                    size={52}
                    strokeWidth={1.4}
                    className="text-emerald-500/75"
                  />
                </div>
              </div>
            </div>

            <div className="relative z-10 flex h-full flex-col justify-between gap-7 lg:flex-row lg:items-end">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/75 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-700 shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Credit intelligence
                </div>

                <h1 className="text-[2.6rem] font-bold leading-none tracking-[-0.055em] text-slate-950 sm:text-5xl">
                  Dashboard
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-[15px]">
                  A clear view of your lending activity, decision outcomes,
                  and latest applicant assessments.
                </p>
              </div>

              <div className="relative flex items-center gap-2.5">
                <div className="hidden rounded-xl border border-slate-200 bg-white/85 px-4 py-2.5 shadow-sm sm:block">
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Workspace
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-slate-700">
                    Risk Analyst
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Notifications"
                  className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white/90 text-slate-500 shadow-sm transition hover:border-emerald-200 hover:text-emerald-600"
                >
                  <Bell size={19} />
                  <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </button>

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-xs font-bold text-white shadow-sm">
                  VR
                </div>
              </div>
            </div>
          </header>

          {/* LIVE STATUS */}
          <div className="mb-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_5px_20px_rgba(15,23,42,0.025)] sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-center gap-3">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full ${
                  error ? "bg-red-50" : "bg-emerald-50"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    error
                      ? "bg-red-500"
                      : loading
                        ? "bg-amber-400"
                        : "bg-emerald-500"
                  }`}
                />
              </span>

              <div className="text-xs">
                <span className="font-bold text-slate-700">
                  {error
                    ? "Dashboard sync interrupted"
                    : loading
                      ? "Synchronizing live data"
                      : "Live data connected"}
                </span>

                {lastUpdated && !error ? (
                  <span className="ml-2 text-slate-400">
                    Updated {lastUpdated.toLocaleTimeString()}
                  </span>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={loadDashboard}
              disabled={loading}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={loading ? "animate-spin" : ""}
              />
              Refresh data
            </button>
          </div>

          {error ? (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-700">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">
                  Dashboard data could not be loaded.
                </p>
                <p className="mt-1 text-xs text-red-600">{error}</p>
              </div>
            </div>
          ) : null}

          {/* KPI CARDS */}
          <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metricCards.map((stat) => {
              const Icon = stat.icon;

              return (
                <article
                  key={stat.title}
                  className={`relative overflow-hidden rounded-2xl border border-slate-200 ${stat.bg} px-5 py-5 shadow-[0_7px_24px_rgba(15,23,42,0.035)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(15,23,42,0.06)]`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                        {stat.title}
                      </p>

                      <p className="mt-2 text-[2.05rem] font-bold leading-none tracking-[-0.05em] text-slate-950">
                        {loading ? "—" : stat.value}
                      </p>

                      <p className="mt-2 text-xs font-medium text-slate-500">
                        {loading ? "Loading…" : stat.detail}
                      </p>
                    </div>

                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.iconBg}`}
                    >
                      <Icon size={21} strokeWidth={1.8} />
                    </span>
                  </div>

                  <Sparkline tone={stat.tone} />
                </article>
              );
            })}
          </section>

          {/* PORTFOLIO + QUICK ACTIONS */}
          <section className="grid gap-5 lg:grid-cols-[1.6fr_0.9fr]">

            <article className="rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-[0_7px_25px_rgba(15,23,42,0.035)] sm:px-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.13em] text-emerald-600">
                    <span className="h-1.5 w-7 rounded-full bg-emerald-500" />
                    Portfolio snapshot
                  </div>

                  <h2 className="mt-2 text-xl font-bold tracking-[-0.03em] text-slate-950">
                    Decision distribution
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Current outcome mix across processed applications.
                  </p>
                </div>

                <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-500">
                  {decisionTotal.toLocaleString()} decisions
                </span>
              </div>

              <div className="mt-7 overflow-hidden rounded-full bg-slate-100">
                <div className="flex h-3">
                  <div
                    className="bg-emerald-500"
                    style={{ width: `${approvedPct}%` }}
                  />
                  <div
                    className="bg-amber-400"
                    style={{ width: `${referredPct}%` }}
                  />
                  <div
                    className="bg-red-500"
                    style={{ width: `${rejectedPct}%` }}
                  />
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/55 px-4 py-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Approved
                  </div>
                  <div className="mt-2 flex items-end justify-between">
                    <span className="text-2xl font-bold text-slate-950">
                      {dashboard.approved.count}
                    </span>
                    <span className="text-xs font-bold text-emerald-600">
                      {approvedPct}%
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-100 bg-amber-50/55 px-4 py-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-700">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    Referred
                  </div>
                  <div className="mt-2 flex items-end justify-between">
                    <span className="text-2xl font-bold text-slate-950">
                      {dashboard.referred.count}
                    </span>
                    <span className="text-xs font-bold text-amber-600">
                      {referredPct}%
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-red-100 bg-red-50/55 px-4 py-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-red-700">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    Rejected
                  </div>
                  <div className="mt-2 flex items-end justify-between">
                    <span className="text-2xl font-bold text-slate-950">
                      {dashboard.rejected.count}
                    </span>
                    <span className="text-xs font-bold text-red-600">
                      {rejectedPct}%
                    </span>
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-[0_7px_25px_rgba(15,23,42,0.035)] sm:px-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">
                    Quick actions
                  </p>

                  <h2 className="mt-2 text-xl font-bold tracking-[-0.03em] text-slate-950">
                    Start an assessment
                  </h2>
                </div>

                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                  <ArrowUpRight size={18} />
                </span>
              </div>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Choose the workflow that matches your applicant data.
              </p>

              <div className="mt-5 space-y-3">
                <Link
                  href="/single-assessment"
                  className="group flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3.5 transition hover:border-emerald-200 hover:bg-emerald-50"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm">
                    <UserRoundSearch size={18} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-slate-800">
                      Single assessment
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      Evaluate one applicant
                    </span>
                  </span>

                  <ArrowRight
                    size={17}
                    className="text-emerald-600 transition group-hover:translate-x-0.5"
                  />
                </Link>

                <Link
                  href="/bulk-assessment"
                  className="group flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/55 px-4 py-3.5 transition hover:border-blue-200 hover:bg-blue-50"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
                    <Upload size={18} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-slate-800">
                      Bulk assessment
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      Process an applicant dataset
                    </span>
                  </span>

                  <ArrowRight
                    size={17}
                    className="text-blue-600 transition group-hover:translate-x-0.5"
                  />
                </Link>
              </div>
            </article>
          </section>

          {/* RECENT ASSESSMENTS */}
          <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_7px_25px_rgba(15,23,42,0.035)]">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">
                  Recent assessments
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Latest decisions processed by ASTRA.
                </p>
              </div>

              <Link
                href="/history"
                className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700"
              >
                View full history
                <ArrowUpRight size={14} />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left">
                <thead className="border-b border-slate-100 bg-slate-50/75">
                  <tr>
                    {["Applicant", "Track", "Risk score", "Decision", "Status", "Processed"].map(
                      (heading) => (
                        <th
                          key={heading}
                          className="px-6 py-3 text-[9px] font-bold uppercase tracking-[0.11em] text-slate-400"
                        >
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <tr key={index}>
                        <td colSpan={6} className="px-6 py-4">
                          <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
                        </td>
                      </tr>
                    ))
                  ) : recentAssessments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-14 text-center">
                        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                          <Users size={18} />
                        </div>
                        <p className="mt-3 text-sm font-bold text-slate-700">
                          No assessments yet
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Completed assessments will appear here.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    recentAssessments.map((assessment) => {
                      const decision = formatDecision(assessment.decision);

                      const tone =
                        decision === "APPROVED"
                          ? {
                              dot: "bg-emerald-500",
                              text: "text-emerald-700",
                              bg: "bg-emerald-50",
                            }
                          : decision === "REFER"
                            ? {
                                dot: "bg-amber-400",
                                text: "text-amber-700",
                                bg: "bg-amber-50",
                              }
                            : decision === "REJECT"
                              ? {
                                  dot: "bg-red-500",
                                  text: "text-red-700",
                                  bg: "bg-red-50",
                                }
                              : {
                                  dot: "bg-slate-400",
                                  text: "text-slate-600",
                                  bg: "bg-slate-50",
                                };

                      return (
                        <tr
                          key={assessment.id}
                          className="transition hover:bg-slate-50/60"
                        >
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-slate-800">
                              {assessment.applicant_id ?? assessment.id}
                            </p>
                            <p className="mt-0.5 text-[10px] text-slate-400">
                              ID {assessment.id.slice(0, 8)}
                            </p>
                          </td>

                          <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                            {formatTrack(assessment.track)}
                          </td>

                          <td className="px-6 py-4">
                            <span className="font-mono text-sm font-bold text-slate-900">
                              {formatScore(assessment.score)}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${tone.bg} ${tone.text}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                              {decision}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              {assessment.status || "Completed"}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <p className="text-xs font-semibold text-slate-600">
                              {formatDate(assessment.created_at)}
                            </p>
                            <p className="mt-0.5 text-[10px] text-slate-400">
                              {formatTime(assessment.created_at)}
                            </p>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
