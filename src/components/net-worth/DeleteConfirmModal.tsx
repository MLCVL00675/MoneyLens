"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { AssetCategory, ASSET_CATEGORY_LABELS } from "@/lib/net-worth/types";
import {
  deleteFixedDeposit,
  deleteBond,
  deleteSIP,
  deleteREIT,
  deleteRealEstate,
  deleteGoldHolding,
  deleteRetirementAccount,
  deleteLiability,
} from "@/actions/net-worth";
import { toast } from "sonner";
import { AlertTriangle, Loader2, X } from "lucide-react";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  category: AssetCategory;
  item: any | null;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onSuccess,
  category,
  item,
}: DeleteConfirmModalProps) {
  const [mounted, setMounted] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !item || !mounted) return null;

  const itemName =
    item.bankName ||
    item.name ||
    item.schemeName ||
    item.lenderName ||
    `${category} holding`;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      if (category === "FIXED_DEPOSIT") {
        await deleteFixedDeposit(item.id);
      } else if (category === "BOND") {
        await deleteBond(item.id);
      } else if (category === "SIP") {
        await deleteSIP(item.id);
      } else if (category === "REIT") {
        await deleteREIT(item.id);
      } else if (category === "REAL_ESTATE") {
        await deleteRealEstate(item.id);
      } else if (category === "GOLD") {
        await deleteGoldHolding(item.id);
      } else if (category === "RETIREMENT") {
        await deleteRetirementAccount(item.id);
      } else if (category === "LIABILITY") {
        await deleteLiability(item.id);
      }

      toast.success("Deleted successfully");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete item");
    } finally {
      setDeleting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      {/* Click outside backdrop dismiss */}
      <div className="fixed inset-0 -z-10" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div>
          <h3 className="font-semibold text-base text-foreground font-serif">
            Delete {ASSET_CATEGORY_LABELS[category] || "Asset"}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Are you sure you want to permanently delete{" "}
            <span className="font-semibold text-foreground">{itemName}</span>?
            This action cannot be undone.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl border border-border/60 text-muted-foreground hover:text-foreground text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-all shadow-xs"
          >
            {deleting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Deleting...
              </>
            ) : (
              "Delete"
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
