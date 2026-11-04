"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getCachedUser } from "@/lib/auth-cache";
import {
  FixedDeposit,
  Bond,
  SIP,
  REIT,
  RealEstate,
  GoldHolding,
  RetirementAccount,
  Liability,
  InvestmentHolding,
  NetWorthSummary,
} from "@/lib/net-worth/types";
import {
  computeNetWorthSummary,
  calculatePropertyCompoundedValue,
  calculateLoanRemainingTenure,
} from "@/lib/net-worth/calculators";
import {
  searchMutualFunds,
  searchStocks,
  getStockQuote,
  getMutualFundQuote,
} from "@/lib/market-api";
import {
  LISTED_REITS_AND_INVITS,
  POPULAR_SIP_SCHEMES,
} from "@/lib/net-worth/reit-directory";
import {
  fetchLivePreciousMetalRates,
  getSpotRateForPurity,
  PreciousMetalRates,
} from "@/lib/net-worth/metal-rates";

async function getAuthenticatedUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized: Please sign in");

  const user = await getCachedUser(userId);
  if (!user) throw new Error("User profile not found");
  return user;
}

function revalidateNetWorth() {
  revalidatePath("/net-worth");
  revalidatePath("/investments");
  revalidatePath("/dashboard");
}

// ─── Fetch All Net Worth Data ────────────────────────────────────────────────
export async function getNetWorthData(): Promise<NetWorthSummary> {
  const user = await getAuthenticatedUser();

  const [
    dbFds,
    dbBonds,
    dbSips,
    dbReits,
    dbRealEstates,
    dbGold,
    dbRetirement,
    dbLiabilities,
    dbInvestments,
    metalRates,
  ] = await Promise.all([
    db.fixedDeposit.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    db.bond.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    db.sIP.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    db.rEIT.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    db.realEstate.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    db.goldHolding.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    db.retirementAccount.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        contributions: {
          orderBy: { date: "desc" },
          take: 24,
        },
      },
    }),
    db.liability.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    db.investment.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    fetchLivePreciousMetalRates(),
  ]);

  const fixedDeposits: FixedDeposit[] = dbFds.map((fd) => ({
    id: fd.id,
    fdType: fd.fdType as "FD" | "RD",
    bankName: fd.bankName,
    principalAmount: Number(fd.principalAmount),
    interestRate: Number(fd.interestRate),
    compoundingFreq: fd.compoundingFreq as any,
    tenureMonths: fd.tenureMonths,
    startDate: fd.startDate.toISOString(),
    maturityDate: fd.maturityDate.toISOString(),
    maturityValue: Number(fd.maturityValue),
    currentValue: Number(fd.currentValue),
    monthlyInstallment: fd.monthlyInstallment ? Number(fd.monthlyInstallment) : null,
    notes: fd.notes,
    createdAt: fd.createdAt.toISOString(),
    updatedAt: fd.updatedAt.toISOString(),
    userId: fd.userId,
  }));

  const bonds: Bond[] = dbBonds.map((b) => ({
    id: b.id,
    name: b.name,
    bondType: b.bondType as any,
    isin: b.isin,
    faceValue: Number(b.faceValue),
    couponRate: Number(b.couponRate),
    couponFrequency: b.couponFrequency as any,
    purchasePrice: Number(b.purchasePrice),
    quantity: b.quantity,
    maturityYear: b.maturityYear,
    currentPrice: b.currentPrice ? Number(b.currentPrice) : null,
    notes: b.notes,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    userId: b.userId,
  }));

  const sips: SIP[] = dbSips.map((s) => ({
    id: s.id,
    schemeName: s.schemeName,
    schemeCode: s.schemeCode,
    monthlyAmount: Number(s.monthlyAmount),
    startDate: s.startDate.toISOString(),
    currentNAV: s.currentNAV ? Number(s.currentNAV) : null,
    totalUnitsHeld: s.totalUnitsHeld ? Number(s.totalUnitsHeld) : null,
    totalInvested: Number(s.totalInvested),
    currentValue: s.currentValue ? Number(s.currentValue) : null,
    stepUpRate: s.stepUpRate ? Number(s.stepUpRate) : null,
    expectedReturn: s.expectedReturn ? Number(s.expectedReturn) : null,
    isActive: s.isActive,
    notes: s.notes,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    userId: s.userId,
  }));

  const reits: REIT[] = dbReits.map((r) => ({
    id: r.id,
    name: r.name,
    symbol: r.symbol,
    exchange: r.exchange,
    units: Number(r.units),
    purchasePrice: Number(r.purchasePrice),
    currentPrice: Number(r.currentPrice),
    distributionYield: r.distributionYield ? Number(r.distributionYield) : null,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    userId: r.userId,
  }));

  const realEstates: RealEstate[] = dbRealEstates.map((re) => ({
    id: re.id,
    name: re.name,
    propertyType: re.propertyType as any,
    location: re.location,
    areaSqFt: re.areaSqFt ? Number(re.areaSqFt) : null,
    purchasePrice: Number(re.purchasePrice),
    purchaseDate: re.purchaseDate.toISOString(),
    appreciationRate: Number(re.appreciationRate),
    currentValuation: Number(re.currentValuation),
    isRental: re.isRental,
    monthlyRent: re.monthlyRent ? Number(re.monthlyRent) : null,
    notes: re.notes,
    createdAt: re.createdAt.toISOString(),
    updatedAt: re.updatedAt.toISOString(),
    userId: re.userId,
  }));

  const goldHoldings: GoldHolding[] = dbGold.map((g) => {
    const liveSpot = getSpotRateForPurity(g.purity, metalRates);
    return {
      id: g.id,
      goldType: g.goldType as any,
      weightGrams: g.weightGrams ? Number(g.weightGrams) : null,
      units: g.units ? Number(g.units) : null,
      purchasePrice: Number(g.purchasePrice),
      currentSpotRate: liveSpot > 0 ? liveSpot : Number(g.currentSpotRate),
      purity: g.purity,
      notes: g.notes,
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
      userId: g.userId,
    };
  });

  const retirementAccounts: RetirementAccount[] = dbRetirement.map((r: any) => ({
    id: r.id,
    accountType: r.accountType as any,
    employeeContribution: Number(r.employeeContribution),
    employerContribution: r.employerContribution ? Number(r.employerContribution) : null,
    interestRate: Number(r.interestRate),
    currentCorpus: Number(r.currentCorpus),
    startDate: r.startDate ? r.startDate.toISOString() : null,
    accountNumber: r.accountNumber,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    userId: r.userId,
    contributions: (r.contributions || []).map((c: any) => ({
      id: c.id,
      retirementAccountId: c.retirementAccountId,
      date: c.date.toISOString(),
      monthYear: c.monthYear,
      employeeShare: Number(c.employeeShare),
      employerShare: Number(c.employerShare),
      totalAmount: Number(c.totalAmount),
      source: c.source,
      notes: c.notes,
      createdAt: c.createdAt.toISOString(),
    })),
  }));

  const liabilities: Liability[] = dbLiabilities.map((l) => ({
    id: l.id,
    liabilityType: l.liabilityType as any,
    lenderName: l.lenderName,
    principalRemaining: Number(l.principalRemaining),
    originalPrincipal: l.originalPrincipal ? Number(l.originalPrincipal) : null,
    interestRate: Number(l.interestRate),
    monthlyEMI: Number(l.monthlyEMI),
    remainingTenureMonths: l.remainingTenureMonths,
    startDate: l.startDate ? l.startDate.toISOString() : null,
    endDate: l.endDate ? l.endDate.toISOString() : null,
    notes: l.notes,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
    userId: l.userId,
  }));

  const investmentHoldings: InvestmentHolding[] = dbInvestments.map((inv) => {
    const units = Number(inv.units);
    const buyPrice = Number(inv.buyPrice);
    const currentPrice = Number(inv.currentPrice);
    const prevClose = Number(inv.previousClose ?? currentPrice);
    const invested = units * buyPrice;
    const currentVal = units * currentPrice;
    const prevVal = units * prevClose;
    const totalReturn = currentVal - invested;
    const returnPercent = invested > 0 ? (totalReturn / invested) * 100 : 0;
    const dayChange = currentVal - prevVal;
    const dayChangePercent = prevVal > 0 ? (dayChange / prevVal) * 100 : 0;

    return {
      id: inv.id,
      name: inv.name,
      symbol: inv.symbol,
      assetType: inv.assetType as any,
      units,
      buyPrice,
      currentPrice,
      currentValue: currentVal,
      investedAmount: invested,
      totalReturn,
      returnPercent,
      dayChange,
      dayChangePercent,
      category: inv.category,
      folioOrAccount: inv.folioOrAccount,
    };
  });

  return computeNetWorthSummary({
    fixedDeposits,
    bonds,
    sips,
    reits,
    realEstates,
    goldHoldings,
    retirementAccounts,
    liabilities,
    investmentHoldings,
  });
}

