"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getAccounts,
  createAccount,
  updateDefaultAccount,
  deleteAccount,
  decommissionAccount,
  recommissionAccount,
} from "@/actions/account";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import {
  Wallet,
  Plus,
  ArrowRight,
  Star,
  Trash2,
  AlertTriangle,
  CreditCard,
  PiggyBank,
  CheckCircle2,
  Target,
  Archive,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { BarLoader } from "react-spinners";
import { LoadingState } from "@/components/ui/loading-state";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [deleteModalAccount, setDeleteModalAccount] = useState<any | null>(null);
  const [decommissionModalAccount, setDecommissionModalAccount] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [decommissioning, setDecommissioning] = useState(false);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const accs = await getAccounts();
      setAccounts(accs);
    } catch {
      toast.error("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSetDefault = async (accountId: string) => {
    try {
      await updateDefaultAccount(accountId);
      toast.success("Default account updated");
      loadData();
    } catch {
      toast.error("Failed to update default account");
    }
  };

  const handleDelete = async () => {
    if (!deleteModalAccount) return;
    setDeleting(true);
    try {
      await deleteAccount(deleteModalAccount.id);
      toast.success("Account deleted");
      setDeleteModalAccount(null);
      loadData();
    } catch {
      toast.error("Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  const handleDecommission = async () => {
    if (!decommissionModalAccount) return;
    setDecommissioning(true);
    try {
      await decommissionAccount(decommissionModalAccount.id);
      toast.success(`"${decommissionModalAccount.name}" decommissioned`);
      setDecommissionModalAccount(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to decommission account");
    } finally {
      setDecommissioning(false);
    }
  };

  const handleRecommission = async (accountId: string) => {
    setReactivatingId(accountId);
    try {
      await recommissionAccount(accountId);
      toast.success("Account recommissioned successfully!");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to recommission account");
    } finally {
      setReactivatingId(null);
    }
  };

  const activeAccounts = accounts.filter((a) => !a.isDecommissioned);
  const decommissionedAccounts = accounts.filter((a) => a.isDecommissioned);

  const totalActualBalance = activeAccounts.reduce(
    (sum, a) => sum + (Number(a.balance) || 0),
    0
  );

  const totalGoalAllocations = activeAccounts.reduce(
    (sum, a) => sum + (Number(a.goalAllocations) || 0),
    0
  );

  const totalEffectiveBalance = totalActualBalance - totalGoalAllocations;

  if (loading) {
    return (
      <LoadingState
        title="Loading Accounts"
        message="Fetching your financial sources and usable balances..."
      />
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-500 mb-1">
            Financial Sources
          </p>
          <h1 className="text-3xl font-serif text-gray-900">Your Accounts</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your bank accounts, savings, and wallets in one place.
          </p>
        </div>

        <button
          onClick={() => setShowAddAccount(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-forest-500 text-white text-sm font-medium hover:bg-forest-600 transition-default shadow-sm w-fit"
        >
          <Plus className="w-4 h-4" />
          Add new account
        </button>
      </div>

      {/* Summary Card */}
      <div className="bg-navy-900 rounded-2xl p-6 text-white grid grid-cols-1 md:grid-cols-4 gap-6 shadow-md">
        <div className="md:col-span-2">
          <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-400">
            Available Balance (After Goals)
          </p>
          <p className="text-3xl font-bold mt-1 text-white">{formatCurrency(totalEffectiveBalance)}</p>
          {totalGoalAllocations > 0 && (
            <p className="text-xs text-forest-300 mt-1">
              Actual bank total: {formatCurrency(totalActualBalance)} · ({formatCurrency(totalGoalAllocations)} set aside in Goals)
            </p>
          )}
        </div>
        <div>
          <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-400">
            Active Accounts
          </p>
          <p className="text-3xl font-bold mt-1 text-gold-400">{activeAccounts.length}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-400">
            Default Account
          </p>
          <p className="text-lg font-semibold mt-2 text-forest-300">
            {activeAccounts.find((a) => a.isDefault)?.name || "None assigned"}
          </p>
        </div>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeAccounts.map((account: any) => {
          const effectiveBalance = Number(account.effectiveBalance ?? account.balance) || 0;
          const actualBalance = Number(account.balance) || 0;
          const goalAllocations = Number(account.goalAllocations) || 0;
          const canDecommission = actualBalance === 0 && effectiveBalance === 0;

          return (
            <div
              key={account.id}
              className="bg-white rounded-xl border border-cream-300 p-5 hover:shadow-md transition-default flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        account.type === "SAVINGS"
                          ? "bg-gold-500/10 text-gold-600"
                          : "bg-forest-500/10 text-forest-600"
                      }`}
                    >
                      {account.type === "SAVINGS" ? (
                        <PiggyBank className="w-5 h-5" />
                      ) : (
                        <CreditCard className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{account.name}</h3>
                      <p className="text-xs text-gray-400 capitalize">
                        {account.type.toLowerCase()} account
                      </p>
                    </div>
                  </div>

                  {account.isDefault && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-gold-100 text-gold-700">
                      <CheckCircle2 className="w-3 h-3 text-gold-600" />
                      Default
                    </span>
                  )}
                </div>

                <div className="my-4 space-y-3">
                  <div>
                    <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">
                      Usable Balance
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-0.5">
                      {formatCurrency(effectiveBalance)}
                    </p>
                  </div>

                  {/* Balance Breakdown Row */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-cream-200/80 text-xs">
                    <div className="bg-cream-50 rounded-lg p-2">
                      <p className="text-[10px] text-gray-400 font-medium uppercase">Total in Bank</p>
                      <p className="font-semibold text-gray-800 mt-0.5">{formatCurrency(actualBalance)}</p>
                    </div>
                    <div className="bg-cream-50 rounded-lg p-2">
                      <p className="text-[10px] text-gray-400 font-medium uppercase">In Goals</p>
                      <p className={`font-semibold mt-0.5 ${goalAllocations > 0 ? "text-gold-600" : "text-gray-500"}`}>
                        {formatCurrency(goalAllocations)}
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-400">
                    {account._count?.transactions ?? 0} recorded transaction(s)
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-cream-200 flex items-center justify-between gap-2">
                <Link
                  href={`/account/${account.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest-600 hover:text-forest-700 transition-default"
                >
                  View Activity <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <div className="flex items-center gap-1">
                  {!account.isDefault && (
                    <button
                      onClick={() => handleSetDefault(account.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gold-600 hover:bg-gold-50 transition-default"
                      title="Set as Default"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  {canDecommission && (
                    <button
                      onClick={() => setDecommissionModalAccount(account)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-navy-900 hover:bg-cream-100 transition-default"
                      title="Decommission Account (Balance is ₹0.00)"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteModalAccount(account)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-coral-500 hover:bg-coral-50 transition-default"
                    title="Delete Account"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Account Card */}
        <button
          onClick={() => setShowAddAccount(true)}
          className="bg-white rounded-xl border-2 border-dashed border-cream-300 p-8 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-forest-500 hover:text-forest-500 hover:bg-forest-50/10 transition-default min-h-[220px]"
        >
          <div className="w-10 h-10 rounded-xl bg-cream-100 flex items-center justify-center">
            <Plus className="w-5 h-5 text-gray-500" />
          </div>
          <span className="text-sm font-medium">Add another account</span>
        </button>
      </div>

      {/* Decommissioned Accounts Section */}
      {decommissionedAccounts.length > 0 && (
        <div className="pt-6 border-t border-cream-300 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-serif text-gray-800 flex items-center gap-2">
                <Archive className="w-4 h-4 text-gray-400" />
                Decommissioned Accounts ({decommissionedAccounts.length})
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                These accounts have zero balance. Past activity is preserved, but they cannot be selected for new transactions or goals.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {decommissionedAccounts.map((account: any) => (
              <div
                key={account.id}
                className="bg-cream-100/50 rounded-xl border border-cream-300/80 p-5 flex flex-col justify-between opacity-85"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gray-200 flex items-center justify-center text-gray-500">
                        <Archive className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700">{account.name}</h3>
                        <p className="text-[11px] text-gray-400 capitalize">{account.type.toLowerCase()} account</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                      Decommissioned
                    </span>
                  </div>

                  <div className="my-3 py-2 border-y border-cream-200 flex items-center justify-between text-xs">
                    <span className="text-gray-400">Balance</span>
                    <span className="font-semibold text-gray-600">₹0.00</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    {account._count?.transactions ?? 0} historical transactions
                  </p>
                </div>

                <div className="pt-3 flex items-center justify-between gap-2 border-t border-cream-200 mt-3">
                  <Link
                    href={`/account/${account.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900"
                  >
                    View History <ArrowRight className="w-3 h-3" />
                  </Link>

                  <button
                    onClick={() => handleRecommission(account.id)}
                    disabled={reactivatingId === account.id}
                    className="px-3 py-1.5 rounded-lg bg-navy-900 text-white text-xs font-medium hover:bg-navy-800 transition-default disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3 h-3" />
                    {reactivatingId === account.id ? "Recommissioning..." : "Recommission"}
                  </button>
                </div>
              </div>
            ))}
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

      {/* Delete Confirmation Modal */}
      {deleteModalAccount && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-scale-in text-gray-900 shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-coral-100 text-coral-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-serif text-gray-900 mb-2">
              Delete &ldquo;{deleteModalAccount.name}&rdquo;?
            </h2>
            <p className="text-gray-600 text-sm mb-6 leading-relaxed">
              Are you sure you want to delete this account? All associated transactions and history will be permanently deleted. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteModalAccount(null)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-lg border border-cream-300 text-sm font-medium text-gray-700 hover:bg-cream-100 transition-default"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-lg bg-coral-500 text-white text-sm font-medium hover:bg-coral-600 transition-default disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? "Deleting..." : "Yes, Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decommission Confirmation Modal */}
      {decommissionModalAccount && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-scale-in text-gray-900 shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
              <Archive className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-serif text-gray-900 mb-2">
              Decommission &ldquo;{decommissionModalAccount.name}&rdquo;?
            </h2>
            <p className="text-gray-600 text-sm mb-6 leading-relaxed">
              This account currently has a <strong>₹0.00</strong> usable balance. Decommissioning it will hide it from the <strong>Add Transaction</strong> and <strong>Goals</strong> selectors, while preserving all historical activity, records, and analytics. You can reactivate it anytime.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDecommissionModalAccount(null)}
                disabled={decommissioning}
                className="flex-1 py-2.5 rounded-lg border border-cream-300 text-sm font-medium text-gray-700 hover:bg-cream-100 transition-default"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDecommission}
                disabled={decommissioning}
                className="flex-1 py-2.5 rounded-lg bg-navy-900 text-white text-sm font-medium hover:bg-navy-800 transition-default disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {decommissioning ? "Decommissioning..." : "Yes, Decommission"}
              </button>
            </div>
          </div>
        </div>
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
