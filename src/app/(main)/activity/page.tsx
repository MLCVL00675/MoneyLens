"use client";

import { useEffect, useState, useCallback } from "react";
import { getAllTransactions, deleteTransaction, bulkDeleteTransactions } from "@/actions/transaction";
import { getAccounts } from "@/actions/account";
import { formatCurrency, formatDate, getCategoryIcon } from "@/lib/utils";
import { CategoryIcon } from "@/components/ui/category-icon";
import { toast } from "sonner";
import Link from "next/link";
import {
  Search,
  Trash2,
  Pencil,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Filter,
  ArrowRightLeft,
  Calendar,
} from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";

type SortField = "date" | "amount" | "category" | "description";
type SortDir = "asc" | "desc";

export default function ActivityPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [recurringFilter, setRecurringFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [txs, accs] = await Promise.all([
        getAllTransactions(),
        getAccounts(),
      ]);
      setTransactions(txs);
      setAccounts(accs);
    } catch {
      toast.error("Failed to load activity");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter and sort transactions
  let filtered = transactions || [];
  if (search) {
    filtered = filtered.filter(
      (t: any) =>
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase()) ||
        t.account?.name.toLowerCase().includes(search.toLowerCase())
    );
  }
  if (typeFilter !== "all") {
    filtered = filtered.filter((t: any) => t.type === typeFilter);
  }
  if (accountFilter !== "all") {
    filtered = filtered.filter((t: any) => t.accountId === accountFilter);
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
      cmp = Number(a.amount) - Number(b.amount);
    } else if (sortField === "category") {
      cmp = a.category.localeCompare(b.category);
    } else if (sortField === "description") {
      cmp = a.description.localeCompare(b.description);
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
      loadData();
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
      loadData();
    } catch {
      toast.error("Failed to delete transaction");
    }
  };

  const exportCSV = () => {
    const headers = ["Date", "Description", "Account", "Category", "Type", "Amount", "Status"];
    const rows = filtered.map((t: any) => [
      formatDate(t.date),
      t.description,
      t.account?.name || "",
      t.category,
      t.type,
      t.amount,
      t.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-activity.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <LoadingState
        title="Loading Activity"
        message="Fetching your transactions and activity history..."
      />
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      {/* Header matching Reference */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-500 mb-1">
            ONE CLEAR LIST
          </p>
          <h1 className="text-3xl font-serif text-gray-900">Activity</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-cream-300 bg-white text-xs font-medium text-gray-700 hover:bg-cream-100 transition-default shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sync
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-cream-300 bg-white text-xs font-medium text-gray-700 hover:bg-cream-100 transition-default shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-cream-300 overflow-hidden shadow-sm">
        {/* Filters Bar */}
        <div className="p-4 border-b border-cream-200 flex items-center gap-3 flex-wrap bg-cream-50/50">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search activity, categories, accounts..."
              className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-cream-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-cream-300 rounded-xl px-3.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500 text-gray-700"
          >
            <option value="all">All activity</option>
            <option value="INCOME">Income only</option>
            <option value="EXPENSE">Expenses only</option>
            <option value="TRANSFER">Transfers only</option>
          </select>

          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="border border-cream-300 rounded-xl px-3.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500 text-gray-700"
          >
            <option value="all">All accounts</option>
            {accounts.map((acc: any) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>

          <select
            value={recurringFilter}
            onChange={(e) => setRecurringFilter(e.target.value)}
            className="border border-cream-300 rounded-xl px-3.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500 text-gray-700"
          >
            <option value="all">All frequencies</option>
            <option value="recurring">Recurring only</option>
            <option value="one-time">One-time only</option>
          </select>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-2 rounded-xl border border-cream-300 text-xs font-medium text-gray-600 hover:bg-cream-100 transition-default"
              >
                Clear Selection
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-coral-400 bg-coral-50 text-coral-600 text-xs font-medium hover:bg-coral-100 transition-default disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete ({selectedIds.size})
              </button>
            </div>
          )}
        </div>

        {/* Selected Totals Banner (When items are checked) */}
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
            <div className="px-5 py-2.5 border-b border-cream-200 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 bg-cream-50/50">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5 rounded border-cream-300 text-forest-600 focus:ring-forest-500"
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
              <span className="text-[11px] text-gray-400">
                Sorted by <strong className="capitalize text-gray-600">{sortField}</strong> ({sortDir === "desc" ? "descending" : "ascending"})
              </span>
            </div>
          )
        )}

        {/* Table Header */}
        <div className="hidden md:grid grid-cols-[44px_90px_1fr_130px_120px_44px] gap-3 px-5 py-3 border-b border-cream-200 text-[10px] font-semibold tracking-[0.1em] uppercase text-gray-500 bg-cream-50/30">
          <div />
          <button onClick={() => toggleSort("date")} className="flex items-center gap-1 hover:text-gray-900 text-left">
            Date <SortIcon field="date" />
          </button>
          <button onClick={() => toggleSort("description")} className="flex items-center gap-1 hover:text-gray-900 text-left">
            Description <SortIcon field="description" />
          </button>
          <button onClick={() => toggleSort("category")} className="flex items-center gap-1 hover:text-gray-900 text-left">
            Category <SortIcon field="category" />
          </button>
          <button onClick={() => toggleSort("amount")} className="flex items-center gap-1 justify-end hover:text-gray-900 text-right">
            Amount <SortIcon field="amount" />
          </button>
          <div />
        </div>

        {/* Table Rows */}
        {filtered.length > 0 ? (
          <div className="divide-y divide-cream-200">
            {filtered.map((tx: any) => (
              <div
                key={tx.id}
                className={`p-3.5 sm:px-5 sm:py-3.5 hover:bg-cream-50/70 transition-default ${
                  selectedIds.has(tx.id) ? "bg-forest-50/30" : ""
                }`}
              >
                {/* Desktop Grid Layout */}
                <div className="hidden md:grid md:grid-cols-[44px_90px_1fr_130px_120px_44px] gap-3 items-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(tx.id)}
                    onChange={() => toggleSelect(tx.id)}
                    className="w-4 h-4 rounded border-cream-300 text-forest-600 focus:ring-forest-500"
                  />
                  <span className="text-sm text-gray-600 font-medium">
                    {new Date(tx.date).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 ${
                        tx.type === "INCOME"
                          ? "bg-forest-500/10 text-forest-700"
                          : tx.type === "TRANSFER"
                          ? "bg-navy-900/10 text-navy-800"
                          : "bg-coral-500/10 text-coral-700"
                      }`}
                    >
                      {tx.type === "TRANSFER" ? (
                        <ArrowRightLeft className="w-4 h-4" />
                      ) : (
                        <CategoryIcon category={tx.category} className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <Link
                        href={`/transaction/edit/${tx.id}`}
                        className="text-sm font-semibold text-gray-900 hover:text-forest-600 transition-colors"
                      >
                        {tx.description}
                      </Link>
                      <p className="text-[11px] text-gray-400 flex items-center gap-1.5 mt-0.5">
                        {(tx.isRecurring || tx.recurringInterval) && (
                          <span className="text-gold-600 font-medium">
                            Recurring ({tx.recurringInterval?.toLowerCase() || "daily"}) ·
                          </span>
                        )}
                        <span>{tx.account?.name || "Account"}</span>
                      </p>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-cream-100 text-gray-700 font-medium inline-block">
                      {tx.category}
                    </span>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-sm font-bold ${
                        tx.type === "INCOME"
                          ? "text-forest-600"
                          : tx.type === "TRANSFER"
                          ? "text-navy-900"
                          : "text-coral-600"
                      }`}
                    >
                      {tx.type === "INCOME" ? "+" : tx.type === "TRANSFER" ? "⇄ " : "-"}
                      {formatCurrency(Number(tx.amount) || 0)}
                    </span>
                  </div>
                  <div className="text-right flex items-center justify-end gap-1">
                    <Link
                      href={`/transaction/edit/${tx.id}`}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-navy-900 hover:bg-cream-100 transition-default"
                      title="Edit Transaction"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(tx.id)}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-coral-500 hover:bg-coral-50 transition-default"
                      title="Delete Transaction"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Mobile Card Layout */}
                <div className="flex md:hidden items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(tx.id)}
                      onChange={() => toggleSelect(tx.id)}
                      className="w-4 h-4 rounded border-cream-300 text-forest-600 focus:ring-forest-500 shrink-0"
                    />
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 ${
                        tx.type === "INCOME"
                          ? "bg-forest-500/10 text-forest-700"
                          : tx.type === "TRANSFER"
                          ? "bg-navy-900/10 text-navy-800"
                          : "bg-coral-500/10 text-coral-700"
                      }`}
                    >
                      {tx.type === "TRANSFER" ? (
                        <ArrowRightLeft className="w-4 h-4" />
                      ) : (
                        <CategoryIcon category={tx.category} className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/transaction/edit/${tx.id}`}
                        className="text-sm font-semibold text-gray-900 hover:text-forest-600 transition-colors truncate block"
                      >
                        {tx.description}
                      </Link>
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-0.5 flex-wrap">
                        <span>
                          {new Date(tx.date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                        <span>·</span>
                        <span>{tx.account?.name || "Account"}</span>
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
                    <span
                      className={`text-sm font-bold ${
                        tx.type === "INCOME"
                          ? "text-forest-600"
                          : tx.type === "TRANSFER"
                          ? "text-navy-900"
                          : "text-coral-600"
                      }`}
                    >
                      {tx.type === "INCOME" ? "+" : tx.type === "TRANSFER" ? "⇄ " : "-"}
                      {formatCurrency(Number(tx.amount) || 0)}
                    </span>
                    <div className="flex items-center gap-1 mt-1">
                      <Link
                        href={`/transaction/edit/${tx.id}`}
                        className="p-1 rounded text-gray-400 hover:text-navy-900 hover:bg-cream-100"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="p-1 rounded text-gray-300 hover:text-coral-500 hover:bg-coral-50"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-16 text-center text-gray-400 text-sm">
            <div className="w-12 h-12 rounded-2xl bg-cream-100 flex items-center justify-center mx-auto mb-3">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <p className="font-serif text-base text-gray-700 mb-1">No transactions found</p>
            <p className="text-xs text-gray-400">Try adjusting your filters or search query.</p>
          </div>
        )}
      </div>
    </div>
  );
}
