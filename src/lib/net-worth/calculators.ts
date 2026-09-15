import {
  FixedDeposit,
  Bond,
  SIP,
  REIT,
  RealEstate,
  PropertyType,
  GoldHolding,
  RetirementAccount,
  Liability,
  InvestmentHolding,
  NetWorthSummary,
  AssetClassBreakdownItem,
  AllocationSlice,
  NetWorthChartPoint,
  CompoundingFrequency,
} from "./types";

// ─── Physical Real Estate Calculators ────────────────────────────────────────
export function calculatePropertyCompoundedValue(
  invested: number,
  annualRate: number, // e.g. 5.0 (%)
  purchaseDate: string | Date
): number {
  if (invested <= 0) return 0;
  const start = new Date(purchaseDate);
  const now = new Date();
  if (isNaN(start.getTime())) return invested;
  const elapsedMs = Math.max(0, now.getTime() - start.getTime());
  const elapsedYears = elapsedMs / (1000 * 60 * 60 * 24 * 365.25);
  const r = (annualRate || 5.0) / 100;
  const val = invested * Math.pow(1 + r, elapsedYears);
  return Math.round(val * 100) / 100;
}

export function calculateRentalYield(
  monthlyRent: number,
  valuation: number
): number {
  if (valuation <= 0 || monthlyRent <= 0) return 0;
  const annualRent = monthlyRent * 12;
  return Math.round((annualRent / valuation) * 10000) / 100; // e.g. 4.2 (%)
}

// ─── Compounding Frequency to Times Per Year ─────────────────────────────────
export function getCompoundingTimesPerYear(freq: CompoundingFrequency): number {
  switch (freq) {
    case "MONTHLY":
      return 12;
    case "QUARTERLY":
      return 4;
    case "HALF_YEARLY":
      return 2;
    case "ANNUALLY":
      return 1;
    default:
      return 4;
  }
}

// ─── Fixed Deposit Calculations ──────────────────────────────────────────────
export function calculateFDMaturityValue(
  principal: number,
  annualRate: number, // e.g. 7.5
  tenureMonths: number,
  compoundingFreq: CompoundingFrequency = "QUARTERLY"
): number {
  if (principal <= 0 || tenureMonths <= 0) return principal;
  const r = annualRate / 100;
  const n = getCompoundingTimesPerYear(compoundingFreq);
  const t = tenureMonths / 12;
  const amount = principal * Math.pow(1 + r / n, n * t);
  return Math.round(amount * 100) / 100;
}

export function calculateFDCurrentValue(
  principal: number,
  annualRate: number,
  tenureMonths: number,
  startDate: string | Date,
  compoundingFreq: CompoundingFrequency = "QUARTERLY"
): number {
  if (principal <= 0) return 0;
  const start = new Date(startDate);
  const now = new Date();
  const elapsedMs = Math.max(0, now.getTime() - start.getTime());
  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
  const totalDays = Math.max(1, tenureMonths * 30.4375);
  const clampedDays = Math.min(elapsedDays, totalDays);
  const elapsedYears = clampedDays / 365.25;

  const r = annualRate / 100;
  const n = getCompoundingTimesPerYear(compoundingFreq);
  const amount = principal * Math.pow(1 + r / n, n * elapsedYears);
  return Math.round(amount * 100) / 100;
}

// ─── Recurring Deposit Maturity Calculation ──────────────────────────────────
export function calculateRDMaturityValue(
  monthlyInstallment: number,
  annualRate: number,
  tenureMonths: number,
  compoundingFreq: CompoundingFrequency = "QUARTERLY"
): number {
  if (monthlyInstallment <= 0 || tenureMonths <= 0) return 0;
  const r = annualRate / 100;
  const n = getCompoundingTimesPerYear(compoundingFreq);
  // Sum of compound interest for each monthly deposit
  let total = 0;
  for (let i = 1; i <= tenureMonths; i++) {
    // Months remaining until maturity for the i-th installment
    const remainingMonths = tenureMonths - i + 1;
    const t = remainingMonths / 12;
    total += monthlyInstallment * Math.pow(1 + r / n, n * t);
  }
  return Math.round(total * 100) / 100;
}

