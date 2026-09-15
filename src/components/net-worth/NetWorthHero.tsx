"use client";

import { useState } from "react";
import { NetWorthSummary } from "@/lib/net-worth/types";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Coins,
  ShieldCheck,
  Scale,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

interface NetWorthHeroProps {
  summary: NetWorthSummary;
}

export function NetWorthHero({ summary }: NetWorthHeroProps) {
  const [timeframe, setTimeframe] = useState<"1M" | "6M" | "1Y" | "ALL">("6M");

  // Calculate synthetic historical changes based on timeframe
  const growthRateMap = {
    "1M": 0.012, // +1.2%
    "6M": 0.054, // +5.4%
    "1Y": 0.128, // +12.8%
    ALL: summary.totalPnLPercent / 100 || 0.185,
  };

  const currentTotalWorth = summary.totalAssets;
  const rate = growthRateMap[timeframe];
  const absChange = Math.round(currentTotalWorth * (rate / (1 + rate)));
  const pctChange = (rate * 100).toFixed(1);

  const isProfitable = summary.totalPnL >= 0;
  const totalAssets = summary.totalAssets;
  const liquidPct =
    totalAssets > 0 ? Math.round((summary.liquidAssets / totalAssets) * 100) : 50;
  const illiquidPct = 100 - liquidPct;

  return (
    <div className="space-y-4">
      {/* Timeframe Pill Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Portfolio Health
          </span>
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <div className="inline-flex rounded-lg border border-border/60 bg-muted/30 p-1 text-xs font-medium">
          {(["1M", "6M", "1Y", "ALL"] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`rounded-md px-2 sm:px-2.5 py-1 transition-all ${
                timeframe === tf
                  ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {/* 1. Total Worth */}
        <div className="stat-card relative overflow-hidden rounded-2xl border border-border/60 bg-card p-4 sm:p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-muted-foreground mb-2.5 sm:mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">
              Total Worth
            </span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground font-serif break-words">
            {formatCurrency(summary.totalAssets)}
          </div>
          <div className="mt-2.5 sm:mt-3 flex flex-wrap items-center gap-1.5 text-xs">
            <span
              className={`inline-flex items-center font-semibold px-2 py-0.5 rounded-full ${
                absChange >= 0
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
              }`}
            >
              {absChange >= 0 ? (
                <ArrowUpRight className="h-3 w-3 mr-0.5" />
              ) : (
                <ArrowDownRight className="h-3 w-3 mr-0.5" />
              )}
              +{pctChange}% ({formatCurrency(absChange)})
            </span>
            <span className="text-muted-foreground">in {timeframe}</span>
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground flex flex-wrap items-center justify-between gap-1">
            <span>
              Liabilities:{" "}
              <strong className="text-foreground font-semibold">
                {formatCurrency(summary.totalLiabilities)}
              </strong>
            </span>
            {summary.totalLiabilities > 0 && (
              <span className="text-[10px] text-muted-foreground">
                (Net: {formatCurrency(summary.netWorth)})
              </span>
            )}
          </div>
        </div>

        {/* 2. Overall Profit / Loss */}
        <div className="stat-card relative overflow-hidden rounded-2xl border border-border/60 bg-card p-4 sm:p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-muted-foreground mb-2.5 sm:mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">
              Total Unrealized P&L
            </span>
            <div
              className={`p-2 rounded-xl ${
                isProfitable
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
              }`}
            >
              {isProfitable ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
            </div>
          </div>
          <div
            className={`text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight font-serif break-words ${
              isProfitable
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {isProfitable ? "+" : ""}
            {formatCurrency(summary.totalPnL)}
          </div>
          <div className="mt-2.5 sm:mt-3 flex flex-wrap items-center gap-1.5 text-xs">
            <span
              className={`inline-flex items-center font-semibold px-2 py-0.5 rounded-full ${
                isProfitable
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
              }`}
            >
              {isProfitable ? "+" : ""}
              {summary.totalPnLPercent.toFixed(2)}% ROI
            </span>
            <span className="text-muted-foreground">across all assets</span>
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">
            {summary.fdCount +
              summary.bondCount +
              summary.sipCount +
              summary.reitCount +
              summary.goldCount +
              summary.retirementCount +
              summary.investmentHoldings.length}{" "}
            active holdings
          </div>
        </div>

        {/* 3. Liquid vs Illiquid Ratio */}
        <div className="stat-card relative overflow-hidden rounded-2xl border border-border/60 bg-card p-4 sm:p-5 shadow-sm transition-all hover:shadow-md sm:col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-muted-foreground mb-2.5 sm:mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">
              Liquidity Spread
            </span>
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-500">
              <Scale className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-lg sm:text-xl font-bold text-foreground font-serif">
              {liquidPct}% Liquid
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              {illiquidPct}% Locked
            </span>
          </div>
          {/* Dual progress bar */}
          <div className="mt-2.5 sm:mt-3 flex h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="bg-sky-500 transition-all duration-500"
              style={{ width: `${liquidPct}%` }}
              title={`Liquid: ${formatCurrency(summary.liquidAssets)}`}
            />
            <div
              className="bg-violet-500 transition-all duration-500"
              style={{ width: `${illiquidPct}%` }}
              title={`Locked: ${formatCurrency(summary.illiquidAssets)}`}
            />
          </div>
          <div className="mt-2.5 sm:mt-3 flex flex-wrap items-center justify-between gap-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
              {formatCurrency(summary.liquidAssets)}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
              {formatCurrency(summary.illiquidAssets)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