// ─── Fixed Deposit Actions ───────────────────────────────────────────────────
export async function saveFixedDeposit(data: {
  id?: string;
  fdType: "FD" | "RD";
  bankName: string;
  principalAmount: number;
  interestRate: number;
  compoundingFreq: string;
  tenureMonths: number;
  startDate: string;
  maturityDate: string;
  maturityValue: number;
  currentValue: number;
  monthlyInstallment?: number | null;
  notes?: string | null;
}) {
  const user = await getAuthenticatedUser();
  const payload = {
    fdType: data.fdType as any,
    bankName: data.bankName,
    principalAmount: data.principalAmount,
    interestRate: data.interestRate,
    compoundingFreq: (data.compoundingFreq || "QUARTERLY") as any,
    tenureMonths: data.tenureMonths,
    startDate: new Date(data.startDate),
    maturityDate: new Date(data.maturityDate),
    maturityValue: data.maturityValue,
    currentValue: data.currentValue,
    monthlyInstallment: data.monthlyInstallment ?? null,
    notes: data.notes ?? null,
  };

  if (data.id) {
    await db.fixedDeposit.updateMany({ where: { id: data.id, userId: user.id }, data: payload });
  } else {
    await db.fixedDeposit.create({ data: { ...payload, userId: user.id } });
  }

  revalidateNetWorth();
  return { success: true };
}

