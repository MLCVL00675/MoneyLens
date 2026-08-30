"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { updateTransaction } from "@/actions/transaction";
import { getCategories } from "@/actions/category";
import { db } from "@/lib/prisma";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BarLoader } from "react-spinners";
import { LoadingState } from "@/components/ui/loading-state";
import { CategorySelect } from "@/components/ui/category-select";

export default function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [transaction, setTransaction] = useState<any>(null);

  // Form state
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const cats = await getCategories();
        setCategories(cats);

        // Fetch transaction via API
        const res = await fetch(`/api/transaction/${id}`);
        if (res.ok) {
          const tx = await res.json();
          setTransaction(tx);
          setType(tx.type);
          setAmount(String(tx.amount));
          setDescription(tx.description);
          setDate(new Date(tx.date).toISOString().split("T")[0]);
          setCategory(tx.category);
          setIsRecurring(tx.isRecurring);
          setRecurringInterval(tx.recurringInterval || "");
        }
      } catch {
        toast.error("Failed to load transaction");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description.trim() || !category) {
      toast.error("Please fill in all fields");
      return;
    }

    setSubmitting(true);
    try {
      await updateTransaction(id, {
        type,
        amount: parseFloat(amount),
        description: description.trim(),
        date,
        category,
        isRecurring,
        recurringInterval: isRecurring
          ? (recurringInterval as any)
          : undefined,
      });
      toast.success("Transaction updated successfully");
      router.push("/activity");
      router.refresh();
    } catch {
      toast.error("Failed to update transaction");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <LoadingState
        title="Loading Transaction"
        message="Fetching transaction details..."
      />
    );
  }

  return (
    <div className="max-w-[700px] mx-auto space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-default"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to overview
      </Link>

      <div>
        <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-500 mb-1">
          Edit Details
        </p>
        <h1 className="text-3xl font-serif text-gray-900">
          Edit transaction.
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-cream-300 p-6 space-y-5"
      >
        {/* Type Toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type
          </label>
          <div className="grid grid-cols-2 gap-1 bg-cream-100 rounded-lg p-1">
            {(["EXPENSE", "INCOME"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`py-2 rounded-md text-sm font-medium transition-default ${
                  type === t
                    ? t === "EXPENSE"
                      ? "bg-coral-500 text-white"
                      : "bg-forest-500 text-white"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {t === "EXPENSE" ? "Expense" : "Income"}
              </button>
            ))}
          </div>
        </div>

        {/* Amount & Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                ₹
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-7 pr-3 py-2.5 border border-cream-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                step="0.01"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Date
            </label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2.5 border border-cream-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Category
          </label>
          <CategorySelect
            categories={categories.filter((cat: any) => {
              if (type === "EXPENSE") return !cat.type || cat.type === "EXPENSE";
              if (type === "INCOME") return cat.type === "INCOME";
              return true;
            })}
            value={category}
            onChange={setCategory}
            placeholder={`Select ${type === "EXPENSE" ? "expense" : "income"} category`}
          />
        </div>

        {/* Recurring */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="w-4 h-4 rounded border-cream-300 text-forest-500 focus:ring-forest-500"
            />
            <span className="text-sm text-gray-700">Recurring</span>
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
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-3 rounded-lg border border-cream-300 text-sm font-medium text-gray-700 hover:bg-cream-100 transition-default"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-3 rounded-lg bg-forest-500 text-white text-sm font-medium hover:bg-forest-600 transition-default disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
