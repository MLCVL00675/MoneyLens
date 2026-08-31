"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createTransaction, scanReceipt } from "@/actions/transaction";
import { getAccounts } from "@/actions/account";
import { getCategories, createCategory, deleteCategory } from "@/actions/category";
import { formatCurrency, getLocalDateString } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  X,
  Check,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  Settings2,
} from "lucide-react";
import { BarLoader } from "react-spinners";
import { LoadingState } from "@/components/ui/loading-state";
import { CategorySelect } from "@/components/ui/category-select";
import { IconPicker } from "@/components/ui/icon-picker";
import { CategoryIcon } from "@/components/ui/category-icon";

export default function CreateTransactionPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [type, setType] = useState<"EXPENSE" | "INCOME" | "TRANSFER">("EXPENSE");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(getLocalDateString());
  const [category, setCategory] = useState("");
  const [accountId, setAccountId] = useState("");
  const [transferAccountId, setTransferAccountId] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<string>("");

  // Receipt scanner state
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [dragActive, setDragActive] = useState(false);

  // Custom category
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("tag");

  useEffect(() => {
    const load = async () => {
      try {
        const [accs, cats] = await Promise.all([
          getAccounts(),
          getCategories(),
        ]);
        const activeAccs = accs.filter((a: any) => !a.isDecommissioned);
        setAccounts(activeAccs);
        setCategories(cats);
        if (activeAccs.length > 0) {
          const defaultAcc = activeAccs.find((a: any) => a.isDefault) || activeAccs[0];
          setAccountId(defaultAcc.id);
        }
      } catch {
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleScanReceipt = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setScanning(true);
    setScanResult(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const mimeType = file.type || "image/jpeg";
        const result = await scanReceipt(base64, mimeType);

        if (result.success && result.data) {
          setScanResult(result.data);
          // Auto-populate form
          if (result.data.amount) setAmount(String(result.data.amount));
          if (result.data.date) setDate(result.data.date);
          if (result.data.description) setDescription(result.data.description);
          if (result.data.category) setCategory(result.data.category);
          toast.success("Receipt scanned successfully!");
        } else {
          toast.error(result.error || "Failed to scan receipt");
        }
        setScanning(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Failed to process receipt");
      setScanning(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleScanReceipt(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleScanReceipt(file);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const categoryType = type === "INCOME" ? "INCOME" : "EXPENSE";
      await createCategory({
        name: newCategoryName.trim(),
        icon: newCategoryIcon,
        type: categoryType,
      });
      setCategory(newCategoryName.trim());
      setShowNewCategory(false);
      setNewCategoryName("");
      // Reload categories
      const cats = await getCategories();
      setCategories(cats);
      toast.success(`Category added to ${categoryType.toLowerCase()} categories!`);
    } catch (error: any) {
      toast.error(error.message || "Failed to add category");
    }
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    try {
      await deleteCategory(catId);
      if (category === catName) setCategory("");
      const cats = await getCategories();
      setCategories(cats);
      toast.success(`Category "${catName}" deleted`);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete category");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!description.trim()) {
      toast.error("Please enter a description");
      return;
    }
    if (!accountId) {
      toast.error("Please select an account");
      return;
    }
    if (!category && type !== "TRANSFER") {
      toast.error("Please select a category");
      return;
    }
    if (type === "TRANSFER" && !transferAccountId) {
      toast.error("Please select a destination account");
      return;
    }
    if (type === "TRANSFER" && accountId === transferAccountId) {
      toast.error("Source and destination accounts must be different");
      return;
    }

    const selectedAccount = accounts.find((a: any) => a.id === accountId);
    const availableBalance = selectedAccount ? Number(selectedAccount.effectiveBalance ?? selectedAccount.balance) : 0;
    const parsedAmount = parseFloat(amount);

    if ((type === "EXPENSE" || type === "TRANSFER") && selectedAccount && parsedAmount > availableBalance) {
      toast.error(
        `Amount (${formatCurrency(parsedAmount)}) exceeds available balance (${formatCurrency(availableBalance)}) on ${selectedAccount.name}`
      );
      return;
    }

    setSubmitting(true);
    try {
      await createTransaction({
        type,
        amount: parsedAmount,
        description: description.trim(),
        date,
        category: type === "TRANSFER" ? "Transfer" : category,
        accountId,
        isRecurring,
        recurringInterval: isRecurring ? (recurringInterval as any) : undefined,
        transferAccountId: type === "TRANSFER" ? transferAccountId : undefined,
      });

      toast.success(
        type === "TRANSFER"
          ? "Transfer completed"
          : `${type === "INCOME" ? "Income" : "Expense"} recorded`
      );
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to create transaction");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <LoadingState
        title="Loading Transaction Form"
        message="Fetching your accounts and categories..."
      />
    );
  }

  return (
    <div className="max-w-[700px] mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-default"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to overview
      </Link>

      {/* Header */}
      <div>
        <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-500 mb-1">
          Make a Note of It
        </p>
        <h1 className="text-3xl font-serif text-gray-900">Add a transaction.</h1>
        <p className="text-gray-500 text-sm mt-1">
          Capture the detail now. Your future self will thank you.
        </p>
      </div>

      {/* Receipt Scanner */}
      <div className="bg-navy-900 rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-gold-500/20 text-gold-400 text-[10px] font-medium px-2.5 py-1 rounded-full">
          <Sparkles className="w-3 h-3" />
          Gemini-assisted
        </div>

        <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-400 mb-2">
          The Quick Way
        </p>
        <h3 className="text-lg font-serif text-white mb-3">
          Let AI read the receipt
        </h3>

        {scanResult ? (
          <div className="bg-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full bg-forest-500 flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
              <span className="text-white text-sm font-medium">Receipt understood</span>
            </div>
            <p className="text-gray-400 text-xs ml-7">
              {scanResult.merchantName || scanResult.description} · ₹
              {scanResult.amount} · {scanResult.date} · {scanResult.category}
            </p>
            <button
              onClick={() => {
                setScanResult(null);
                setAmount("");
                setDescription("");
                setCategory("");
              }}
              className="flex items-center gap-1 text-gray-500 text-xs mt-3 hover:text-gray-300 transition-default"
            >
              <RefreshCw className="w-3 h-3" />
              Scan another receipt
            </button>
          </div>
        ) : scanning ? (
          <div className="flex items-center justify-center py-8">
            <BarLoader color="#D4A843" width={150} />
            <p className="text-gray-400 text-sm ml-4">Reading receipt...</p>
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-default ${
              dragActive
                ? "border-gold-400 bg-gold-400/5"
                : "border-white/20 hover:border-white/40"
            }`}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
              id="receipt-upload"
            />
            <label htmlFor="receipt-upload" className="cursor-pointer">
              <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">
                Drop a receipt image or{" "}
                <span className="text-gold-400 underline">browse</span>
              </p>
              <p className="text-gray-600 text-xs mt-1">PNG, JPG up to 5MB</p>
            </label>
          </div>
        )}
      </div>

      {/* Transaction Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-cream-300 p-6 space-y-5">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-500 mb-1">
            Review the Details
          </p>
          <h3 className="text-lg font-serif text-gray-900">Transaction details</h3>
        </div>

        {/* Type Toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
          <div className="grid grid-cols-3 gap-1 bg-cream-100 rounded-lg p-1">
            {(["EXPENSE", "INCOME", "TRANSFER"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setType(t);
                  setCategory("");
                }}
                className={`py-2 rounded-md text-sm font-medium transition-default ${
                  type === t
                    ? t === "EXPENSE"
                      ? "bg-coral-500 text-white"
                      : t === "INCOME"
                      ? "bg-forest-500 text-white"
                      : "bg-navy-900 text-white"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {t === "EXPENSE" ? "Expense" : t === "INCOME" ? "Income" : "Transfer"}
              </button>
            ))}
          </div>
        </div>

        {/* Amount & Date */}
        {(() => {
          const selectedAccount = accounts.find((a: any) => a.id === accountId);
          const availableBalance = selectedAccount ? Number(selectedAccount.effectiveBalance ?? selectedAccount.balance) : 0;
          const parsedAmount = parseFloat(amount || "0");
          const isOverBalance = (type === "EXPENSE" || type === "TRANSFER") && Boolean(selectedAccount) && parsedAmount > availableBalance && parsedAmount > 0;
          const filteredCategories = categories.filter((cat: any) => {
            if (type === "EXPENSE") return !cat.type || cat.type === "EXPENSE";
            if (type === "INCOME") return cat.type === "INCOME";
            return true;
          });

          return (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className={`w-full pl-7 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent ${
                        isOverBalance
                          ? "border-coral-500 text-coral-600 focus:ring-coral-500"
                          : "border-cream-300 focus:ring-forest-500"
                      }`}
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                  {isOverBalance && (
                    <p className="text-xs text-coral-600 font-medium mt-1.5">
                      ⚠️ Amount exceeds account balance of {formatCurrency(availableBalance)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-cream-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2.5 border border-cream-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                  placeholder={
                    type === "INCOME"
                      ? "e.g. Monthly Salary, Freelance client, Dividend"
                      : type === "TRANSFER"
                      ? "e.g. Monthly savings transfer"
                      : "e.g. Blue Tokai Coffee, Groceries, Electricity bill"
                  }
                />
              </div>

              {/* Account */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {type === "INCOME"
                    ? "Deposit into account"
                    : type === "TRANSFER"
                    ? "From account (source)"
                    : "Pay from account"}
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-cream-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                >
                  <option value="">Select account</option>
                  {accounts.map((acc: any) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type})
                    </option>
                  ))}
                </select>
                {selectedAccount && (
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-1.5 px-0.5">
                    {type === "INCOME" ? (
                      <span>Current balance: <strong className="text-gray-800 font-semibold">{formatCurrency(selectedAccount.balance)}</strong></span>
                    ) : (
                      <>
                        <span>Available to spend: <strong className="text-gray-800 font-semibold">{formatCurrency(availableBalance)}</strong></span>
                        {selectedAccount.goalAllocations > 0 && (
                          <span className="text-gold-600 font-medium">{formatCurrency(selectedAccount.goalAllocations)} in Goals</span>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Transfer destination */}
              {type === "TRANSFER" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">To account</label>
                  <select
                    value={transferAccountId}
                    onChange={(e) => setTransferAccountId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-cream-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                  >
                    <option value="">Select destination</option>
                    {accounts
                      .filter((a: any) => a.id !== accountId)
                      .map((acc: any) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.type})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Category */}
              {type !== "TRANSFER" && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-gray-700">
                      {type === "EXPENSE" ? "Expense Category" : "Income Category"}
                    </label>
                    <div className="flex items-center gap-3">
                      {categories.some((c: any) => !c.isDefault) && (
                        <button
                          type="button"
                          onClick={() => setShowManageCategories(true)}
                          className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 font-medium transition-default"
                        >
                          <Settings2 className="w-3.5 h-3.5" />
                          Manage categories
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowNewCategory(!showNewCategory)}
                        className="text-xs text-forest-600 hover:text-forest-700 flex items-center gap-1 font-medium"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        New category
                      </button>
                    </div>
                  </div>

                  {showNewCategory && (
                    <div className="p-3.5 mb-3 bg-cream-50/80 border border-cream-300 rounded-xl space-y-3 animate-scale-in">
                      <div className="flex gap-2 items-center">
                        <div className="w-10 h-10 rounded-lg bg-white border border-cream-300 flex items-center justify-center shrink-0 shadow-sm">
                          <CategoryIcon icon={newCategoryIcon} className="w-5 h-5 text-gray-900" />
                        </div>
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          className="flex-1 px-3 py-2 border border-cream-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest-500"
                          placeholder={`New ${type === "INCOME" ? "income" : "expense"} category name`}
                        />
                        <button
                          type="button"
                          onClick={handleAddCategory}
                          className="px-4 py-2 bg-forest-500 text-white rounded-lg text-sm hover:bg-forest-600 transition-default font-medium"
                        >
                          Add
                        </button>
                      </div>

                      {/* Icon Picker Grid */}
                      <IconPicker
                        selectedIcon={newCategoryIcon}
                        onSelectIcon={setNewCategoryIcon}
                        type={type === "INCOME" ? "INCOME" : "EXPENSE"}
                      />
                    </div>
                  )}

                  <CategorySelect
                    categories={filteredCategories}
                    value={category}
                    onChange={setCategory}
                    placeholder={`Select ${type === "EXPENSE" ? "expense" : "income"} category`}
                  />
                </div>
              )}

              {/* Recurring */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="w-4 h-4 rounded border-cream-300 text-forest-500 focus:ring-forest-500"
                  />
                  <span className="text-sm text-gray-700">Recurring transaction</span>
                </label>

                {isRecurring && (
                  <select
                    value={recurringInterval}
                    onChange={(e) => setRecurringInterval(e.target.value)}
                    className="border border-cream-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest-500"
                  >
                    <option value="">Interval</option>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || isOverBalance}
                className="w-full py-3 rounded-lg bg-forest-500 text-white text-sm font-medium hover:bg-forest-600 transition-default disabled:opacity-50"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <BarLoader color="white" width={60} height={3} />
                    Processing...
                  </span>
                ) : isOverBalance ? (
                  "Insufficient balance"
                ) : type === "TRANSFER" ? (
                  "Complete transfer"
                ) : (
                  `Record ${type === "INCOME" ? "income" : "expense"}`
                )}
              </button>
            </>
          );
        })()}
      </form>

      {/* Manage Custom Categories Modal */}
      {showManageCategories && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-scale-in text-gray-900 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-forest-500/10 flex items-center justify-center text-forest-600">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-serif text-gray-900">Manage Custom Categories</h2>
                  <p className="text-xs text-gray-500">Delete any custom category you&apos;ve added</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowManageCategories(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-cream-100 transition-default"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[300px] overflow-y-auto divide-y divide-cream-100 border border-cream-200 rounded-xl bg-cream-50/50">
              {categories.filter((c: any) => !c.isDefault).length > 0 ? (
                categories
                  .filter((c: any) => !c.isDefault)
                  .map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between p-3.5 hover:bg-white transition-default">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-md bg-white border border-cream-200 flex items-center justify-center shrink-0">
                          <CategoryIcon icon={c.icon} category={c.name} className="w-3.5 h-3.5 text-gray-900" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                          <span
                            className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              c.type === "INCOME"
                                ? "bg-forest-100 text-forest-700"
                                : "bg-coral-100 text-coral-700"
                            }`}
                          >
                            {c.type === "INCOME" ? "Income Category" : "Expense Category"}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          setDeletingCatId(c.id);
                          await handleDeleteCategory(c.id, c.name);
                          setDeletingCatId(null);
                        }}
                        disabled={deletingCatId === c.id}
                        className="p-2 rounded-lg text-gray-400 hover:text-coral-600 hover:bg-coral-50 transition-default disabled:opacity-50"
                        title={`Delete ${c.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
              ) : (
                <div className="p-8 text-center text-gray-400 text-sm">
                  No custom categories created yet.
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowManageCategories(false)}
              className="w-full py-2.5 bg-cream-100 hover:bg-cream-200 text-gray-800 font-medium rounded-lg transition-default text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