export async function deleteFixedDeposit(id: string) {
  const user = await getAuthenticatedUser();
  await db.fixedDeposit.deleteMany({ where: { id, userId: user.id } });
  revalidateNetWorth();
  return { success: true };
}

// ─── Bond Actions ────────────────────────────────────────────────────────────
export async function saveBond(data: {
  id?: string;
  name: string;
  bondType: string;
  isin?: string | null;
  faceValue: number;
  couponRate: number;
  couponFrequency: string;
  purchasePrice: number;
  quantity: number;
  maturityYear: number;
  currentPrice?: number | null;
  notes?: string | null;
}) {
  const user = await getAuthenticatedUser();
  const payload = {
    name: data.name,
    bondType: (data.bondType || "GOVERNMENT") as any,
    isin: data.isin ?? null,
    faceValue: data.faceValue,
    couponRate: data.couponRate,
    couponFrequency: (data.couponFrequency || "ANNUALLY") as any,
    purchasePrice: data.purchasePrice,
    quantity: data.quantity,
    maturityYear: data.maturityYear,
    currentPrice: data.currentPrice ?? data.purchasePrice,
    notes: data.notes ?? null,
  };

  if (data.id) {
    await db.bond.updateMany({ where: { id: data.id, userId: user.id }, data: payload });
  } else {
    await db.bond.create({ data: { ...payload, userId: user.id } });
  }

  revalidateNetWorth();
  return { success: true };
}

export async function deleteBond(id: string) {
  const user = await getAuthenticatedUser();
  await db.bond.deleteMany({ where: { id, userId: user.id } });
  revalidateNetWorth();
  return { success: true };
}

