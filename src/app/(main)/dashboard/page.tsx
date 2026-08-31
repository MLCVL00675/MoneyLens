"use client";

import { useEffect, useState, useCallback } from "react";
import { getDashboardData, getBalanceHistory, updateBudget } from "@/actions/dashboard";
import { createAccount, updateDefaultAccount } from "@/actions/account";
import { formatCurrency, formatDate, getGreeting, percentChange, getCategoryIcon } from "@/lib/utils";
import { CategoryIcon } from "@/components/ui/category-icon";
import { toast } from "sonner";
import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Percent,
  Plus,
  ArrowRight,
  ChevronDown,
  Pencil,
  Check,
  X,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  BarChart3,
} from "lucide-react";
import { BarLoader } from "react-spinners";
import { LoadingState } from "@/components/ui/loading-state";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const CHART_COLORS = ["#4A8B6E", "#C75C5C", "#D4A843", "#6366F1", "#EC4899", "#F59E0B", "#8B5CF6", "#06B6D4"];

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartDays, setChartDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetValue, setBudgetValue] = useState("");
  const [showAddAccount, setShowAddAccount] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [dashData, balanceData] = await Promise.all([
        getDashboardData(),
        getBalanceHistory(chartDays),
      ]);
      setData(dashData);
      setChartData(balanceData);
      if (dashData.budget) {
        setBudgetValue(String(dashData.budget.amount));
      }
    } catch (error) {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [chartDays]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBudgetSave = async () => {
    const amount = parseFloat(budgetValue);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid budget amount");
      return;
    }
    try {
      await updateBudget(amount);
      setEditingBudget(false);
      toast.success("Budget updated");
      loadData();
    } catch {
      toast.error("Failed to update budget");
    }
  };

  if (loading) {
    return (
      <LoadingState
        title="Loading Overview"
        message="Calculating balances, insights, and recent activity..."
      />
    );
  }

  if (!data) return null;

  const { accounts, stats, recentTransactions, budget, goals, expenseByCategory } = data;

  const budgetSpent = stats.currentMonthExpense;
  const budgetAmount = budget?.amount || 0;
  const budgetPercent = budgetAmount > 0 ? (budgetSpent / budgetAmount) * 100 : 0;
  const budgetColor =
    budgetPercent > 90 ? "bg-coral-500" : budgetPercent > 75 ? "bg-gold-500" : "bg-forest-500";

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const userName = "there"; // Will come from user data

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      {/* Greeting */}
      <div>
        <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-500 mb-1">
          {dateStr.toUpperCase()}
        </p>
        <h1 className="text-3xl lg:text-4xl font-serif text-gray-900">
          {getGreeting()}.
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Here&apos;s the part of your money that deserves your attention.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 stagger-children">
        {/* Total Balance */}
        <div className="stat-card bg-gradient-to-br from-forest-500 to-forest-700 text-white border-0">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-green-200">
              Total Balance
            </p>
            <Wallet className="w-5 h-5 text-green-200" />
          </div>
          <p className="text-2xl font-bold">{formatCurrency(stats.effectiveBalance)}</p>
          {stats.totalGoalAllocations > 0 && (
            <p className="text-green-200 text-xs mt-1">
              Actual: {formatCurrency(stats.totalBalance)}
            </p>
          )}
          <p className="text-green-200 text-xs mt-2">
            {percentChange(stats.totalBalance, stats.totalBalance - (stats.currentMonthIncome - stats.currentMonthExpense)) > 0 ? "+" : ""}
            {percentChange(stats.totalBalance, stats.totalBalance - (stats.currentMonthIncome - stats.currentMonthExpense)).toFixed(1)}% this month
          </p>
        </div>

        {/* Monthly Income */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-500">
              Monthly Income
            </p>
            <TrendingUp className="w-5 h-5 text-forest-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(stats.currentMonthIncome)}
          </p>
          <p className="text-xs mt-2">
            <span className={stats.currentMonthIncome >= stats.lastMonthIncome ? "text-forest-500" : "text-coral-500"}>
              {stats.currentMonthIncome >= stats.lastMonthIncome ? "+" : ""}
              {formatCurrency(stats.currentMonthIncome - stats.lastMonthIncome)}
            </span>
            <span className="text-gray-400"> vs. last month</span>
          </p>
        </div>

        {/* Monthly Spend */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-500">
              Monthly Spend
            </p>
            <TrendingDown className="w-5 h-5 text-coral-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(stats.currentMonthExpense)}
          </p>
          <p className="text-xs mt-2">
            <span className={stats.currentMonthExpense <= stats.lastMonthExpense ? "text-forest-500" : "text-coral-500"}>
              {stats.currentMonthExpense <= stats.lastMonthExpense ? "" : "+"}
              {((stats.currentMonthExpense - stats.lastMonthExpense) / Math.max(stats.lastMonthExpense, 1) * 100).toFixed(0)}%
            </span>
            <span className="text-gray-400"> vs. last month</span>
          </p>
        </div>

        {/* Savings Rate */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-500">
              Savings Rate
            </p>
            <Percent className="w-5 h-5 text-gold-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats.savingsRate.toFixed(1)}%
          </p>
          <p className="text-xs mt-2">
            <span className={stats.savingsRate >= stats.lastMonthSavingsRate ? "text-forest-500" : "text-coral-500"}>
              {stats.savingsRate >= stats.lastMonthSavingsRate ? "+" : ""}
              {(stats.savingsRate - stats.lastMonthSavingsRate).toFixed(1)} pts
            </span>
            <span className="text-gray-400">
              {stats.savingsRate >= 50 ? " a healthy month" : " keep going"}
            </span>
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Balance Rhythm - Line Chart */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-cream-300 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-500 mb-1">
                Balance Rhythm
              </p>
              <h3 className="text-lg font-serif text-gray-900">
                {stats.currentMonthIncome > stats.currentMonthExpense
                  ? "Inflow is ahead of outflow"
                  : "Outflow is ahead of inflow"}
              </h3>
            </div>
            <select
              value={chartDays}
              onChange={(e) => setChartDays(Number(e.target.value))}
              className="text-sm border border-cream-300 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-forest-500"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 3 months</option>
              <option value={180}>Last 6 months</option>
              <option value={365}>Last year</option>
            </select>
          </div>

          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D4" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  tickFormatter={(val) => {
                    if (typeof val === "string" && val.includes("-")) {
                      const [y, m, d] = val.split("-").map(Number);
                      return new Date(y, m - 1, d).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
                    }
                    const d = new Date(val);
                    return `${d.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`;
                  }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(Number(value) || 0), ""]}
                  labelFormatter={(label) => {
                    if (typeof label === "string" && label.includes("-")) {
                      const [y, m, d] = label.split("-").map(Number);
                      return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      });
                    }
                    return label;
                  }}
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #E8E0D4",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="income"
                  stroke="#4A8B6E"
                  strokeWidth={2}
                  dot={false}
                  name="Income"
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  stroke="#C75C5C"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="5 5"
                  name="Expenses"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center gap-6 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-forest-500 rounded" />
              Income {formatCurrency(stats.currentMonthIncome)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-coral-500 rounded" />
              Expenses {formatCurrency(stats.currentMonthExpense)}
            </span>
          </div>
        </div>

        {/* Expense Pie Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-cream-300 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-500 mb-1">
                This Month&apos;s Shape
              </p>
              <h3 className="text-lg font-serif text-gray-900">Where it went</h3>
            </div>
          </div>

          {expenseByCategory.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="w-[150px] h-[150px] relative shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {expenseByCategory.map((_: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p
                    className="text-xs font-bold text-gray-900 tracking-tight leading-tight text-center max-w-[85px] truncate"
                    title={formatCurrency(stats.currentMonthExpense)}
                  >
                    {formatCurrency(stats.currentMonthExpense).split(".")[0]}
                  </p>
                  <p className="text-[10px] text-gray-400 font-medium">spent</p>
                </div>
              </div>

              <div className="flex-1 space-y-2">
                {expenseByCategory.slice(0, 5).map((cat: any, i: number) => (
                  <div key={cat.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      {cat.name}
                    </span>
                    <span className="text-gray-500">
                      {((cat.value / stats.currentMonthExpense) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">
              No expenses this month
            </div>
          )}
        </div>
      </div>

      {/* Budget Progress */}
      {(budget || true) && (
        <div className="bg-white rounded-xl border border-cream-300 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-500 mb-1">
                Budget
              </p>
              <h3 className="text-base font-serif text-gray-900">Monthly spending limit</h3>
            </div>
            {!editingBudget ? (
              <button
                onClick={() => setEditingBudget(true)}
                className="text-xs text-forest-600 hover:text-forest-700 flex items-center gap-1"
              >
                <Pencil className="w-3 h-3" />
                {budget ? "Edit" : "Set budget"}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={budgetValue}
                  onChange={(e) => setBudgetValue(e.target.value)}
                  className="w-32 text-sm border border-cream-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-forest-500"
                  placeholder="Amount"
                />
                <button
                  onClick={handleBudgetSave}
                  className="p-1.5 rounded-lg bg-forest-500 text-white hover:bg-forest-600"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setEditingBudget(false)}
                  className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {budgetAmount > 0 ? (
            <>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">
                  {formatCurrency(budgetSpent)} of {formatCurrency(budgetAmount)}
                </span>
                <span className={`font-medium ${budgetPercent > 90 ? "text-coral-500" : budgetPercent > 75 ? "text-gold-600" : "text-forest-500"}`}>
                  {budgetPercent.toFixed(0)}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-cream-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${budgetColor}`}
                  style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                />
              </div>
              {budgetPercent > 90 && (
                <p className="text-coral-500 text-xs mt-2">⚠️ You&apos;re close to your budget limit!</p>
              )}
            </>
          ) : (
            <p className="text-gray-400 text-sm">Set a monthly budget to track your spending.</p>
          )}
        </div>
      )}

      {/* Accounts + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Accounts */}
        <div id="accounts" className="lg:col-span-3 scroll-mt-20">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-500 mb-1">
                Three Places, One Picture
              </p>
              <h3 className="text-base font-serif text-gray-900">Your accounts</h3>
            </div>
            <button
              onClick={() => setShowAddAccount(true)}
              className="text-xs text-forest-600 hover:text-forest-700 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add account
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {accounts.map((account: any) => (
              <Link
                key={account.id}
                href={`/account/${account.id}`}
                className="bg-white rounded-xl border border-cream-300 p-4 hover:shadow-md transition-default group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      account.type === "SAVINGS" ? "bg-gold-500/10 text-gold-600" : "bg-forest-500/10 text-forest-600"
                    }`}>
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{account.name}</p>
                      <p className="text-[10px] text-gray-400">
                        {account._count.transactions} txns
                        {account.isDefault && " · Default"}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-default" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold tracking-wider text-gray-400">
                    Usable Balance
                  </p>
                  <p className="text-xl font-bold text-gray-900 mt-0.5">
                    {formatCurrency(account.effectiveBalance)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-2 mt-2 border-t border-cream-200 text-[11px]">
                  <div className="text-gray-500">
                    <span>Bank: </span>
                    <strong className="text-gray-700">{formatCurrency(account.balance)}</strong>
                  </div>
                  <div className={account.goalAllocations > 0 ? "text-gold-600 font-medium text-right" : "text-gray-400 text-right"}>
                    <span>Goals: </span>
                    <span>{formatCurrency(account.goalAllocations || 0)}</span>
                  </div>
                </div>
              </Link>
            ))}

            {accounts.length === 0 && (
              <button
                onClick={() => setShowAddAccount(true)}
                className="bg-white rounded-xl border-2 border-dashed border-cream-300 p-8 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-forest-500 hover:text-forest-500 transition-default col-span-2"
              >
                <Plus className="w-8 h-8" />
                <span className="text-sm font-medium">Add your first account</span>
              </button>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div id="activity" className="lg:col-span-2 scroll-mt-20">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-500 mb-1">
                Latest Activity
              </p>
              <h3 className="text-base font-serif text-gray-900">Recent transactions</h3>
            </div>
            <Link
              href="/activity"
              className="text-xs text-forest-600 hover:text-forest-700 font-medium flex items-center gap-1 transition-default"
            >
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white rounded-xl border border-cream-300 divide-y divide-cream-200">
            {recentTransactions.length > 0 ? (
              recentTransactions.slice(0, 3).map((tx: any) => (
                <Link
                  key={tx.id}
                  href={`/transaction/edit/${tx.id}`}
                  className="flex items-center justify-between p-3.5 hover:bg-cream-50 transition-default group"
                  title="Click to edit transaction"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      tx.type === "INCOME"
                        ? "bg-forest-500/10 text-forest-700"
                        : "bg-coral-500/10 text-coral-700"
                    }`}>
                      <CategoryIcon category={tx.category} className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 group-hover:text-forest-600 transition-colors">
                        {tx.description}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {tx.account?.name} · {formatDate(tx.date)}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${
                    tx.type === "INCOME" ? "text-forest-500" : "text-coral-500"
                  }`}>
                    {tx.type === "INCOME" ? "+" : "-"}{formatCurrency(tx.amount)}
                  </span>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center text-gray-400 text-sm">
                No transactions yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Goals Summary */}
      {goals.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-500 mb-1">
                Saving For
              </p>
              <h3 className="text-base font-serif text-gray-900">Your goals</h3>
            </div>
            <Link href="/goals" className="text-xs text-forest-600 hover:text-forest-700 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {goals.slice(0, 3).map((goal: any) => {
              const progress = goal.targetAmount > 0
                ? (goal.currentAmount / goal.targetAmount) * 100
                : 0;
              return (
                <div key={goal.id} className="bg-white rounded-xl border border-cream-300 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-gold-500" />
                    <p className="text-sm font-medium text-gray-900">{goal.name}</p>
                  </div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(goal.currentAmount)}
                    </span>
                    <span className="text-xs text-gray-400">
                      / {formatCurrency(goal.targetAmount)}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-cream-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gold-500 transition-all duration-500"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    {progress.toFixed(0)}% saved
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {showAddAccount && (
        <AddAccountModal
          onClose={() => setShowAddAccount(false)}
          onSuccess={() => {
            setShowAddAccount(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// Add Account Modal Component
function AddAccountModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"CURRENT" | "SAVINGS">("CURRENT");
  const [balance, setBalance] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter an account name");
      return;
    }

    setSubmitting(true);
    try {
      await createAccount({
        name: name.trim(),
        type,
        balance: parseFloat(balance) || 0,
        isDefault,
      });
      toast.success("Account created");
      onSuccess();
    } catch {
      toast.error("Failed to create account");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-scale-in">
        <h2 className="text-xl font-serif text-gray-900 mb-1">Add new account</h2>
        <p className="text-gray-500 text-sm mb-5">Track another source of funds.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Account name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-cream-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
              placeholder="e.g. Everyday Current"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Account type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["CURRENT", "SAVINGS"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`py-2.5 rounded-lg text-sm font-medium transition-default ${
                    type === t
                      ? "bg-navy-900 text-white"
                      : "bg-cream-100 text-gray-600 hover:bg-cream-200"
                  }`}
                >
                  {t === "CURRENT" ? "Current" : "Savings"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Initial balance
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
              <input
                type="number"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="w-full border border-cream-300 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                placeholder="0.00"
                step="0.01"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 rounded border-cream-300 text-forest-500 focus:ring-forest-500"
            />
            <span className="text-sm text-gray-700">Set as default account</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-cream-300 text-sm font-medium text-gray-700 hover:bg-cream-100 transition-default"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-lg bg-forest-500 text-white text-sm font-medium hover:bg-forest-600 transition-default disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
