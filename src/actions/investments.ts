"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getCachedUser } from "@/lib/auth-cache";
import { geminiModel } from "@/lib/gemini";
import { getAssetLiveQuote, searchMutualFunds, searchStocks } from "@/lib/market-api";

export interface ParsedHolding {
  name: string;
  symbol: string;
  assetType: "MUTUAL_FUND" | "STOCK" | "ETF" | "CRYPTO" | "GOLD";
  units: number;
  buyPrice: number;
  currentPrice: number;
  folioOrAccount?: string;
  category?: string;
}

// ─── AI Statement Parser (CAMS / KFintech / Zerodha / Groww CAS) ───────────────

export async function parseInvestmentStatement(
  base64Data: string,
  mimeType: string = "application/pdf"
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    const prompt = `You are a financial portfolio data extraction expert specialized in Indian Mutual Fund Consolidated Account Statements (CAMS, KFintech, CDSL, NSDL) and Broker portfolio statements (Zerodha, Groww, AngelOne, Upstox, ICICI Direct).

Analyze this investment statement document/image carefully and extract ALL portfolio holdings (Mutual Funds, Stocks, ETFs).

For each holding, extract:
- "name": Full scheme or company name (e.g. "Parag Parikh Flexi Cap Fund - Direct Plan - Growth", "Reliance Industries Ltd", "Nippon India Small Cap Fund")
- "symbol": Ticker symbol or scheme code if visible, otherwise a clean shortened identifier (e.g. "RELIANCE.NS", "122639", "PPFAS-FLEXI")
- "assetType": Must be one of: "MUTUAL_FUND", "STOCK", "ETF", "GOLD", "CRYPTO"
- "units": Number of units / shares held (positive decimal number, e.g. 154.2045 or 25)
- "buyPrice": Average purchase price / NAV per unit or cost value per unit. If only total cost is given, calculate totalCost / units. If missing, set to 0.
- "currentPrice": Latest NAV or current market price per unit from the statement. If missing, set to buyPrice.
- "folioOrAccount": Folio number or Demat account number if available, else null
- "category": Fund category or sector (e.g. "Equity - Flexi Cap", "Large & Mid Cap", "IT Sector", "ELSS Tax Saver")

Return STRICTLY a valid JSON object in this format, with NO additional text or markdown:
{
  "holdings": [
    {
      "name": "Parag Parikh Flexi Cap Fund - Direct Plan - Growth",
      "symbol": "122639",
      "assetType": "MUTUAL_FUND",
      "units": 520.456,
      "buyPrice": 62.50,
      "currentPrice": 85.20,
      "folioOrAccount": "104829104",
      "category": "Equity - Flexi Cap"
    }
  ]
}

If no holdings are found or the document is unclear, return: {"holdings": []}`;

    const result = await geminiModel.generateContent([
      {
        inlineData: {
          mimeType: mimeType || "application/pdf",
          data: base64Data,
        },
      },
      { text: prompt },
    ]);

    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON structure found in AI response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const holdings: ParsedHolding[] = Array.isArray(parsed.holdings) ? parsed.holdings : [];

    // Filter out invalid items
    const validHoldings = holdings.filter(
      (h) => h.name && typeof h.units === "number" && h.units > 0
    );

    return {
      success: true,
      data: validHoldings,
    };
  } catch (error: any) {
    console.error("Statement parsing error:", error);
    return {
      success: false,
      error: error?.message || "Failed to parse statement. Please try entering holdings manually or upload a clearer file.",
    };
  }
}

// ─── Bulk Import Extracted Holdings ──────────────────────────────────────────

