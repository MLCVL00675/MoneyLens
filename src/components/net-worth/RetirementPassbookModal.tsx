"use client";

import { RetirementAccount } from "@/lib/net-worth/types";
import { formatCurrency } from "@/lib/utils";
import { X, BookOpen, Calendar, PlusCircle, CheckCircle2 } from "lucide-react";

interface RetirementPassbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: RetirementAccount | null;
  onLogMonth?: (account: RetirementAccount) => void;
  onQuickUpdateBalance?: (account: RetirementAccount) => void;
}

export function RetirementPassbookModal({
  isOpen,
  onClose,
  account,
  onLogMonth,
  onQuickUpdateBalance,
}: RetirementPassbookModalProps) {
  if (!isOpen || !account) return null;

  const contributions = account.contributions || [];
  const monthlyInflow =
    account.employeeContribution + (account.employerContribution || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-50">
      <div className="bg-card w-full max-w-2xl rounded-2xl border border-border/80 shadow-2xl p-4 sm:p-6 relative animate-in zoom-in-95 duration-150 max-h-[calc(100vh-1.5rem)] sm:max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 sm:pb-4 border-b border-border/60 gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-serif text-base sm:text-lg font-bold text-foreground">
                  {account.accountType} Contribution Passbook
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                  {account.interestRate}% p.a.
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {account.accountNumber ? `A/C Number: ${account.accountNumber}` : "Government Provident Fund Corpus"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
            {onQuickUpdateBalance && (
              <button
                onClick={() => {
                  onClose();
                  onQuickUpdateBalance(account);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border border-border/80 bg-muted/40 hover:bg-muted text-foreground transition-all"
              >
                <span>Sync Balance</span>
              </button>
            )}
            {onLogMonth && (
              <button
                onClick={() => {
                  onClose();
                  onLogMonth(account);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Log Month</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Account Snapshot Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 my-3 sm:my-4 shrink-0">
          <div className="p-3 rounded-xl bg-muted/20 border border-border/60">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Current Balance
            </span>
            <span className="text-sm sm:text-base font-bold text-foreground font-serif mt-0.5 block break-words">
              {formatCurrency(account.currentCorpus)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-muted/20 border border-border/60">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Monthly Inflow
            </span>
            <span className="text-sm sm:text-base font-bold text-teal-600 dark:text-teal-400 font-serif mt-0.5 block break-words">
              {formatCurrency(monthlyInflow)} / mo
            </span>
          </div>

          <div className="p-3 rounded-xl bg-muted/20 border border-border/60">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Est. Annual Interest
            </span>
            <span className="text-sm sm:text-base font-bold text-foreground font-serif mt-0.5 block break-words">
              +{formatCurrency(account.currentCorpus * (account.interestRate / 100))}
            </span>
          </div>
        </div>

        {/* Passbook Table / History */}
        <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0 border border-border/60 rounded-xl">
          {contributions.length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] font-semibold tracking-wider sticky top-0 border-b border-border/60">
                <tr>
                  <th className="px-4 py-2.5">Month / Year</th>
                  <th className="px-3 py-2.5 text-right">Employee Share</th>
                  {account.accountType !== "PPF" && (
                    <th className="px-3 py-2.5 text-right">Employer Match</th>
                  )}
                  <th className="px-3 py-2.5 text-right">Total Credited</th>
                  <th className="px-4 py-2.5">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {contributions.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                      <span>{c.monthYear}</span>
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-foreground">
                      {formatCurrency(c.employeeShare)}
                    </td>
                    {account.accountType !== "PPF" && (
                      <td className="px-3 py-3 text-right font-medium text-muted-foreground">
                        {formatCurrency(c.employerShare)}
                      </td>
                    )}
                    <td className="px-3 py-3 text-right font-bold text-teal-600 dark:text-teal-400">
                      +{formatCurrency(c.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground truncate max-w-[150px]">
                      {c.notes || "Salary deduction"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-10 text-center text-muted-foreground">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
              <p className="text-sm font-semibold text-foreground">No contributions logged yet</p>
              <p className="text-xs mt-1 max-w-sm mx-auto">
                Log your monthly salary deduction to maintain a verified history of your EPF/PPF growth.
              </p>
              <button
                onClick={() => {
                  onClose();
                  if (onLogMonth) onLogMonth(account);
                }}
                className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Log First Month</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
