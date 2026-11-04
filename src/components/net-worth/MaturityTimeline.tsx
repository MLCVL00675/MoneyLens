"use client";

import { FixedDeposit, Bond, Liability } from "@/lib/net-worth/types";
import { formatCurrency } from "@/lib/utils";
import { Calendar, Clock, Landmark, AlertCircle, ArrowUpRight } from "lucide-react";

interface MaturityTimelineProps {
  fixedDeposits: FixedDeposit[];
  bonds: Bond[];
  liabilities: Liability[];
  compact?: boolean;
  title?: string;
  description?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function MaturityTimeline({
  fixedDeposits,
  bonds,
  liabilities,
  compact = false,
  title = "Maturity & Liquidity Timeline",
  description = "Scheduled FD payouts and debt payoff milestones",
  emptyTitle,
  emptyDescription,
}: MaturityTimelineProps) {
  // Collect all upcoming maturity events
  const now = new Date();

  const events: Array<{
    id: string;
    title: string;
    sub: string;
    date: Date;
    type: "FD_MATURITY" | "BOND_MATURITY" | "LOAN_PAYOFF";
    amount: number;
    daysRemaining: number;
  }> = [];

  // 1. FD/RD maturities
  fixedDeposits.forEach((fd) => {
    const matDate = new Date(fd.maturityDate);
    const diffTime = matDate.getTime() - now.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    events.push({
      id: fd.id,
      title: `${fd.bankName} ${fd.fdType}`,
      sub: `${fd.interestRate}% p.a. • Tenure: ${fd.tenureMonths}m`,
      date: matDate,
      type: "FD_MATURITY",
      amount: fd.maturityValue,
      daysRemaining: days,
    });
  });

  // 2. Bond maturities
  bonds.forEach((b) => {
    const matDate = new Date(b.maturityYear, 11, 31);
    const diffTime = matDate.getTime() - now.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    events.push({
      id: b.id,
      title: b.name,
      sub: `${b.bondType} • ${b.couponRate}% coupon`,
      date: matDate,
      type: "BOND_MATURITY",
      amount: b.quantity * b.faceValue,
      daysRemaining: days,
    });
  });

  // 3. Loan payoff estimates (only active loans)
  liabilities.forEach((l) => {
    if (
      l.principalRemaining > 0 &&
      l.remainingTenureMonths &&
      l.remainingTenureMonths > 0
    ) {
      const endDate = l.endDate
        ? new Date(l.endDate)
        : new Date(
            now.getFullYear(),
            now.getMonth() + l.remainingTenureMonths,
            1
          );
      const diffTime = endDate.getTime() - now.getTime();
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      events.push({
        id: l.id,
        title: `${l.lenderName || "Loan"} (${(l.liabilityType || "LOAN").replace(/_/g, " ")})`,
        sub: `EMI: ${formatCurrency(l.monthlyEMI)} • ${l.interestRate}% interest`,
        date: endDate,
        type: "LOAN_PAYOFF",
        amount: l.principalRemaining,
        daysRemaining: days,
      });
    }
  });

  // Sort chronologically
  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm text-center">
        <div className="p-3 rounded-full bg-muted w-fit mx-auto mb-2 text-muted-foreground">
          <Calendar className="h-6 w-6" />
        </div>
        <h4 className="font-semibold text-sm text-foreground">
          {emptyTitle || (compact ? "No Upcoming Milestones" : "No Upcoming Maturities")}
        </h4>
        <p className="text-xs text-muted-foreground mt-1">
          {emptyDescription ||
            (compact
              ? "Active obligations with scheduled tenures will appear here."
              : "Add Fixed Deposits, Bonds, or Loans to automatically see payout timelines here.")}
        </p>
      </div>
    );
  }

  const displayLimit = compact ? 4 : 6;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-foreground font-serif">
              {title}
            </h3>
            <p className="text-xs text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground self-start sm:self-auto shrink-0">
          {events.length} upcoming
        </span>
      </div>

      {/* Timeline items list */}
      <div
        className={`grid gap-2.5 sm:gap-3 ${
          compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        }`}
      >
        {events.slice(0, displayLimit).map((item) => {
          const isMatured = item.daysRemaining <= 0;
          const isSoon = item.daysRemaining > 0 && item.daysRemaining <= 90;

          return (
            <div
              key={item.id}
              className={`p-3.5 sm:p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                isMatured
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : isSoon
                  ? "border-amber-500/40 bg-amber-500/5"
                  : "border-border/60 bg-muted/20"
              }`}
            >
              {/* Header row: Badge and Amount */}
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0 ${
                    item.type === "LOAN_PAYOFF"
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      : item.type === "BOND_MATURITY"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {item.type === "FD_MATURITY"
                    ? "FD Payout"
                    : item.type === "BOND_MATURITY"
                    ? "Bond Redemption"
                    : "Debt Free"}
                </span>
                <span className="text-xs font-bold text-foreground font-serif shrink-0">
                  {formatCurrency(item.amount)}
                </span>
              </div>

              {/* Title & Subtitle */}
              <div className="min-w-0 flex-1">
                <h4
                  className="font-semibold text-xs text-foreground truncate"
                  title={item.title}
                >
                  {item.title}
                </h4>
                {item.sub && (
                  <p
                    className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2"
                    title={item.sub}
                  >
                    {item.sub}
                  </p>
                )}
              </div>

              {/* Footer row: Date and days remaining */}
              <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2 text-[11px]">
                <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span>
                    {item.date.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </span>
                <span
                  className={`font-semibold shrink-0 ${
                    isMatured
                      ? "text-emerald-600 dark:text-emerald-400"
                      : isSoon
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-muted-foreground"
                  }`}
                >
                  {isMatured
                    ? item.type === "LOAN_PAYOFF"
                      ? "Paid Off"
                      : "Matured"
                    : `In ${item.daysRemaining} days`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
