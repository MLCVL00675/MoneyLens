"use client";

import { FixedDeposit, Bond, Liability } from "@/lib/net-worth/types";
import { formatCurrency } from "@/lib/utils";
import { Calendar, Clock, Landmark, AlertCircle, ArrowUpRight } from "lucide-react";

interface MaturityTimelineProps {
  fixedDeposits: FixedDeposit[];
  bonds: Bond[];
  liabilities: Liability[];
}

export function MaturityTimeline({
  fixedDeposits,
  bonds,
  liabilities,
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
      const endDate = new Date(
        now.getFullYear(),
        now.getMonth() + l.remainingTenureMonths,
        1
      );
      const diffTime = endDate.getTime() - now.getTime();
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      events.push({
        id: l.id,
        title: `${l.lenderName} (${l.liabilityType.replace("_", " ")})`,
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
        <h4 className="font-semibold text-sm text-foreground">No Upcoming Maturities</h4>
        <p className="text-xs text-muted-foreground mt-1">
          Add Fixed Deposits or Bonds to automatically see payout timelines here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-foreground font-serif">
              Maturity & Liquidity Timeline
            </h3>
            <p className="text-xs text-muted-foreground">
              Scheduled FD payouts and debt payoff milestones
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground self-start sm:self-auto">
          {events.length} upcoming
        </span>
      </div>

      {/* Timeline items list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {events.slice(0, 6).map((item) => {
          const isMatured = item.daysRemaining <= 0;
          const isSoon = item.daysRemaining > 0 && item.daysRemaining <= 90;

          return (
            <div
              key={item.id}
              className={`p-3.5 sm:p-4 rounded-xl border transition-all flex flex-col justify-between ${
                isMatured
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : isSoon
                  ? "border-amber-500/40 bg-amber-500/5"
                  : "border-border/60 bg-muted/20"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      item.type === "LOAN_PAYOFF"
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {item.type === "FD_MATURITY"
                      ? "FD Payout"
                      : item.type === "BOND_MATURITY"
                      ? "Bond Redemption"
                      : "Debt Free"}
                  </span>
                  <h4 className="font-semibold text-xs text-foreground mt-1.5 truncate">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                    {item.sub}
                  </p>
                </div>
                <div className="text-right shrink-0 pl-2">
                  <span className="text-xs font-bold text-foreground font-serif">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {item.date.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <span
                  className={`font-semibold ${
                    isMatured
                      ? "text-emerald-600 dark:text-emerald-400"
                      : isSoon
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-muted-foreground"
                  }`}
                >
                  {isMatured
                    ? "Matured"
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
