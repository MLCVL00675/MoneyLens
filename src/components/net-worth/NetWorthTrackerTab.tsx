"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { getNetWorthData, getLivePreciousMetalRates } from "@/actions/net-worth";
import {
  NetWorthSummary,
  AssetCategory,
  ASSET_CATEGORY_LABELS,
  RetirementAccount,
} from "@/lib/net-worth/types";
import { PreciousMetalRates } from "@/lib/net-worth/metal-rates";
import { formatCurrency } from "@/lib/utils";
import { LoadingState } from "@/components/ui/loading-state";
import { NetWorthHero } from "./NetWorthHero";
import { AllocationDonut } from "./AllocationDonut";
import { NetWorthAreaChart } from "./NetWorthAreaChart";
import { DebtAssetsBar } from "./DebtAssetsBar";
import { MaturityTimeline } from "./MaturityTimeline";
import { ProjectionPanel } from "./ProjectionPanel";
import { AssetTable } from "./AssetTable";
import { LiabilitySection } from "./LiabilitySection";
import { AddEditAssetModal } from "./AddEditAssetModal";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { LogRetirementContributionModal } from "./LogRetirementContributionModal";
import { RetirementPassbookModal } from "./RetirementPassbookModal";
import { QuickUpdateBalanceModal } from "./QuickUpdateBalanceModal";
import { toast } from "sonner";
import {
  RefreshCw,
  Plus,
  BookOpen,
} from "lucide-react";

// Reusable KPI Stat Card Primitive
function KPICard({
  label,
  value,
  subtitle,
  valueClassName = "text-foreground",
}: {
  label: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="stat-card p-4 sm:p-5 rounded-2xl border border-border/60 bg-card shadow-xs">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <div className={`text-xl sm:text-2xl font-bold font-serif mt-1.5 break-words ${valueClassName}`}>
        {value}
      </div>
      {subtitle && <span className="text-xs text-muted-foreground mt-1 block">{subtitle}</span>}
    </div>
  );
}

