import Link from "next/link";
import {
  Bell,
  UserRoundSearch,
  Upload,
  ArrowUpRight,
  Users,
  CheckCircle2,
  Clock3,
  XCircle,
} from "lucide-react";

import Sidebar from "@/components/Sidebar";

const recentAssessments = [
  {
    id: "A-1001",
    track: "Track A",
    score: 742,
    decision: "APPROVED",
    status: "Completed",
  },
  {
    id: "A-1002",
    track: "Track B",
    score: 615,
    decision: "REFER",
    status: "Completed",
  },
  {
    id: "A-1003",
    track: "Track A",
    score: 421,
    decision: "REJECT",
    status: "Completed",
  },
  {
    id: "A-1004",
    track: "Track B",
    score: 781,
    decision: "APPROVED",
    status: "Completed",
  },
];

const stats = [
  {
    title: "Total Assessments",
    value: "1,248",
    description: "This month",
    icon: Users,
    iconColor: "bg-blue-50 text-blue-600",
  },
  {
    title: "Approved",
    value: "68%",
    description: "848 applicants",
    icon: CheckCircle2,
    iconColor: "bg-emerald-50 text-emerald-600",
  },
  {
    title: "Referred",
    value: "18%",
    description: "225 applicants",
    icon: Clock3,
    iconColor: "bg-amber-50 text-amber-600",
  },
  {
    title: "Rejected",
    value: "14%",
    description: "175 applicants",
    icon: XCircle,
    iconColor: "bg-red-50 text-red-600",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="min-w-0 flex-1 p-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-600">
              CREDIT DECISION CENTER
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Dashboard
            </h1>

            <p className="mt-2 text-slate-500">
              Overview of your lending operations and credit assessments.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button className="rounded-full border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm transition hover:bg-slate-50">
              <Bell size={20} />
            </button>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              VR
            </div>
          </div>
        </div>

        {/* Statistics */}
        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      {stat.title}
                    </p>

                    <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                      {stat.value}
                    </h2>

                    <p className="mt-2 text-sm text-slate-400">
                      {stat.description}
                    </p>
                  </div>

                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.iconColor}`}
                  >
                    <Icon size={21} />
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Quick Actions */}
        <section className="mt-10">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Quick Actions
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Start a new credit assessment.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Link
              href="/single-assessment"
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <UserRoundSearch size={24} />
                </div>

                <ArrowUpRight
                  size={20}
                  className="text-slate-400 transition group-hover:text-emerald-600"
                />
              </div>

              <h3 className="mt-5 text-lg font-semibold text-slate-900">
                Single Assessment
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Score an individual applicant using bureau history or
                alternative financial data.
              </p>

              <div className="mt-5 text-sm font-semibold text-emerald-600">
                Start assessment →
              </div>
            </Link>

            <Link
              href="/bulk-assessment"
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Upload size={24} />
                </div>

                <ArrowUpRight
                  size={20}
                  className="text-slate-400 transition group-hover:text-blue-600"
                />
              </div>

              <h3 className="mt-5 text-lg font-semibold text-slate-900">
                Bulk Assessment
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Upload a dataset and automatically score multiple applicants
                using the appropriate model.
              </p>

              <div className="mt-5 text-sm font-semibold text-blue-600">
                Upload dataset →
              </div>
            </Link>
          </div>
        </section>

        {/* Recent Assessments */}
        <section className="mt-10">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Recent Assessments
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Latest credit decisions processed by the system.
              </p>
            </div>

            <button className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">
              View all
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Applicant
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Track
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Risk Score
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Decision
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {recentAssessments.map((assessment) => (
                    <tr
                      key={assessment.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900">
                          {assessment.id}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {assessment.track}
                        </span>
                      </td>

                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {assessment.score}
                      </td>

                      <td className="px-6 py-4">
                        <DecisionBadge decision={assessment.decision} />
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-500">
                          {assessment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function DecisionBadge({ decision }: { decision: string }) {
  const styles = {
    APPROVED: "bg-emerald-50 text-emerald-700",
    REFER: "bg-amber-50 text-amber-700",
    REJECT: "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        styles[decision as keyof typeof styles]
      }`}
    >
      {decision}
    </span>
  );
}