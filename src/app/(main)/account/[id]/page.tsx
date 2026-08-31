"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import {
  getAccountById,
  deleteAccount,
  updateDefaultAccount,
  decommissionAccount,
  recommissionAccount,
} from "@/actions/account";
import { deleteTransaction, bulkDeleteTransactions } from "@/actions/transaction";
import { formatCurrency, formatDate, getCategoryIcon } from "@/lib/utils";
import { CategoryIcon } from "@/components/ui/category-icon";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Trash2,
  Pencil,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronUp,
  Clock,
  Wallet,
  Filter,
  ArrowUpDown,
  Star,
  AlertTriangle,
  Archive,
  RotateCcw,
} from "lucide-react";
import { BarLoader } from "react-spinners";
import { LoadingState } from "@/components/ui/loading-state";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type SortField = "date" | "amount" | "category";
type SortDir = "asc" | "desc";

export default function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [recurringFilter, setRecurringFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [chartRange, setChartRange] = useState(30);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDecommissionModal, setShowDecommissionModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [decommissioningAccount, setDecommissioningAccount] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  const loadAccount = useCallback(async () => {
    try {
      const data = await getAccountById(id);
      setAccount(data);
    } catch (error) {
      toast.error("Failed to load account");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  if (loading) {
    return (
      <LoadingState
        title="Loading Account"
        message="Fetching account balance and transaction history..."
      />
    );
  }

  if (!account) return <p className="text-gray-500">Account not found</p>;

  // Filter and sort transactions
  let filtered = account.transactions || [];
  if (search) {
    filtered = filtered.filter((t: any) =>
      t.description.toLowerCase().includes(search.toLowerCase())
    );
  }
  if (typeFilter !== "all") {
    filtered = filtered.filter((t: any) => t.type === typeFilter);
  }
  if (recurringFilter === "recurring") {
    filtered = filtered.filter((t: any) => t.isRecurring);
  } else if (recurringFilter === "one-time") {
    filtered = filtered.filter((t: any) => !t.isRecurring);
  }

  // Sort
  filtered = [...filtered].sort((a: any, b: any) => {
    let cmp = 0;
    if (sortField === "date") {
      cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (cmp === 0) {
        cmp = new Date(a.createdAt || a.date).getTime() - new Date(b.createdAt || b.date).getTime();
      }
    } else if (sortField === "amount") {
      cmp = a.amount - b.amount;
    } else if (sortField === "category") {
      cmp = a.category.localeCompare(b.category);
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  // Calculate live totals for selected rows and filtered view
  const selectedTransactions = filtered.filter((t: any) => selectedIds.has(t.id));
  const selectedExpenseTotal = selectedTransactions
    .filter((t: any) => t.type === "EXPENSE")
    .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
  const selectedIncomeTotal = selectedTransactions
    .filter((t: any) => t.type === "INCOME")
    .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
  const selectedNetTotal = selectedIncomeTotal - selectedExpenseTotal;

  const filteredExpenseTotal = filtered
    .filter((t: any) => t.type === "EXPENSE")
    .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
  const filteredIncomeTotal = filtered
    .filter((t: any) => t.type === "INCOME")
    .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
  const filteredNetTotal = filteredIncomeTotal - filteredExpenseTotal;

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-gray-300" />;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3 h-3 text-forest-500" />
    ) : (
      <ChevronDown className="w-3 h-3 text-forest-500" />
    );
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((t: any) => t.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      await bulkDeleteTransactions(Array.from(selectedIds));
      toast.success(`Deleted ${selectedIds.size} transaction(s)`);
      setSelectedIds(new Set());
      loadAccount();
    } catch {
      toast.error("Failed to delete transactions");
    } finally {
      setDeleting(false);
    }
  };

  const handleDelete = async (txId: string) => {
    try {
      await deleteTransaction(txId);
      toast.success("Transaction deleted");
      loadAccount();
    } catch {
      toast.error("Failed to delete transaction");
    }
  };

  // Chart data - group by date within range
  const chartStartDate = new Date();
  chartStartDate.setDate(chartStartDate.getDate() - chartRange);
  const chartTransactions = (account.transactions || []).filter(
    (t: any) => new Date(t.date) >= chartStartDate
  );

  const chartDataMap: Record<string, { date: string; income: number; expense: number }> = {};
  chartTransactions.forEach((t: any) => {
    const dateKey = new Date(t.date).toISOString().split("T")[0];
    if (!chartDataMap[dateKey]) {
      chartDataMap[dateKey] = { date: dateKey, income: 0, expense: 0 };
    }
    if (t.type === "INCOME") chartDataMap[dateKey].income += t.amount;
    else if (t.type === "EXPENSE") chartDataMap[dateKey].expense += t.amount;
  });
  const chartData = Object.values(chartDataMap).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await deleteAccount(account.id);
      toast.success("Account deleted successfully");
      router.push("/dashboard");
    } catch {
      toast.error("Failed to delete account");
      setDeletingAccount(false);
    }
  };

  const handleDecommissionAccount = async () => {
    setDecommissioningAccount(true);
    try {
      await decommissionAccount(account.id);
      toast.success(`"${account.name}" decommissioned successfully`);
      setShowDecommissionModal(false);
      loadAccount();
    } catch (err: any) {
      toast.error(err.message || "Failed to decommission account");
    } finally {
      setDecommissioningAccount(false);
    }
  };

  const handleRecommissionAccount = async () => {
    setReactivating(true);
    try {
      await recommissionAccount(account.id);
      toast.success(`"${account.name}" recommissioned successfully!`);
      loadAccount();
    } catch (err: any) {
      toast.error(err.message || "Failed to recommission account");
    } finally {
      setReactivating(false);
    }
  };

  const handleSetDefault = async () => {
    try {
      await updateDefaultAccount(account.id);
      toast.success("Default account updated");
      loadAccount();
    } catch {
      toast.error("Failed to update default account");
    }
  };

  const effectiveBalance = Number(account.effectiveBalance ?? account.balance) || 0;
  const actualBalance = Number(account.balance) || 0;
  const canDecommission = !account.isDecommissioned && actualBalance === 0 && effectiveBalance === 0;

  const exportCSV = () => {
    const headers = ["Date", "Description", "Category", "Type", "Amount"];
    const rows = filtered.map((t: any) => [
      formatDate(t.date),
      t.description,
      t.category,
      t.type,
      t.amount,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${account.name}-transactions.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      {/* Back Link */}
      <Link
        href="/accounts"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-default"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to accounts
      </Link>

      {/* Decommissioned Notice Banner */}
      {account.isDecommissioned && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4 text-amber-900">
          <div className="flex items-center gap-3">
            <Archive className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold">This account is decommissioned</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Historical activity and reports are preserved, but this account is hidden from new transactions and savings goals.
              </p>
            </div>
          </div>
          <button
            onClick={handleRecommissionAccount}
            disabled={reactivating}
            className="px-4 py-2 rounded-xl bg-navy-900 text-white text-xs font-medium hover:bg-navy-800 transition-default shrink-0 flex items-center gap-1.5 disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {reactivating ? "Recommissioning..." : "Recommission Account"}
          </button>
        </div>
      )}

      {/* Account Header */}
      <div className="bg-navy-900 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-400">
                  Account Detail
                </p>
                {account.isDecommissioned && (
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                    Decommissioned
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-serif">{account.name}</h1>
              <p className="text-gray-400 text-xs mt-0.5">
                {account._count.transactions} transactions
                {account.isDefault && " · Default account"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6 justify-between md:justify-end">
            <div className="text-right">
              <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-400">
                Available Balance
              </p>
              <p className="text-3xl font-bold mt-1">
                {formatCurrency(effectiveBalance)}
              </p>
              {Number(account.goalAllocations) > 0 && (
                <p className="text-xs text-forest-300 mt-0.5">
                  Actual: {formatCurrency(actualBalance)} · ({formatCurrency(Number(account.goalAllocations))} in Goals)
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!account.isDefault && !account.isDecommissioned && (
                <button
                  onClick={handleSetDefault}
                  className="px-3 py-2 rounded-lg bg-white/10 text-xs font-medium text-gray-200 hover:bg-white/20 transition-default flex items-center gap-1.5"
                  title="Make this the default account"
                >
                  <Star className="w-3.5 h-3.5 text-gold-400" />
                  Set Default
                </button>
              )}
              {canDecommission && (
                <button
                  onClick={() => setShowDecommissionModal(true)}
                  className="px-3 py-2 rounded-lg bg-white/10 text-xs font-medium text-gray-200 hover:bg-white/20 transition-default flex items-center gap-1.5"
                  title="Decommission this account"
                >
                  <Archive className="w-3.5 h-3.5 text-amber-400" />
                  Decommission
                </button>
              )}
              {account.isDecommissioned && (
                <button
                  onClick={handleRecommissionAccount}
                  disabled={reactivating}
                  className="px-3 py-2 rounded-lg bg-white/10 text-xs font-medium text-gray-200 hover:bg-white/20 transition-default flex items-center gap-1.5"
                  title="Recommission this account"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-forest-400" />
                  Recommission
                </button>
              )}
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-3 py-2 rounded-lg bg-coral-500/20 text-coral-300 text-xs font-medium hover:bg-coral-500/30 transition-default flex items-center gap-1.5"
                title="Delete this account"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Decommission Confirmation Modal */}
      {showDecommissionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-scale-in text-gray-900 shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
              <Archive className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-serif text-gray-900 mb-2">Decommission &ldquo;{account.name}&rdquo;?</h2>
            <p className="text-gray-600 text-sm mb-6 leading-relaxed">
              This account has a <strong>₹0.00</strong> balance. Decommissioning it will hide it from the <strong>Add Transaction</strong> and <strong>Goals</strong> selectors, while preserving all historical activity, records, and analytics.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDecommissionModal(false)}
                disabled={decommissioningAccount}
                className="flex-1 py-2.5 rounded-lg border border-cream-300 text-sm font-medium text-gray-700 hover:bg-cream-100 transition-default"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDecommissionAccount}
                disabled={decommissioningAccount}
                className="flex-1 py-2.5 rounded-lg bg-navy-900 text-white text-sm font-medium hover:bg-navy-800 transition-default disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {decommissioningAccount ? "Decommissioning..." : "Yes, Decommission"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-scale-in text-gray-900 shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-coral-100 text-coral-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-serif text-gray-900 mb-2">Delete &ldquo;{account.name}&rdquo;?</h2>
            <p className="text-gray-600 text-sm mb-6 leading-relaxed">
              Are you sure you want to delete this account? All associated transactions ({account._count.transactions}) and history will be permanently deleted. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deletingAccount}
                className="flex-1 py-2.5 rounded-lg border border-cream-300 text-sm font-medium text-gray-700 hover:bg-cream-100 transition-default"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="flex-1 py-2.5 rounded-lg bg-coral-500 text-white text-sm font-medium hover:bg-coral-600 transition-default disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingAccount ? "Deleting..." : "Yes, Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overview Chart */}
      <div className="bg-white rounded-xl border border-cream-300 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-serif text-gray-900">Income vs Expenses</h3>
          <div className="flex gap-1.5">
            {[
              { label: "7D", days: 7 },
              { label: "1M", days: 30 },
              { label: "3M", days: 90 },
              { label: "6M", days: 180 },
              { label: "All", days: 9999 },
            ].map((opt) => (
              <button
                key={opt.label}
                onClick={() => setChartRange(opt.days)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-default ${
                  chartRange === opt.days
                    ? "bg-navy-900 text-white"
                    : "bg-cream-100 text-gray-600 hover:bg-cream-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[220px]">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D4" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  tickFormatter={(v) =>
                    new Date(v).toLocaleDateString("en-IN", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(Number(value) || 0), ""]}
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #E8E0D4",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend />
                <Bar dataKey="income" fill="#4A8B6E" radius={[4, 4, 0, 0]} name="Income" />
                <Bar dataKey="expense" fill="#C75C5C" radius={[4, 4, 0, 0]} name="Expense" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              No data for this period
            </div>
          )}
        </div>
      </div>

      {/* Transaction Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-500 mb-1">
              One Clear List
            </p>
            <h3 className="text-base font-serif text-gray-900">Activity</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadAccount()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cream-300 bg-white text-xs font-medium text-gray-700 hover:bg-cream-100 transition-default"
            >
              <RefreshCw className="w-3 h-3" />
              Sync
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cream-300 bg-white text-xs font-medium text-gray-700 hover:bg-cream-100 transition-default"
            >
              <Download className="w-3 h-3" />
              Export
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-cream-300 overflow-hidden">
          {/* Filters */}
          <div className="p-4 border-b border-cream-200 flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search activity"
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-cream-300 text-sm focus:outline-none focus:ring-1 focus:ring-forest-500"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-cream-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-forest-500"
            >
              <option value="all">All activity</option>
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
            </select>

            <select
              value={recurringFilter}
              onChange={(e) => setRecurringFilter(e.target.value)}
              className="border border-cream-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-forest-500"
            >
              <option value="all">All</option>
              <option value="recurring">Recurring</option>
              <option value="one-time">One-time</option>
            </select>

            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="px-3 py-1.5 rounded-lg border border-cream-300 text-xs font-medium text-gray-600 hover:bg-cream-100 transition-default"
                >
                  Clear Selection
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={deleting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-coral-400 bg-coral-50 text-coral-600 text-xs font-medium hover:bg-coral-100 transition-default disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete ({selectedIds.size})
                </button>
              </div>
            )}
          </div>

          {/* Selection Totals Banner (When items are checked) */}
          {selectedIds.size > 0 ? (
            <div className="px-5 py-3 border-b border-navy-800 bg-navy-900 text-white flex flex-wrap items-center justify-between gap-3 animate-scale-in">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-600 text-gold-500 focus:ring-gold-400"
                  />
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                    {selectedIds.size} of {filtered.length} Selected
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-5 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400">Selected Income:</span>
                  <span className="font-semibold text-forest-300">
                    +{formatCurrency(selectedIncomeTotal)}
                  </span>
                </div>
                <div className="w-px h-3.5 bg-white/20" />
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400">Selected Expense:</span>
                  <span className="font-semibold text-coral-300">
                    -{formatCurrency(selectedExpenseTotal)}
                  </span>
                </div>
                <div className="w-px h-3.5 bg-white/20" />
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400">Net:</span>
                  <span className={`font-bold ${selectedNetTotal >= 0 ? "text-forest-300" : "text-coral-300"}`}>
                    {selectedNetTotal >= 0 ? "+" : ""}{formatCurrency(selectedNetTotal)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Default List Summary Bar (When nothing is checked) */
            filtered.length > 0 && (
              <div className="px-4 py-2 border-b border-cream-200 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 bg-cream-50/50">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={toggleSelectAll}
                      className="w-3.5 h-3.5 rounded border-cream-300 text-forest-500 focus:ring-forest-500"
                    />
                    <span className="font-medium text-gray-700">Select all</span>
                  </label>
                  <span className="text-gray-300">|</span>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span>
                      Income: <strong className="text-forest-600">+{formatCurrency(filteredIncomeTotal)}</strong>
                    </span>
                    <span>
                      Expense: <strong className="text-coral-600">-{formatCurrency(filteredExpenseTotal)}</strong>
                    </span>
                    <span>
                      Net: <strong className={filteredNetTotal >= 0 ? "text-forest-600" : "text-coral-600"}>
                        {filteredNetTotal >= 0 ? "+" : ""}{formatCurrency(filteredNetTotal)}
                      </strong>
                    </span>
                  </div>
                </div>
                <span>Sorted by {sortField} {sortDir === "desc" ? "↓" : "↑"}</span>
              </div>
            )
          )}

          {/* Table Header */}
          <div className="hidden md:grid grid-cols-[40px_90px_1fr_120px_100px_40px] gap-3 px-4 py-2.5 border-b border-cream-200 text-[10px] font-semibold tracking-[0.1em] uppercase text-gray-500">
            <div />
            <button onClick={() => toggleSort("date")} className="flex items-center gap-1 hover:text-gray-700">
              Date <SortIcon field="date" />
            </button>
            <div>Description</div>
            <button onClick={() => toggleSort("category")} className="flex items-center gap-1 hover:text-gray-700">
              Category <SortIcon field="category" />
            </button>
            <button onClick={() => toggleSort("amount")} className="flex items-center gap-1 justify-end hover:text-gray-700">
              Amount <SortIcon field="amount" />
            </button>
            <div />
          </div>

          {/* Rows */}
          {filtered.length > 0 ? (
            <div className="divide-y divide-cream-200">
              {filtered.map((tx: any) => (
                <div
                  key={tx.id}
                  className={`p-3.5 sm:px-4 sm:py-3 hover:bg-cream-50 transition-default ${
                    selectedIds.has(tx.id) ? "bg-forest-50/30" : ""
                  }`}
                >
                  {/* Desktop Grid */}
                  <div className="hidden md:grid md:grid-cols-[40px_90px_1fr_120px_100px_40px] gap-3 items-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(tx.id)}
                      onChange={() => toggleSelect(tx.id)}
                      className="w-3.5 h-3.5 rounded border-cream-300 text-forest-500 focus:ring-forest-500"
                    />
                    <span className="text-sm text-gray-600">
                      {new Date(tx.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        tx.type === "INCOME" ? "bg-forest-500/10 text-forest-700" : "bg-coral-500/10 text-coral-700"
                      }`}>
                        <CategoryIcon category={tx.category} className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <Link
                          href={`/transaction/edit/${tx.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-forest-600 transition-colors"
                        >
                          {tx.description}
                        </Link>
                        <p className="text-[10px] text-gray-400">
                          {(tx.isRecurring || tx.recurringInterval) && (
                            <span className="text-gold-600 font-medium">
                              Recurring ({tx.recurringInterval?.toLowerCase() || "daily"}) ·{" "}
                            </span>
                          )}
                          {account.name}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-cream-100 text-gray-600 w-fit">
                      {tx.category}
                    </span>
                    <span className={`text-sm font-semibold text-right ${
                      tx.type === "INCOME" ? "text-forest-500" : "text-coral-500"
                    }`}>
                      {tx.type === "INCOME" ? "+" : "-"}₹{Number(tx.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/transaction/edit/${tx.id}`}
                        className="p-1 rounded text-gray-400 hover:text-navy-900 transition-default"
                        title="Edit Transaction"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="p-1 rounded text-gray-300 hover:text-coral-500 transition-default"
                        title="Delete Transaction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Mobile Card */}
                  <div className="flex md:hidden items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(tx.id)}
                        onChange={() => toggleSelect(tx.id)}
                        className="w-3.5 h-3.5 rounded border-cream-300 text-forest-500 focus:ring-forest-500 shrink-0"
                      />
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        tx.type === "INCOME" ? "bg-forest-500/10 text-forest-700" : "bg-coral-500/10 text-coral-700"
                      }`}>
                        <CategoryIcon category={tx.category} className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/transaction/edit/${tx.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-forest-600 transition-colors truncate block"
                        >
                          {tx.description}
                        </Link>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-0.5">
                          <span>
                            {new Date(tx.date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                          <span>·</span>
                          <span>{tx.category}</span>
                          {(tx.isRecurring || tx.recurringInterval) && (
                            <>
                              <span>·</span>
                              <span className="text-gold-600 font-medium">Recurring</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end">
                      <span className={`text-sm font-semibold ${
                        tx.type === "INCOME" ? "text-forest-500" : "text-coral-500"
                      }`}>
                        {tx.type === "INCOME" ? "+" : "-"}₹{Number(tx.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                      <div className="flex items-center gap-1 mt-1">
                        <Link
                          href={`/transaction/edit/${tx.id}`}
                          className="p-1 rounded text-gray-400 hover:text-navy-900"
                          title="Edit"
                        >
                          <Pencil className="w-3 h-3" />
                        </Link>
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="p-1 rounded text-gray-300 hover:text-coral-500"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-400 text-sm">
              No transactions found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
