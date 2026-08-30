"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Database,
  Eye,
  Lock,
  CheckCircle2,
} from "lucide-react";

export default function ConsentPage() {
  const [consent, setConsent] = useState(false);
  const router = useRouter();

  const handleContinue = () => {
    if (consent) {
      router.push("/");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <ShieldCheck size={30} />
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            Your Consent Matters
          </h1>

          <p className="mt-3 text-slate-600">
            Before we process your financial information, please review how
            your data will be used.
          </p>
        </div>

        {/* Consent Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          
          <h2 className="text-xl font-semibold text-slate-900">
            Data Processing Consent
          </h2>

          <p className="mt-3 leading-7 text-slate-600">
            RiskLens uses the financial and credit-related information provided
            by you to perform a credit risk assessment and generate an
            explainable lending decision.
          </p>

          {/* Information Cards */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            
            <InfoCard
              icon={<Database size={20} />}
              title="Data We Analyze"
              description="Credit history, income information, repayment patterns, and alternative financial indicators."
            />

            <InfoCard
              icon={<Eye size={20} />}
              title="Purpose"
              description="Your information is used to assess credit risk and support lending decisions."
            />

            <InfoCard
              icon={<Lock size={20} />}
              title="Data Protection"
              description="Your submitted information is handled securely for the purpose of this assessment."
            />

            <InfoCard
              icon={<CheckCircle2 size={20} />}
              title="Explainable Decisions"
              description="RiskLens provides key factors that influenced the credit decision."
            />

          </div>

          {/* Consent Checkbox */}
          <label className="mt-8 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 h-5 w-5 cursor-pointer accent-blue-600"
            />

            <span className="text-sm leading-6 text-slate-700">
              I have read and understood how my financial and credit-related
              information will be processed. I voluntarily consent to the use
              of this information for credit risk assessment and lending
              decision purposes.
            </span>
          </label>

          {/* Button */}
          <button
            onClick={handleContinue}
            disabled={!consent}
            className={`mt-6 w-full rounded-xl px-6 py-4 font-semibold transition ${
              consent
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "cursor-not-allowed bg-slate-200 text-slate-400"
            }`}
          >
            Continue to RiskLens →
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          You must provide consent before continuing with the credit
          assessment process.
        </p>
      </div>
    </main>
  );
}

function InfoCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-5">
      <div className="mb-3 text-blue-600">{icon}</div>

      <h3 className="font-semibold text-slate-900">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        {description}
      </p>
    </div>
  );
}