// ─── SIP Actions ─────────────────────────────────────────────────────────────
export async function saveSIP(data: {
  id?: string;
  schemeName: string;
  schemeCode?: string | null;
  monthlyAmount: number;
  startDate: string;
  currentNAV?: number | null;
  totalUnitsHeld?: number | null;
  totalInvested?: number | null;
  currentValue?: number | null;
  stepUpRate?: number | null;
  expectedReturn?: number | null;
  isActive?: boolean;
  notes?: string | null;
}) {
  const user = await getAuthenticatedUser();

  let existingSip = null;
  if (data.id) {
    existingSip = await db.sIP.findUnique({ where: { id: data.id, userId: user.id } });
  }

  const invested =
    data.totalInvested !== undefined && data.totalInvested !== null
      ? data.totalInvested
      : existingSip
      ? Number(existingSip.totalInvested)
      : 0;

  const units =
    data.totalUnitsHeld !== undefined && data.totalUnitsHeld !== null
      ? data.totalUnitsHeld
      : existingSip && existingSip.totalUnitsHeld
      ? Number(existingSip.totalUnitsHeld)
      : null;

  const nav =
    data.currentNAV ?? (existingSip && existingSip.currentNAV ? Number(existingSip.currentNAV) : null);

  const payload = {
    schemeName: data.schemeName,
    schemeCode: data.schemeCode ?? null,
    monthlyAmount: data.monthlyAmount,
    startDate: new Date(data.startDate),
    currentNAV: nav,
    totalUnitsHeld: units,
    totalInvested: invested,
    currentValue:
      units && nav && units > 0 && nav > 0
        ? Math.round(units * nav * 100) / 100
        : data.currentValue ?? (existingSip ? Number(existingSip.currentValue) : invested),
    stepUpRate: data.stepUpRate ?? null,
    expectedReturn: data.expectedReturn ?? null,
    isActive: data.isActive ?? true,
    notes: data.notes ?? null,
  };

  if (data.id) {
    await db.sIP.updateMany({ where: { id: data.id, userId: user.id }, data: payload });
  } else {
    await db.sIP.create({ data: { ...payload, userId: user.id } });
  }

  revalidateNetWorth();
  return { success: true };
}

export async function deleteSIP(id: string) {
  const user = await getAuthenticatedUser();
  await db.sIP.deleteMany({ where: { id, userId: user.id } });
  revalidateNetWorth();
  return { success: true };
}

// ─── REIT Actions ────────────────────────────────────────────────────────────
export async function saveREIT(data: {
  id?: string;
  name: string;
  symbol?: string | null;
  exchange?: string | null;
  units: number;
  purchasePrice: number;
  currentPrice: number;
  distributionYield?: number | null;
  notes?: string | null;
}) {
  const user = await getAuthenticatedUser();
  const payload = {
    name: data.name,
    symbol: data.symbol ?? null,
    exchange: data.exchange ?? null,
    units: data.units,
    purchasePrice: data.purchasePrice,
    currentPrice: data.currentPrice,
    distributionYield: data.distributionYield ?? null,
    notes: data.notes ?? null,
  };

  if (data.id) {
    await db.rEIT.updateMany({ where: { id: data.id, userId: user.id }, data: payload });
  } else {
    await db.rEIT.create({ data: { ...payload, userId: user.id } });
  }

  revalidateNetWorth();
  return { success: true };
}

export async function deleteREIT(id: string) {
  const user = await getAuthenticatedUser();
  await db.rEIT.deleteMany({ where: { id, userId: user.id } });
  revalidateNetWorth();
  return { success: true };
}