// ─── SIP Future Value Projection ─────────────────────────────────────────────
export function calculateSIPFutureValue(
  monthlyAmount: number,
  expectedReturnRate: number, // e.g. 12 (%)
  years: number
): number {
  if (monthlyAmount <= 0 || years <= 0) return 0;
  const i = expectedReturnRate / 100 / 12;
  const n = years * 12;
  if (i === 0) return monthlyAmount * n;
  const fv = monthlyAmount * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
  return Math.round(fv);
}

// ─── Asset Current Value Resolvers ───────────────────────────────────────────
export function getFDCurrentValue(fd: FixedDeposit): number {
  if (fd.currentValue && fd.currentValue > 0) return fd.currentValue;
  if (fd.fdType === "RD" && fd.monthlyInstallment) {
    return calculateRDMaturityValue(
      fd.monthlyInstallment,
      fd.interestRate,
      Math.min(
        fd.tenureMonths,
        Math.max(
          1,
          Math.floor(
            (new Date().getTime() - new Date(fd.startDate).getTime()) /
              (1000 * 60 * 60 * 24 * 30.4375)
          )
        )
      ),
      fd.compoundingFreq
    );
  }
  return calculateFDCurrentValue(
    fd.principalAmount,
    fd.interestRate,
    fd.tenureMonths,
    fd.startDate,
    fd.compoundingFreq
  );
}

export function getBondCurrentValue(bond: Bond): number {
  const price = bond.currentPrice ?? bond.purchasePrice;
  return bond.quantity * price;
}

export function getSIPCurrentValue(sip: SIP): number {
  if (sip.totalUnitsHeld && sip.totalUnitsHeld > 0 && sip.currentNAV && sip.currentNAV > 0) {
    return Math.round(sip.totalUnitsHeld * sip.currentNAV * 100) / 100;
  }
  if (sip.currentValue !== undefined && sip.currentValue !== null && sip.currentValue > 0) {
    return sip.currentValue;
  }
  return sip.totalInvested;
}

export function getREITCurrentValue(reit: REIT): number {
  return Math.round(reit.units * reit.currentPrice * 100) / 100;
}

export function getGoldCurrentValue(gold: GoldHolding): number {
  if (gold.units && gold.units > 0) {
    return Math.round(gold.units * gold.currentSpotRate * 100) / 100;
  }
  if (gold.weightGrams && gold.weightGrams > 0) {
    // Current spot rate is assumed per gram
    return Math.round(gold.weightGrams * gold.currentSpotRate * 100) / 100;
  }
  return gold.purchasePrice;
}

