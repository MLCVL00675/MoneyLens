"use client";

import { useState } from "react";
import {
  NetWorthSummary,
  AssetCategory,
  FixedDeposit,
  Bond,
  SIP,
  REIT,
  RealEstate,
  GoldHolding,
  RetirementAccount,
} from "@/lib/net-worth/types";
import { formatCurrency } from "@/lib/utils";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Landmark,
  Building2,
  Home,
  Coins,
  ShieldCheck,
  TrendingUp,
  Layers,
  Sparkles,
  CalendarClock,
  BookOpen,
} from "lucide-react";

export type TableAssetCategory =
  | "FIXED_DEPOSIT"
  | "BOND"
  | "SIP"
  | "REIT"
  | "REAL_ESTATE"
  | "GOLD"
  | "RETIREMENT";

interface AssetTableProps {
  summary: NetWorthSummary;
  category?: TableAssetCategory | "ALL";
  onAddNew: (category?: AssetCategory) => void;
  onEdit: (category: AssetCategory, item: any) => void;
  onDelete: (category: AssetCategory, item: any) => void;
  onLogMonth?: (account: any) => void;
  onViewPassbook?: (account: any) => void;
}

export function AssetTable({
  summary,
  category = "ALL",
  onAddNew,
  onEdit,
  onDelete,
  onLogMonth,
  onViewPassbook,
}: AssetTableProps) {
  const isDedicatedView = category !== "ALL";
  const [selectedTab, setSelectedTab] = useState<TableAssetCategory | "ALL">(category);
  const [search, setSearch] = useState("");

  // Flatten items for table display
  const items: Array<{
    id: string;
    raw: any;
    category: AssetCategory;
    title: string;
    subtitle: string;
    invested: number;
    currentValue: number;
    rateOrReturn: string;
    badge: string;
    badgeColor: string;
  }> = [];

  // 1. FDs
  summary.fixedDeposits.forEach((fd) => {
    const matDateStr = new Date(fd.maturityDate).toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
    });
    items.push({
      id: fd.id,
      raw: fd,
      category: "FIXED_DEPOSIT",
      title: `${fd.bankName} ${fd.fdType}`,
      subtitle: `Matures ${matDateStr}`,
      invested: fd.principalAmount,
      currentValue: fd.currentValue || fd.principalAmount,
      rateOrReturn: `${fd.interestRate}% p.a.`,
      badge: fd.fdType,
      badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    });
  });

  // 2. Bonds
  summary.bonds.forEach((b) => {
    const invested = b.quantity * b.purchasePrice;
    const currentVal = b.quantity * (b.currentPrice ?? b.purchasePrice);
    items.push({
      id: b.id,
      raw: b,
      category: "BOND",
      title: b.name,
      subtitle: `Matures ${b.maturityYear}`,
      invested,
      currentValue: currentVal,
      rateOrReturn: `${b.couponRate}% coupon`,
      badge: b.bondType,
      badgeColor: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20",
    });
  });

  // 3. SIPs
  summary.sips.forEach((s) => {
    const currentVal =
      s.currentValue ||
      (s.totalUnitsHeld && s.currentNAV
        ? s.totalUnitsHeld * s.currentNAV
        : s.totalInvested);
    const returnVal = currentVal - s.totalInvested;
    const retPct =
      s.totalInvested > 0
        ? ((returnVal / s.totalInvested) * 100).toFixed(1)
        : "0";

    items.push({
      id: s.id,
      raw: s,
      category: "SIP",
      title: s.schemeName,
      subtitle: `₹${s.monthlyAmount.toLocaleString("en-IN")}/mo SIP`,
      invested: s.totalInvested,
      currentValue: currentVal,
      rateOrReturn: `${Number(retPct) >= 0 ? "+" : ""}${retPct}%`,
      badge: "SIP",
      badgeColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20",
    });
  });

  // 4. REITs
  summary.reits.forEach((r) => {
    const invested = r.units * r.purchasePrice;
    const currentVal = r.units * r.currentPrice;
    const gain = currentVal - invested;
    const gainPct =
      invested > 0 ? ((gain / invested) * 100).toFixed(1) : "0";
    items.push({
      id: r.id,
      raw: r,
      category: "REIT",
      title: r.name,
      subtitle: `${r.units.toLocaleString("en-IN")} units`,
      invested,
      currentValue: currentVal,
      rateOrReturn: `${Number(gainPct) >= 0 ? "+" : ""}${gainPct}%`,
      badge: "REIT",
      badgeColor: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20",
    });
  });

  // 4b. Physical Real Estate
  (summary.realEstates || []).forEach((re) => {
    const invested = re.purchasePrice;
    const currentVal = re.currentValuation || re.purchasePrice;
    const gain = currentVal - invested;
    const gainPct =
      invested > 0 ? ((gain / invested) * 100).toFixed(1) : "0";

    let typeBadge = "Plot";
    let badgeColor = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";
    if (re.propertyType === "SELF_OCCUPIED") {
      typeBadge = "Staying Home";
      badgeColor = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20";
    } else if (re.propertyType === "RENTAL") {
      typeBadge = "Rental Property";
      badgeColor = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
    } else if (re.propertyType === "COMMERCIAL") {
      typeBadge = "Commercial";
      badgeColor = "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20";
    }

    const mainProperty =
      re.location ||
      (re.areaSqFt ? `${re.areaSqFt.toLocaleString("en-IN")} sq.ft.` : "Physical Property");

    items.push({
      id: re.id,
      raw: re,
      category: "REAL_ESTATE",
      title: re.name,
      subtitle: mainProperty,
      invested,
      currentValue: currentVal,
      rateOrReturn: `${Number(gainPct) >= 0 ? "+" : ""}${gainPct}%`,
      badge: typeBadge,
      badgeColor,
    });
  });

  // 5. Physical Gold & Commodities
  summary.goldHoldings.forEach((g) => {
    const currentVal =
      (g.units && g.units > 0 ? g.units * g.currentSpotRate : 0) ||
      (g.weightGrams && g.weightGrams > 0
        ? g.weightGrams * g.currentSpotRate
        : g.purchasePrice);
    const gain = currentVal - g.purchasePrice;
    const gainPct =
      g.purchasePrice > 0 ? ((gain / g.purchasePrice) * 100).toFixed(1) : "0";

    const goldMainProp = g.weightGrams
      ? `${g.weightGrams}g ${g.purity ? `• ${g.purity}` : "Bullion"}`
      : `${g.units} units`;

    items.push({
      id: g.id,
      raw: g,
      category: "GOLD",
      title: `${g.goldType === "PHYSICAL" ? "Physical Bullion" : g.goldType.replace("_", " ")}`,
      subtitle: goldMainProp,
      invested: g.purchasePrice,
      currentValue: currentVal,
      rateOrReturn: `${Number(gainPct) >= 0 ? "+" : ""}${gainPct}%`,
      badge: "Physical Metal",
      badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    });
  });

  // 6. Retirement Accounts
  summary.retirementAccounts.forEach((ret) => {
    const monthlyInflow =
      ret.employeeContribution + (ret.employerContribution || 0);

    const retMainProp = ret.accountNumber
      ? `A/C: ${ret.accountNumber}`
      : monthlyInflow > 0
      ? `Monthly: ${formatCurrency(monthlyInflow)}/mo`
      : "Provident Fund";

    items.push({
      id: ret.id,
      raw: ret,
      category: "RETIREMENT",
      title: `${ret.accountType} Account`,
      subtitle: retMainProp,
      invested: monthlyInflow > 0 ? monthlyInflow : ret.currentCorpus,
      currentValue: ret.currentCorpus,
      rateOrReturn: `${ret.interestRate}% p.a.`,
      badge: ret.accountType,
      badgeColor: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20",
    });
  });

  // Effective category filter: in dedicated view, strictly lock to `category`
  const effectiveCategory = isDedicatedView ? category : selectedTab;

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesCategory =
      effectiveCategory === "ALL" || item.category === effectiveCategory;
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Dedicated View Metadata
  const getCategoryConfig = (cat: AssetCategory | "ALL") => {
    switch (cat) {
      case "FIXED_DEPOSIT":
        return {
          title: "Fixed & Recurring Deposits",
          description: "All active term deposits, interest rates, tenure schedules, and maturity values",
          addLabel: "Add FD / RD",
          emptyTitle: "No Fixed Deposits Added Yet",
          emptyDesc: "Click '+ Add FD / RD' to record your bank term deposits and recurring deposits.",
          icon: Landmark,
        };
      case "BOND":
        return {
          title: "Bond & Government Security Holdings",
          description: "Corporate, sovereign G-Sec, and municipal debt instruments with coupon payouts",
          addLabel: "Add Bond",
          emptyTitle: "No Bonds Added Yet",
          emptyDesc: "Click '+ Add Bond' to track corporate bonds and government securities.",
          icon: Landmark,
        };
      case "SIP":
        return {
          title: "Systematic Investment Plans (SIP)",
          description: "Active and paused mutual fund SIPs with monthly amounts and compounding returns",
          addLabel: "Add SIP",
          emptyTitle: "No SIPs Added Yet",
          emptyDesc: "Click '+ Add SIP' to record your systematic monthly investment plans.",
          icon: TrendingUp,
        };
      case "REIT":
        return {
          title: "REITs & InvITs Holdings",
          description: "Listed commercial real estate investment trusts and infrastructure investment trusts",
          addLabel: "Add REIT / InvIT",
          emptyTitle: "No REITs Added Yet",
          emptyDesc: "Click '+ Add REIT / InvIT' to record your commercial real estate units and distribution yields.",
          icon: Building2,
        };
      case "REAL_ESTATE":
        return {
          title: "Physical Real Estate Holdings",
          description: "Plots of land, primary residences, rental homes, and commercial units with 4%–6% compounding appreciation",
          addLabel: "Add Property",
          emptyTitle: "No Physical Properties Added Yet",
          emptyDesc: "Click '+ Add Property' to record your land plots, self-occupied homes, rentals, or commercial spaces.",
          icon: Home,
        };
      case "GOLD":
        return {
          title: "Physical Gold & Commodities Holdings",
          description: "Inventory of physical bullion bars, minted coins, 22K/24K jewelry, and silver stored in vaults",
          addLabel: "Add Physical Gold",
          emptyTitle: "No Physical Gold Added Yet",
          emptyDesc: "Click '+ Add Physical Gold' to track your physical bullion bars, coins, and jewelry.",
          icon: Sparkles,
        };
      case "RETIREMENT":
        return {
          title: "Retirement Accounts (EPF / PPF / NPS)",
          description: "Tax-advantaged provident fund accounts with employee and employer contributions",
          addLabel: "Add Retirement A/C",
          emptyTitle: "No Retirement Accounts Added Yet",
          emptyDesc: "Click '+ Add Retirement A/C' to track your EPF, PPF, or NPS corpus accounts.",
          icon: ShieldCheck,
        };
      default:
        return {
          title: "Asset Holdings Directory",
          description: "Comprehensive list of all fixed income, commodities, retirement, and alternatives",
          addLabel: "Add Asset",
          emptyTitle: "No Assets Found",
          emptyDesc: "Click '+ Add Asset' to record your first Fixed Deposit, Bond, Gold, or Retirement account.",
          icon: Layers,
        };
    }
  };

  const config = getCategoryConfig(effectiveCategory);

  const categoryTabs = [
    { key: "ALL", label: "All Assets", count: items.length },
    { key: "FIXED_DEPOSIT", label: "FD / RD", count: summary.fdCount },
    { key: "BOND", label: "Bonds", count: summary.bondCount },
    { key: "SIP", label: "SIPs", count: summary.sipCount },
    { key: "REIT", label: "REITs", count: summary.reitCount },
    { key: "REAL_ESTATE", label: "Real Estate", count: summary.physicalRealEstateCount },
    { key: "GOLD", label: "Physical Gold", count: summary.goldCount },
    { key: "RETIREMENT", label: "Retirement", count: summary.retirementCount },
  ];

  return (
    <div
      id="asset-holdings-directory"
      className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden"
    >
      {/* Table Header & Controls */}
      <div className="p-5 border-b border-border/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base text-foreground font-serif">
                {config.title}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
                {filteredItems.length}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {config.description}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(isDedicatedView || selectedTab !== "ALL") && (
              <button
                onClick={() =>
                  onAddNew(
                    isDedicatedView
                      ? category
                      : (selectedTab as AssetCategory)
                  )
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
              >
                <Plus className="h-4 w-4" /> {config.addLabel}
              </button>
            )}
          </div>
        </div>

        {/* Tab filters and search: ONLY show tab selector pills when in "ALL" / Overview mode */}
        <div className={`flex flex-col md:flex-row md:items-center ${isDedicatedView ? "justify-end" : "justify-between"} gap-3 pt-1`}>
          {!isDedicatedView && (
            <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {categoryTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedTab(tab.key as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    selectedTab === tab.key
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      selectedTab === tab.key
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Search bar */}
          <div className={`relative w-full ${isDedicatedView ? "md:w-80" : "md:w-64"}`}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder={`Search ${isDedicatedView ? config.title.toLowerCase() : "holdings"}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-border/60 bg-muted/20 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>
        </div>
      </div>

      {/* Table Body */}
      {filteredItems.length === 0 ? (
        <div className="p-8 sm:p-12 text-center">
          <div className="p-3.5 rounded-full bg-muted w-fit mx-auto mb-2 text-muted-foreground">
            <config.icon className="h-6 w-6" />
          </div>
          <h4 className="font-semibold text-foreground text-sm">{config.emptyTitle}</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
            {search ? `No holdings matching "${search}".` : config.emptyDesc}
          </p>
          {!search && (
            <button
              onClick={() => onAddNew(isDedicatedView ? category : undefined)}
              className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" /> {config.addLabel} Now
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Mobile Card View (md:hidden) */}
          <div className="block md:hidden divide-y divide-border/40">
            {filteredItems.map((item) => (
              <div
                key={`mobile-${item.id}`}
                className="p-4 space-y-3 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    </div>
                    <h4 className="font-semibold text-foreground text-xs mt-1 truncate">
                      {item.title}
                    </h4>
                    {item.subtitle && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {item.subtitle}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-foreground font-serif">
                      {formatCurrency(item.currentValue)}
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                      {item.rateOrReturn}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/30 text-xs">
                  <div className="text-muted-foreground text-[11px]">
                    <span className="opacity-80">
                      {item.category === "RETIREMENT" ? "Monthly: " : "Invested: "}
                    </span>
                    <strong className="text-foreground font-medium">
                      {item.category === "RETIREMENT"
                        ? `${formatCurrency(item.invested)}/mo`
                        : formatCurrency(item.invested)}
                    </strong>
                  </div>

                  <div className="flex items-center gap-1">
                    {item.category === "RETIREMENT" && onLogMonth && (
                      <button
                        onClick={() => onLogMonth(item.raw)}
                        title="Log monthly salary deduction"
                        className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 transition-colors"
                      >
                        <CalendarClock className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {item.category === "RETIREMENT" && onViewPassbook && (
                      <button
                        onClick={() => onViewPassbook(item.raw)}
                        title="View contribution passbook"
                        className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => onEdit(item.category, item.raw)}
                      title="Edit asset"
                      className="p-1.5 rounded-lg bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(item.category, item.raw)}
                      title="Delete asset"
                      className="p-1.5 rounded-lg bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View (hidden md:block) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 border-b border-border/60 text-muted-foreground uppercase text-[10px] font-semibold tracking-wider">
                <tr>
                  <th className="px-5 py-3">Asset Description</th>
                  <th className="px-4 py-3">Classification</th>
                  <th className="px-4 py-3 text-right">
                    {category === "RETIREMENT" ? "Monthly Inflow" : "Invested / Principal"}
                  </th>
                  <th className="px-4 py-3 text-right">Current Valuation</th>
                  <th className="px-4 py-3 text-right">Yield / Return</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    <td className="px-5 py-3.5">
                      <div>
                        <span className="font-semibold text-foreground text-xs block">
                          {item.title}
                        </span>
                        {item.subtitle && (
                          <span className="text-[11px] text-muted-foreground mt-0.5 block truncate max-w-[260px]">
                            {item.subtitle}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-muted-foreground">
                      {item.category === "RETIREMENT"
                        ? `${formatCurrency(item.invested)} / mo`
                        : formatCurrency(item.invested)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-foreground">
                      {formatCurrency(item.currentValue)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {item.rateOrReturn}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        {item.category === "RETIREMENT" && onLogMonth && (
                          <button
                            onClick={() => onLogMonth(item.raw)}
                            title="Log monthly salary deduction"
                            className="p-1.5 rounded-lg hover:bg-teal-500/10 text-teal-600 dark:text-teal-400 transition-colors"
                          >
                            <CalendarClock className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {item.category === "RETIREMENT" && onViewPassbook && (
                          <button
                            onClick={() => onViewPassbook(item.raw)}
                            title="View contribution passbook"
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <BookOpen className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onEdit(item.category, item.raw)}
                          title="Edit asset"
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(item.category, item.raw)}
                          title="Delete asset"
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