// ─── Physical Real Estate Actions ───────────────────────────────────────────
export async function saveRealEstate(data: {
  id?: string;
  name: string;
  propertyType: string;
  location?: string | null;
  areaSqFt?: number | null;
  purchasePrice: number;
  purchaseDate: string;
  appreciationRate?: number;
  currentValuation?: number;
  isRental?: boolean;
  monthlyRent?: number | null;
  notes?: string | null;
}) {
  const user = await getAuthenticatedUser();
  const appRate = data.appreciationRate ?? 5.0;
  const curVal =
    data.currentValuation && data.currentValuation > 0
      ? data.currentValuation
      : calculatePropertyCompoundedValue(data.purchasePrice, appRate, data.purchaseDate);

  const payload = {
    name: data.name,
    propertyType: (data.propertyType || "SELF_OCCUPIED") as any,
    location: data.location ?? null,
    areaSqFt: data.areaSqFt ?? null,
    purchasePrice: data.purchasePrice,
    purchaseDate: new Date(data.purchaseDate),
    appreciationRate: appRate,
    currentValuation: curVal,
    isRental: Boolean(
      data.isRental ??
      (data.propertyType === "RENTAL" || (data.monthlyRent ? data.monthlyRent > 0 : false))
    ),
    monthlyRent: data.monthlyRent ?? null,
    notes: data.notes ?? null,
  };

  if (data.id) {
    await db.realEstate.updateMany({ where: { id: data.id, userId: user.id }, data: payload });
  } else {
    await db.realEstate.create({ data: { ...payload, userId: user.id } });
  }

  revalidateNetWorth();
  return { success: true };
}

export async function deleteRealEstate(id: string) {
  const user = await getAuthenticatedUser();
  await db.realEstate.deleteMany({ where: { id, userId: user.id } });
  revalidateNetWorth();
  return { success: true };
}

// ─── Gold Holding Actions ────────────────────────────────────────────────────
export async function saveGoldHolding(data: {
  id?: string;
  goldType: string;
  weightGrams?: number | null;
  units?: number | null;
  purchasePrice: number;
  currentSpotRate?: number;
  purity?: string | null;
  notes?: string | null;
}) {
  const user = await getAuthenticatedUser();
  const metalRates = await fetchLivePreciousMetalRates();
  const liveSpot = getSpotRateForPurity(data.purity, metalRates);

  const payload = {
    goldType: (data.goldType || "PHYSICAL") as any,
    weightGrams: data.weightGrams ?? null,
    units: data.units ?? null,
    purchasePrice: data.purchasePrice,
    currentSpotRate: liveSpot > 0 ? liveSpot : data.currentSpotRate || metalRates.gold24k,
    purity: data.purity ?? null,
    notes: data.notes ?? null,
  };

  if (data.id) {
    await db.goldHolding.updateMany({ where: { id: data.id, userId: user.id }, data: payload });
  } else {
    await db.goldHolding.create({ data: { ...payload, userId: user.id } });
  }

  revalidateNetWorth();
  return { success: true, spotRateApplied: payload.currentSpotRate };
}

export async function deleteGoldHolding(id: string) {
  const user = await getAuthenticatedUser();
  await db.goldHolding.deleteMany({ where: { id, userId: user.id } });
  revalidateNetWorth();
  return { success: true };
}

// ─── Retirement Account Actions ──────────────────────────────────────────────
export async function saveRetirementAccount(data: {
  id?: string;
  accountType: string;
  employeeContribution: number;
  employerContribution?: number | null;
  interestRate: number;
  currentCorpus: number;
  startDate?: string | null;
  accountNumber?: string | null;
  notes?: string | null;
}) {
  const user = await getAuthenticatedUser();
  const payload = {
    accountType: (data.accountType || "EPF") as any,
    employeeContribution: data.employeeContribution,
    employerContribution: data.employerContribution ?? null,
    interestRate: data.interestRate,
    currentCorpus: data.currentCorpus,
    startDate: data.startDate ? new Date(data.startDate) : null,
    accountNumber: data.accountNumber ?? null,
    notes: data.notes ?? null,
  };

  if (data.id) {
    await db.retirementAccount.updateMany({ where: { id: data.id, userId: user.id }, data: payload });
  } else {
    await db.retirementAccount.create({ data: { ...payload, userId: user.id } });
  }

  revalidateNetWorth();
  return { success: true };
}

