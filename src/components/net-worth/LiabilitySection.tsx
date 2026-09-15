"use client";

import { useState } from "react";
import { Liability } from "@/lib/net-worth/types";
import { formatCurrency } from "@/lib/utils";
import { reopenLiability } from "@/actions/net-worth";
import { CloseLoanModal } from "./CloseLoanModal";
import { toast } from "sonner";
import {
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  AlertCircle,
  TrendingDown,
  Building,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface LiabilitySectionProps {
  liabilities: Liability[];
  onAddLiability: () => void;
  onEditLiability: (item: Liability) => void;
  onDeleteLiability: (item: Liability) => void;
  onRefresh?: () => void;
}

export function LiabilitySection({
  liabilities,
  onAddLiability,
  onEditLiability,
  onDeleteLiability,
  onRefresh,
}: LiabilitySectionProps) {
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "CLOSED">("ALL");
  const [closingLoan, setClosingLoan] = useState<Liability | null>(null);
  const [reopeningId, setReopeningId] = useState<string | null>(null);

  const activeLiabilities = liabilities.filter(
    (l) => (l.principalRemaining || 0) > 0
  );
  const closedLiabilities = liabilities.filter(
    (l) => (l.principalRemaining || 0) === 0
  );

  const filteredLiabilities =
    filter === "ACTIVE"
      ? activeLiabilities
      : filter === "CLOSED"
      ? closedLiabilities
      : liabilities;

  const totalOutstanding = activeLiabilities.reduce(
    (sum, l) => sum + (l.principalRemaining || 0),
    0
  );
  const totalMonthlyEMI = activeLiabilities.reduce(
    (sum, l) => sum + (l.monthlyEMI || 0),
    0
  );

  // Weighted average interest rate across active debts
  const weightedRate =
    totalOutstanding > 0
      ? activeLiabilities.reduce(
          (sum, l) => sum + l.principalRemaining * (l.interestRate || 0),
          0
        ) / totalOutstanding
      : 0;

  const triggerRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      window.dispatchEvent(new CustomEvent("refresh-net-worth"));
    }
  };

  const handleReopenLoan = async (item: Liability) => {
    setReopeningId(item.id);
    try {
      const orig = Number(item.originalPrincipal || 100000);
      await reopenLiability(item.id, orig, Number(item.monthlyEMI || 5000));
      toast.success(`Reopened ${item.lenderName} loan successfully`);
      triggerRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to reopen loan");
    } finally {
      setReopeningId(null);
    }
  };

  return (
    <div
      id="liabilities-debts-section"
      className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-2.5 rounded-xl bg-rose-500/10 text-rose-500 shrink-0">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-foreground font-serif">
              Liabilities & Debt Obligations
            </h3>
            <p className="text-xs text-muted-foreground">
              Loans, mortgages, credit card balances, and scheduled EMIs
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {closedLiabilities.length > 0 && (
            <div className="inline-flex rounded-lg border border-border/60 bg-muted/30 p-0.5 text-xs font-medium">
              {(
                [
                  { id: "ALL", label: `All (${liabilities.length})` },
                  { id: "ACTIVE", label: `Active (${activeLiabilities.length})` },
                  { id: "CLOSED", label: `Closed (${closedLiabilities.length})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`rounded-md px-2 sm:px-2.5 py-1 transition-all ${
                    filter === tab.id
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={onAddLiability}
            className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-all shadow-xs"
          >
            <Plus className="h-4 w-4" /> Add Liability
          </button>
        </div>
      </div>

      {/* 3 Metric Cards for Debts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <div className="p-3.5 sm:p-4 rounded-xl border border-border/50 bg-muted/20">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Total Outstanding Debt
          </span>
          <div className="text-lg sm:text-xl font-bold text-rose-600 dark:text-rose-400 font-serif mt-1 break-words">
            {formatCurrency(totalOutstanding)}
          </div>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            {activeLiabilities.length} active{" "}
            {closedLiabilities.length > 0 && `• ${closedLiabilities.length} closed`}
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl border border-border/50 bg-muted/20">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Monthly EMI Drain
          </span>
          <div className="text-lg sm:text-xl font-bold text-foreground font-serif mt-1 break-words">
            {formatCurrency(totalMonthlyEMI)}
          </div>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            Deducted monthly from cashflow
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl border border-border/50 bg-muted/20">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Weighted Avg. Interest
          </span>
          <div className="text-lg sm:text-xl font-bold text-foreground font-serif mt-1">
            {weightedRate.toFixed(2)}% p.a.
          </div>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            Cost of borrowing across active debt
          </span>
        </div>
      </div>

      {/* Liabilities List */}
      {filteredLiabilities.length === 0 ? (
        <div className="p-6 sm:p-8 rounded-xl border border-dashed border-border/80 text-center">
          <span className="text-2xl">🎉</span>
          <h4 className="font-medium text-foreground text-sm mt-2">
            {filter === "CLOSED" ? "No Closed Loans Yet" : "No Debt Recorded"}
          </h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {filter === "CLOSED"
              ? "You haven't marked any loans as closed or fully repaid yet."
              : "You are completely debt-free, or haven't recorded any loans yet!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {filteredLiabilities.map((item) => {
            const isClosed = (item.principalRemaining || 0) === 0;
            const original = item.originalPrincipal || item.principalRemaining;
            const paidPct = isClosed
              ? 100
              : original > 0
              ? Math.min(
                  100,
                  Math.max(
                    0,
                    ((original - item.principalRemaining) / original) * 100
                  )
                )
              : 0;

            return (
              <div
                key={item.id}
                className={`p-3.5 sm:p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  isClosed
                    ? "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50"
                    : "border-border/60 bg-muted/10 hover:border-rose-500/30"
                }`}
              >
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400">
                          {item.liabilityType.replace("_", " ")}
                        </span>
                        {isClosed && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="h-3 w-3" /> Closed / Paid Off
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-sm text-foreground mt-1.5 truncate">
                        {item.lenderName}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.interestRate}% interest • EMI: {formatCurrency(item.monthlyEMI)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 self-end sm:self-auto shrink-0">
                      {!isClosed && (
                        <button
                          onClick={() => setClosingLoan(item)}
                          title="Close / Foreclose Loan"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Close</span>
                        </button>
                      )}

                      {isClosed && (
                        <button
                          onClick={() => handleReopenLoan(item)}
                          disabled={reopeningId === item.id}
                          title="Reopen this loan"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all"
                        >
                          <RotateCcw className={`h-3.5 w-3.5 ${reopeningId === item.id ? "animate-spin" : ""}`} />
                          <span>Reopen</span>
                        </button>
                      )}

                      <button
                        onClick={() => onEditLiability(item)}
                        title="Edit Details"
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteLiability(item)}
                        title="Delete Liability"
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3.5 flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase">
                        Principal Remaining
                      </span>
                      <div
                        className={`text-base font-bold font-serif ${
                          isClosed
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-foreground"
                        }`}
                      >
                        {formatCurrency(item.principalRemaining)}
                      </div>
                    </div>
                    {isClosed ? (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> 100% Repaid
                      </span>
                    ) : item.remainingTenureMonths ? (
                      <span className="text-xs text-muted-foreground">
                        {item.remainingTenureMonths} mos left
                      </span>
                    ) : null}
                  </div>

                  {/* Paydown progress bar */}
                  <div className="mt-2">
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${paidPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                      <span>{paidPct.toFixed(0)}% Repaid</span>
                      <span>Original: {formatCurrency(original)}</span>
                    </div>
                  </div>
                </div>

                {item.notes && (
                  <div className="mt-2.5 pt-2 border-t border-border/40 text-[11px] text-muted-foreground italic">
                    {item.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Close Loan Modal */}
      <CloseLoanModal
        isOpen={!!closingLoan}
        onClose={() => setClosingLoan(null)}
        onSuccess={triggerRefresh}
        liability={closingLoan}
      />
    </div>
  );
}