export async function importInvestments(holdings: ParsedHolding[]) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await getCachedUser(userId);
  if (!user) throw new Error("User not found");

  if (!holdings || holdings.length === 0) {
    throw new Error("No holdings provided for import");
  }

  let importedCount = 0;

  for (const h of holdings) {
    if (!h.name || !h.units || h.units <= 0) continue;

    // Check if we can fetch live price to enrich
    let liveQuote = null;
    try {
      if (h.symbol) {
        liveQuote = await getAssetLiveQuote(h.symbol, h.assetType);
      }
    } catch {
      // Ignore lookup failure
    }

    const currentPrice = liveQuote?.price || h.currentPrice || h.buyPrice || 0;
    const previousClose = liveQuote?.previousClose || currentPrice;

    await db.investment.create({
      data: {
        userId: user.id,
        name: h.name.trim(),
        symbol: h.symbol ? h.symbol.trim().toUpperCase() : h.name.trim().substring(0, 20),
        assetType: (h.assetType as any) || "MUTUAL_FUND",
        units: h.units,
        buyPrice: h.buyPrice || currentPrice,
        currentPrice: currentPrice,
        previousClose: previousClose,
        category: h.category || liveQuote?.category || "Other",
        folioOrAccount: h.folioOrAccount || undefined,
        lastPriceUpdate: new Date(),
      },
    });
    importedCount++;
  }

  revalidatePath("/investments");
  revalidatePath("/dashboard");
  return { success: true, count: importedCount };
}

// ─── Get Portfolio Holdings & Summary Analytics ───────────────────────────────

export async function getInvestments() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await getCachedUser(userId);
  if (!user) throw new Error("User not found");

  const holdings = await db.investment.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      account: { select: { id: true, name: true } },
    },
  });

  let totalInvested = 0;
  let totalCurrentValue = 0;
  let totalPreviousDayValue = 0;

  const allocationMap: Record<string, number> = {
    MUTUAL_FUND: 0,
    STOCK: 0,
    ETF: 0,
    GOLD: 0,
    CRYPTO: 0,
  };

  const serializedHoldings = holdings.map((h) => {
    const units = Number(h.units);
    const buyPrice = Number(h.buyPrice);
    const currentPrice = Number(h.currentPrice);
    const previousClose = Number(h.previousClose ?? currentPrice);

    const invested = units * buyPrice;
    const currentVal = units * currentPrice;
    const prevVal = units * previousClose;

    const totalReturn = currentVal - invested;
    const returnPercent = invested > 0 ? (totalReturn / invested) * 100 : 0;

    const dayChange = currentVal - prevVal;
    const dayChangePercent = prevVal > 0 ? (dayChange / prevVal) * 100 : 0;

    totalInvested += invested;
    totalCurrentValue += currentVal;
    totalPreviousDayValue += prevVal;

    const assetKey = h.assetType || "MUTUAL_FUND";
    allocationMap[assetKey] = (allocationMap[assetKey] || 0) + currentVal;

    return {
      id: h.id,
      name: h.name,
      symbol: h.symbol,
      assetType: h.assetType,
      units,
      buyPrice,
      currentPrice,
      previousClose,
      investedAmount: invested,
      currentValue: currentVal,
      totalReturn,
      returnPercent,
      dayChange,
      dayChangePercent,
      category: h.category,
      folioOrAccount: h.folioOrAccount,
      lastPriceUpdate: h.lastPriceUpdate?.toISOString() || null,
      account: h.account,
    };
  });

  const totalReturn = totalCurrentValue - totalInvested;
  const totalReturnPercent = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

  const totalDayChange = totalCurrentValue - totalPreviousDayValue;
  const totalDayChangePercent =
    totalPreviousDayValue > 0 ? (totalDayChange / totalPreviousDayValue) * 100 : 0;

  const assetAllocation = Object.entries(allocationMap)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => ({
      name: key === "MUTUAL_FUND" ? "Mutual Funds" : key === "STOCK" ? "Stocks" : key === "ETF" ? "ETFs" : key,
      type: key,
      value,
      percentage: totalCurrentValue > 0 ? (value / totalCurrentValue) * 100 : 0,
    }));

  return {
    summary: {
      totalInvested,
      totalCurrentValue,
      totalReturn,
      totalReturnPercent,
      totalDayChange,
      totalDayChangePercent,
      holdingCount: holdings.length,
    },
    assetAllocation,
    holdings: serializedHoldings,
  };
}

