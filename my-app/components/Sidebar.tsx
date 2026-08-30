"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  UserRoundSearch,
  Upload,
  History,
  Settings,
  ShieldCheck,
} from "lucide-react";

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Single Assessment",
    href: "/single-assessment",
    icon: UserRoundSearch,
  },
  {
    name: "Bulk Assessment",
    href: "/bulk-assessment",
    icon: Upload,
  },
  {
    name: "Assessment History",
    href: "/history",
    icon: History,
  },
];

export default function Sidebar() {
  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-950 text-white">
      {/* Logo */}
      <div className="border-b border-slate-800 px-6 py-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500">
            <ShieldCheck size={22} />
          </div>

          <div>
            <h1 className="text-lg font-bold tracking-tight">
              RiskLens
            </h1>
            <p className="text-xs text-slate-400">
              Credit Intelligence
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 px-3 py-6">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Workspace
        </p>

        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white"
            >
              <Icon size={19} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Settings */}
      <div className="border-t border-slate-800 p-3">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white"
        >
          <Settings size={19} />
          Settings
        </Link>
      </div>
    </aside>
  );
}