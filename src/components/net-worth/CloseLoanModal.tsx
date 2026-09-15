"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Liability } from "@/lib/net-worth/types";
import { closeLiability } from "@/actions/net-worth";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  CheckCircle2,
  X,
  CreditCard,
  Building,
  Sparkles,
  Loader2,
  Check,
  Calendar,
} from "lucide-react";

interface CloseLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  liability: Liability | null;
}

const CLOSURE_REASONS = [
  "Early Prepayment / Full Foreclosure",
  "Completed All Scheduled EMIs",
  "Refinanced / Balance Transferred",
  "Settled via One-Time Payment",
];

export function CloseLoanModal({
  isOpen,
  onClose,
  onSuccess,
  liability,
}: CloseLoanModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>(CLOSURE_REASONS[0]);
  const [customNotes, setCustomNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen || !liability) return null;

  const original = liability.originalPrincipal || liability.principalRemaining;

  const handleConfirmClose = async () => {
    setSubmitting(true);
    try {
      const finalNote = customNotes.trim()
        ? `${selectedReason} - ${customNotes.trim()}`
        : selectedReason;

      await closeLiability(liability.id, finalNote);
      toast.success(`${liability.lenderName} loan marked as closed & fully paid off! 🎉`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to close loan");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="fixed inset-0 -z-10" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-border/80 bg-card shadow-2xl my-2 sm:my-8 flex flex-col max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-4rem)] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 p-4 sm:p-5 pb-3 sm:pb-4 bg-card shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-foreground font-serif">
                Close / Foreclose Loan
              </h3>
              <p className="text-xs text-muted-foreground">
                Mark liability as 100% repaid and stop EMI deductions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Loan Summary Card */}
          <div className="p-3.5 sm:p-4 rounded-xl border border-border/60 bg-muted/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground truncate max-w-[200px]">
                {liability.lenderName}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
                {liability.liabilityType.replace("_", " ")}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-border/40 text-xs">
              <div>
                <span className="text-[10px] text-muted-foreground block">
                  Outstanding Principal
                </span>
                <strong className="text-foreground text-sm font-serif font-bold break-words">
                  {formatCurrency(liability.principalRemaining)}
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">
                  Monthly EMI Drain
                </span>
                <strong className="text-foreground text-sm font-serif font-bold break-words">
                  {formatCurrency(liability.monthlyEMI)}/mo
                </strong>
              </div>
            </div>
          </div>

          {/* Closure Reason Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground block">
              Closure Reason / Type
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {CLOSURE_REASONS.map((reason) => {
                const isSelected = selectedReason === reason;
                return (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setSelectedReason(reason)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs text-left transition-all ${
                      isSelected
                        ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium"
                        : "border-border/60 bg-muted/10 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                    }`}
                  >
                    <span>{reason}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Closure Remarks / Reference (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. NOC received / Ref #123456"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Impact Banner */}
          <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-300">
            <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <p className="text-[11px] leading-relaxed">
              Closing this loan will eliminate its <strong>{formatCurrency(liability.principalRemaining)}</strong> debt from your net worth calculations and free up <strong>{formatCurrency(liability.monthlyEMI)}</strong> in monthly cashflow.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 border-t border-border/60 p-3.5 sm:p-4 bg-muted/20 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmClose}
            disabled={submitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-xs"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Closing Loan...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Confirm & Close Loan
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
