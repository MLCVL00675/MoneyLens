"use client";

import { useState, useMemo } from "react";
import { NetWorthChartPoint } from "@/lib/net-worth/types";
import { formatCurrency } from "@/lib/utils";
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Check, Layers } from "lucide-react";

interface NetWorthAreaChartProps {
  currentNetWorth?: number;
  currentAssets: number;
  currentLiabilities?: number;
}

export function NetWorthAreaChart({
  currentNetWorth,
  currentAssets,
  currentLiabilities,
}: NetWorthAreaChartProps) {
  const [rangeMonths, setRangeMonths] = useState<number>(6);
  const [showBenchmarkNifty, setShowBenchmarkNifty] = useState<boolean>(true);
  const [showBenchmarkGold, setShowBenchmarkGold] = useState<boolean>(false);

  // Generate synthetic trajectory based on asset growth (excluding loans/liabilities)
  const chartData = useMemo(() => {
    const points: Array<{
      month: string;
      netWorth: number;
      assets: number;
      liabilities: number;
      niftyBenchmark: number;
      goldBenchmark: number;
    }> = [];

    const now = new Date();
    const monthsCount = rangeMonths;
    const baseValue = Math.max(0, currentAssets || 0);

    for (let i = monthsCount; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label =
        d.toLocaleString("default", { month: "short" }) +
        " '" +
        String(d.getFullYear()).slice(2);

      // Past trend discounting based on asset growth
      const assetDiscount = Math.pow(1 - 0.011, i);
      const niftyDiscount = Math.pow(1 - 0.0125, i);
      const goldDiscount = Math.pow(1 - 0.0095, i);

      const a = Math.round(baseValue * assetDiscount);

      points.push({
        month: label,
        netWorth: a,
        assets: a,
        liabilities: 0,
        niftyBenchmark: Math.round(baseValue * niftyDiscount * 0.96),
        goldBenchmark: Math.round(baseValue * goldDiscount * 0.94),
      });
    }

    return points;
  }, [rangeMonths, currentAssets]);

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6 shadow-sm transition-all space-y-4">
      {/* Header with Title and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base text-foreground font-serif">
              Net Worth Trajectory
            </h3>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <TrendingUp className="h-3 w-3" /> Growth Mode
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Historical progression and comparative market benchmarks
          </p>
        </div>

        {/* Right side controls: Benchmarks & Timeframe */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Benchmarks toggles */}
          <button
            onClick={() => setShowBenchmarkNifty(!showBenchmarkNifty)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
              showBenchmarkNifty
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                : "bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                showBenchmarkNifty ? "bg-amber-500" : "bg-muted-foreground"
              }`}
            />
            Nifty 50
          </button>

          <button
            onClick={() => setShowBenchmarkGold(!showBenchmarkGold)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
              showBenchmarkGold
                ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30"
                : "bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                showBenchmarkGold ? "bg-yellow-400" : "bg-muted-foreground"
              }`}
            />
            Gold (24K)
          </button>

          {/* Timeframe Selector */}
          <div className="inline-flex rounded-lg border border-border/60 bg-muted/30 p-0.5 text-xs font-medium">
            {[
              { label: "6M", months: 6 },
              { label: "1Y", months: 12 },
              { label: "3Y", months: 36 },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => setRangeMonths(item.months)}
                className={`rounded-md px-2 py-1 transition-all ${
                  rangeMonths === item.months
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="h-[240px] sm:h-[280px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="currentColor"
              className="text-border/40"
            />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "currentColor" }}
              className="text-muted-foreground"
            />
            <YAxis
              width={42}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "currentColor" }}
              className="text-muted-foreground"
              tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`}
              domain={["auto", "auto"]}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-xl border border-border/60 bg-popover/95 p-3 shadow-xl backdrop-blur-md text-xs space-y-1.5">
                      <div className="font-semibold text-foreground border-b border-border/40 pb-1">
                        {label}
                      </div>
                      {payload.map((p: any) => (
                        <div
                          key={p.name}
                          className="flex items-center justify-between gap-4"
                        >
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: p.color }}
                            />
                            {p.name}:
                          </span>
                          <span className="font-semibold text-foreground">
                            {formatCurrency(p.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="netWorth"
              name="Net Worth"
              stroke="#10B981"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#netWorthGradient)"
            />
            {showBenchmarkNifty && (
              <Line
                type="monotone"
                dataKey="niftyBenchmark"
                name="Nifty 50 Benchmark"
                stroke="#F59E0B"
                strokeWidth={1.75}
                strokeDasharray="4 4"
                dot={false}
              />
            )}
            {showBenchmarkGold && (
              <Line
                type="monotone"
                dataKey="goldBenchmark"
                name="Gold Benchmark"
                stroke="#EAB308"
                strokeWidth={1.5}
                strokeDasharray="2 2"
                dot={false}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
