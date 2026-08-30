"use client";

import { useState, useEffect, useCallback } from "react";
import { getAnalyticsData, sendMonthlyReportEmail } from "@/actions/analysis";
import { getAccounts } from "@/actions/account";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Area, AreaChart,
} from "recharts";
import { LoadingState } from "@/components/ui/loading-state";
import { CategoryIcon } from "@/components/ui/category-icon";
import {
  TrendingUp, TrendingDown, DollarSign, Calendar,
  BarChart3, PieChart as PieIcon, Activity, ArrowUpDown,
  Layers, ArrowDownLeft, ArrowUpRight, Percent, Mail,
} from "lucide-react";

const CHART_COLORS = ["#4A8B6E", "#C75C5C", "#D4A843", "#6366F1", "#EC4899", "#F59E0B", "#8B5CF6", "#06B6D4", "#F97316", "#14B8A6"];

const TIME_RANGES = [
  { label: "This Week", days: 7 },
  { label: "This Month", days: 30 },
  { label: "3 Months", days: 90 },
  { label: "6 Months", days: 180 },
  { label: "This Year", days: 365 },
  { label: "Custom", days: 0 },
];

export default function AnalysisPage() {
  const [data, setData] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState(30);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [customMode, setCustomMode] = useState<"between" | "after" | "before">("between");
  const [showCustom, setShowCustom] = useState(false);
  const [appliedCustom, setAppliedCustom] = useState<{ start: string; end: string } | null>(null);
  const [categoryTab, setCategoryTab] = useState<"all" | "expense" | "income">("all");
  const [pieTab, setPieTab] = useState<"expense" | "income">("expense");
  const [sendingEmail, setSendingEmail] = useState(false);

  const handleSendEmail = async () => {
    setSendingEmail(true);
    try {
      const res = await sendMonthlyReportEmail();
      if (res.success) {
        toast.success(`Monthly financial report sent to ${res.email}!`);
      } else {
        toast.error(res.error || "Failed to send email");
      }
    } catch {
      toast.error("Failed to send monthly report email");
    } finally {
      setSendingEmail(false);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let startDate: string;
      let endDate: string;

      if (showCustom) {
        if (!appliedCustom) {
          setLoading(false);
          return;
        }
        startDate = appliedCustom.start;
        endDate = appliedCustom.end;
      } else {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - selectedRange);
        startDate = start.toISOString().split("T")[0];
        endDate = end.toISOString().split("T")[0];
      }

      const [analyticsData, accs] = await Promise.all([
        getAnalyticsData({
          startDate,
          endDate,
          accountId: selectedAccount || undefined,
        }),
        accounts.length === 0 ? getAccounts() : Promise.resolve(accounts),
      ]);

      setData(analyticsData);
      if (accounts.length === 0) setAccounts(accs);
    } catch {
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [selectedRange, selectedAccount, showCustom, appliedCustom, accounts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApplyCustom = () => {
    const today = new Date().toISOString().split("T")[0];
    let start = "";
    let end = "";

    if (customMode === "between") {
      if (!customStart || !customEnd) {
        toast.error("Please choose both Start Date and End Date");
        return;
      }
      if (customStart > customEnd) {
        toast.error("End date cannot be earlier than start date");
        return;
      }
      start = customStart;
      end = customEnd;
    } else if (customMode === "after") {
      if (!customStart) {
        toast.error("Please choose a start date");
        return;
      }
      start = customStart;
      end = today;
    } else if (customMode === "before") {
      if (!customEnd) {
        toast.error("Please choose an end date");
        return;
      }
      start = "2020-01-01";
      end = customEnd;
    }

    setAppliedCustom({ start, end });
  };

  const isApplyDisabled =
    customMode === "between"
      ? !customStart || !customEnd || customStart > customEnd
      : customMode === "after"
      ? !customStart
      : !customEnd;

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-500 mb-1">
            Deep Dive
          </p>
          <h1 className="text-3xl font-serif text-gray-900">Analysis</h1>
          <p className="text-gray-500 text-sm mt-1">
            Understand where your money goes and how your wealth grows.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSendEmail}
          disabled={sendingEmail}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-cream-300 text-sm font-medium text-navy-900 hover:bg-cream-50 hover:border-cream-400 shadow-2xs transition-default disabled:opacity-50"
        >
          <Mail className="w-4 h-4 text-forest-600" />
          <span>{sendingEmail ? "Generating & Sending..." : "Email Monthly Report"}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-cream-300 p-4 flex flex-wrap items-center gap-3">
        {/* Time range */}
        <div className="flex gap-1.5 flex-wrap">
          {TIME_RANGES.map((range) => (
            <button
              key={range.label}
              onClick={() => {
                if (range.days === 0) {
                  const today = new Date().toISOString().split("T")[0];
                  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
                  if (!customStart) setCustomStart(thirtyDaysAgo);
                  if (!customEnd) setCustomEnd(today);
                  setShowCustom(true);
                } else {
                  setShowCustom(false);
                  setSelectedRange(range.days);
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-default ${
                (range.days === 0 && showCustom) ||
                (!showCustom && selectedRange === range.days)
                  ? "bg-navy-900 text-white"
                  : "bg-cream-100 text-gray-600 hover:bg-cream-200"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>

        {/* Custom date range */}
        {showCustom && (
          <div className="flex flex-wrap items-center gap-2 animate-scale-in bg-cream-50 p-1.5 rounded-xl border border-cream-300">
            {/* Custom Mode Switcher */}
            <div className="flex bg-white rounded-lg p-0.5 border border-cream-300 text-xs">
              <button
                type="button"
                onClick={() => setCustomMode("between")}
                className={`px-2.5 py-1 rounded-md transition-default font-medium ${
                  customMode === "between" ? "bg-navy-900 text-white" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Between
              </button>
              <button
                type="button"
                onClick={() => setCustomMode("after")}
                className={`px-2.5 py-1 rounded-md transition-default font-medium ${
                  customMode === "after" ? "bg-navy-900 text-white" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                After
              </button>
              <button
                type="button"
                onClick={() => setCustomMode("before")}
                className={`px-2.5 py-1 rounded-md transition-default font-medium ${
                  customMode === "before" ? "bg-navy-900 text-white" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Before
              </button>
            </div>

            {/* Inputs depending on mode */}
            {customMode === "between" && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStart}
                  max={customEnd || new Date().toISOString().split("T")[0]}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    setCustomStart(newStart);
                    if (customEnd && newStart > customEnd) {
                      setCustomEnd(newStart);
                    }
                  }}
                  className="border border-cream-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-forest-500 bg-white"
                />
                <span className="text-gray-400 text-xs font-medium">to</span>
                <input
                  type="date"
                  value={customEnd}
                  min={customStart || undefined}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => {
                    const newEnd = e.target.value;
                    if (customStart && newEnd < customStart) {
                      toast.error("End date cannot be earlier than start date");
                      return;
                    }
                    setCustomEnd(newEnd);
                  }}
                  className="border border-cream-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-forest-500 bg-white"
                />
              </div>
            )}

            {customMode === "after" && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500 font-medium">From:</span>
                <input
                  type="date"
                  value={customStart}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="border border-cream-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-forest-500 bg-white"
                />
                <span className="text-gray-400">onwards</span>
              </div>
            )}

            {customMode === "before" && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500 font-medium">Up to:</span>
                <input
                  type="date"
                  value={customEnd}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="border border-cream-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-forest-500 bg-white"
                />
              </div>
            )}

            <button
              onClick={handleApplyCustom}
              disabled={isApplyDisabled}
              className="px-3.5 py-1 bg-forest-500 text-white rounded-lg text-xs font-medium hover:bg-forest-600 transition-default disabled:opacity-40 shadow-xs"
            >
              Apply Filter
            </button>
          </div>
        )}

        {/* Account filter */}
        <select
          value={selectedAccount}
          onChange={(e) => setSelectedAccount(e.target.value)}
          className="ml-auto border border-cream-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-forest-500"
        >
          <option value="">All accounts</option>
          {accounts.map((acc: any) => (
            <option key={acc.id} value={acc.id}>{acc.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingState
          title="Analyzing Finances"
          message="Generating trend charts, income vs expense ratios, and breakdown..."
        />
      ) : !data ? null : (
        <>
          {/* Summary Stats */}
          {(() => {
            const expenseRatio =
              data.summary.expenseRatio !== undefined
                ? data.summary.expenseRatio
                : data.summary.totalIncome > 0
                ? (data.summary.totalExpense / data.summary.totalIncome) * 100
                : data.summary.totalExpense > 0
                ? 100
                : 0;

            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 stagger-children">
                <div className="stat-card">
                  <TrendingUp className="w-5 h-5 text-forest-500 mb-2" />
                  <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-gray-500">Total Income</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(data.summary.totalIncome)}</p>
                </div>
                <div className="stat-card">
                  <TrendingDown className="w-5 h-5 text-coral-500 mb-2" />
                  <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-gray-500">Total Expense</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(data.summary.totalExpense)}</p>
                </div>
                <div className="stat-card">
                  <DollarSign className="w-5 h-5 text-gold-500 mb-2" />
                  <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-gray-500">Net Savings</p>
                  <p className={`text-xl font-bold mt-1 ${data.summary.netSavings >= 0 ? "text-forest-500" : "text-coral-500"}`}>
                    {formatCurrency(data.summary.netSavings)}
                  </p>
                </div>
                <div className="stat-card">
                  <Percent className="w-5 h-5 text-teal-600 mb-2" />
                  <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-gray-500">Expense Ratio</p>
                  <p className={`text-xl font-bold mt-1 ${
                    expenseRatio <= 50
                      ? "text-forest-500"
                      : expenseRatio <= 90
                      ? "text-gold-500"
                      : "text-coral-500"
                  }`}>
                    {expenseRatio.toFixed(1)}%
                  </p>
                </div>
                <div className="stat-card">
                  <Calendar className="w-5 h-5 text-purple-500 mb-2" />
                  <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-gray-500">Avg Daily Spend</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(data.summary.avgDailySpend)}</p>
                </div>
                <div className="stat-card">
                  <Activity className="w-5 h-5 text-indigo-500 mb-2" />
                  <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-gray-500">Top Category</p>
                  <p className="text-lg font-bold text-gray-900 mt-1 truncate" title={data.summary.topCategory}>
                    {data.summary.topCategory}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Income vs Expense - Bar Chart */}
          <div className="bg-white rounded-xl border border-cream-300 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-navy-900/5 text-navy-900 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-serif text-gray-900">Income vs Expenses</h3>
                  <p className="text-xs text-gray-400">Monthly cash flow and comparison</p>
                </div>
              </div>

              {/* Legend & Summary Pills */}
              <div className="flex items-center gap-2.5 text-xs">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-forest-50 border border-forest-200/60">
                  <span className="w-2.5 h-2.5 rounded-full bg-forest-600 shadow-xs" />
                  <span className="text-gray-600 font-medium">Income:</span>
                  <span className="font-bold text-forest-700">{formatCurrency(data.summary.totalIncome)}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-coral-50 border border-coral-200/60">
                  <span className="w-2.5 h-2.5 rounded-full bg-coral-500 shadow-xs" />
                  <span className="text-gray-600 font-medium">Expense:</span>
                  <span className="font-bold text-coral-700">{formatCurrency(data.summary.totalExpense)}</span>
                </div>
              </div>
            </div>

            <div className="h-[290px] w-full">
              {data.monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.monthlyData}
                    barGap={8}
                    margin={{ top: 15, right: 10, left: -15, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="barIncomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4A8B6E" stopOpacity={1} />
                        <stop offset="100%" stopColor="#356E55" stopOpacity={0.85} />
                      </linearGradient>
                      <linearGradient id="barExpenseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#E06A67" stopOpacity={1} />
                        <stop offset="100%" stopColor="#C75C5C" stopOpacity={0.85} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="#F0EAE1" vertical={false} />
                    <XAxis
                      dataKey="month"
                      axisLine={{ stroke: "#E8E0D4" }}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#6B7280", fontWeight: 500 }}
                      tickFormatter={(v) => {
                        const [y, m] = v.split("-");
                        return new Date(Number(y), Number(m) - 1).toLocaleDateString("en-IN", {
                          month: "short",
                          year: "2-digit",
                        });
                      }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#9CA3AF" }}
                      tickFormatter={(v) => {
                        if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
                        if (v >= 1000) return `₹${(v / 1000).toFixed(0)}k`;
                        return `₹${v}`;
                      }}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(11, 19, 43, 0.04)", radius: 8 }}
                      content={({ active, payload, label }: any) => {
                        if (!active || !payload || !payload.length) return null;
                        const income = payload.find((p: any) => p.dataKey === "income")?.value || 0;
                        const expense = payload.find((p: any) => p.dataKey === "expense")?.value || 0;
                        const net = income - expense;

                        let formattedMonth = label;
                        if (label && label.includes("-")) {
                          const [y, m] = label.split("-");
                          formattedMonth = new Date(Number(y), Number(m) - 1).toLocaleDateString("en-IN", {
                            month: "long",
                            year: "numeric",
                          });
                        }

                        return (
                          <div className="bg-navy-900/95 backdrop-blur-md text-white px-4 py-3 rounded-xl shadow-2xl border border-white/10 text-xs min-w-[170px] animate-scale-in">
                            <p className="font-semibold text-gray-300 border-b border-white/10 pb-1.5 mb-2">
                              {formattedMonth}
                            </p>
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-3">
                                <span className="flex items-center gap-1.5 text-gray-300">
                                  <span className="w-2 h-2 rounded-full bg-forest-400" />
                                  Income
                                </span>
                                <span className="font-semibold text-forest-300">+{formatCurrency(income)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <span className="flex items-center gap-1.5 text-gray-300">
                                  <span className="w-2 h-2 rounded-full bg-coral-400" />
                                  Expense
                                </span>
                                <span className="font-semibold text-coral-300">-{formatCurrency(expense)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-3 pt-1.5 border-t border-white/10 text-[11px]">
                                <span className="text-gray-400">Net Flow</span>
                                <span className={`font-bold ${net >= 0 ? "text-forest-300" : "text-coral-300"}`}>
                                  {net >= 0 ? "+" : ""}{formatCurrency(net)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="income"
                      fill="url(#barIncomeGrad)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={44}
                      name="Income"
                    />
                    <Bar
                      dataKey="expense"
                      fill="url(#barExpenseGrad)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={44}
                      name="Expense"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                  No activity data for this period
                </div>
              )}
            </div>
          </div>

          {/* Trend Line + Category Pie */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Spending Trend Line */}
            <div className="lg:col-span-3 bg-white rounded-xl border border-cream-300 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-navy-900/5 text-navy-900 flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-serif text-gray-900">Spending & Income Trend</h3>
                    <p className="text-xs text-gray-400">Daily trajectory over the selected timeframe</p>
                  </div>
                </div>
              </div>
              <div className="h-[250px]">
                {data.dailyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.dailyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="areaExpenseGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#C75C5C" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#C75C5C" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="areaIncomeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4A8B6E" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#4A8B6E" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" stroke="#F0EAE1" vertical={false} />
                      <XAxis
                        dataKey="date"
                        axisLine={{ stroke: "#E8E0D4" }}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: "#6B7280" }}
                        tickFormatter={(v) =>
                          new Date(v).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
                        }
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: "#9CA3AF" }}
                        tickFormatter={(v) => {
                          if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
                          if (v >= 1000) return `₹${(v / 1000).toFixed(0)}k`;
                          return `₹${v}`;
                        }}
                      />
                      <Tooltip
                        cursor={{ stroke: "#C75C5C", strokeWidth: 1, strokeDasharray: "4 4" }}
                        content={({ active, payload, label }: any) => {
                          if (!active || !payload || !payload.length) return null;
                          const income = payload.find((p: any) => p.dataKey === "income")?.value || 0;
                          const expense = payload.find((p: any) => p.dataKey === "expense")?.value || 0;
                          const formattedDate = new Date(label).toLocaleDateString("en-IN", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          });

                          return (
                            <div className="bg-navy-900/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-xl shadow-2xl border border-white/10 text-xs min-w-[160px] animate-scale-in">
                              <p className="font-semibold text-gray-300 border-b border-white/10 pb-1 mb-1.5">
                                {formattedDate}
                              </p>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="flex items-center gap-1.5 text-gray-300">
                                    <span className="w-2 h-2 rounded-full bg-forest-400" />
                                    Income
                                  </span>
                                  <span className="font-semibold text-forest-300">+{formatCurrency(income)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <span className="flex items-center gap-1.5 text-gray-300">
                                    <span className="w-2 h-2 rounded-full bg-coral-400" />
                                    Expense
                                  </span>
                                  <span className="font-semibold text-coral-300">-{formatCurrency(expense)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="income"
                        stroke="#4A8B6E"
                        fill="url(#areaIncomeGrad)"
                        strokeWidth={2.5}
                        name="Income"
                      />
                      <Area
                        type="monotone"
                        dataKey="expense"
                        stroke="#C75C5C"
                        fill="url(#areaExpenseGrad)"
                        strokeWidth={2.5}
                        name="Expense"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                    No trend records for this period
                  </div>
                )}
              </div>
            </div>

            {/* Category Breakdown Pie */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-cream-300 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <PieIcon className="w-5 h-5 text-gray-400" />
                    <h3 className="text-base font-serif text-gray-900">By Category</h3>
                  </div>

                  <div className="flex bg-cream-100 p-0.5 rounded-lg text-xs">
                    <button
                      type="button"
                      onClick={() => setPieTab("expense")}
                      className={`px-2.5 py-1 rounded-md transition-default font-medium ${
                        pieTab === "expense" ? "bg-white text-coral-600 shadow-xs" : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      Expense
                    </button>
                    <button
                      type="button"
                      onClick={() => setPieTab("income")}
                      className={`px-2.5 py-1 rounded-md transition-default font-medium ${
                        pieTab === "income" ? "bg-white text-forest-600 shadow-xs" : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      Income
                    </button>
                  </div>
                </div>

                {(() => {
                  const pieData =
                    pieTab === "expense"
                      ? data.categoryData.filter((c: any) => c.expense > 0).map((c: any) => ({ name: c.name, value: c.expense }))
                      : data.categoryData.filter((c: any) => c.income > 0).map((c: any) => ({ name: c.name, value: c.income }));

                  if (pieData.length === 0) {
                    return (
                      <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
                        No {pieTab} data recorded for this period
                      </div>
                    );
                  }

                  return (
                    <>
                      <div className="h-[160px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={70}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {pieData.map((_: any, i: number) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: any) => [formatCurrency(Number(value) || 0), ""]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-1.5 mt-2 max-h-[140px] overflow-y-auto">
                        {pieData.slice(0, 6).map((cat: any, i: number) => (
                          <div key={cat.name} className="flex items-center justify-between text-xs py-0.5">
                            <span className="flex items-center gap-1.5 truncate max-w-[140px]">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                              <span className="truncate">{cat.name}</span>
                            </span>
                            <span className={`font-semibold shrink-0 ${pieTab === "expense" ? "text-coral-600" : "text-forest-600"}`}>
                              {formatCurrency(cat.value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Separated Category Breakdowns */}
          {(() => {
            const expenseCategories = data.categoryData
              .filter((c: any) => c.expense > 0)
              .sort((a: any, b: any) => b.expense - a.expense);

            const incomeCategories = data.categoryData
              .filter((c: any) => c.income > 0)
              .sort((a: any, b: any) => b.income - a.income);

            const totalExpense = data.summary.totalExpense || 0;
            const totalIncome = data.summary.totalIncome || 0;

            return (
              <div className="space-y-4">
                {/* Category Section Header & Tabs */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-xl border border-cream-300 p-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-navy-900/5 text-navy-900 flex items-center justify-center">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-serif text-gray-900">Category Breakdown</h3>
                      <p className="text-xs text-gray-400">Detailed performance split by spending and earnings</p>
                    </div>
                  </div>

                  <div className="flex items-center bg-cream-100 p-1 rounded-xl gap-1">
                    <button
                      type="button"
                      onClick={() => setCategoryTab("all")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-default ${
                        categoryTab === "all"
                          ? "bg-white text-navy-900 shadow-xs font-semibold"
                          : "text-gray-500 hover:text-gray-900"
                      }`}
                    >
                      Side by Side
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoryTab("expense")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-default flex items-center gap-1.5 ${
                        categoryTab === "expense"
                          ? "bg-white text-coral-600 shadow-xs font-semibold"
                          : "text-gray-500 hover:text-coral-600"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-coral-500" />
                      Expenses ({expenseCategories.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoryTab("income")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-default flex items-center gap-1.5 ${
                        categoryTab === "income"
                          ? "bg-white text-forest-600 shadow-xs font-semibold"
                          : "text-gray-500 hover:text-forest-600"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-forest-500" />
                      Income ({incomeCategories.length})
                    </button>
                  </div>
                </div>

                {/* Grid of Tables */}
                <div
                  className={`grid gap-5 ${
                    categoryTab === "all" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
                  }`}
                >
                  {/* EXPENSES BREAKDOWN TABLE */}
                  {(categoryTab === "all" || categoryTab === "expense") && (
                    <div className="bg-white rounded-xl border border-cream-300 p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-cream-200">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-coral-100 text-coral-600 flex items-center justify-center">
                              <TrendingDown className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900">Expense Breakdown</h4>
                              <p className="text-[11px] text-gray-400">{expenseCategories.length} categories with spend</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] uppercase text-gray-400 font-semibold">Total Spend</p>
                            <p className="text-sm font-bold text-coral-600">{formatCurrency(totalExpense)}</p>
                          </div>
                        </div>

                        {expenseCategories.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-gray-400 uppercase text-[10px] tracking-wider border-b border-cream-100">
                                  <th className="text-left py-2 px-2 font-semibold">Category</th>
                                  <th className="text-right py-2 px-2 font-semibold">Amount</th>
                                  <th className="text-right py-2 px-2 font-semibold">% Share</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-cream-100">
                                {expenseCategories.map((cat: any) => {
                                  const pct = totalExpense > 0 ? (cat.expense / totalExpense) * 100 : 0;
                                  return (
                                    <tr key={cat.name} className="hover:bg-cream-50/70 transition-default">
                                      <td className="py-2.5 px-2 font-medium text-gray-800">
                                        <div className="flex items-center gap-2">
                                          <div className="w-6 h-6 rounded-md bg-coral-50 flex items-center justify-center text-gray-900 shrink-0">
                                            <CategoryIcon category={cat.name} className="w-3.5 h-3.5 text-gray-900" />
                                          </div>
                                          <span className="truncate">{cat.name}</span>
                                        </div>
                                      </td>
                                      <td className="py-2.5 px-2 text-right font-semibold text-coral-600">
                                        {formatCurrency(cat.expense)}
                                      </td>
                                      <td className="py-2.5 px-2 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                          <span className="font-medium text-gray-600 w-10 text-right">{pct.toFixed(1)}%</span>
                                          <div className="w-16 h-1.5 bg-cream-200 rounded-full overflow-hidden shrink-0">
                                            <div
                                              className="h-full bg-coral-500 rounded-full"
                                              style={{ width: `${Math.min(pct, 100)}%` }}
                                            />
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="py-12 text-center text-xs text-gray-400">No expense records found</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* INCOME BREAKDOWN TABLE */}
                  {(categoryTab === "all" || categoryTab === "income") && (
                    <div className="bg-white rounded-xl border border-cream-300 p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-cream-200">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-forest-100 text-forest-600 flex items-center justify-center">
                              <TrendingUp className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900">Income Breakdown</h4>
                              <p className="text-[11px] text-gray-400">{incomeCategories.length} categories with earnings</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] uppercase text-gray-400 font-semibold">Total Income</p>
                            <p className="text-sm font-bold text-forest-600">{formatCurrency(totalIncome)}</p>
                          </div>
                        </div>

                        {incomeCategories.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-gray-400 uppercase text-[10px] tracking-wider border-b border-cream-100">
                                  <th className="text-left py-2 px-2 font-semibold">Category</th>
                                  <th className="text-right py-2 px-2 font-semibold">Amount</th>
                                  <th className="text-right py-2 px-2 font-semibold">% Share</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-cream-100">
                                {incomeCategories.map((cat: any) => {
                                  const pct = totalIncome > 0 ? (cat.income / totalIncome) * 100 : 0;
                                  return (
                                    <tr key={cat.name} className="hover:bg-cream-50/70 transition-default">
                                      <td className="py-2.5 px-2 font-medium text-gray-800">
                                        <div className="flex items-center gap-2">
                                          <div className="w-6 h-6 rounded-md bg-forest-50 flex items-center justify-center text-gray-900 shrink-0">
                                            <CategoryIcon category={cat.name} className="w-3.5 h-3.5 text-gray-900" />
                                          </div>
                                          <span className="truncate">{cat.name}</span>
                                        </div>
                                      </td>
                                      <td className="py-2.5 px-2 text-right font-semibold text-forest-600">
                                        {formatCurrency(cat.income)}
                                      </td>
                                      <td className="py-2.5 px-2 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                          <span className="font-medium text-gray-600 w-10 text-right">{pct.toFixed(1)}%</span>
                                          <div className="w-16 h-1.5 bg-cream-200 rounded-full overflow-hidden shrink-0">
                                            <div
                                              className="h-full bg-forest-500 rounded-full"
                                              style={{ width: `${Math.min(pct, 100)}%` }}
                                            />
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="py-12 text-center text-xs text-gray-400">No income records found</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
