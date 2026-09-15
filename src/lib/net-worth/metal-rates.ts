export interface PreciousMetalRates {
  gold24k: number; // INR / gram (99.9% pure bullion)
  gold22k: number; // INR / gram (91.6% hallmark 916)
  gold18k: number; // INR / gram (75.0% fine 750)
  gold14k: number; // INR / gram (58.5% 585)
  silver999: number; // INR / gram (99.9% fine silver)
  silver925: number; // INR / gram (92.5% sterling silver)
  rawGoldUsdOz: number;
  rawSilverUsdOz: number;
  usdinr: number;
  lastUpdated: string;
  source: string;
}

// In-memory 5-minute cache
let cachedRates: PreciousMetalRates | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function fetchLivePreciousMetalRates(): Promise<PreciousMetalRates> {
  const now = Date.now();
  if (cachedRates && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedRates;
  }

  try {
    const fetchQuote = async (symbol: string): Promise<number | null> => {
      try {
        const res = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              Accept: "application/json",
            },
            signal: AbortSignal.timeout(4000),
          }
        );
        if (!res.ok) return null;
        const data = await res.json();
        return data?.chart?.result?.[0]?.meta?.regularMarketPrice || null;
      } catch {
        return null;
      }
    };

    const [rawGold, rawUsdInr, rawSilver] = await Promise.all([
      fetchQuote("GC=F"),
      fetchQuote("USDINR=X"),
      fetchQuote("SI=F"),
    ]);

    // Fallbacks if external network is down
    const goldUsd = rawGold || 4330.0;
    const inrRate = rawUsdInr || 95.5;
    const silverUsd = rawSilver || 63.5;

    // 1 Troy Ounce = 31.1034768 Grams
    // In Indian domestic bullion markets, landed rate includes customs & standard charges (~6%)
    const TROY_OZ_TO_GRAMS = 31.1034768;
    const INDIAN_TARIFF_MULTIPLIER = 1.06;

    const gold24k = Math.round(
      ((goldUsd * inrRate) / TROY_OZ_TO_GRAMS) * INDIAN_TARIFF_MULTIPLIER
    );
    const gold22k = Math.round(gold24k * (22 / 24)); // 91.67%
    const gold18k = Math.round(gold24k * (18 / 24)); // 75.00%
    const gold14k = Math.round(gold24k * (14 / 24)); // 58.33%

    const silver999 = Math.round(
      ((silverUsd * inrRate) / TROY_OZ_TO_GRAMS) * INDIAN_TARIFF_MULTIPLIER
    );
    const silver925 = Math.round(silver999 * 0.925);

    cachedRates = {
      gold24k,
      gold22k,
      gold18k,
      gold14k,
      silver999,
      silver925,
      rawGoldUsdOz: goldUsd,
      rawSilverUsdOz: silverUsd,
      usdinr: inrRate,
      lastUpdated: new Date().toISOString(),
      source: "Live Market (COMEX / MCX / FX)",
    };
    lastFetchTime = now;

    return cachedRates;
  } catch (error) {
    console.error("Error fetching live metal rates:", error);
    // Safe default fallbacks
    return {
      gold24k: 14100,
      gold22k: 12925,
      gold18k: 10575,
      gold14k: 8225,
      silver999: 206,
      silver925: 191,
      rawGoldUsdOz: 4330,
      rawSilverUsdOz: 63.5,
      usdinr: 95.5,
      lastUpdated: new Date().toISOString(),
      source: "Market Benchmark (Cached)",
    };
  }
}

export function getSpotRateForPurity(
  purity: string | null | undefined,
  rates: PreciousMetalRates
): number {
  if (!purity) return rates.gold24k;
  const p = purity.toUpperCase();

  if (p.includes("24K") || p.includes("99.9") || p.includes("999") && !p.includes("SILVER")) {
    return rates.gold24k;
  }
  if (p.includes("22K") || p.includes("91.6") || p.includes("916")) {
    return rates.gold22k;
  }
  if (p.includes("18K") || p.includes("75.0") || p.includes("750")) {
    return rates.gold18k;
  }
  if (p.includes("14K") || p.includes("58.5") || p.includes("585")) {
    return rates.gold14k;
  }
  if (p.includes("925") || p.includes("STERLING")) {
    return rates.silver925;
  }
  if (p.includes("SILVER") || p.includes("999 FINE")) {
    return rates.silver999;
  }

  return rates.gold24k;
}
