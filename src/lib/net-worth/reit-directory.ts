export interface REITAsset {
  name: string;
  symbol: string;
  exchange: "NSE" | "BSE" | "NYSE" | "NASDAQ";
  category: string;
  defaultPrice: number;
  distributionYield: number; // in %
  description: string;
}

export const LISTED_REITS_AND_INVITS: REITAsset[] = [
  {
    name: "Embassy Office Parks REIT",
    symbol: "EMBASSY.NS",
    exchange: "NSE",
    category: "Commercial Office REIT",
    defaultPrice: 388.5,
    distributionYield: 6.8,
    description: "India's 1st listed REIT with prime Grade-A tech & office parks in Bangalore, Mumbai, Pune, and NCR.",
  },
  {
    name: "Mindspace Business Parks REIT",
    symbol: "MINDSPACE.NS",
    exchange: "NSE",
    category: "Commercial Office REIT",
    defaultPrice: 348.0,
    distributionYield: 6.5,
    description: "Grade-A institutional office spaces across Mumbai Region, Hyderabad, Pune, and Chennai.",
  },
  {
    name: "Brookfield India Real Estate Trust",
    symbol: "BIRET.NS",
    exchange: "NSE",
    category: "Commercial Office REIT",
    defaultPrice: 262.0,
    distributionYield: 8.1,
    description: "Campus-format commercial office parks backed by Brookfield Asset Management.",
  },
  {
    name: "Nexus Select Trust REIT",
    symbol: "NEXUS.NS",
    exchange: "NSE",
    category: "Retail Mall REIT",
    defaultPrice: 142.5,
    distributionYield: 7.2,
    description: "India's premier consumption center & retail mall REIT (Select CITYWALK, Nexus Malls).",
  },
  {
    name: "PowerGrid Infrastructure Investment Trust",
    symbol: "PGINVIT.NS",
    exchange: "NSE",
    category: "Power Transmission InvIT",
    defaultPrice: 91.5,
    distributionYield: 11.2,
    description: "Sovereign-backed interstate power transmission lines sponsored by Power Grid Corp of India.",
  },
  {
    name: "India Grid Trust (IndiGrid)",
    symbol: "INDIGRID.NS",
    exchange: "NSE",
    category: "Power & Renewables InvIT",
    defaultPrice: 136.0,
    distributionYield: 10.4,
    description: "India's first infrastructure investment trust in the power transmission and solar sector.",
  },
  {
    name: "IRB InvIT Fund",
    symbol: "IRBINVIT.NS",
    exchange: "NSE",
    category: "Highways & Toll Roads InvIT",
    defaultPrice: 68.2,
    distributionYield: 11.8,
    description: "Operates and maintains toll-road concessions across high-traffic Golden Quadrilateral corridors.",
  },
  {
    name: "Bharat Highways InvIT",
    symbol: "BHARATINV.NS",
    exchange: "NSE",
    category: "Road Infrastructure InvIT",
    defaultPrice: 104.0,
    distributionYield: 9.8,
    description: "Hybrid annuity model (HAM) national highway projects with NHAI annuity cash flows.",
  },
  {
    name: "Realty Income Corp (The Monthly Dividend Co)",
    symbol: "O",
    exchange: "NYSE",
    category: "Global Retail REIT",
    defaultPrice: 4600.0,
    distributionYield: 5.6,
    description: "S&P 500 member commercial REIT that pays monthly dividends backed by long-term net leases.",
  },
  {
    name: "Prologis Inc",
    symbol: "PLD",
    exchange: "NYSE",
    category: "Global Logistics REIT",
    defaultPrice: 9800.0,
    distributionYield: 3.4,
    description: "World leader in logistics real estate with modern B2B warehouses and distribution centers.",
  },
  {
    name: "American Tower Corp",
    symbol: "AMT",
    exchange: "NYSE",
    category: "Global Telecom Tower REIT",
    defaultPrice: 16500.0,
    distributionYield: 3.2,
    description: "Global telecommunications infrastructure and mobile cell tower network operator.",
  },
  {
    name: "Simon Property Group",
    symbol: "SPG",
    exchange: "NYSE",
    category: "Global Retail REIT",
    defaultPrice: 13200.0,
    distributionYield: 5.2,
    description: "Premier shopping, dining, entertainment and mixed-use destination destinations worldwide.",
  },
];

export interface PopularSIPScheme {
  name: string;
  schemeCode: string;
  fundHouse: string;
  category: string;
  defaultReturn: number;
}

export const POPULAR_SIP_SCHEMES: PopularSIPScheme[] = [
  {
    name: "Parag Parikh Flexi Cap Fund - Direct Plan - Growth",
    schemeCode: "122639",
    fundHouse: "PPFAS Mutual Fund",
    category: "Equity: Flexi Cap",
    defaultReturn: 16.5,
  },
  {
    name: "Mirae Asset Large & Midcap Fund - Direct Plan - Growth",
    schemeCode: "118834",
    fundHouse: "Mirae Asset Mutual Fund",
    category: "Equity: Large & Mid Cap",
    defaultReturn: 15.2,
  },
  {
    name: "SBI Bluechip Fund - Direct Plan - Growth",
    schemeCode: "119598",
    fundHouse: "SBI Mutual Fund",
    category: "Equity: Large Cap",
    defaultReturn: 13.8,
  },
  {
    name: "Nippon India Small Cap Fund - Direct Plan - Growth",
    schemeCode: "118778",
    fundHouse: "Nippon India Mutual Fund",
    category: "Equity: Small Cap",
    defaultReturn: 19.4,
  },
  {
    name: "HDFC Mid-Cap Opportunities Fund - Direct Plan - Growth",
    schemeCode: "118989",
    fundHouse: "HDFC Mutual Fund",
    category: "Equity: Mid Cap",
    defaultReturn: 17.1,
  },
  {
    name: "Quant Active Fund - Direct Plan - Growth",
    schemeCode: "120828",
    fundHouse: "Quant Mutual Fund",
    category: "Equity: Multi Cap",
    defaultReturn: 18.2,
  },
  {
    name: "SBI Long Term Equity Fund (Tax Saver ELSS) - Direct Plan - Growth",
    schemeCode: "119717",
    fundHouse: "SBI Mutual Fund",
    category: "Equity: ELSS (80C Tax Saver)",
    defaultReturn: 15.5,
  },
  {
    name: "UTI Nifty 50 Index Fund - Direct Plan - Growth",
    schemeCode: "120716",
    fundHouse: "UTI Mutual Fund",
    category: "Index: Nifty 50",
    defaultReturn: 13.2,
  },
  {
    name: "Tata Digital India Fund - Direct Plan - Growth",
    schemeCode: "135781",
    fundHouse: "Tata Mutual Fund",
    category: "Sectoral: Technology",
    defaultReturn: 17.8,
  },
  {
    name: "Kotak Emerging Equity Fund - Direct Plan - Growth",
    schemeCode: "120166",
    fundHouse: "Kotak Mahindra Mutual Fund",
    category: "Equity: Mid Cap",
    defaultReturn: 16.0,
  },
];
