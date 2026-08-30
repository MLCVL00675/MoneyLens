import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Prisma } from "@prisma/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Serialize Prisma Decimal values to plain numbers.
 * Required because Next.js Server Actions cannot pass Decimal instances to client.
 */
export function serializeTransaction(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Prisma.Decimal) return obj.toNumber();
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(serializeTransaction);
  if (typeof obj === "object") {
    const serialized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      serialized[key] = serializeTransaction(value);
    }
    return serialized;
  }
  return obj;
}

/**
 * Format a number as INR currency.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a date in human-readable format.
 */
export function formatDate(date: Date | string, style: "short" | "long" | "relative" = "short"): string {
  const d = new Date(date);

  if (style === "relative") {
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
  }

  if (style === "long") {
    return d.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Get greeting based on time of day.
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Calculate percentage change between two numbers.
 */
export function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export { DEFAULT_CATEGORIES, AVAILABLE_CATEGORY_ICONS } from "@/lib/category-icons";
import { DEFAULT_CATEGORIES } from "@/lib/category-icons";

/**
 * Get category icon identifier by name.
 */
export function getCategoryIcon(name: string): string {
  const cat = DEFAULT_CATEGORIES.find(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  );
  return cat?.icon ?? "tag";
}