// ─── Net Worth Summary Aggregator ────────────────────────────────────────────
export function computeNetWorthSummary(data: {
  fixedDeposits: FixedDeposit[];
  bonds: Bond[];
  sips: SIP[];
  reits: REIT[];
  realEstates?: RealEstate[];
  goldHoldings: GoldHolding[];
  retirementAccounts: RetirementAccount[];
  liabilities: Liability[];
  investmentHoldings: InvestmentHolding[];
}): NetWorthSummary {
  const {
    fixedDeposits,
    bonds,
    sips,
    reits,
    realEstates = [],
    goldHoldings,
    retirementAccounts,
    liabilities,
    investmentHoldings,
  } = data;

  // 1. Separate investments into Direct Stocks, Mutual Funds, and Gold/Silver MFs/ETFs
  let directStocksValue = 0;
  let directStocksInvested = 0;
  let directStocksCount = 0;

  let mutualFundsValue = 0;
  let mutualFundsInvested = 0;
  let mutualFundsCount = 0;

  let goldSilverFundsValue = 0;
  let goldSilverFundsInvested = 0;
  let goldSilverFundsCount = 0;

  for (const inv of investmentHoldings) {
    const curVal = inv.currentValue || 0;
    const invAmt = inv.investedAmount || 0;

    // Detect Gold & Silver Mutual Funds, ETFs, FoFs, and BeES
    const isGoldOrSilverFund =
      inv.assetType === "GOLD" ||
      /(gold|silver|sgb|bees)/i.test(inv.name || "") ||
      /(gold|silver|bees)/i.test(inv.symbol || "") ||
      /(gold|silver|commodity)/i.test(inv.category || "");

    if (isGoldOrSilverFund) {
      goldSilverFundsValue += curVal;
      goldSilverFundsInvested += invAmt;
      goldSilverFundsCount += 1;
    } else if (inv.assetType === "STOCK") {
      directStocksValue += curVal;
      directStocksInvested += invAmt;
      directStocksCount += 1;
    } else {
      mutualFundsValue += curVal;
      mutualFundsInvested += invAmt;
      mutualFundsCount += 1;
    }
  }

  // 2. Fixed Deposits & RDs
  const fdVal = fixedDeposits.reduce((acc, fd) => acc + getFDCurrentValue(fd), 0);
  const fdInvested = fixedDeposits.reduce((acc, fd) => acc + fd.principalAmount, 0);

  // 3. Bonds & Government Securities
  const bondVal = bonds.reduce((acc, b) => acc + getBondCurrentValue(b), 0);
  const bondInvested = bonds.reduce((acc, b) => acc + b.quantity * b.purchasePrice, 0);

  // 4. Mutual Fund SIPs — "SIP is not a diff category, IT COMES UNDER MF ONLY"
  const sipVal = sips.reduce((acc, s) => acc + getSIPCurrentValue(s), 0);
  const sipInvested = sips.reduce((acc, s) => acc + (s.totalInvested || 0), 0);

  // For any SIP scheme not already tracked inside investmentHoldings, merge its value into Mutual Funds
  for (const s of sips) {
    const normSipName = (s.schemeName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const sipCode = s.schemeCode ? s.schemeCode.trim().toLowerCase() : "";

    const alreadyInHoldings = investmentHoldings.some((inv) => {
      const normInvName = (inv.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const invSymbol = (inv.symbol || "").toLowerCase();
      if (sipCode && (invSymbol === sipCode || invSymbol.includes(sipCode))) return true;
      if (normSipName === normInvName) return true;
      if (normSipName.length > 8 && normInvName.length > 8) {
        if (normSipName.includes(normInvName) || normInvName.includes(normSipName)) return true;
      }
      return false;
    });

    if (!alreadyInHoldings) {
      const sCur = getSIPCurrentValue(s);
      const sInv = s.totalInvested || 0;
      const isGoldSilverSip =
        /(gold|silver|sgb|bees)/i.test(s.schemeName || "") ||
        /(gold|silver|commodity)/i.test(s.notes || "");

      if (isGoldSilverSip) {
        goldSilverFundsValue += sCur;
        goldSilverFundsInvested += sInv;
        goldSilverFundsCount += 1;
      } else {
        mutualFundsValue += sCur;
        mutualFundsInvested += sInv;
        mutualFundsCount += 1;
      }
    }
  }

  // 5. REITs & InvITs (Paper Real Estate Trusts)
  const reitVal = reits.reduce((acc, r) => acc + getREITCurrentValue(r), 0);
  const reitInvested = reits.reduce((acc, r) => acc + r.units * r.purchasePrice, 0);

  // 6. Physical Real Estate (Plots, Staying Home, Rental, Commercial)
  let physicalRealEstateVal = 0;
  let physicalRealEstateInvested = 0;
  let physicalRealEstateRentalIncome = 0;
  const physicalRealEstateCount = (realEstates || []).length;

  for (const re of realEstates || []) {
    const val =
      re.currentValuation && re.currentValuation > 0
        ? re.currentValuation
        : calculatePropertyCompoundedValue(
            re.purchasePrice,
            re.appreciationRate,
            re.purchaseDate
          );
    physicalRealEstateVal += val;
    physicalRealEstateInvested += re.purchasePrice || 0;
    if (re.isRental && re.monthlyRent && re.monthlyRent > 0) {
      physicalRealEstateRentalIncome += re.monthlyRent * 12;
    }
  }

  // 7. Physical Gold & Commodities (All Physical Bullion Bars, Minted Coins, Jewelry)
  let physicalGoldVal = 0;
  let physicalGoldInvested = 0;
  let physicalGoldCount = 0;

  for (const g of goldHoldings) {
    const gCur = getGoldCurrentValue(g);
    const gInv = g.purchasePrice || 0;

    // If an item was tagged as ETF or SGB in older data, allocate to Paper Gold/Silver MFs/ETFs
    if (g.goldType === "ETF" || g.goldType === "SOVEREIGN_GOLD_BOND") {
      goldSilverFundsValue += gCur;
      goldSilverFundsInvested += gInv;
      goldSilverFundsCount += 1;
    } else {
      // Physical Gold Bullion, Coins, Jewelry
      physicalGoldVal += gCur;
      physicalGoldInvested += gInv;
      physicalGoldCount += 1;
    }
  }

  // 8. Retirement Accounts (EPF / PPF / NPS)
  const retirementVal = retirementAccounts.reduce(
    (acc, r) => acc + (r.currentCorpus || 0),
    0
  );
  // Monthly salary deduction + employer match inflow
  const retirementMonthlyInflow = retirementAccounts.reduce(
    (acc, r) => acc + (r.employeeContribution || 0) + (r.employerContribution || 0),
    0
  );
  const retirementInvested = retirementVal;

  // Total Assets across all asset classes (SIPs are included under Mutual Funds)
  const totalAssets =
    directStocksValue +
    mutualFundsValue +
    goldSilverFundsValue +
    physicalGoldVal +
    fdVal +
    bondVal +
    reitVal +
    physicalRealEstateVal +
    retirementVal;

  // Aggregate helper values
  const equitiesValue = directStocksValue + mutualFundsValue;
  const fixedIncomeValue = fdVal + bondVal;
  const realEstateValue = reitVal;
  const totalGoldCommodities = goldSilverFundsValue + physicalGoldVal;

  // Liabilities
  const totalLiabilities = liabilities.reduce(
    (acc, l) => acc + (l.principalRemaining || 0),
    0
  );

  const netWorth = totalAssets - totalLiabilities;

  // Total Invested & PnL
  const totalInvested =
    directStocksInvested +
    mutualFundsInvested +
    goldSilverFundsInvested +
    physicalGoldInvested +
    fdInvested +
    bondInvested +
    reitInvested +
    physicalRealEstateInvested +
    retirementInvested;

  const totalPnL = totalAssets - totalInvested;
  const totalPnLPercent =
    totalInvested > 0 ? Math.round((totalPnL / totalInvested) * 10000) / 100 : 0;

  // Liquidity
  // Liquid: Stocks, MFs, ETFs, Gold/Silver funds, REITs
  const liquidAssets = directStocksValue + mutualFundsValue + goldSilverFundsValue + reitVal;
  // Illiquid: Physical Gold, FDs, Bonds, Retirement, ongoing SIP locked units
  const illiquidAssets = totalAssets - liquidAssets;

  // Granular Allocation Slices for Donut Chart across ALL active asset classes
  const allocation: AllocationSlice[] = [];
  if (totalAssets > 0) {
    if (directStocksValue > 0) {
      const pnl = directStocksValue - directStocksInvested;
      allocation.push({
        name: "Direct Stocks",
        category: "Equities",
        value: Math.round(directStocksValue),
        invested: Math.round(directStocksInvested),
        pnl: Math.round(pnl),
        pnlPercent: directStocksInvested > 0 ? Math.round((pnl / directStocksInvested) * 1000) / 10 : 0,
        percentage: Math.round((directStocksValue / totalAssets) * 1000) / 10,
        color: "#3B82F6", // Royal Blue
        href: "/investments?tab=STOCK",
      });
    }
    if (mutualFundsValue > 0) {
      const pnl = mutualFundsValue - mutualFundsInvested;
      allocation.push({
        name: "Mutual Funds & ETFs",
        category: "Funds & ETFs",
        value: Math.round(mutualFundsValue),
        invested: Math.round(mutualFundsInvested),
        pnl: Math.round(pnl),
        pnlPercent: mutualFundsInvested > 0 ? Math.round((pnl / mutualFundsInvested) * 1000) / 10 : 0,
        percentage: Math.round((mutualFundsValue / totalAssets) * 1000) / 10,
        color: "#6366F1", // Indigo
        href: "/investments?tab=MUTUAL_FUND",
      });
    }
    if (goldSilverFundsValue > 0) {
      const pnl = goldSilverFundsValue - goldSilverFundsInvested;
      allocation.push({
        name: "Gold & Silver MFs/ETFs",
        category: "Paper Commodities",
        value: Math.round(goldSilverFundsValue),
        invested: Math.round(goldSilverFundsInvested),
        pnl: Math.round(pnl),
        pnlPercent: goldSilverFundsInvested > 0 ? Math.round((pnl / goldSilverFundsInvested) * 1000) / 10 : 0,
        percentage: Math.round((goldSilverFundsValue / totalAssets) * 1000) / 10,
        color: "#D97706", // Amber Bronze
        href: "/investments",
      });
    }
    if (physicalGoldVal > 0) {
      const pnl = physicalGoldVal - physicalGoldInvested;
      allocation.push({
        name: "Physical Gold & Commodities",
        category: "Physical Metals",
        value: Math.round(physicalGoldVal),
        invested: Math.round(physicalGoldInvested),
        pnl: Math.round(pnl),
        pnlPercent: physicalGoldInvested > 0 ? Math.round((pnl / physicalGoldInvested) * 1000) / 10 : 0,
        percentage: Math.round((physicalGoldVal / totalAssets) * 1000) / 10,
        color: "#F59E0B", // Pure Gold / Yellow
        href: "/net-worth?category=GOLD",
      });
    }
    if (fdVal > 0) {
      const pnl = fdVal - fdInvested;
      allocation.push({
        name: "Fixed Deposits & RD",
        category: "Fixed Income",
        value: Math.round(fdVal),
        invested: Math.round(fdInvested),
        pnl: Math.round(pnl),
        pnlPercent: fdInvested > 0 ? Math.round((pnl / fdInvested) * 1000) / 10 : 0,
        percentage: Math.round((fdVal / totalAssets) * 1000) / 10,
        color: "#10B981", // Emerald Green
        href: "/net-worth?category=FIXED_DEPOSIT",
      });
    }
    if (bondVal > 0) {
      const pnl = bondVal - bondInvested;
      allocation.push({
        name: "Bonds & G-Sec",
        category: "Debt Securities",
        value: Math.round(bondVal),
        invested: Math.round(bondInvested),
        pnl: Math.round(pnl),
        pnlPercent: bondInvested > 0 ? Math.round((pnl / bondInvested) * 1000) / 10 : 0,
        percentage: Math.round((bondVal / totalAssets) * 1000) / 10,
        color: "#06B6D4", // Cyan
        href: "/net-worth?category=BOND",
      });
    }
    if (reitVal > 0) {
      const pnl = reitVal - reitInvested;
      allocation.push({
        name: "REITs & InvITs",
        category: "Listed Trusts",
        value: Math.round(reitVal),
        invested: Math.round(reitInvested),
        pnl: Math.round(pnl),
        pnlPercent: reitInvested > 0 ? Math.round((pnl / reitInvested) * 1000) / 10 : 0,
        percentage: Math.round((reitVal / totalAssets) * 1000) / 10,
        color: "#EC4899", // Rose Pink
        href: "/net-worth?category=REIT",
      });
    }
    if (physicalRealEstateVal > 0) {
      const pnl = physicalRealEstateVal - physicalRealEstateInvested;
      allocation.push({
        name: "Physical Real Estate",
        category: "Physical Properties",
        value: Math.round(physicalRealEstateVal),
        invested: Math.round(physicalRealEstateInvested),
        pnl: Math.round(pnl),
        pnlPercent: physicalRealEstateInvested > 0 ? Math.round((pnl / physicalRealEstateInvested) * 1000) / 10 : 0,
        percentage: Math.round((physicalRealEstateVal / totalAssets) * 1000) / 10,
        color: "#059669", // Emerald Green
        href: "/net-worth?category=REAL_ESTATE",
      });
    }
    if (retirementVal > 0) {
      const pnl = retirementVal - retirementInvested;
      allocation.push({
        name: "Retirement (EPF/PPF)",
        category: "Retirement",
        value: Math.round(retirementVal),
        invested: Math.round(retirementInvested),
        pnl: Math.round(pnl),
        pnlPercent: retirementInvested > 0 ? Math.round((pnl / retirementInvested) * 1000) / 10 : 0,
        percentage: Math.round((retirementVal / totalAssets) * 1000) / 10,
        color: "#14B8A6", // Teal
        href: "/net-worth?category=RETIREMENT",
      });
    }
  }

  // Helper for computing breakdown metrics for all asset classes
  const computeClassItem = (
    id: string,
    name: string,
    category: string,
    typeBadge: string,
    typeBadgeColor: string,
    curVal: number,
    invAmt: number,
    color: string,
    count: number,
    href: string,
    flags?: { isPhysicalCommodity?: boolean; isPaperCommodity?: boolean }
  ): AssetClassBreakdownItem => {
    const pnl = curVal - invAmt;
    const pnlPercent = invAmt > 0 ? Math.round((pnl / invAmt) * 10000) / 100 : 0;
    const percentage = totalAssets > 0 ? Math.round((curVal / totalAssets) * 1000) / 10 : 0;
    return {
      id,
      name,
      category,
      typeBadge,
      typeBadgeColor,
      currentValue: Math.round(curVal),
      investedAmount: Math.round(invAmt),
      pnl: Math.round(pnl),
      pnlPercent,
      percentage,
      color,
      count,
      href,
      isPhysicalCommodity: flags?.isPhysicalCommodity,
      isPaperCommodity: flags?.isPaperCommodity,
    };
  };

  // Build the complete Asset Breakdown Matrix
  const assetBreakdown = [
    computeClassItem(
      "direct_stocks",
      "Direct Stocks",
      "Equities",
      "Direct Equity",
      "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      directStocksValue,
      directStocksInvested,
      "#3B82F6",
      directStocksCount,
      "/investments?tab=STOCK"
    ),
    computeClassItem(
      "mutual_funds",
      "Mutual Funds & ETFs",
      "Funds & ETFs",
      "Equity & Debt MFs",
      "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
      mutualFundsValue,
      mutualFundsInvested,
      "#6366F1",
      mutualFundsCount,
      "/investments?tab=MUTUAL_FUND"
    ),
    computeClassItem(
      "gold_silver_funds",
      "Gold & Silver MFs/ETFs",
      "Paper Commodities",
      "Gold/Silver MFs & BeES",
      "bg-amber-600/10 text-amber-700 dark:text-amber-400 border-amber-600/20",
      goldSilverFundsValue,
      goldSilverFundsInvested,
      "#D97706",
      goldSilverFundsCount,
      "/investments",
      { isPaperCommodity: true }
    ),
    computeClassItem(
      "physical_gold",
      "Physical Gold & Commodities",
      "Physical Metals",
      "Bullion, Bars & Coins",
      "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
      physicalGoldVal,
      physicalGoldInvested,
      "#F59E0B",
      physicalGoldCount,
      "/net-worth?category=GOLD",
      { isPhysicalCommodity: true }
    ),
    computeClassItem(
      "fixed_deposits",
      "Fixed Deposits & RD",
      "Fixed Income",
      "Term Deposits",
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      fdVal,
      fdInvested,
      "#10B981",
      fixedDeposits.length,
      "/net-worth?category=FIXED_DEPOSIT"
    ),
    computeClassItem(
      "bonds",
      "Bonds & G-Sec",
      "Debt Securities",
      "Govt & Corporate Bonds",
      "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
      bondVal,
      bondInvested,
      "#06B6D4",
      bonds.length,
      "/net-worth?category=BOND"
    ),
    computeClassItem(
      "real_estate",
      "Physical Real Estate",
      "Physical Real Estate",
      "Plots, Homes & Commercial",
      "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border-emerald-600/20",
      physicalRealEstateVal,
      physicalRealEstateInvested,
      "#059669",
      physicalRealEstateCount,
      "/net-worth?category=REAL_ESTATE"
    ),
    computeClassItem(
      "reits",
      "REITs & InvITs",
      "Listed Trusts",
      "Commercial Trusts",
      "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
      reitVal,
      reitInvested,
      "#EC4899",
      reits.length,
      "/net-worth?category=REIT"
    ),
    computeClassItem(
      "retirement",
      "Retirement (EPF/PPF/NPS)",
      "Retirement Corpus",
      "Provident Funds",
      "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
      retirementVal,
      retirementInvested,
      "#14B8A6",
      retirementAccounts.length,
      "/net-worth?category=RETIREMENT"
    ),
  ];

  return {
    totalAssets: Math.round(totalAssets),
    totalLiabilities: Math.round(totalLiabilities),
    netWorth: Math.round(netWorth),
    totalInvested: Math.round(totalInvested),
    totalCurrentValue: Math.round(totalAssets),
    totalPnL: Math.round(totalPnL),
    totalPnLPercent,
    liquidAssets: Math.round(liquidAssets),
    illiquidAssets: Math.round(illiquidAssets),
    directStocksValue: Math.round(directStocksValue),
    mutualFundsValue: Math.round(mutualFundsValue),
    goldSilverFundsValue: Math.round(goldSilverFundsValue),
    physicalGoldValue: Math.round(physicalGoldVal),
    fdValue: Math.round(fdVal),
    bondValue: Math.round(bondVal),
    sipValue: Math.round(sipVal),
    realEstateValue: Math.round(reitVal),
    physicalRealEstateValue: Math.round(physicalRealEstateVal),
    physicalRealEstateInvested: Math.round(physicalRealEstateInvested),
    physicalRealEstateRentalIncome: Math.round(physicalRealEstateRentalIncome),
    retirementValue: Math.round(retirementVal),
    equitiesValue: Math.round(equitiesValue),
    fixedIncomeValue: Math.round(fixedIncomeValue),
    goldValue: Math.round(totalGoldCommodities),
    fdCount: fixedDeposits.length,
    bondCount: bonds.length,
    sipCount: sips.length,
    reitCount: reits.length,
    physicalRealEstateCount,
    goldCount: physicalGoldCount,
    retirementCount: retirementAccounts.length,
    liabilityCount: liabilities.length,
    fixedDeposits,
    bonds,
    sips,
    reits,
    realEstates: realEstates || [],
    goldHoldings,
    retirementAccounts,
    liabilities,
    investmentHoldings,
    allocation,
    assetBreakdown,
  };
}

// ─── Historical Trend Synthesizer ────────────────────────────────────────────
// Generates realistic multi-month trajectory for visualization based on current assets & debts
export function generateNetWorthTrend(
  currentAssets: number,
  currentLiabilities: number,
  monthsBack: number = 6
): NetWorthChartPoint[] {
  const points: NetWorthChartPoint[] = [];
  const now = new Date();

  // Monthly growth factor estimated at ~0.9% assets growth and ~1.2% debt paydown
  for (let i = monthsBack; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = d.toLocaleString("default", { month: "short" }) + " '" + String(d.getFullYear()).slice(2);

    // discount backward
    const assetDiscount = Math.pow(1 - 0.009, i);
    const liabilityInflation = Math.pow(1 + 0.012, i);

    const a = Math.round(currentAssets * assetDiscount);
    const l = Math.round(currentLiabilities * (currentLiabilities > 0 ? liabilityInflation : 0));
    const nw = a - l;

    points.push({
      month: monthLabel,
      netWorth: nw,
      assets: a,
      liabilities: l,
    });
  }

  return points;
}