export async function deleteRetirementAccount(id: string) {
  const user = await getAuthenticatedUser();
  await db.retirementAccount.deleteMany({ where: { id, userId: user.id } });
  revalidateNetWorth();
  return { success: true };
}

export async function logMonthlyRetirementContribution(data: {
  retirementAccountId: string;
  monthYear?: string;
  employeeShare?: number;
  employerShare?: number;
  notes?: string;
}) {
  const user = await getAuthenticatedUser();
  const account = await db.retirementAccount.findFirst({
    where: { id: data.retirementAccountId, userId: user.id },
  });
  if (!account) throw new Error("Retirement account not found");

  const empShare = data.employeeShare ?? Number(account.employeeContribution);
  const empyrShare =
    data.employerShare ?? (account.employerContribution ? Number(account.employerContribution) : 0);
  const total = empShare + empyrShare;

  const monthYear =
    data.monthYear ||
    new Date().toLocaleString("en-US", { month: "short", year: "numeric" });

  await db.$transaction([
    db.retirementContribution.create({
      data: {
        retirementAccountId: account.id,
        monthYear,
        employeeShare: empShare,
        employerShare: empyrShare,
        totalAmount: total,
        source: "MANUAL",
        notes: data.notes || `Salary deduction for ${monthYear}`,
      },
    }),
    db.retirementAccount.update({
      where: { id: account.id },
      data: {
        currentCorpus: { increment: total },
      },
    }),
  ]);

  revalidateNetWorth();
  return { success: true, addedAmount: total, monthYear };
}

export async function quickUpdateRetirementCorpus(id: string, newCorpus: number) {
  const user = await getAuthenticatedUser();
  await db.retirementAccount.updateMany({
    where: { id, userId: user.id },
    data: { currentCorpus: newCorpus },
  });
  revalidateNetWorth();
  return { success: true };
}

// ─── Liability Actions ───────────────────────────────────────────────────────
export async function saveLiability(data: {
  id?: string;
  liabilityType: string;
  lenderName: string;
  principalRemaining: number;
  originalPrincipal?: number | null;
  interestRate: number;
  monthlyEMI: number;
  remainingTenureMonths?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
}) {
  const user = await getAuthenticatedUser();
  const computedTenure =
    data.remainingTenureMonths != null
      ? data.remainingTenureMonths
      : calculateLoanRemainingTenure(
          data.principalRemaining,
          data.monthlyEMI,
          data.interestRate
        );

  const payload = {
    liabilityType: (data.liabilityType || "PERSONAL_LOAN") as any,
    lenderName: data.lenderName,
    principalRemaining: data.principalRemaining,
    originalPrincipal: data.originalPrincipal ?? null,
    interestRate: data.interestRate,
    monthlyEMI: data.monthlyEMI,
    remainingTenureMonths: computedTenure,
    startDate: data.startDate ? new Date(data.startDate) : null,
    endDate: data.endDate ? new Date(data.endDate) : null,
    notes: data.notes ?? null,
  };

  if (data.id) {
    await db.liability.updateMany({ where: { id: data.id, userId: user.id }, data: payload });
  } else {
    await db.liability.create({ data: { ...payload, userId: user.id } });
  }

  revalidateNetWorth();
  return { success: true };
}

export async function deleteLiability(id: string) {
  const user = await getAuthenticatedUser();
  await db.liability.deleteMany({ where: { id, userId: user.id } });
  revalidateNetWorth();
  return { success: true };
}

export async function closeLiability(id: string, closureNotes?: string) {
  const user = await getAuthenticatedUser();
  const existing = await db.liability.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("Liability record not found");

  const todayStr = new Date().toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const noteAddition = closureNotes
    ? `[Closed on ${todayStr}]: ${closureNotes}`
    : `[Closed on ${todayStr}]: Loan fully paid off / foreclosed`;

  const updatedNotes = existing.notes ? `${existing.notes} | ${noteAddition}` : noteAddition;

  await db.liability.updateMany({
    where: { id, userId: user.id },
    data: {
      principalRemaining: 0,
      monthlyEMI: 0,
      remainingTenureMonths: 0,
      endDate: new Date(),
      notes: updatedNotes,
    },
  });

  revalidateNetWorth();
  return { success: true };
}

