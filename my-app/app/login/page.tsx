"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Mail, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    // For now, this is a demo login.
    // Later, we can connect it to FastAPI/database authentication.

    if (email && password) {
      router.push("/consent");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl md:grid-cols-2">

        {/* Left Side */}
        <div className="hidden bg-slate-900 p-10 text-white md:flex md:flex-col md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600">
                <ShieldCheck size={24} />
              </div>

              <span className="text-xl font-bold">
                RiskLens
              </span>
            </div>

            <div className="mt-16">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-400">
                Intelligent Lending
              </p>

              <h1 className="mt-4 text-4xl font-bold leading-tight">
                Smarter credit decisions.
                <br />
                Faster lending.
              </h1>

              <p className="mt-5 max-w-md leading-7 text-slate-400">
                RiskLens combines traditional credit history and alternative
                financial data to provide fast and explainable credit
                assessments.
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-500">
            Secure • Explainable • Inclusive
          </p>
        </div>

        {/* Right Side - Login Form */}
        <div className="p-8 sm:p-12">
          <div className="mx-auto max-w-md">

            <h2 className="text-3xl font-bold text-slate-900">
              Welcome back
            </h2>

            <p className="mt-2 text-slate-500">
              Sign in to access the RiskLens lending dashboard.
            </p>

            <form onSubmit={handleLogin} className="mt-10 space-y-5">

              {/* Email */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Email Address
                </label>

                <div className="relative">
                  <Mail
                    size={20}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 py-3.5 pl-12 pr-4 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Password
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={20}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 py-3.5 pl-12 pr-4 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    required
                  />
                </div>
              </div>

              {/* Demo note */}
              <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
                Demo mode: Enter any email and password to continue.
              </div>

              {/* Login Button */}
              <button
                type="submit"
                className="w-full rounded-xl bg-blue-600 py-3.5 font-semibold text-white transition hover:bg-blue-700"
              >
                Sign In →
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-500">
              RiskLens Credit Intelligence Platform
            </p>

          </div>
        </div>

      </div>
    </main>
  );
}