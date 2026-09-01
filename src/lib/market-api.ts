/**
 * Live Market API Client
 * - Indian Mutual Funds: AMFI Official Master NAV Feed (18,000+ schemes) with ISIN & Scheme Code indexing + mfapi.in historical NAV fallback
 * - Stocks & ETFs: Live market quotes for NSE (.NS), BSE (.BO), US and Global equities via Yahoo Finance
 */

export interface MarketSearchResult {
  symbol: string; // AMFI Scheme Code, ISIN, or Stock Ticker (e.g. "122639", "INF247L01BY3", or "RELIANCE.NS")
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

// ─── AMFI Official Master List Cache ──────────────────────────────────────────

interface AmfiSchemeEntry {
  schemeCode: string;
  isinGrowth?: string;
  isinReinv?: string;
  name: string;
  price: number;
  date: string;
  category?: string;
}

let amfiCache: {
  byCode: Map<string, AmfiSchemeEntry>;
  byIsin: Map<string, AmfiSchemeEntry>;
  list: AmfiSchemeEntry[];
} | null = null;
let amfiCacheTimestamp = 0;
const AMFI_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes TTL

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export async function getAmfiMasterData(): Promise<{
  byCode: Map<string, AmfiSchemeEntry>;
  byIsin: Map<string, AmfiSchemeEntry>;
  list: AmfiSchemeEntry[];
}> {
  const now = Date.now();
  if (amfiCache && now - amfiCacheTimestamp < AMFI_CACHE_TTL_MS) {
    return amfiCache;
  }

  try {
    const res = await fetch("https://www.amfiindia.com/spages/NAVAll.txt", {
      headers: { "User-Agent": BROWSER_USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      if (amfiCache) return amfiCache;
      throw new Error(`Failed to fetch AMFI NAVAll.txt: HTTP ${res.status}`);
    }

    const text = await res.text();
    const lines = text.split(/\r?\n/);

    const byCode = new Map<string, AmfiSchemeEntry>();
    const byIsin = new Map<string, AmfiSchemeEntry>();
    const list: AmfiSchemeEntry[] = [];

    let currentCategory = "Mutual Fund";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Detect section category headers in NAVAll.txt
      if (!trimmed.includes(";")) {
        if (trimmed.startsWith("Open Ended Schemes") || trimmed.startsWith("Close Ended Schemes")) {
          currentCategory = trimmed.replace(/\r/g, "");
        }
        continue;
      }

      const parts = trimmed.split(";");
      if (parts.length < 5) continue;

      const schemeCode = parts[0]?.trim();
      const isinGrowth = parts[1]?.trim();
      const isinReinv = parts[2]?.trim();
      const schemeName = parts[3]?.trim();
      const navStr = parts[parts.length - 2]?.trim();
      const dateStr = parts[parts.length - 1]?.trim();

      const nav = parseFloat(navStr);
      if (!nav || isNaN(nav)) continue;

      const entry: AmfiSchemeEntry = {
        schemeCode,
        isinGrowth: isinGrowth && isinGrowth !== "-" ? isinGrowth : undefined,
        isinReinv: isinReinv && isinReinv !== "-" ? isinReinv : undefined,
        name: schemeName || `Scheme ${schemeCode}`,
        price: nav,
        date: dateStr,
        category: currentCategory,
      };

      if (schemeCode) byCode.set(schemeCode, entry);
      if (isinGrowth && isinGrowth !== "-") byIsin.set(isinGrowth.toUpperCase(), entry);
      if (isinReinv && isinReinv !== "-") byIsin.set(isinReinv.toUpperCase(), entry);
      list.push(entry);
    }

    amfiCache = { byCode, byIsin, list };
    amfiCacheTimestamp = now;
    return amfiCache;
  } catch (error) {
    console.error("Error updating AMFI master data:", error);
    if (amfiCache) return amfiCache;
    return { byCode: new Map(), byIsin: new Map(), list: [] };
  }
}

// ─── Indian Mutual Funds Quote & Search ───────────────────────────────────────

export async function getMutualFundQuote(
  symbolOrCode: string | number,
  fallbackName?: string
): Promise<MarketQuote | null> {
  const clean = String(symbolOrCode || "").trim();
  if (!clean && !fallbackName) return null;

  try {
    const amfi = await getAmfiMasterData();

    // 1. Resolve through AMFI Master Database (by ISIN or AMFI Scheme Code)
    let entry: AmfiSchemeEntry | undefined;
    if (clean) {
      entry = amfi.byIsin.get(clean.toUpperCase()) || amfi.byCode.get(clean);
    }

    // 2. If not found by symbol, try matching by scheme name
    if (!entry && fallbackName) {
      const searchName = fallbackName.toLowerCase().replace(/[^a-z0-9]/g, " ").trim();
      entry = amfi.list.find((item) => {
        const itemName = item.name.toLowerCase();
        return itemName.includes(searchName) || searchName.includes(itemName);
      });
    }

    const schemeCode = entry?.schemeCode || (/^\d+$/.test(clean) ? clean : null);

    // 3. If we have a numeric AMFI scheme code, query mfapi.in to get BOTH latest NAV and previous close (1D change)
    if (schemeCode) {
      try {
        const res = await fetch(`https://api.mfapi.in/mf/${schemeCode}`, {
          headers: { "User-Agent": BROWSER_USER_AGENT },
          signal: AbortSignal.timeout(4000),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.status === "SUCCESS" && Array.isArray(json.data) && json.data.length > 0) {
            const currentNav = parseFloat(json.data[0].nav);
            const prevNav =
              json.data.length > 1
                ? parseFloat(json.data[1].nav)
                : entry?.price || currentNav;

            const change = currentNav - prevNav;
            const changePercent = prevNav > 0 ? (change / prevNav) * 100 : 0;
            const meta = json.meta || {};

            return {
              symbol: clean || schemeCode,
              name: meta.scheme_name || entry?.name || fallbackName || `MF Scheme ${schemeCode}`,
              price: currentNav,
              previousClose: prevNav,
              change,
              changePercent,
              currency: "INR",
              exchange: "AMFI",
              category: meta.scheme_category || meta.scheme_type || entry?.category || "Mutual Fund",
              lastUpdated: json.data[0].date,
            };
          }
        }
      } catch {
        // mfapi failed or timed out — fall through to AMFI master quote
      }
    }

    // 4. Fallback to AMFI master list quote if available
    if (entry) {
      return {
        symbol: clean || entry.schemeCode,
        name: entry.name || fallbackName || clean,
        price: entry.price,
        previousClose: entry.price,
        change: 0,
        changePercent: 0,
        currency: "INR",
        exchange: "AMFI",
        category: entry.category || "Mutual Fund",
        lastUpdated: entry.date,
      };
    }

    return null;
  } catch (error) {
    console.error(`Error fetching MF quote for ${symbolOrCode}:`, error);
    return null;
  }
}

export async function searchMutualFunds(query: string): Promise<MarketSearchResult[]> {
  if (!query || query.trim().length < 2) return [];
  const q = query.trim().toUpperCase();

  const results: MarketSearchResult[] = [];
  const seenSymbols = new Set<string>();

  try {
    const amfi = await getAmfiMasterData();

    // Check direct ISIN match
    const isinMatch = amfi.byIsin.get(q);
    if (isinMatch) {
      seenSymbols.add(isinMatch.schemeCode);
      results.push({
        symbol: isinMatch.isinGrowth || isinMatch.schemeCode,
        name: isinMatch.name,
        assetType: "MUTUAL_FUND",
        exchange: "AMFI",
        category: isinMatch.category,
        price: isinMatch.price,
      });
    }

    // Check direct Scheme Code match
    const codeMatch = amfi.byCode.get(q);
    if (codeMatch && !seenSymbols.has(codeMatch.schemeCode)) {
      seenSymbols.add(codeMatch.schemeCode);
      results.push({
        symbol: codeMatch.schemeCode,
        name: codeMatch.name,
        assetType: "MUTUAL_FUND",
        exchange: "AMFI",
        category: codeMatch.category,
        price: codeMatch.price,
      });
    }

    // Keyword match in AMFI master list
    const qWords = q.toLowerCase().split(/\s+/).filter(Boolean);
    let amfiMatches = 0;
    for (const item of amfi.list) {
      if (seenSymbols.has(item.schemeCode)) continue;
      const lower = item.name.toLowerCase();
      if (qWords.every((w) => lower.includes(w))) {
        seenSymbols.add(item.schemeCode);
        results.push({
          symbol: item.schemeCode,
          name: item.name,
          assetType: "MUTUAL_FUND",
          exchange: "AMFI",
          category: item.category,
          price: item.price,
        });
        amfiMatches++;
        if (amfiMatches >= 8) break;
      }
    }

    // Also supplement with mfapi search API if needed
    if (results.length < 5) {
      try {
        const res = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(query.trim())}`, {
          headers: { "User-Agent": BROWSER_USER_AGENT },
          signal: AbortSignal.timeout(3000),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            for (const item of data.slice(0, 10)) {
              const code = String(item.schemeCode);
              if (!seenSymbols.has(code)) {
                seenSymbols.add(code);
                results.push({
                  symbol: code,
                  name: item.schemeName,
                  assetType: "MUTUAL_FUND",
                  exchange: "AMFI",
                });
              }
            }
          }
        }
      } catch {
        // Ignore mfapi search failure
      }
    }

    return results.slice(0, 10);
  } catch (error) {
    console.error("Error searching mutual funds:", error);
    return results;
  }
}

// ─── Stocks & ETFs (Yahoo Finance with Indian Market Support) ──────────────────

export async function searchStocks(query: string): Promise<MarketSearchResult[]> {
  if (!query || query.trim().length < 1) return [];

  try {
    const q = query.trim().toUpperCase();
    const urls = [
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`,
      `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`,
    ];

    for (const url of urls) {
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent": BROWSER_USER_AGENT,
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(4000),
        });

        if (!res.ok) continue;
        const data = await res.json();
        const quotes = data.quotes || [];

        if (quotes.length > 0) {
          return quotes
            .filter((item: any) => item.quoteType === "EQUITY" || item.quoteType === "ETF")
            .map((item: any) => ({
              symbol: item.symbol,
              name: item.longname || item.shortname || item.symbol,
              assetType: item.quoteType === "ETF" ? ("ETF" as const) : ("STOCK" as const),
              exchange: item.exchange || item.fullExchangeName,
              category: item.sector || item.industry,
            }));
        }
      } catch {
        // Try next search endpoint
      }
    }

