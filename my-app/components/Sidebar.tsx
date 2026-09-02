"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UserRoundSearch,
  Upload,
  History,
  Settings,
  ShieldCheck,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Single Assessment", href: "/single-assessment", icon: UserRoundSearch },
  { name: "Bulk Assessment", href: "/bulk-assessment", icon: Upload },
  { name: "Assessment History", href: "/history", icon: History },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = (
    <>
      <div className="mb-4 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        Workspace
      </div>
      <nav className="space-y-1.5">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200 ${
                active
                  ? "bg-white/[0.10] text-white shadow-sm"
                  : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100"
              }`}
            >
              {active && <span className="absolute left-0 h-6 w-0.5 rounded-full bg-emerald-400" />}
              <Icon size={18} strokeWidth={active ? 2.3 : 2} />
              <span className="flex-1">{item.name}</span>
              <ChevronRight
                size={15}
                className={`transition-transform ${active ? "text-emerald-400" : "text-slate-700 group-hover:translate-x-0.5 group-hover:text-slate-500"}`}
              />
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      <button
        type="button"
        aria-label="Open navigation"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-950 text-white shadow-lg md:hidden"
      >
        <Menu size={20} />
      </button>

      {mobileOpen && (
        <button
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-white/[0.06] bg-[#0b1220] text-white md:flex">
        <div className="border-b border-white/[0.06] px-5 py-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-950/30">
              <ShieldCheck size={21} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight">ATLAS</h1>
                <span className="rounded-full bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">Risk</span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">Credit intelligence platform</p>
            </div>
          </Link>
        </div>

        <div className="flex-1 px-3 py-7">{nav}</div>

        <div className="px-3 pb-4">
          <div className="mb-3 rounded-xl border border-white/[0.06] bg-white/[0.035] p-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.55)]" />
              <span className="text-xs font-semibold text-slate-300">System operational</span>
            </div>
            <p className="mt-1 pl-4 text-[10px] text-slate-600">Models & data services connected</p>
          </div>
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-200"
          >
            <Settings size={18} />
            Settings
          </Link>
        </div>

        <div className="border-t border-white/[0.06] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-white">VR</div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-300">Risk Analyst</p>
              <p className="text-[10px] text-slate-600">ASTRA workspace</p>
            </div>
          </div>
        </div>
      </aside>

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/[0.06] bg-[#0b1220] text-white shadow-2xl transition-transform duration-200 md:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-5">
          <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 text-slate-950"><ShieldCheck size={21} /></div>
            <div><p className="font-bold">ATLAS</p><p className="text-[10px] text-slate-500">Credit intelligence</p></div>
          </Link>
          <button type="button" onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-white/[0.06] hover:text-white" aria-label="Close navigation"><X size={20} /></button>
        </div>
        <div className="flex-1 px-3 py-7">{nav}</div>
      </aside>
    </>
  );
}
