"use client";

import { useState, useEffect } from "react";
import { RetirementAccount } from "@/lib/net-worth/types";
import { logMonthlyRetirementContribution } from "@/actions/net-worth";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { X, CalendarClock, PlusCircle, ArrowRight } from "lucide-react";

interface LogRetirementContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  account: RetirementAccount | null;
}

export function LogRetirementContributionModal({
  isOpen,
  onClose,
  onSuccess,
  account,
}: LogRetirementContributionModalProps) {
  const [employeeShare, setEmployeeShare] = useState("");
  const [employerShare, setEmployerShare] = useState("");
  const [monthYear, setMonthYear] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (account) {
      setEmployeeShare(String(account.employeeContribution || ""));
      setEmployerShare(
        account.accountType === "PPF"
          ? "0"
          : String(account.employerContribution || "")
      );
      const now = new Date();
      setMonthYear(
        now.toLocaleString("en-US", { month: "short", year: "numeric" })
      );
      setNotes("");
    }
  }, [account]);

  if (!isOpen || !account) return null;

  const emp = parseFloat(employeeShare) || 0;
  const empyr = account.accountType === "PPF" ? 0 : parseFloat(employerShare) || 0;
  const total = emp + empyr;
  const newCorpus = account.currentCorpus + total;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (total <= 0) {
      toast.error("Please enter a valid contribution amount");
      return;
    }

    setSubmitting(true);
    try {
      await logMonthlyRetirementContribution({
        retirementAccountId: account.id,
        monthYear,
        employeeShare: emp,
        employerShare: empyr,
        notes: notes.trim() || undefined,
      });

      toast.success(
        `Logged ${monthYear} contribution (+${formatCurrency(total)}) for ${account.accountType}`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to log contribution");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-50">
      <div className="bg-card w-full max-w-md rounded-2xl border border-border/80 shadow-2xl p-4 sm:p-6 relative flex flex-col max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-4rem)] overflow-hidden animate-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-3.5 sm:top-4 right-3.5 sm:right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-3 sm:mb-4 shrink-0 pr-8">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/20">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-base sm:text-lg font-bold text-foreground">
              Log Monthly Salary Credit
            </h3>
            <p className="text-xs text-muted-foreground">
              {account.accountType} Account · {account.accountNumber ? `A/C ${account.accountNumber}` : "Provident Fund"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4 overflow-y-auto flex-1 pr-0.5">
          {/* Month/Year selector */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Contribution Month &amp; Year
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sep 2026"
              value={monthYear}
              onChange={(e) => setMonthYear(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-border/60 bg-muted/20 text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className={`grid ${account.accountType === "PPF" ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"} gap-3`}>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                {account.accountType === "PPF" ? "Deposit Amount (₹)" : "Employee Share (₹)"}
              </label>
              <input
                type="number"
                step="any"
                required
                value={employeeShare}
                onChange={(e) => setEmployeeShare(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-border/60 bg-muted/20 text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {account.accountType !== "PPF" && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Employer Match (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  value={employerShare}
                  onChange={(e) => setEmployerShare(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-border/60 bg-muted/20 text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}
          </div>

          {/* Live Balance Update Preview Card */}
          <div className="p-3.5 rounded-xl bg-teal-500/5 border border-teal-500/20 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Adding to Passbook:</span>
              <strong className="text-teal-700 dark:text-teal-300 font-bold text-sm">
                +{formatCurrency(total)}
              </strong>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] pt-1.5 border-t border-teal-500/15">
              <span className="text-muted-foreground">
                Current: <strong>{formatCurrency(account.currentCorpus)}</strong>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground hidden sm:inline" />
              <span className="text-foreground font-bold">
                New: <strong>{formatCurrency(newCorpus)}</strong>
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Notes / Remarks (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Salary slip deduction, bonus match"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-border/60 bg-muted/20 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || total <= 0}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-xs disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{submitting ? "Crediting..." : "Credit to Passbook"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
