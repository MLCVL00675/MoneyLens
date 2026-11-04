"use client";

import { NetWorthSummary } from "@/lib/net-worth/types";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ShieldCheck, AlertTriangle, ShieldAlert, Layers } from "lucide-react";

interface DebtAssetsBarProps {
  summary: NetWorthSummary;
}

export function DebtAssetsBar({ summary }: DebtAssetsBarProps) {
  const totalAssets = summary.totalAssets;
  const totalDebt = summary.totalLiabilities;
  const debtToAssetRatio =
    totalAssets > 0 ? (totalDebt / totalAssets) * 100 : 0;

  // Solvency Risk Badge
  let riskBadge = {
    label: "Healthy Solvency",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    icon: ShieldCheck,
    desc: "Low debt-to-asset ratio (< 20%)",
  };
  if (debtToAssetRatio > 40) {
    riskBadge = {
      label: "Elevated Leverage",
      color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
      icon: ShieldAlert,
      desc: "Debt exceeds 40% of total assets",
    };
  } else if (debtToAssetRatio > 20) {
    riskBadge = {
      label: "Moderate Leverage",
      color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
      icon: AlertTriangle,
      desc: "Healthy manageable debt profile",
    };
  }

  // Chart data: Compare All Asset Classes against Liabilities
  const barData = [
    { category: "Stocks", shortCategory: "Stocks", Assets: summary.directStocksValue || 0, Debt: 0 },
    { category: "Mutual Funds", shortCategory: "Mutual Funds", Assets: summary.mutualFundsValue || 0, Debt: 0 },
    { category: "Gold/Silver MF", shortCategory: "Gold MF", Assets: summary.goldSilverFundsValue || 0, Debt: 0 },
    { category: "Physical Gold", shortCategory: "Phys Gold", Assets: summary.physicalGoldValue || 0, Debt: 0 },
    { category: "Fixed Deposit / RD", shortCategory: "FD / RD", Assets: summary.fdValue || 0, Debt: 0 },
    { category: "Bonds & G-Secs", shortCategory: "Bonds", Assets: summary.bondValue || 0, Debt: 0 },
    { category: "SIPs", shortCategory: "SIPs", Assets: summary.sipValue || 0, Debt: 0 },
    { category: "Real Estate / REITs", shortCategory: "REITs", Assets: summary.realEstateValue || 0, Debt: 0 },
    { category: "Retirement (EPF/PPF/NPS)", shortCategory: "Retirement", Assets: summary.retirementValue || 0, Debt: 0 },
    { category: "Total Liabilities", shortCategory: "Liabilities", Assets: 0, Debt: totalDebt },
  ].filter((item) => item.Assets > 0 || item.category === "Total Liabilities");

  const RiskIcon = riskBadge.icon;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6 shadow-sm transition-all flex flex-col justify-between h-full">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 sm:gap-4 mb-3 sm:mb-4">
          <div>
            <h3 className="font-semibold text-base text-foreground font-serif">
              Assets vs. Debt Breakdown
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Comparative solvency profile and obligations
            </p>
          </div>

          <div
            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold border self-start sm:self-auto ${riskBadge.color}`}
          >
            <RiskIcon className="h-3.5 w-3.5" />
            <span>{riskBadge.label}</span>
          </div>
        </div>

        {/* Ratio Metric Bar */}
        <div className="p-3 sm:p-3.5 rounded-xl border border-border/50 bg-muted/20 mb-3 sm:mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground font-medium">
              Debt-to-Asset Ratio:
            </span>
            <span className="font-bold text-foreground">
              {debtToAssetRatio.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{
                width: `${totalAssets > 0 ? Math.max(0, 100 - debtToAssetRatio) : 100}%`,
              }}
              title="Assets equity"
            />
            <div
              className="bg-rose-500 h-full transition-all duration-500"
              style={{
                width: `${Math.min(100, debtToAssetRatio)}%`,
              }}
              title="Debt ratio"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-muted-foreground mt-1.5">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              Assets: {formatCurrency(totalAssets)}
            </span>
            <span className="text-rose-600 dark:text-rose-400 font-medium">
              Debts: {formatCurrency(totalDebt)}
            </span>
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="h-[260px] sm:h-[280px] w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={barData}
            margin={{ top: 10, right: 10, left: 4, bottom: 25 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="currentColor"
              className="text-border/40"
            />
            <XAxis
              dataKey="shortCategory"
              tickLine={false}
              axisLine={false}
              interval={0}
              height={45}
              angle={-35}
              textAnchor="end"
              tick={{ fontSize: 9, fill: "currentColor" }}
              className="text-muted-foreground"
            />
            <YAxis
              width={42}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "currentColor" }}
              className="text-muted-foreground"
              tickFormatter={(v) => {
                if (v === 0) return "₹0";
                if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
                if (v >= 100000) return `₹${(v / 100000).toFixed(0)}L`;
                if (v >= 1000) return `₹${(v / 1000).toFixed(0)}k`;
                return `₹${v}`;
              }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const fullLabel = payload[0]?.payload?.category || label;
                  return (
                    <div className="rounded-xl border border-border/60 bg-popover/95 p-3 shadow-xl backdrop-blur-md text-xs space-y-1">
                      <div className="font-semibold text-foreground border-b border-border/40 pb-1">
                        {fullLabel}
                      </div>
                      {payload.map((p: any) =>
                        p.value > 0 ? (
                          <div
                            key={p.name}
                            className="flex items-center justify-between gap-4"
                          >
                            <span className="text-muted-foreground">
                              {p.name}:
                            </span>
                            <span className="font-semibold text-foreground">
                              {formatCurrency(p.value)}
                            </span>
                          </div>
                        ) : null
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="Assets"
              name="Asset Value"
              fill="#10B981"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
            <Bar
              dataKey="Debt"
              name="Debt Remaining"
              fill="#F43F5E"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