    return [];
  } catch (error) {
    console.error("Error searching stocks:", error);
    return [];
  }
}

export async function getStockQuote(rawSymbol: string): Promise<MarketQuote | null> {
  const sym = rawSymbol.trim().toUpperCase();
  if (!sym) return null;

  // Generate candidate symbols: for Indian markets, test .NS (NSE) and .BO (BSE) if no dot is present
  const candidates: string[] = [];
  if (sym.includes(".")) {
    candidates.push(sym);
  } else {
    candidates.push(`${sym}.NS`, `${sym}.BO`, sym);
  }

  for (const candidate of candidates) {
    const endpoints = [
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(candidate)}?interval=1d&range=1d`,
      `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(candidate)}?interval=1d&range=1d`,
    ];

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          headers: {
            "User-Agent": BROWSER_USER_AGENT,
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(4000),
        });

        if (!res.ok) continue;
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;

        if (meta && typeof meta.regularMarketPrice === "number" && meta.regularMarketPrice > 0) {
          const price = meta.regularMarketPrice;
          const previousClose = meta.chartPreviousClose || meta.previousClose || price;
          const change = price - previousClose;
          const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

          return {
            symbol: candidate,
            name: meta.longName || meta.shortName || sym,
            price,
            previousClose,
            change,
            changePercent,
            currency: meta.currency || "INR",
            exchange: meta.fullExchangeName || meta.exchangeName || "NSE",
            category: meta.instrumentType || "Stock",
          };
        }
      } catch {
        // Try next endpoint or candidate
      }
    }
  }

  return null;
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

export async function getAssetLiveQuote(
  symbol: string,
  assetType?: "MUTUAL_FUND" | "STOCK" | "ETF" | "CRYPTO" | "GOLD" | string,
  fallbackName?: string
): Promise<MarketQuote | null> {
  const cleanSymbol = (symbol || "").trim();
  if (!cleanSymbol && !fallbackName) return null;

  try {
    const isMutualFundType =
      assetType === "MUTUAL_FUND" ||
      /^INF[A-Z0-9]{9}$/i.test(cleanSymbol) ||
      (/^\d+$/.test(cleanSymbol) && !cleanSymbol.includes("."));

    if (isMutualFundType) {
      const mfQuote = await getMutualFundQuote(cleanSymbol, fallbackName);
      if (mfQuote) return mfQuote;

      // If not an ISIN, try stock as fallback
      if (!/^INF[A-Z0-9]{9}$/i.test(cleanSymbol)) {
        return await getStockQuote(cleanSymbol);
      }
      return null;
    }

    // Default to stock/ETF lookup
    const stockQuote = await getStockQuote(cleanSymbol);
    if (stockQuote) return stockQuote;

    // Fallback to mutual fund if stock lookup found nothing
    return await getMutualFundQuote(cleanSymbol, fallbackName);
  } catch (error) {
    console.error(`Error in getAssetLiveQuote for ${symbol}:`, error);
    return null;
  }
}
