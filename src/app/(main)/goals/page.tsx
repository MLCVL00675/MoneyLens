"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getGoals,
  createGoal,
  contributeToGoal,
  redeemGoal,
  deleteGoal,
  updateGoalContribution,
  deleteGoalContribution,
} from "@/actions/goals";
import { getAccounts } from "@/actions/account";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  Target, Plus, ChevronDown, ChevronUp, Trash2, Gift,
  Wallet, Calendar, ArrowRight, Clock, Pencil,
} from "lucide-react";
import { BarLoader } from "react-spinners";
import { LoadingState } from "@/components/ui/loading-state";

export default function GoalsPage() {
  const [goals, setGoals] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);

  // Create form
  const [newName, setNewName] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [creating, setCreating] = useState(false);

  // Contribute form
  const [contributeGoalId, setContributeGoalId] = useState<string | null>(null);
  const [contributeAmount, setContributeAmount] = useState("");
  const [contributeAccountId, setContributeAccountId] = useState("");
  const [contributeDesc, setContributeDesc] = useState("");
  const [contributing, setContributing] = useState(false);

  // Modals
  const [redeemModalGoal, setRedeemModalGoal] = useState<any | null>(null);
  const [deleteModalGoal, setDeleteModalGoal] = useState<any | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [deletingGoal, setDeletingGoal] = useState(false);

  // Edit Goal Deposit Modal State
  const [editingContribution, setEditingContribution] = useState<any | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editAccountId, setEditAccountId] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingContributionId, setDeletingContributionId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [gls, accs] = await Promise.all([getGoals(), getAccounts()]);
      const activeAccs = accs.filter((a: any) => !a.isDecommissioned);
      setGoals(gls);
      setAccounts(activeAccs);
      if (activeAccs.length > 0 && !contributeAccountId) {
        setContributeAccountId(activeAccs[0].id);
      }
    } catch {
      toast.error("Failed to load goals");
    } finally {
      setLoading(false);
    }
  }, [contributeAccountId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newTarget || parseFloat(newTarget) <= 0) {
      toast.error("Please fill in all required fields");
      return;
    }
    setCreating(true);
    try {
      await createGoal({
        name: newName.trim(),
        targetAmount: parseFloat(newTarget),
        deadline: newDeadline || undefined,
      });
      toast.success("Goal created!");
      setShowCreate(false);
      setNewName("");
      setNewTarget("");
      setNewDeadline("");
      loadData();
    } catch {
      toast.error("Failed to create goal");
    } finally {
      setCreating(false);
    }
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributeGoalId || !contributeAmount || parseFloat(contributeAmount) <= 0 || !contributeAccountId) {
      toast.error("Please fill in all fields");
      return;
    }
    setContributing(true);
    try {
      const res: any = await contributeToGoal({
        goalId: contributeGoalId,
        amount: parseFloat(contributeAmount),
        accountId: contributeAccountId,
        description: contributeDesc || undefined,
      });
      if (res?.wasClamped) {
        toast.success(`Goal reached 100%! Capped at remaining ${formatCurrency(res.adjustedAmount)}`);
      } else {
        toast.success("Contribution added!");
      }
      setContributeGoalId(null);
      setContributeAmount("");
      setContributeDesc("");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to add contribution");
    } finally {
      setContributing(false);
    }
  };

  const handleConfirmRedeem = async () => {
    if (!redeemModalGoal) return;
    setRedeeming(true);
    try {
      await redeemGoal(redeemModalGoal.id);
      toast.success(`"${redeemModalGoal.name}" redeemed! Expense recorded.`);
      setRedeemModalGoal(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to redeem goal");
    } finally {
      setRedeeming(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalGoal) return;
    setDeletingGoal(true);
    try {
      await deleteGoal(deleteModalGoal.id);
      toast.success("Goal deleted");
      setDeleteModalGoal(null);
      loadData();
    } catch {
      toast.error("Failed to delete goal");
    } finally {
      setDeletingGoal(false);
    }
  };

  const handleOpenEditContribution = (c: any, goal: any) => {
    setEditingContribution({ ...c, goal });
    setEditAmount(String(c.amount));
    setEditAccountId(c.account?.id || c.accountId || (accounts[0]?.id ?? ""));
    setEditDesc(c.description || "");
  };

  const handleSaveEditContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContribution) return;
    const amt = parseFloat(editAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!editAccountId) {
      toast.error("Please select an account");
      return;
    }

    setSavingEdit(true);
    try {
      await updateGoalContribution({
        id: editingContribution.id,
        amount: amt,
        accountId: editAccountId,
        description: editDesc.trim() || undefined,
      });
      toast.success("Deposit updated successfully");
      setEditingContribution(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update deposit");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteContribution = async (contributionId: string) => {
    setDeletingContributionId(contributionId);
    try {
      await deleteGoalContribution(contributionId);
      toast.success("Deposit removed from goal");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete deposit");
    } finally {
      setDeletingContributionId(null);
    }
  };

  if (loading) {
    return (
      <LoadingState
        title="Loading Savings Goals"
        message="Calculating your targets, funding progress, and allocations..."
      />
    );
  }

  const activeGoals = goals.filter((g) => g.status === "ACTIVE");
  const completedGoals = goals.filter((g) => g.status === "COMPLETED");
  const redeemedGoals = goals.filter((g) => g.status === "REDEEMED");

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-500 mb-1">
            Stay on Track
          </p>
          <h1 className="text-3xl font-serif text-gray-900">Savings Goals</h1>
          <p className="text-gray-500 text-sm mt-1">
            Set aside money for the things that matter. The money stays in your account — we just keep track.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-forest-500 text-white text-sm font-medium hover:bg-forest-600 transition-default shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Goal
        </button>
      </div>

      {/* Create Goal Form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-cream-300 p-5 animate-scale-in space-y-4 shadow-sm">
          <h3 className="text-base font-serif text-gray-900">Create a new goal</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Goal name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2.5 border border-cream-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                placeholder="e.g. iPad Pro"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Target amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                <input
                  type="number"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  className="w-full pl-7 pr-3 py-2.5 border border-cream-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Deadline (optional)</label>
              <input
                type="date"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                className="w-full px-3 py-2.5 border border-cream-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-lg border border-cream-300 text-sm font-medium text-gray-700 hover:bg-cream-100 transition-default"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 rounded-lg bg-forest-500 text-white text-sm font-medium hover:bg-forest-600 transition-default disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Goal"}
            </button>
          </div>
        </form>
      )}

      {/* Active Goals Grid */}
      {activeGoals.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Active Goals</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {activeGoals.map((goal: any) => {
              const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
              const isExpanded = expandedGoal === goal.id;

              // Group contributions by account
              const accountMap: Record<string, { name: string; type: string; total: number }> = {};
              (goal.contributions || []).forEach((c: any) => {
                if (!accountMap[c.account.id]) {
                  accountMap[c.account.id] = { name: c.account.name, type: c.account.type, total: 0 };
                }
                accountMap[c.account.id].total += c.amount;
              });

              return (
                <div
                  key={goal.id}
                  className="bg-white rounded-2xl border border-cream-300 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between p-4 min-h-[290px]"
                >
                  {/* Top Bar: Icon, Title & Delete */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-gold-500/10 flex items-center justify-center shrink-0">
                        <Target className="w-4.5 h-4.5 text-gold-600" />
                      </div>
                      <div className="flex-1 min-w-0 pr-1">
                        <h3 className="text-sm font-bold text-gray-900 truncate" title={goal.name}>
                          {goal.name}
                        </h3>
                        {goal.deadline && (
                          <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 shrink-0" />
                            {formatDate(goal.deadline)}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => setDeleteModalGoal(goal)}
                        className="p-1 rounded-lg text-gray-300 hover:text-coral-500 transition-default shrink-0"
                        title="Delete Goal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Middle: Amount & Progress */}
                    <div className="my-3 space-y-1.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-bold text-gray-900 tracking-tight">
                          {formatCurrency(goal.currentAmount)}
                        </span>
                        <span className="text-[11px] font-semibold text-gold-700">
                          {progress.toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400">
                        Target: {formatCurrency(goal.targetAmount)}
                      </p>
                      <div className="w-full h-2 bg-cream-200 rounded-full overflow-hidden mt-2">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-600 transition-all duration-500"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Money Held In */}
                    {Object.keys(accountMap).length > 0 && (
                      <div className="my-2.5 pt-2 border-t border-cream-200/80">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(accountMap).map(([accId, acc]) => (
                            <div
                              key={accId}
                              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-cream-100 text-[10px] text-gray-700"
                            >
                              <Wallet className="w-2.5 h-2.5 text-gray-400" />
                              <span className="font-medium truncate max-w-[70px]">{acc.name}:</span>
                              <span className="text-gray-500">{formatCurrency(acc.total)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Actions */}
                  <div className="space-y-2 pt-2 border-t border-cream-200/60">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setContributeGoalId(contributeGoalId === goal.id ? null : goal.id)}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-forest-500 text-white text-xs font-medium hover:bg-forest-600 transition-default flex items-center justify-center gap-1 shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add funds
                      </button>
                      {progress >= 100 && (
                        <button
                          onClick={() => setRedeemModalGoal(goal)}
                          className="py-1.5 px-2.5 rounded-lg bg-gold-500 text-white text-xs font-medium hover:bg-gold-600 transition-default flex items-center gap-1 shadow-sm animate-pulse"
                          title="Redeem Goal"
                        >
                          <Gift className="w-3.5 h-3.5" />
                          Redeem
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => setExpandedGoal(isExpanded ? null : goal.id)}
                      className="w-full flex items-center justify-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-default py-0.5"
                    >
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {isExpanded ? "Hide history" : "Deposit history"}
                    </button>

                    {/* Inline Contribute Form */}
                    {contributeGoalId === goal.id && (
                      <div className="pt-2 border-t border-cream-200 animate-scale-in">
                        {(() => {
                          const remainingNeeded = Math.max(0, Number(goal.targetAmount) - Number(goal.currentAmount));
                          return (
                            <form onSubmit={handleContribute} className="space-y-2">
                              <div>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                                  <input
                                    type="number"
                                    value={contributeAmount}
                                    max={remainingNeeded}
                                    onChange={(e) => setContributeAmount(e.target.value)}
                                    className="w-full pl-6 pr-2 py-1.5 border border-cream-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-forest-500"
                                    placeholder={`Amount (max ${remainingNeeded})`}
                                    step="0.01"
                                  />
                                </div>
                              </div>
                              <select
                                value={contributeAccountId}
                                onChange={(e) => setContributeAccountId(e.target.value)}
                                className="w-full px-2 py-1.5 border border-cream-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-forest-500"
                              >
                                {accounts.map((acc: any) => (
                                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                                ))}
                              </select>
                              <div className="flex gap-1.5">
                                <input
                                  type="text"
                                  value={contributeDesc}
                                  onChange={(e) => setContributeDesc(e.target.value)}
                                  className="flex-1 px-2 py-1 border border-cream-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-forest-500"
                                  placeholder="Note (optional)"
                                />
                                <button
                                  type="submit"
                                  disabled={contributing}
                                  className="px-3 py-1 rounded-lg bg-forest-600 text-white text-xs font-medium hover:bg-forest-700 transition-default disabled:opacity-50"
                                >
                                  {contributing ? "..." : "Save"}
                                </button>
                              </div>
                            </form>
                          );
                        })()}
                      </div>
                    )}

                    {/* Deposit History */}
                    {isExpanded && goal.contributions && goal.contributions.length > 0 && (
                      <div className="pt-2 border-t border-cream-200 divide-y divide-cream-100 max-h-44 overflow-y-auto">
                        {goal.contributions.map((c: any) => (
                          <div key={c.id} className="flex items-center justify-between py-2 text-[11px] group">
                            <div className="min-w-0 pr-1">
                              <p className="font-medium text-gray-800 truncate">{c.description || "Contribution"}</p>
                              <p className="text-[9px] text-gray-400">
                                {c.account?.name} · {formatDate(c.date)}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="font-semibold text-forest-600">
                                +{formatCurrency(c.amount)}
                              </span>
                              <button
                                onClick={() => handleOpenEditContribution(c, goal)}
                                className="p-1 rounded text-gray-400 hover:text-navy-900 hover:bg-cream-100 transition-default"
                                title="Edit Deposit"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteContribution(c.id)}
                                disabled={deletingContributionId === c.id}
                                className="p-1 rounded text-gray-300 hover:text-coral-500 hover:bg-coral-50 transition-default disabled:opacity-50"
                                title="Delete Deposit"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Completed (Ready to Redeem)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {completedGoals.map((goal: any) => (
              <div key={goal.id} className="bg-white rounded-2xl border-2 border-gold-400 p-4 flex flex-col justify-between shadow-sm min-h-[170px]">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-gold-500/20 flex items-center justify-center shrink-0">
                      <Target className="w-4 h-4 text-gold-600" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 truncate">{goal.name}</h3>
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(goal.currentAmount)} saved · Target reached! 🎉
                  </p>
                </div>
                <button
                  onClick={() => setRedeemModalGoal(goal)}
                  className="w-full mt-3 py-2 rounded-lg bg-gold-500 text-white text-xs font-medium hover:bg-gold-600 transition-default flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Gift className="w-3.5 h-3.5" />
                  Redeem Goal
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Redeemed Goals */}
      {redeemedGoals.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Redeemed Goals</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {redeemedGoals.map((goal: any) => (
              <div key={goal.id} className="bg-cream-100 rounded-2xl border border-cream-300 p-4 opacity-75 flex flex-col justify-between min-h-[130px]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gray-200 flex items-center justify-center shrink-0">
                    <Gift className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-700 truncate">{goal.name}</h3>
                    <p className="text-[10px] text-gray-400">
                      Redeemed · {formatCurrency(goal.targetAmount)} spent
                    </p>
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 italic self-end">Redeemed</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {goals.length === 0 && (
        <div className="bg-white rounded-xl border-2 border-dashed border-cream-300 p-12 text-center">
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-serif text-gray-900 mb-1">No goals yet</h3>
          <p className="text-gray-500 text-sm mb-4">
            Create a savings goal to start putting money aside for the things that matter.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2.5 rounded-lg bg-forest-500 text-white text-sm font-medium hover:bg-forest-600 transition-default"
          >
            Create your first goal
          </button>
        </div>
      )}

      {/* Custom Redeem Modal */}
      {redeemModalGoal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-scale-in text-gray-900 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-gold-100 text-gold-600 flex items-center justify-center mb-4">
              <Gift className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-serif text-gray-900 mb-2">
              Redeem &ldquo;{redeemModalGoal.name}&rdquo;?
            </h2>
            <p className="text-gray-600 text-sm mb-4 leading-relaxed">
              Congratulations on reaching your goal! Redeeming will create expense transactions for{" "}
              <strong>{formatCurrency(redeemModalGoal.currentAmount)}</strong> and deduct the saved funds from your accounts.
            </p>

            {/* Deductions breakdown */}
            <div className="bg-cream-50 rounded-xl p-3.5 border border-cream-200 mb-5 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Amounts to be deducted:
              </p>
              {redeemModalGoal.contributions && redeemModalGoal.contributions.length > 0 ? (
                (() => {
                  const totals: Record<string, { name: string; total: number }> = {};
                  redeemModalGoal.contributions.forEach((c: any) => {
                    const accId = c.account?.id || c.accountId;
                    const accName = c.account?.name || "Account";
                    if (!totals[accId]) totals[accId] = { name: accName, total: 0 };
                    totals[accId].total += Number(c.amount) || 0;
                  });
                  return Object.entries(totals).map(([id, item]) => (
                    <div key={id} className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700">{item.name}</span>
                      <span className="font-semibold text-coral-600">-{formatCurrency(item.total)}</span>
                    </div>
                  ));
                })()
              ) : (
                <p className="text-xs text-gray-500">Total: {formatCurrency(redeemModalGoal.currentAmount)}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRedeemModalGoal(null)}
                disabled={redeeming}
                className="flex-1 py-2.5 rounded-lg border border-cream-300 text-sm font-medium text-gray-700 hover:bg-cream-100 transition-default"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRedeem}
                disabled={redeeming}
                className="flex-1 py-2.5 rounded-lg bg-gold-500 text-white text-sm font-medium hover:bg-gold-600 transition-default disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {redeeming ? "Redeeming..." : "Confirm & Redeem"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Goal Modal */}
      {deleteModalGoal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-scale-in text-gray-900 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-coral-100 text-coral-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-serif text-gray-900 mb-2">
              Delete &ldquo;{deleteModalGoal.name}&rdquo;?
            </h2>
            <p className="text-gray-600 text-sm mb-6 leading-relaxed">
              Are you sure you want to delete this goal? All contribution records for this goal will be removed. Your bank account balances will not be affected.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteModalGoal(null)}
                disabled={deletingGoal}
                className="flex-1 py-2.5 rounded-lg border border-cream-300 text-sm font-medium text-gray-700 hover:bg-cream-100 transition-default"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingGoal}
                className="flex-1 py-2.5 rounded-lg bg-coral-500 text-white text-sm font-medium hover:bg-coral-600 transition-default disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingGoal ? "Deleting..." : "Yes, Delete Goal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Edit Goal Deposit Modal */}
      {editingContribution && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-scale-in text-gray-900 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-forest-100 text-forest-600 flex items-center justify-center mb-4">
              <Pencil className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-serif text-gray-900 mb-1">
              Edit Goal Deposit
            </h2>
            <p className="text-gray-500 text-xs mb-4">
              Update deposit details for &ldquo;{editingContribution.goal?.name || "Goal"}&rdquo;.
            </p>

            <form onSubmit={handleSaveEditContribution} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Deposit Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                  <input
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border border-cream-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest-500"
                    placeholder="0.00"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">From Account</label>
                <select
                  value={editAccountId}
                  onChange={(e) => setEditAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-cream-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest-500"
                  required
                >
                  {accounts.map((acc: any) => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Note / Description</label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-cream-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest-500"
                  placeholder="e.g. Monthly savings contribution"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingContribution(null)}
                  disabled={savingEdit}
                  className="flex-1 py-2.5 rounded-lg border border-cream-300 text-sm font-medium text-gray-700 hover:bg-cream-100 transition-default"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 py-2.5 rounded-lg bg-forest-500 text-white text-sm font-medium hover:bg-forest-600 transition-default disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