export async function reopenLiability(
  id: string,
  restoredPrincipal?: number,
  restoredEMI?: number,
  restoredTenure?: number
) {
  const user = await getAuthenticatedUser();
  const existing = await db.liability.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("Liability record not found");

  const origPrincipal = Number(existing.originalPrincipal || 0);
  const principal = restoredPrincipal ?? (origPrincipal > 0 ? origPrincipal : 100000);
  const emi = restoredEMI ?? 5000;
  const tenure =
    restoredTenure ??
    (existing.remainingTenureMonths && existing.remainingTenureMonths > 0
      ? existing.remainingTenureMonths
      : calculateLoanRemainingTenure(
          principal,
          emi,
          Number(existing.interestRate || 8.5)
        ) || 12);

  await db.liability.updateMany({
    where: { id, userId: user.id },
    data: {
      principalRemaining: principal,
      monthlyEMI: emi,
      remainingTenureMonths: tenure,
      endDate: null,
    },
  });

  revalidateNetWorth();
  return { success: true };
}

// ─── Real Scheme Search for SIP (AMFI Master Feed + Popular Presets) ────────
export async function searchSIPSchemes(query: string) {
  const { userId } = await auth();
  if (!userId) return [];
  const q = (query || "").trim().toLowerCase();

  if (!q) {
    return POPULAR_SIP_SCHEMES.map((s) => ({
      name: s.name,
      symbol: s.schemeCode,
      category: s.category,
      fundHouse: s.fundHouse,
      defaultReturn: s.defaultReturn,
      price: 0,
      isPreset: true,
    }));
  }

  const matchedPresets = POPULAR_SIP_SCHEMES.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.fundHouse.toLowerCase().includes(q)
  ).map((s) => ({
    name: s.name,
    symbol: s.schemeCode,
    category: s.category,
    fundHouse: s.fundHouse,
    defaultReturn: s.defaultReturn,
    price: 0,
    isPreset: true,
  }));

  try {
    const liveMfResults = await searchMutualFunds(query);
    const seen = new Set(matchedPresets.map((p) => p.symbol));
    const combined = [...matchedPresets];

    for (const item of liveMfResults) {
      if (!seen.has(item.symbol)) {
        seen.add(item.symbol);
        combined.push({
          name: item.name,
          symbol: item.symbol,
          category: item.category || "Mutual Fund",
          fundHouse: item.name.split(" ")[0] + " Mutual Fund",
          defaultReturn: 12,
          price: item.price || 0,
          isPreset: false,
        });
      }
    }
    return combined.slice(0, 15);
  } catch (err) {
    console.error("Error searching SIP schemes:", err);
    return matchedPresets;
  }
}

// ─── Real REIT & InvIT Search (Curated Listed Indian/Global + Market Search) ─
export async function searchREITs(query: string) {
  const { userId } = await auth();
  if (!userId) return [];
  const q = (query || "").trim().toLowerCase();

  if (!q) {
    return LISTED_REITS_AND_INVITS;
  }

  const matchedCurated = LISTED_REITS_AND_INVITS.filter(
    (r) =>
      r.name.toLowerCase().includes(q) ||
      r.symbol.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q)
  );

  if (matchedCurated.length >= 2 && q.length < 5) {
    return matchedCurated;
  }

  try {
    const stocks = await searchStocks(query);
    const reitStocks = stocks
      .filter((s) => {
        const lower = `${s.name} ${s.category || ""}`.toLowerCase();
        return (
          lower.includes("reit") ||
          lower.includes("invit") ||
          lower.includes("trust") ||
          lower.includes("real estate") ||
          lower.includes("property")
        );
      })
      .map((s) => ({
        name: s.name,
        symbol: s.symbol,
        exchange: (s.exchange?.toUpperCase().includes("BSE")
          ? "BSE"
          : s.exchange?.toUpperCase().includes("NSE")
          ? "NSE"
          : "NYSE") as any,
        category: s.category || "Real Estate Investment Trust",
        defaultPrice: 100,
        distributionYield: 6.0,
        description: `${s.exchange || "Exchange"} Listed Real Estate Trust`,
      }));

    const seen = new Set(matchedCurated.map((c) => c.symbol));
    const combined = [...matchedCurated];
    for (const r of reitStocks) {
      if (!seen.has(r.symbol)) {
        seen.add(r.symbol);
        combined.push(r);
      }
    }
    return combined.slice(0, 12);
  } catch {
    return matchedCurated;
  }
}

