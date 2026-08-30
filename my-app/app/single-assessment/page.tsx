import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Wallet,
} from "lucide-react";

import Sidebar from "@/components/Sidebar";

export default function SingleAssessment() {
  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="min-w-0 flex-1 p-8">
        <div className="mx-auto max-w-5xl">

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
              SINGLE ASSESSMENT
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Select Applicant Type
            </h1>

            <p className="mt-3 max-w-2xl text-slate-500">
              Choose the assessment track based on the applicant's available
              financial and credit information.
            </p>
          </div>

          {/* Assessment options */}
          <div className="mt-10 grid gap-6 md:grid-cols-2">

            {/* Track A */}
            <Link
              href="/single-assessment/bureau"
              className="group rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <Building2 size={28} />
                </div>

                <ArrowRight
                  size={20}
                  className="text-slate-400 transition group-hover:text-emerald-600"
                />
              </div>

              <p className="mt-6 text-sm font-semibold text-emerald-600">
                TRACK A · BUREAU DATA
              </p>

              <h2 className="mt-2 text-xl font-bold text-slate-900">
                Credit History Assessment
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Use this track when the applicant has traditional credit
                bureau information such as active accounts, credit history,
                outstanding debt and payment history.
              </p>

              <div className="mt-6 text-sm font-semibold text-emerald-600">
                Continue with Track A →
              </div>
            </Link>

            {/* Track B */}
            <Link
              href="/single-assessment/alternative"
              className="group rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Wallet size={28} />
                </div>

                <ArrowRight
                  size={20}
                  className="text-slate-400 transition group-hover:text-blue-600"
                />
              </div>

              <p className="mt-6 text-sm font-semibold text-blue-600">
                TRACK B · ALTERNATIVE DATA
              </p>

              <h2 className="mt-2 text-xl font-bold text-slate-900">
                Alternative Data Assessment
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Use this track when traditional credit bureau history is
                limited or unavailable. The assessment uses alternative
                financial behaviour indicators.
              </p>

              <div className="mt-6 text-sm font-semibold text-blue-600">
                Continue with Track B →
              </div>
            </Link>

          </div>

          {/* Information note */}
          <div className="mt-8 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-sm leading-6 text-slate-600">
              <span className="font-semibold text-slate-900">
                Which track should I choose?
              </span>{" "}
              Select Track A when traditional bureau data is available.
              Select Track B when the applicant has limited or no traditional
              credit history.
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}