// ─── Manual Add / Update / Delete ─────────────────────────────────────────────

export async function createInvestment(data: {
  name: string;
  symbol: string;
  assetType: "MUTUAL_FUND" | "STOCK" | "ETF" | "CRYPTO" | "GOLD";
  units: number;
  buyPrice: number;
  currentPrice?: number;
  category?: string;
  folioOrAccount?: string;
  notes?: string;
  accountId?: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await getCachedUser(userId);
  if (!user) throw new Error("User not found");

  if (!data.name || !data.units || data.units <= 0 || !data.buyPrice || data.buyPrice <= 0) {
    throw new Error("Please fill in valid name, units, and buy price");
  }

  // Attempt live quote lookup if currentPrice is not supplied
  let currentPrice = data.currentPrice;
  let previousClose = data.currentPrice;

  if (!currentPrice && data.symbol) {
    try {
      const quote = await getAssetLiveQuote(data.symbol, data.assetType);
      if (quote?.price) {
        currentPrice = quote.price;
        previousClose = quote.previousClose || quote.price;
      }
    } catch {
      // Fallback
    }
  }

  const finalCurrentPrice = currentPrice || data.buyPrice;

  const investment = await db.investment.create({
    data: {
      userId: user.id,
      name: data.name.trim(),
      symbol: data.symbol.trim().toUpperCase(),
      assetType: data.assetType,
      units: data.units,
      buyPrice: data.buyPrice,
      currentPrice: finalCurrentPrice,
      previousClose: previousClose || finalCurrentPrice,
      category: data.category || undefined,
      folioOrAccount: data.folioOrAccount || undefined,
      notes: data.notes || undefined,
      accountId: data.accountId || undefined,
      lastPriceUpdate: new Date(),
    },
  });

  revalidatePath("/investments");
  revalidatePath("/dashboard");
  return { success: true, id: investment.id };
}

export async function updateInvestment(
  id: string,
  data: {
    units?: number;
    buyPrice?: number;
    notes?: string;
    folioOrAccount?: string;
  }
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await getCachedUser(userId);
  if (!user) throw new Error("User not found");

  await db.investment.update({
    where: { id, userId: user.id },
    data: {
      units: data.units !== undefined ? data.units : undefined,
      buyPrice: data.buyPrice !== undefined ? data.buyPrice : undefined,
      notes: data.notes !== undefined ? data.notes : undefined,
      folioOrAccount: data.folioOrAccount !== undefined ? data.folioOrAccount : undefined,
    },
  });

  revalidatePath("/investments");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteInvestment(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await getCachedUser(userId);
  if (!user) throw new Error("User not found");

  await db.investment.delete({
    where: { id, userId: user.id },
  });

  revalidatePath("/investments");
  revalidatePath("/dashboard");
  return { success: true };
}

// ─── 1-Click Sync All Holdings with Live Market Prices ─────────────────────────

export async function syncInvestmentPrices() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await getCachedUser(userId);
  if (!user) throw new Error("User not found");

  const holdings = await db.investment.findMany({
    where: { userId: user.id },
  });

  let updatedCount = 0;

  for (const h of holdings) {
    if (!h.symbol) continue;

    try {
      const quote = await getAssetLiveQuote(h.symbol, h.assetType);
      if (quote && quote.price > 0) {
        await db.investment.update({
          where: { id: h.id },
          data: {
            currentPrice: quote.price,
            previousClose: quote.previousClose || quote.price,
            category: h.category || quote.category || undefined,
            lastPriceUpdate: new Date(),
          },
        });
        updatedCount++;
      }
    } catch (e) {
      console.error(`Error syncing price for ${h.symbol}:`, e);
    }
  }

  revalidatePath("/investments");
  revalidatePath("/dashboard");
  return { success: true, updatedCount };
}
