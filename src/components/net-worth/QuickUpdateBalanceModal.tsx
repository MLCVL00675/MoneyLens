"use client";

import { useState, useEffect } from "react";
import { RetirementAccount } from "@/lib/net-worth/types";
import { quickUpdateRetirementCorpus } from "@/actions/net-worth";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { X, RefreshCw, CheckCircle } from "lucide-react";

interface QuickUpdateBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  account: RetirementAccount | null;
}

export function QuickUpdateBalanceModal({
  isOpen,
  onClose,
  onSuccess,
  account,
}: QuickUpdateBalanceModalProps) {
  const [newCorpus, setNewCorpus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (account) {
      setNewCorpus(String(account.currentCorpus || ""));
    }
  }, [account]);

  if (!isOpen || !account) return null;

  const val = parseFloat(newCorpus) || 0;
  const diff = val - account.currentCorpus;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (val < 0) {
      toast.error("Please enter a valid balance");
      return;
    }

    setSubmitting(true);
    try {
      await quickUpdateRetirementCorpus(account.id, val);
      toast.success(
        `Updated ${account.accountType} passbook balance to ${formatCurrency(val)}`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update balance");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-50">
      <div className="bg-card w-full max-w-sm rounded-2xl border border-border/80 shadow-2xl p-4 sm:p-6 relative animate-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-3.5 sm:top-4 right-3.5 sm:right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-3 sm:mb-4 pr-6">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/20">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-foreground">
              Update Passbook Balance
            </h3>
            <p className="text-xs text-muted-foreground">
              {account.accountType} · {account.accountNumber ? `A/C ${account.accountNumber}` : "EPFO Passbook"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              New Verified Corpus Balance (₹)
            </label>
            <input
              type="number"
              step="any"
              required
              value={newCorpus}
              onChange={(e) => setNewCorpus(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-muted/20 text-base font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-[10px] text-muted-foreground mt-1 block">
              Enter the exact balance seen on your UMANG / EPFO / Netbanking portal.
            </span>
          </div>

          {diff !== 0 && (
            <div className="p-3 rounded-xl bg-muted/30 border border-border/40 text-xs flex items-center justify-between">
              <span className="text-muted-foreground">Adjustment:</span>
              <strong
                className={
                  diff > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }
              >
                {diff > 0 ? "+" : ""}
                {formatCurrency(diff)}
              </strong>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs disabled:opacity-50"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{submitting ? "Updating..." : "Save Verified Balance"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
