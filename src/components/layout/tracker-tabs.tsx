"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TrendingUp, Wallet } from "lucide-react";

export function TrackerTabs() {
  const pathname = usePathname();
  const isNetWorth = pathname.startsWith("/net-worth");
  const isFinance = !isNetWorth;

  return (
    <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border/50 pb-4 mb-6">
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-muted/50 border border-border/60">
        <Link
          href="/investments"
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            isFinance
              ? "bg-card text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <span>Finance Tracker</span>
        </Link>

        <Link
          href="/net-worth"
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            isNetWorth
              ? "bg-card text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Wallet className="w-4 h-4 text-primary" />
          <span>Net Worth Tracker</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
            Multi-Asset
          </span>
        </Link>
      </div>

      <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>Unified Portfolio &amp; Net Worth Hub</span>
      </div>
    </div>
  );
}
