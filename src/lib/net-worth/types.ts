// ─── Net Worth Tracker — TypeScript Interfaces ───────────────────────────────

export type FixedDepositType = "FD" | "RD";
export type CompoundingFrequency = "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "ANNUALLY";
export type BondType = "CORPORATE" | "GOVERNMENT" | "MUNICIPAL";
export type CouponFrequency = "MONTHLY" | "QUARTERLY" | "SEMI_ANNUALLY" | "ANNUALLY" | "ZERO_COUPON";
export type GoldType = "PHYSICAL" | "DIGITAL" | "SOVEREIGN_GOLD_BOND" | "ETF";
export type RetirementAccountType = "EPF" | "PPF" | "NPS" | "VPF";
export type LiabilityType =
  | "HOME_LOAN"
  | "AUTO_LOAN"
  | "PERSONAL_LOAN"
  | "CREDIT_CARD"
  | "EDUCATION_LOAN"
  | "OTHER";

// ─── Asset Interfaces ─────────────────────────────────────────────────────────

export interface FixedDeposit {
  id: string;
  fdType: FixedDepositType;
  bankName: string;
  principalAmount: number;
  interestRate: number;       // e.g. 7.5 = 7.5%
  compoundingFreq: CompoundingFrequency;
  tenureMonths: number;
  startDate: string;          // ISO string
  maturityDate: string;       // ISO string
  maturityValue: number;
  currentValue: number;
  monthlyInstallment?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface Bond {
  id: string;
  name: string;
  bondType: BondType;
  isin?: string | null;
  faceValue: number;
  couponRate: number;         // e.g. 7.26 = 7.26%
  couponFrequency: CouponFrequency;
  purchasePrice: number;
  quantity: number;
  maturityYear: number;
  currentPrice?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface SIP {
  id: string;
  schemeName: string;
  schemeCode?: string | null;
  monthlyAmount: number;
  startDate: string;
  currentNAV?: number | null;
  totalUnitsHeld?: number | null;
  totalInvested: number;
  currentValue?: number | null;
  stepUpRate?: number | null;
  expectedReturn?: number | null;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface REIT {
  id: string;
  name: string;
  symbol?: string | null;
  exchange?: string | null;
  units: number;
  purchasePrice: number;
  currentPrice: number;
  distributionYield?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export type PropertyType = "PLOT" | "SELF_OCCUPIED" | "RENTAL" | "COMMERCIAL";

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  PLOT: "Plot / Land",
  SELF_OCCUPIED: "Staying Home (Self-Occupied)",
  RENTAL: "Rental Property",
  COMMERCIAL: "Commercial Space",
};

export interface RealEstate {
  id: string;
  name: string;
  propertyType: PropertyType;
  location?: string | null;
  areaSqFt?: number | null;
  purchasePrice: number;
  purchaseDate: string;
  appreciationRate: number;
  currentValuation: number;
  isRental: boolean;
  monthlyRent?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface GoldHolding {
  id: string;
  goldType: GoldType;
  weightGrams?: number | null;
  units?: number | null;
  purchasePrice: number;
  currentSpotRate: number;
  purity?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface RetirementContribution {
  id: string;
  retirementAccountId: string;
  date: string;
  monthYear: string;
  employeeShare: number;
  employerShare: number;
  totalAmount: number;
  source?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface RetirementAccount {
  id: string;
  accountType: RetirementAccountType;
  employeeContribution: number; // Monthly employee contribution
  employerContribution?: number | null; // Monthly employer contribution
  interestRate: number;
  currentCorpus: number;
  startDate?: string | null;
  accountNumber?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  contributions?: RetirementContribution[];
}

export interface Liability {
  id: string;
  liabilityType: LiabilityType;
  lenderName: string;
  principalRemaining: number;
  originalPrincipal?: number | null;
  interestRate: number;
  monthlyEMI: number;
  remainingTenureMonths?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

// ─── Existing Investment (from DB) ───────────────────────────────────────────

export interface InvestmentHolding {
  id: string;
  name: string;
  symbol: string;
  assetType: "MUTUAL_FUND" | "STOCK" | "ETF" | "CRYPTO" | "GOLD";
  units: number;
  buyPrice: number;
  currentPrice: number;
  currentValue: number;
  investedAmount: number;
  totalReturn: number;
  returnPercent: number;
  dayChange: number;
  dayChangePercent: number;
  category?: string | null;
  folioOrAccount?: string | null;
}

// ─── Summary & Chart Types ───────────────────────────────────────────────────

export interface AllocationSlice {
  name: string;
  category: string;
  value: number;       // current market value in ₹
  invested?: number;   // cost basis in ₹
  pnl?: number;        // unrealized profit / loss in ₹
  pnlPercent?: number; // return %
  percentage: number;  // % of total assets
  color: string;
  href?: string;       // direct link to dedicated view
}

export interface AssetClassBreakdownItem {
  id: string;
  name: string;
  category: string;
  typeBadge: string;
  typeBadgeColor: string;
  currentValue: number;
  investedAmount: number;
  pnl: number;
  pnlPercent: number;
  percentage: number;
  color: string;
  count: number;
  href: string;
  isPhysicalCommodity?: boolean;
  isPaperCommodity?: boolean;
}

export interface NetWorthSummary {
  // Totals
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;

  // Asset breakdown
  totalInvested: number;       // cost basis of all market investments
  totalCurrentValue: number;   // current market value of all investments
  totalPnL: number;            // unrealised gain / loss
  totalPnLPercent: number;

  // Liquidity
  liquidAssets: number;        // investments + gold + REIT (market-tradeable)
  illiquidAssets: number;      // FD, Bonds, Retirement (locked / illiquid)

  // Granular asset class breakdown
  directStocksValue: number;       // Direct equity stocks
  mutualFundsValue: number;        // Equity, hybrid & debt MFs/ETFs
  goldSilverFundsValue: number;    // Gold & Silver MFs / ETFs / FoFs
  physicalGoldValue: number;       // Physical gold, coins, bars, bullion
  fdValue: number;                 // Fixed & recurring deposits
  bondValue: number;               // Bonds & G-Secs
  sipValue: number;                // Systematic Investment Plans
  realEstateValue: number;         // REITs & InvITs (Paper Securities)
  physicalRealEstateValue: number; // Physical Real Estate (Plots, Homes, Commercial)
  physicalRealEstateInvested: number;
  physicalRealEstateRentalIncome: number;
  retirementValue: number;         // EPF, PPF, NPS

  // Legacy aggregated groupings
  equitiesValue: number;           // stocks + MFs + ETFs + SIPs
  fixedIncomeValue: number;        // FDs + RDs + Bonds
  goldValue: number;               // All gold (physical + paper)

  // Counts
  fdCount: number;
  bondCount: number;
  sipCount: number;
  reitCount: number;
  physicalRealEstateCount: number;
  goldCount: number;
  retirementCount: number;
  liabilityCount: number;

  // Raw arrays (serialized from Prisma)
  fixedDeposits: FixedDeposit[];
  bonds: Bond[];
  sips: SIP[];
  reits: REIT[];
  realEstates: RealEstate[];
  goldHoldings: GoldHolding[];
  retirementAccounts: RetirementAccount[];
  liabilities: Liability[];
  investmentHoldings: InvestmentHolding[];

  // Allocation slices for donut chart
  allocation: AllocationSlice[];

  // Full asset class matrix across all classes
  assetBreakdown: AssetClassBreakdownItem[];
}

export interface NetWorthChartPoint {
  month: string;   // "Sep '25"
  netWorth: number;
  assets: number;
  liabilities: number;
}

// ─── Form Input Types ────────────────────────────────────────────────────────

export type AssetCategory =
  | "FIXED_DEPOSIT"
  | "BOND"
  | "SIP"
  | "REIT"
  | "REAL_ESTATE"
  | "GOLD"
  | "RETIREMENT"
  | "LIABILITY";

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  FIXED_DEPOSIT: "Fixed Deposit / RD",
  BOND: "Bond / Govt Security",
  SIP: "SIP",
  REIT: "REITs & InvITs",
  REAL_ESTATE: "Physical Real Estate",
  GOLD: "Physical Gold & Commodities",
  RETIREMENT: "Retirement (EPF/PPF/NPS)",
  LIABILITY: "Loan / Liability",
};