// ─── Fetch Live Quote for Asset ─────────────────────────────────────────────
export async function fetchLiveQuote(
  symbol: string,
  assetType: "MUTUAL_FUND" | "STOCK",
  name?: string
) {
  const { userId } = await auth();
  if (!userId) return null;

  try {
    if (assetType === "MUTUAL_FUND") {
      return await getMutualFundQuote(symbol, name);
    } else {
      return await getStockQuote(symbol);
    }
  } catch (err) {
    console.error("Error fetching live quote:", err);
    return null;
  }
}

// ─── Live Precious Metal Rates Action (Gold & Silver Spot in INR / Gram) ────
export async function getLivePreciousMetalRates(): Promise<PreciousMetalRates> {
  return fetchLivePreciousMetalRates();
}

// ─── Fetch Active Holdings for Direct Transaction Mapping ───────────────────
export async function getNetWorthHoldingsForTransaction() {
  const user = await getAuthenticatedUser();

  const [dbSips, dbLiabilities] = await Promise.all([
    db.sIP.findMany({
      where: { userId: user.id, isActive: true },
      orderBy: { schemeName: "asc" },
    }),
    db.liability.findMany({
      where: { userId: user.id },
      orderBy: { lenderName: "asc" },
    }),
  ]);

  return {
    sips: dbSips.map((s) => ({
      id: s.id,
      schemeName: s.schemeName,
      schemeCode: s.schemeCode,
      monthlyAmount: Number(s.monthlyAmount),
      currentNAV: s.currentNAV ? Number(s.currentNAV) : 0,
      totalUnitsHeld: s.totalUnitsHeld ? Number(s.totalUnitsHeld) : 0,
      totalInvested: Number(s.totalInvested),
    })),
    liabilities: dbLiabilities
      .filter((l) => Number(l.principalRemaining) > 0)
      .map((l) => ({
        id: l.id,
        lenderName: l.lenderName,
        liabilityType: l.liabilityType,
        principalRemaining: Number(l.principalRemaining),
        originalPrincipal: l.originalPrincipal ? Number(l.originalPrincipal) : null,
        interestRate: Number(l.interestRate),
        monthlyEMI: Number(l.monthlyEMI),
        remainingTenureMonths: l.remainingTenureMonths,
      })),
  };
}

// ─── Fetch Currently Invested Mutual Funds for SIP Selection ───────────────
export async function getUserInvestedFunds() {
  const user = await getAuthenticatedUser();
  const holdings = await db.investment.findMany({
    where: {
      userId: user.id,
      assetType: "MUTUAL_FUND",
    },
    orderBy: { updatedAt: "desc" },
  });

  return holdings.map((h) => {
    const units = Number(h.units);
    const buyPrice = Number(h.buyPrice);
    const currentPrice = Number(h.currentPrice);
    const invested = units * buyPrice;
    const currentVal = units * currentPrice;

    return {
      id: h.id,
      name: h.name,
      symbol: h.symbol,
      units,
      buyPrice,
      currentPrice,
      investedAmount: invested,
      currentValue: currentVal,
      category: h.category || "Mutual Fund",
      folioOrAccount: h.folioOrAccount,
      isInvested: true,
    };
  });
}