export function NetWorthTrackerTab() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");

  const [data, setData] = useState<NetWorthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metalRates, setMetalRates] = useState<PreciousMetalRates | null>(null);

  // Modal controls
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCategory, setModalCategory] = useState<AssetCategory>("FIXED_DEPOSIT");
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Delete modal controls
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteCategory, setDeleteCategory] = useState<AssetCategory>("FIXED_DEPOSIT");
  const [deletingItem, setDeletingItem] = useState<any | null>(null);

  // Retirement specific modal controls
  const [logContributionModalOpen, setLogContributionModalOpen] = useState(false);
  const [selectedAccountForContribution, setSelectedAccountForContribution] =
    useState<RetirementAccount | null>(null);
  const [passbookModalOpen, setPassbookModalOpen] = useState(false);
  const [selectedAccountForPassbook, setSelectedAccountForPassbook] =
    useState<RetirementAccount | null>(null);
  const [quickBalanceModalOpen, setQuickBalanceModalOpen] = useState(false);
  const [selectedAccountForBalance, setSelectedAccountForBalance] =
    useState<RetirementAccount | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [summary, rates] = await Promise.all([
        getNetWorthData(),
        getLivePreciousMetalRates(),
      ]);
      setData(summary);
      if (rates) setMetalRates(rates);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load net worth data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleAddNew = useCallback(
    (category: AssetCategory = (categoryParam as any) || "FIXED_DEPOSIT") => {
      setModalCategory(category);
      setEditingItem(null);
      setModalOpen(true);
    },
    [categoryParam]
  );

  const handleEdit = useCallback((cat: AssetCategory, item: any) => {
    setModalCategory(cat);
    setEditingItem(item);
    setModalOpen(true);
  }, []);

  const handleDelete = useCallback((cat: AssetCategory, item: any) => {
    setDeleteCategory(cat);
    setDeletingItem(item);
    setDeleteModalOpen(true);
  }, []);

  useEffect(() => {
    loadData();

    const handleOpenAdd = (e: any) => {
      const targetCategory =
        e?.detail?.category || (categoryParam as AssetCategory) || "FIXED_DEPOSIT";
      handleAddNew(targetCategory);
    };
    const handleTriggerRefresh = () => {
      handleRefresh();
    };

    window.addEventListener("open-add-asset-modal", handleOpenAdd);
    window.addEventListener("refresh-net-worth", handleTriggerRefresh);
    return () => {
      window.removeEventListener("open-add-asset-modal", handleOpenAdd);
      window.removeEventListener("refresh-net-worth", handleTriggerRefresh);
    };
  }, [loadData, handleAddNew, handleRefresh, categoryParam]);

  if (loading || !data) {
    return (
      <div className="py-20 flex justify-center">
        <LoadingState message="Loading your comprehensive net worth dashboard..." />
      </div>
    );
  }

  // ─── Render Sub-Views ────────────────────────────────────────────────────────
  const renderCategoryContent = () => {
    if (categoryParam === "FIXED_DEPOSIT") {
      const totalValue = data.fixedDeposits.reduce(
        (sum, fd) => sum + (fd.currentValue || fd.principalAmount),
        0
      );
      const totalInvested = data.fixedDeposits.reduce((sum, fd) => sum + fd.principalAmount, 0);
      const totalMaturity = data.fixedDeposits.reduce((sum, fd) => sum + fd.maturityValue, 0);
      const avgRate =
        data.fixedDeposits.length > 0
          ? data.fixedDeposits.reduce((sum, fd) => sum + fd.interestRate, 0) /
            data.fixedDeposits.length
          : 0;

      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground font-serif">
              Fixed &amp; Recurring Deposits
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Term deposits with compound interest, tenure schedules, and maturity payouts
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <KPICard label="Total FD/RD Balance" value={formatCurrency(totalValue)} subtitle={`${data.fixedDeposits.length} Active Deposits`} />
            <KPICard label="Principal Invested" value={formatCurrency(totalInvested)} subtitle="Total capital locked" />
            <KPICard
              label="Projected Maturity Payout"
              value={formatCurrency(totalMaturity)}
              valueClassName="text-emerald-600 dark:text-emerald-400"
              subtitle={`+${formatCurrency(Math.max(0, totalMaturity - totalInvested))} interest`}
            />
            <KPICard label="Average Interest Rate" value={`${avgRate.toFixed(2)}% p.a.`} subtitle="Compounded quarterly" />
          </div>
          <MaturityTimeline fixedDeposits={data.fixedDeposits} bonds={[]} liabilities={[]} />
          <AssetTable summary={data} category="FIXED_DEPOSIT" onAddNew={() => handleAddNew("FIXED_DEPOSIT")} onEdit={handleEdit} onDelete={handleDelete} />
        </div>
      );
    }

    if (categoryParam === "BOND") {
      const totalValue = data.bonds.reduce((sum, b) => sum + b.quantity * (b.currentPrice || b.purchasePrice), 0);
      const totalFaceValue = data.bonds.reduce((sum, b) => sum + b.quantity * b.faceValue, 0);
      const annualCoupon = data.bonds.reduce((sum, b) => sum + b.quantity * b.faceValue * (b.couponRate / 100), 0);
      const avgCoupon = totalFaceValue > 0 ? (annualCoupon / totalFaceValue) * 100 : 0;

      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground font-serif">
              Bonds &amp; Government Securities
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Sovereign G-Secs, Corporate debentures, and Municipal coupon-bearing bonds
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <KPICard label="Bond Portfolio Value" value={formatCurrency(totalValue)} subtitle={`${data.bonds.length} Active Holdings`} />
            <KPICard label="Total Face Value" value={formatCurrency(totalFaceValue)} subtitle="Redemption value at maturity" />
            <KPICard label="Annual Coupon Income" value={formatCurrency(annualCoupon)} valueClassName="text-emerald-600 dark:text-emerald-400" subtitle="Scheduled cashflow per year" />
            <KPICard label="Weighted Coupon Yield" value={`${avgCoupon.toFixed(2)}%`} subtitle="Effective coupon payout rate" />
          </div>
          <MaturityTimeline fixedDeposits={[]} bonds={data.bonds} liabilities={[]} />
          <AssetTable summary={data} category="BOND" onAddNew={() => handleAddNew("BOND")} onEdit={handleEdit} onDelete={handleDelete} />
        </div>
      );
    }

    if (categoryParam === "SIP") {
      const totalSIPValue = data.sips.reduce((sum, s) => sum + (s.currentValue || s.totalInvested), 0);
      const totalInvested = data.sips.reduce((sum, s) => sum + s.totalInvested, 0);
      const monthlyOutflow = data.sips.reduce((sum, s) => sum + (s.isActive ? s.monthlyAmount : 0), 0);
      const unrealizedReturn = totalSIPValue - totalInvested;
      const returnPct = totalInvested > 0 ? (unrealizedReturn / totalInvested) * 100 : 0;

      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground font-serif">
              Systematic Investment Plans (SIP)
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Automated monthly mutual fund &amp; equity SIPs with compounding projections
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <KPICard label="Total SIP Valuation" value={formatCurrency(totalSIPValue)} subtitle={`${data.sips.length} Tracked Plans`} />
            <KPICard label="Monthly SIP Inflow" value={`${formatCurrency(monthlyOutflow)}/mo`} subtitle="Across active mandates" />
            <KPICard label="Total Invested" value={formatCurrency(totalInvested)} subtitle="Cumulative contributions" />
            <KPICard
              label="Unrealized Profit / Loss"
              value={`${unrealizedReturn >= 0 ? "+" : ""}${formatCurrency(unrealizedReturn)}`}
              valueClassName={unrealizedReturn >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}
              subtitle={`${unrealizedReturn >= 0 ? "+" : ""}${returnPct.toFixed(1)}% All-Time`}
            />
          </div>
          <ProjectionPanel />
          <AssetTable summary={data} category="SIP" onAddNew={() => handleAddNew("SIP")} onEdit={handleEdit} onDelete={handleDelete} />
        </div>
      );
    }

    if (categoryParam === "REIT") {
      const totalValue = data.reits.reduce((sum, r) => sum + r.units * r.currentPrice, 0);
      const totalInvested = data.reits.reduce((sum, r) => sum + r.units * r.purchasePrice, 0);
      const annualDividends = data.reits.reduce((sum, r) => sum + r.units * r.currentPrice * ((r.distributionYield || 0) / 100), 0);
      const avgYield =
        data.reits.length > 0
          ? data.reits.reduce((sum, r) => sum + (r.distributionYield || 0), 0) / data.reits.length
          : 0;

      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground font-serif">REITs &amp; InvITs</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Real Estate Investment Trusts, commercial trusts, and infrastructure trusts (InvITs)
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <KPICard label="Total Valuation" value={formatCurrency(totalValue)} subtitle={`${data.reits.length} REIT Holdings`} />
            <KPICard label="Total Invested" value={formatCurrency(totalInvested)} subtitle="Purchase cost basis" />
            <KPICard label="Annual Distribution Income" value={formatCurrency(annualDividends)} valueClassName="text-emerald-600 dark:text-emerald-400" subtitle="Estimated passive payout" />
            <KPICard label="Average Distribution Yield" value={`${avgYield.toFixed(2)}% p.a.`} subtitle="Annual dividend yield" />
          </div>
          <AssetTable summary={data} category="REIT" onAddNew={() => handleAddNew("REIT")} onEdit={handleEdit} onDelete={handleDelete} />
        </div>
      );
    }

    if (categoryParam === "REAL_ESTATE") {
      const totalValuation = (data.realEstates || []).reduce((sum, re) => sum + (re.currentValuation || re.purchasePrice), 0);
      const totalInvested = (data.realEstates || []).reduce((sum, re) => sum + re.purchasePrice, 0);
      const unrealizedAppreciation = totalValuation - totalInvested;
      const appreciationPct = totalInvested > 0 ? (unrealizedAppreciation / totalInvested) * 100 : 0;
      const totalAnnualRental = (data.realEstates || []).reduce((sum, re) => sum + (re.isRental && re.monthlyRent ? re.monthlyRent * 12 : 0), 0);
      const rentalPropertiesValuation = (data.realEstates || []).reduce((sum, re) => sum + (re.isRental && re.monthlyRent ? re.currentValuation || re.purchasePrice : 0), 0);
      const weightedRentalYield = rentalPropertiesValuation > 0 ? (totalAnnualRental / rentalPropertiesValuation) * 100 : 0;

      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground font-serif">Physical Real Estate Portfolio</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Physical properties: Land plots, staying home, rental properties, and commercial spaces
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 p-3 sm:p-3.5 bg-card/60 backdrop-blur-md rounded-2xl border border-border/60 text-xs">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400">
              <span className="font-semibold">🌱 Land / Plot</span>
              <span className="text-[11px] opacity-80 ml-auto">Capital Growth</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-400">
              <span className="font-semibold">🏠 Staying Home</span>
              <span className="text-[11px] opacity-80 ml-auto">Self-Occupied</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              <span className="font-semibold">🔑 Rental Property</span>
              <span className="text-[11px] opacity-80 ml-auto">Yield + Apprec.</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-400">
              <span className="font-semibold">🏢 Commercial Space</span>
              <span className="text-[11px] opacity-80 ml-auto">High Cashflow</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <KPICard label="Total Real Estate Valuation" value={formatCurrency(totalValuation)} subtitle={`${(data.realEstates || []).length} Properties Tracked`} />
            <KPICard label="Total Capital Invested" value={formatCurrency(totalInvested)} subtitle="Historical purchase cost" />
            <KPICard
              label="Capital Appreciation"
              value={`${unrealizedAppreciation >= 0 ? "+" : ""}${formatCurrency(unrealizedAppreciation)}`}
              valueClassName={unrealizedAppreciation >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}
              subtitle={`${unrealizedAppreciation >= 0 ? "+" : ""}${appreciationPct.toFixed(1)}% Compounded`}
            />
            <KPICard
              label="Gross Rental Income & Yield"
              value={<>{formatCurrency(totalAnnualRental)}<span className="text-xs font-normal text-muted-foreground ml-1">/yr</span></>}
              valueClassName="text-emerald-600 dark:text-emerald-400"
              subtitle={weightedRentalYield > 0 ? `${weightedRentalYield.toFixed(2)}% gross yield` : "No rental income"}
            />
          </div>
          <AssetTable summary={data} category="REAL_ESTATE" onAddNew={() => handleAddNew("REAL_ESTATE")} onEdit={handleEdit} onDelete={handleDelete} />
        </div>
      );
    }

    if (categoryParam === "GOLD") {
      const totalValue = data.goldHoldings.reduce((sum, g) => {
        if (g.units && g.units > 0) return sum + g.units * g.currentSpotRate;
        if (g.weightGrams && g.weightGrams > 0) return sum + g.weightGrams * g.currentSpotRate;
        return sum + g.purchasePrice;
      }, 0);
      const totalWeight = data.goldHoldings.reduce((sum, g) => sum + (g.weightGrams || 0), 0);
      const totalCost = data.goldHoldings.reduce((sum, g) => sum + g.purchasePrice, 0);
      const pnl = totalValue - totalCost;
      const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0;

      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground font-serif">Physical Gold &amp; Commodities</h2>
            <p className="text-xs text-muted-foreground mt-1">Physical bullion bars, minted coins, silver, and precious jewelry</p>
          </div>
          <div className="p-3 sm:p-3.5 px-3.5 sm:px-4 rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-xs font-semibold text-foreground">Live Bullion Rates</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
              <span className="px-2.5 py-1 rounded-xl bg-card border border-border/60">
                Gold 24K: <strong>₹{metalRates?.gold24k ? formatCurrency(metalRates.gold24k) : "₹14,108"}/g</strong>
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-card border border-border/60">
                Silver 999: <strong>₹{metalRates?.silver999 ? formatCurrency(metalRates.silver999) : "₹206"}/g</strong>
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <KPICard label="Total Gold Valuation" value={formatCurrency(totalValue)} subtitle={`${data.goldHoldings.length} Holdings`} />
            <KPICard label="Total Weight (Grams)" value={`${totalWeight.toFixed(2)} g`} subtitle="Pure bullion equivalent" />
            <KPICard label="Total Purchase Cost" value={formatCurrency(totalCost)} subtitle="Historical cost basis" />
            <KPICard
              label="Unrealized Appreciation"
              value={`${pnl >= 0 ? "+" : ""}${formatCurrency(pnl)}`}
              valueClassName={pnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}
              subtitle={`${pnl >= 0 ? "+" : ""}${pnlPct.toFixed(1)}% Capital Gain`}
            />
          </div>
          <AssetTable summary={data} category="GOLD" onAddNew={() => handleAddNew("GOLD")} onEdit={handleEdit} onDelete={handleDelete} />
        </div>
      );
    }

    if (categoryParam === "RETIREMENT") {
      const totalCorpus = data.retirementAccounts.reduce((sum, r) => sum + (r.currentCorpus || 0), 0);
      const monthlyEmployee = data.retirementAccounts.reduce((sum, r) => sum + r.employeeContribution, 0);
      const monthlyEmployer = data.retirementAccounts.reduce((sum, r) => sum + (r.employerContribution || 0), 0);
      const totalMonthlyInflow = monthlyEmployee + monthlyEmployer;
      const avgRate =
        data.retirementAccounts.length > 0
          ? data.retirementAccounts.reduce((sum, r) => sum + r.interestRate, 0) / data.retirementAccounts.length
          : 8.25;

      return (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground font-serif">
                Retirement &amp; Pension Funds (EPF, PPF &amp; NPS)
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Track verified passbook balances, monthly salary deductions, and compounding tax-exempt wealth
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {data.retirementAccounts.length > 0 && (
                <>
                  <button
                    onClick={() => {
                      setSelectedAccountForContribution(data.retirementAccounts[0]);
                      setLogContributionModalOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Log Month</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedAccountForPassbook(data.retirementAccounts[0]);
                      setPassbookModalOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border border-border/80 bg-card hover:bg-muted text-foreground transition-colors"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-teal-600" />
                    <span>View Passbook</span>
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <KPICard label="Total Retirement Corpus" value={formatCurrency(totalCorpus)} subtitle={`${data.retirementAccounts.length} Verified Accounts`} />
            <KPICard label="Monthly Salary Inflow" value={`${formatCurrency(totalMonthlyInflow)}/mo`} subtitle="Employee deduction + Match" />
            <KPICard label="Annual Contributions" value={formatCurrency(totalMonthlyInflow * 12)} subtitle="Annual tax-exempt inflow" />
            <KPICard label="Average Compound Rate" value={`${avgRate.toFixed(2)}% p.a.`} subtitle="Govt interest guarantee" />
          </div>
          <AssetTable
            summary={data}
            category="RETIREMENT"
            onAddNew={() => handleAddNew("RETIREMENT")}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onLogMonth={(acc) => {
              setSelectedAccountForContribution(acc);
              setLogContributionModalOpen(true);
            }}
            onViewPassbook={(acc) => {
              setSelectedAccountForPassbook(acc);
              setPassbookModalOpen(true);
            }}
          />
        </div>
      );
    }

    if (categoryParam === "LIABILITY") {
      const totalDebt = data.totalLiabilities;
      const activeLiabilities = data.liabilities.filter(
        (l) => (l.principalRemaining || 0) > 0
      );
      const totalMonthlyEMI = activeLiabilities.reduce(
        (sum, l) => sum + (l.monthlyEMI || 0),
        0
      );
      const avgRate =
        activeLiabilities.length > 0
          ? activeLiabilities.reduce((sum, l) => sum + (l.interestRate || 0), 0) /
            activeLiabilities.length
          : 0;

      return (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground font-serif">
                Loans &amp; Debt Liabilities
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Manage mortgages, vehicle loans, education debt, and track your accelerated payoff trajectory
              </p>
            </div>
            <button
              onClick={() => handleAddNew("LIABILITY")}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition-colors self-start sm:self-auto"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Loan / Liability</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <KPICard
              label="Total Outstanding Debt"
              value={formatCurrency(totalDebt)}
              valueClassName="text-rose-600 dark:text-rose-400"
              subtitle={`${activeLiabilities.length} Active Obligations`}
            />
            <KPICard
              label="Monthly EMI Cash Drain"
              value={`${formatCurrency(totalMonthlyEMI)}/mo`}
              valueClassName="text-rose-600 dark:text-rose-400"
              subtitle="Monthly debt servicing cost"
            />
            <KPICard
              label="Annual Debt Servicing"
              value={formatCurrency(totalMonthlyEMI * 12)}
              subtitle="Total yearly EMI outflow"
            />
            <KPICard
              label="Weighted Interest Rate"
              value={`${avgRate.toFixed(2)}% p.a.`}
              subtitle="Cost basis across active debt"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <DebtAssetsBar summary={data} />
            </div>
            <div>
              <MaturityTimeline fixedDeposits={[]} bonds={[]} liabilities={data.liabilities} />
            </div>
          </div>

          <LiabilitySection
            liabilities={data.liabilities}
            onAddLiability={() => handleAddNew("LIABILITY")}
            onEditLiability={(l) => handleEdit("LIABILITY", l)}
            onDeleteLiability={(l) => handleDelete("LIABILITY", l)}
            onRefresh={loadData}
          />
        </div>
      );
    }

    // Default Overview View
    return (
      <div className="space-y-6">
        <NetWorthHero summary={data} />
        
        {/* 1. Full-Width Asset Allocation with Big Pie on the Left */}
        <AllocationDonut allocation={data.allocation} totalAssets={data.totalAssets} />

        {/* 2. Net Worth Trajectory Chart Below the Pie */}
        <NetWorthAreaChart
          currentAssets={data.totalAssets}
          currentLiabilities={data.totalLiabilities}
          currentNetWorth={data.netWorth}
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <LiabilitySection
              liabilities={data.liabilities}
              onAddLiability={() => handleAddNew("LIABILITY")}
              onEditLiability={(l) => handleEdit("LIABILITY", l)}
              onDeleteLiability={(l) => handleDelete("LIABILITY", l)}
              onRefresh={loadData}
            />
          </div>
          <div>
            <DebtAssetsBar summary={data} />
          </div>
        </div>
        <MaturityTimeline fixedDeposits={data.fixedDeposits} bonds={data.bonds} liabilities={data.liabilities} />
        <ProjectionPanel />
        <AssetTable
          summary={data}
          onAddNew={handleAddNew}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onLogMonth={(acc) => {
            setSelectedAccountForContribution(acc);
            setLogContributionModalOpen(true);
          }}
          onViewPassbook={(acc) => {
            setSelectedAccountForPassbook(acc);
            setPassbookModalOpen(true);
          }}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {renderCategoryContent()}

      {/* Unified Modals Root (Instantiated ONCE, completely eliminating multi-view duplication) */}
      <AddEditAssetModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={loadData}
        initialCategory={modalCategory}
        initialData={editingItem}
      />
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onSuccess={loadData}
        category={deleteCategory}
        item={deletingItem}
      />
      <LogRetirementContributionModal
        isOpen={logContributionModalOpen}
        onClose={() => setLogContributionModalOpen(false)}
        onSuccess={loadData}
        account={selectedAccountForContribution}
      />
      <RetirementPassbookModal
        isOpen={passbookModalOpen}
        onClose={() => setPassbookModalOpen(false)}
        account={selectedAccountForPassbook}
        onLogMonth={(acc) => {
          setSelectedAccountForContribution(acc);
          setLogContributionModalOpen(true);
        }}
        onQuickUpdateBalance={(acc) => {
          setSelectedAccountForBalance(acc);
          setQuickBalanceModalOpen(true);
        }}
      />
      <QuickUpdateBalanceModal
        isOpen={quickBalanceModalOpen}
        onClose={() => setQuickBalanceModalOpen(false)}
        onSuccess={loadData}
        account={selectedAccountForBalance}
      />
    </div>
  );
}
