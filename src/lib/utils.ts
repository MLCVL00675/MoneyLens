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

/**
 * Returns YYYY-MM-DD formatted date string in the specified timezone (defaults to Asia/Kolkata).
 */
export function formatDateKey(date: Date | string, timeZone: string = "Asia/Kolkata"): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-CA", { timeZone });
}

/**
 * Returns YYYY-MM formatted month string in the specified timezone (defaults to Asia/Kolkata).
 */
export function formatMonthKey(date: Date | string, timeZone: string = "Asia/Kolkata"): string {
  const key = formatDateKey(date, timeZone);
  return key ? key.slice(0, 7) : "";
}

/**
 * Returns current or given date in YYYY-MM-DD format based on local/IST timezone.
 */
export function getLocalDateString(date: Date = new Date(), timeZone: string = "Asia/Kolkata"): string {
  return formatDateKey(date, timeZone);
}

/**
 * Calculate precise month boundaries in Indian Standard Time (or specified timezone)
 * converting to UTC Dates for Prisma querying.
 */
export function getTimezoneMonthBounds(date: Date = new Date(), timeZone: string = "Asia/Kolkata") {
  const dateStr = formatDateKey(date, timeZone);
  const [yearStr, monthStr] = dateStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12

  // Current month start & end (IST is +05:30)
  const currentMonthStart = new Date(`${yearStr}-${monthStr}-01T00:00:00+05:30`);
  const nextMonthYear = month === 12 ? year + 1 : year;
  const nextMonthNum = month === 12 ? 1 : month + 1;
  const nextMonthStr = String(nextMonthNum).padStart(2, "0");
  const nextMonthFirst = new Date(`${nextMonthYear}-${nextMonthStr}-01T00:00:00+05:30`);
  const currentMonthEnd = new Date(nextMonthFirst.getTime() - 1);

  // Last month start & end
  const lastMonthYear = month === 1 ? year - 1 : year;
  const lastMonth = month === 1 ? 12 : month - 1;
  const lastMonthStr = String(lastMonth).padStart(2, "0");
  const lastMonthStart = new Date(`${lastMonthYear}-${lastMonthStr}-01T00:00:00+05:30`);
  const lastMonthEnd = new Date(currentMonthStart.getTime() - 1);

  return {
    currentMonthStart,
    currentMonthEnd,
    lastMonthStart,
    lastMonthEnd,
  };
}
