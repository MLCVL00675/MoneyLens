/**
 * Live Market API Client
 * - Indian Mutual Funds: Free official AMFI data via mfapi.in (15,000+ schemes)
 * - Stocks & ETFs: Free live market quotes for NSE (.NS), BSE (.BO), US and Global equities
 */

export interface MarketSearchResult {
  symbol: string; // AMFI Scheme Code or Stock Ticker (e.g. "122639" or "RELIANCE.NS")
  name: string;
  assetType: "MUTUAL_FUND" | "STOCK" | "ETF";
  exchange?: string;
  category?: string;
  price?: number;
}

export interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  previousClose?: number;
  change?: number;
  changePercent?: number;
  currency: string;
  exchange?: string;
  category?: string;
  lastUpdated?: string;
}

// ─── Indian Mutual Funds (AMFI via mfapi.in) ──────────────────────────────────

export async function searchMutualFunds(query: string): Promise<MarketSearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const res = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(query.trim())}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.slice(0, 10).map((item: any) => ({
      symbol: String(item.schemeCode),
      name: item.schemeName,
      assetType: "MUTUAL_FUND",
      exchange: "AMFI",
    }));
  } catch (error) {
    console.error("Error searching mutual funds:", error);
    return [];
  }
}

export async function getMutualFundQuote(schemeCode: string | number): Promise<MarketQuote | null> {
  try {
    const res = await fetch(`https://api.mfapi.in/mf/${schemeCode}/latest`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;
    const data = await res.json();

    if (data.status !== "SUCCESS" || !data.data?.[0]?.nav) {
      return null;
    }

    const currentNav = parseFloat(data.data[0].nav);
    const navDate = data.data[0].date;
    const meta = data.meta || {};

    return {
      symbol: String(schemeCode),
      name: meta.scheme_name || `MF Scheme ${schemeCode}`,
      price: currentNav,
      previousClose: currentNav,
      changePercent: 0,
      currency: "INR",
      exchange: "AMFI",
      category: meta.scheme_category || meta.scheme_type || "Mutual Fund",
      lastUpdated: navDate,
    };
  } catch (error) {
    console.error(`Error fetching MF quote for ${schemeCode}:`, error);
    return null;
  }
}

// ─── Stocks & ETFs (Yahoo Finance) ───────────────────────────────────────────

export async function searchStocks(query: string): Promise<MarketSearchResult[]> {
  if (!query || query.trim().length < 1) return [];

  try {
    const q = query.trim().toUpperCase();
    const res = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`,
      {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!res.ok) return [];
    const data = await res.json();
    const quotes = data.quotes || [];

    return quotes
      .filter((q: any) => q.quoteType === "EQUITY" || q.quoteType === "ETF")
      .map((q: any) => ({
        symbol: q.symbol,
        name: q.longname || q.shortname || q.symbol,
        assetType: q.quoteType === "ETF" ? ("ETF" as const) : ("STOCK" as const),
        exchange: q.exchange || q.fullExchangeName,
        category: q.sector || q.industry,
      }));
  } catch (error) {
    console.error("Error searching stocks:", error);
    return [];
  }
}

export async function getStockQuote(symbol: string): Promise<MarketQuote | null> {
  try {
    const sym = symbol.trim().toUpperCase();
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`,
      {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;

    if (!meta || meta.regularMarketPrice === undefined) {
      return null;
    }

    const price = meta.regularMarketPrice;
    const previousClose = meta.chartPreviousClose || meta.previousClose || price;
    const change = price - previousClose;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

    return {
      symbol: meta.symbol || sym,
      name: meta.longName || meta.shortName || sym,
      price,
      previousClose,
      change,
      changePercent,
      currency: meta.currency || "INR",
      exchange: meta.fullExchangeName || meta.exchangeName || "NSE",
      category: meta.instrumentType,
    };
  } catch (error) {
    console.error(`Error fetching stock quote for ${symbol}:`, error);
    return null;
  }
}

// ─── Unified Search & Quote Fetcher ──────────────────────────────────────────

export async function searchAssets(query: string): Promise<MarketSearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const [mfResults, stockResults] = await Promise.allSettled([
      searchMutualFunds(query),
      searchStocks(query),
    ]);

    const mfs = mfResults.status === "fulfilled" ? mfResults.value : [];
    const stocks = stockResults.status === "fulfilled" ? stockResults.value : [];

    return [...mfs, ...stocks];
  } catch (error) {
    console.error("Error in searchAssets:", error);
    return [];
  }
}

export async function getAssetLiveQuote(symbol: string, assetType: "MUTUAL_FUND" | "STOCK" | "ETF" | string): Promise<MarketQuote | null> {
  try {
    if (assetType === "MUTUAL_FUND" || /^\d+$/.test(symbol.trim())) {
      return await getMutualFundQuote(symbol);
    }
    return await getStockQuote(symbol);
  } catch (error) {
    console.error(`Error in getAssetLiveQuote for ${symbol}:`, error);
    return null;
  }
}
