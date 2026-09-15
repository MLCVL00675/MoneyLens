"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { serializeTransaction, formatCurrency } from "@/lib/utils";
import { getCachedUser } from "@/lib/auth-cache";
import { geminiModel } from "@/lib/gemini";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function createTransaction(data: {
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  amount: number;
  description: string;
  date: string;
  category: string;
  accountId: string;
  receiptUrl?: string;
  isRecurring: boolean;
  recurringInterval?: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  // Transfer fields
  transferAccountId?: string;
  // Net Worth Mappings
  expenseType?: "GENERAL" | "INVESTMENT" | "LOAN";
  sipId?: string;
  liabilityId?: string;
  allottedUnits?: number;
  allotmentNav?: number;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await getCachedUser(userId);
  if (!user) throw new Error("User not found");

  const transactionDate = new Date(data.date);

  // Calculate next recurring date
  let nextRecurringDate: Date | null = null;
  if (data.isRecurring && data.recurringInterval) {
    nextRecurringDate = calculateNextRecurringDate(
      transactionDate,
      data.recurringInterval
    );
  }

  const result = await db.$transaction(async (tx) => {
    // Validate source account exists and check balance if Expense or Transfer
    const sourceAccount = await tx.account.findUnique({
      where: { id: data.accountId, userId: user.id },
    });
    if (!sourceAccount) throw new Error("Source account not found");

    const currentBalance = sourceAccount.balance.toNumber();

    if (data.type === "EXPENSE" && data.amount > currentBalance) {
      throw new Error(
        `Insufficient funds. Expense amount (${formatCurrency(data.amount)}) exceeds account balance (${formatCurrency(currentBalance)}).`
      );
    }

    if (data.type === "TRANSFER" && data.transferAccountId) {
      if (data.amount > currentBalance) {
        throw new Error(
          `Insufficient funds. Transfer amount (${formatCurrency(data.amount)}) exceeds source account balance (${formatCurrency(currentBalance)}).`
        );
      }

      const destAccount = await tx.account.findUnique({
        where: { id: data.transferAccountId, userId: user.id },
      });
      if (!destAccount) throw new Error("Destination account not found");

      // Handle transfer: create two linked transactions
      const transferId = crypto.randomUUID();

      // Expense from source account
      const outgoing = await tx.transaction.create({
        data: {
          type: "EXPENSE",
          amount: data.amount,
          description: `Transfer to: ${data.description}`,
          date: transactionDate,
          category: "Transfer",
          accountId: data.accountId,
          userId: user.id,
          transferId,
          transferAccountId: data.transferAccountId,
          isRecurring: data.isRecurring,
          recurringInterval: data.recurringInterval || null,
          nextRecurringDate,
          status: "COMPLETED",
        },
      });

      // Income to destination account
      const incoming = await tx.transaction.create({
        data: {
          type: "INCOME",
          amount: data.amount,
          description: `Transfer from: ${data.description}`,
          date: transactionDate,
          category: "Transfer",
          accountId: data.transferAccountId,
          userId: user.id,
          transferId,
          transferAccountId: data.accountId,
          isRecurring: false,
          status: "COMPLETED",
        },
      });

      // Update source account balance
      await tx.account.update({
        where: { id: data.accountId },
        data: { balance: { decrement: data.amount } },
      });

      // Update destination account balance
      await tx.account.update({
        where: { id: data.transferAccountId },
        data: { balance: { increment: data.amount } },
      });

      return outgoing;
    } else {
      // Regular income/expense
      const transaction = await tx.transaction.create({
        data: {
          type: data.type,
          amount: data.amount,
          description: data.description,
          date: transactionDate,
          category: data.category,
          accountId: data.accountId,
          userId: user.id,
          receiptUrl: data.receiptUrl || null,
          isRecurring: data.isRecurring,
          recurringInterval: data.recurringInterval || null,
          nextRecurringDate,
          status: "COMPLETED",
          expenseType: data.expenseType || "GENERAL",
          sipId: data.sipId || null,
          liabilityId: data.liabilityId || null,
          allottedUnits: data.allottedUnits !== undefined ? data.allottedUnits : null,
          allotmentNav: data.allotmentNav !== undefined ? data.allotmentNav : null,
        },
      });

      // Update account balance
      const balanceChange =
        data.type === "INCOME" ? data.amount : -data.amount;
      await tx.account.update({
        where: { id: data.accountId },
        data: {
          balance: { increment: balanceChange },
        },
      });

      // ─── Loan / Liability Synchronization ────────────────────────────────
      if (data.liabilityId && data.type === "EXPENSE") {
        const liability = await tx.liability.findUnique({
          where: { id: data.liabilityId, userId: user.id },
        });

        if (liability) {
          const currentPrincipal = Number(liability.principalRemaining);
          const annualRate = Number(liability.interestRate);
          // Monthly interest = principal * (annualRate / 100) / 12
          const monthlyInterest = (currentPrincipal * (annualRate / 100)) / 12;
          // Principal portion of EMI
          const principalPaid = Math.max(
            0,
            Math.min(currentPrincipal, data.amount - monthlyInterest)
          );
          const newPrincipal = Math.max(0, currentPrincipal - principalPaid);
          const newTenure =
            liability.remainingTenureMonths && liability.remainingTenureMonths > 1
              ? liability.remainingTenureMonths - 1
              : 0;

          await tx.liability.update({
            where: { id: liability.id },
            data: {
              principalRemaining: newPrincipal,
              remainingTenureMonths: newTenure,
            },
          });
        }
      }

      // ─── Investment / SIP Synchronization ────────────────────────────────
      if (data.sipId && data.type === "EXPENSE") {
        const sip = await tx.sIP.findUnique({
          where: { id: data.sipId, userId: user.id },
        });

        if (sip) {
          const navValue =
            data.allotmentNav && data.allotmentNav > 0
              ? data.allotmentNav
              : sip.currentNAV && Number(sip.currentNAV) > 0
              ? Number(sip.currentNAV)
              : 0;

          const unitsToAdd =
            data.allottedUnits !== undefined && data.allottedUnits > 0
              ? data.allottedUnits
              : navValue > 0
              ? data.amount / navValue
              : 0;

          const oldInvested = Number(sip.totalInvested);
          const newInvested = oldInvested + data.amount;
          const oldUnits = sip.totalUnitsHeld ? Number(sip.totalUnitsHeld) : 0;
          const newUnits = oldUnits + unitsToAdd;
          const newCurrentValue =
            navValue > 0 ? newUnits * navValue : undefined;

          // 1. Update SIP in Net Worth Tracker
          await tx.sIP.update({
            where: { id: sip.id },
            data: {
              totalInvested: newInvested,
              totalUnitsHeld: newUnits,
              currentNAV: navValue > 0 ? navValue : undefined,
              currentValue: newCurrentValue,
            },
          });

          // 2. Sync / Upsert into db.investment (Reflects in Investments Tab under Mutual Funds)
          const userMfHoldings = await tx.investment.findMany({
            where: { userId: user.id, assetType: "MUTUAL_FUND" },
          });

          const normSipName = sip.schemeName.toLowerCase().replace(/[^a-z0-9]/g, "");
          const sipCode = sip.schemeCode ? sip.schemeCode.trim().toLowerCase() : "";

          const existingInv =
            userMfHoldings.find((inv) => {
              const normInvName = inv.name.toLowerCase().replace(/[^a-z0-9]/g, "");
              const invSymbol = inv.symbol.toLowerCase();

              // 1. Symbol or AMFI code match
              if (sipCode && (invSymbol === sipCode || invSymbol.includes(sipCode))) {
                return true;
              }
              // 2. Exact normalized name match
              if (normSipName === normInvName) {
                return true;
              }
              // 3. Substring containment match (e.g. "Motilal Oswal Small Cap Fund" vs "MOTILAL OSWAL SMALL CAP FUND - REGULAR")
              if (normSipName.length > 8 && normInvName.length > 8) {
                if (normSipName.includes(normInvName) || normInvName.includes(normSipName)) {
                  return true;
                }
              }
              return false;
            }) || null;


          if (existingInv) {
            const existingUnits = Number(existingInv.units);
            const existingBuyPrice = Number(existingInv.buyPrice);
            const updatedUnits = existingUnits + unitsToAdd;
            const updatedBuyPrice =
              updatedUnits > 0
                ? (existingUnits * existingBuyPrice + data.amount) / updatedUnits
                : existingBuyPrice;

            await tx.investment.update({
              where: { id: existingInv.id },
              data: {
                units: updatedUnits,
                buyPrice: updatedBuyPrice,
                currentPrice:
                  navValue > 0 ? navValue : existingInv.currentPrice,
                lastPriceUpdate: new Date(),
              },
            });
          } else {
            // Create new holding in Investments tab
            await tx.investment.create({
              data: {
                userId: user.id,
                name: sip.schemeName,
                symbol:
                  sip.schemeCode ||
                  sip.schemeName.substring(0, 10).toUpperCase(),
                assetType: "MUTUAL_FUND",
                units: unitsToAdd,
                buyPrice: unitsToAdd > 0 ? data.amount / unitsToAdd : navValue,
                currentPrice: navValue > 0 ? navValue : 0,
                exchange: "AMFI",
                category: "Mutual Fund SIP",
                accountId: data.accountId,
                notes: `Auto-linked from SIP: ${sip.schemeName}`,
                lastPriceUpdate: new Date(),
              },
            });
          }
        }
      }

      return transaction;
    }
  }, {
    maxWait: 10000,
    timeout: 30000,
  });


  revalidatePath("/dashboard");
  revalidatePath("/activity");
  revalidatePath("/investments");
  revalidatePath("/net-worth");
  revalidatePath(`/account/${data.accountId}`);
  if (data.transferAccountId) {
    revalidatePath(`/account/${data.transferAccountId}`);
  }

  return serializeTransaction(result);
}


export async function updateTransaction(
  transactionId: string,
  data: {
    type: "INCOME" | "EXPENSE";
    amount: number;
    description: string;
    date: string;
    category: string;
    isRecurring: boolean;
    recurringInterval?: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  }
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await getCachedUser(userId);
  if (!user) throw new Error("User not found");

  // Get existing transaction to calculate balance diff
  const existingTx = await db.transaction.findUnique({
    where: { id: transactionId, userId: user.id },
  });
  if (!existingTx) throw new Error("Transaction not found");

  const transactionDate = new Date(data.date);
  let nextRecurringDate: Date | null = null;
  if (data.isRecurring && data.recurringInterval) {
    nextRecurringDate = calculateNextRecurringDate(
      transactionDate,
      data.recurringInterval
    );
  }

  const result = await db.$transaction(async (tx) => {
    // Reverse old balance effect
    const oldEffect =
      existingTx.type === "INCOME"
        ? existingTx.amount.toNumber()
        : -existingTx.amount.toNumber();
    await tx.account.update({
      where: { id: existingTx.accountId },
      data: { balance: { decrement: oldEffect } },
    });

    // Apply new balance effect
    const newEffect = data.type === "INCOME" ? data.amount : -data.amount;
    await tx.account.update({
      where: { id: existingTx.accountId },
      data: { balance: { increment: newEffect } },
    });

    // Update transaction
    return tx.transaction.update({
      where: { id: transactionId },
      data: {
        type: data.type,
        amount: data.amount,
        description: data.description,
        date: transactionDate,
        category: data.category,
        isRecurring: data.isRecurring,
        recurringInterval: data.recurringInterval || null,
        nextRecurringDate,
      },
    });
  });

  revalidatePath("/dashboard");
  revalidatePath("/activity");
  revalidatePath("/analysis");
  revalidatePath("/accounts");
  revalidatePath(`/account/${existingTx.accountId}`);
  return serializeTransaction(result);
}

// ─── Reversal Helper for Net Worth & Portfolio Synchronization ─────────────
async function reverseTransactionNetWorthEffects(
  tx: any,
  transaction: any,
  userId: string
) {
  // 1. Revert SIP & Mutual Fund Holding Effects
  let sip = null;
  if (transaction.sipId) {
    sip = await tx.sIP.findUnique({
      where: { id: transaction.sipId, userId },
    });
  } else if (
    transaction.category === "Investment" ||
    transaction.category?.toLowerCase().includes("invest") ||
    transaction.description?.toLowerCase().includes("sip")
  ) {
    // Fallback: match SIP scheme by description if sipId was not explicitly set
    const userSips = await tx.sIP.findMany({ where: { userId } });
    const descLower = transaction.description.toLowerCase();
    sip =
      userSips.find(
        (s: any) =>
          descLower.includes(s.schemeName.toLowerCase()) ||
          s.schemeName.toLowerCase().includes(descLower.replace(" sip", ""))
      ) || null;
  }

  if (sip) {
    const amt = Number(transaction.amount);
    const navVal =
      transaction.allotmentNav && Number(transaction.allotmentNav) > 0
        ? Number(transaction.allotmentNav)
        : sip.currentNAV && Number(sip.currentNAV) > 0
        ? Number(sip.currentNAV)
        : 0;

    const unitsToDeduct =
      transaction.allottedUnits !== null &&
      transaction.allottedUnits !== undefined &&
      Number(transaction.allottedUnits) > 0
        ? Number(transaction.allottedUnits)
        : navVal > 0
        ? amt / navVal
        : 0;

    const oldInvested = Number(sip.totalInvested);
    const newInvested = Math.max(0, oldInvested - amt);
    const oldUnits = sip.totalUnitsHeld ? Number(sip.totalUnitsHeld) : 0;
    const newUnits = Math.max(0, oldUnits - unitsToDeduct);
    const newCurrentValue =
      navVal > 0
        ? newUnits * navVal
        : sip.currentValue
        ? Math.max(0, Number(sip.currentValue) - amt)
        : newInvested;

    // Revert SIP in Net Worth Tracker
    await tx.sIP.update({
      where: { id: sip.id },
      data: {
        totalInvested: newInvested,
        totalUnitsHeld: newUnits,
        currentValue: newCurrentValue,
      },
    });

    // Revert holding in db.investment (reflected in Investments and Net Worth tabs)
    const userMfHoldings = await tx.investment.findMany({
      where: { userId, assetType: "MUTUAL_FUND" },
    });

    const normSipName = sip.schemeName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const sipCode = sip.schemeCode ? sip.schemeCode.trim().toLowerCase() : "";

    const existingInv =
      userMfHoldings.find((inv: any) => {
        const normInvName = inv.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        const invSymbol = inv.symbol.toLowerCase();

        if (sipCode && (invSymbol === sipCode || invSymbol.includes(sipCode)))
          return true;
        if (normSipName === normInvName) return true;
        if (normSipName.length > 8 && normInvName.length > 8) {
          if (
            normSipName.includes(normInvName) ||
            normInvName.includes(normSipName)
          )
            return true;
        }
        return false;
      }) || null;

    if (existingInv) {
      const existingUnits = Number(existingInv.units);
      const existingBuyPrice = Number(existingInv.buyPrice);
      const remainingUnits = Math.max(0, existingUnits - unitsToDeduct);
      const existingTotalCost = existingUnits * existingBuyPrice;
      const remainingTotalCost = Math.max(0, existingTotalCost - amt);

      if (remainingUnits <= 0.0001) {
        await tx.investment.delete({
          where: { id: existingInv.id },
        });
      } else {
        const newBuyPrice =
          remainingUnits > 0 ? remainingTotalCost / remainingUnits : existingBuyPrice;

        await tx.investment.update({
          where: { id: existingInv.id },
          data: {
            units: remainingUnits,
            buyPrice: Math.round(newBuyPrice * 100) / 100,
            lastPriceUpdate: new Date(),
          },
        });
      }
    }
  }

  // 2. Revert Loan / Liability EMI Principal Reduction
  let liability = null;
  if (transaction.liabilityId) {
    liability = await tx.liability.findUnique({
      where: { id: transaction.liabilityId, userId },
    });
  }

  if (liability) {
    const amt = Number(transaction.amount);
    const rate = Number(liability.interestRate);
    const currentPrincipal = Number(liability.principalRemaining);
    const monthlyInterest = (currentPrincipal * (rate / 100)) / 12;
    const estPrincipalPaid = Math.max(0, Math.min(amt, amt - monthlyInterest));
    const restoredPrincipal = currentPrincipal + estPrincipalPaid;

    await tx.liability.update({
      where: { id: liability.id },
      data: {
        principalRemaining: restoredPrincipal,
      },
    });
  }
}

export async function deleteTransaction(transactionId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await getCachedUser(userId);
  if (!user) throw new Error("User not found");

  const transaction = await db.transaction.findUnique({
    where: { id: transactionId, userId: user.id },
  });
  if (!transaction) throw new Error("Transaction not found");

  await db.$transaction(
    async (tx) => {
      // 1. Reverse balance effect on Account
      const balanceChange =
        transaction.type === "INCOME"
          ? -transaction.amount.toNumber()
          : transaction.amount.toNumber();

      await tx.account.update({
        where: { id: transaction.accountId },
        data: { balance: { increment: balanceChange } },
      });

      // 2. Reverse Net Worth & Portfolio effects (SIP / Investment / Loan)
      await reverseTransactionNetWorthEffects(tx, transaction, user.id);

      // 3. Delete transaction record
      await tx.transaction.delete({
        where: { id: transactionId },
      });
    },
    {
      timeout: 30000,
      maxWait: 10000,
    }
  );

  revalidatePath("/dashboard");
  revalidatePath("/activity");
  revalidatePath("/investments");
  revalidatePath("/net-worth");
  revalidatePath("/analysis");
  revalidatePath("/accounts");
  revalidatePath(`/account/${transaction.accountId}`);
  return { success: true };
}

export async function bulkDeleteTransactions(transactionIds: string[]) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await getCachedUser(userId);
  if (!user) throw new Error("User not found");

  const transactions = await db.transaction.findMany({
    where: { id: { in: transactionIds }, userId: user.id },
  });

  await db.$transaction(
    async (tx) => {
      // Group balance adjustments by account
      const accountAdjustments: Record<string, number> = {};

      for (const t of transactions) {
        const adjustment =
          t.type === "INCOME" ? -t.amount.toNumber() : t.amount.toNumber();
        accountAdjustments[t.accountId] =
          (accountAdjustments[t.accountId] || 0) + adjustment;

        // Reverse Net Worth & Portfolio effects for each transaction
        await reverseTransactionNetWorthEffects(tx, t, user.id);
      }

      // Apply all balance adjustments
      for (const [accountId, adjustment] of Object.entries(accountAdjustments)) {
        await tx.account.update({
          where: { id: accountId },
          data: { balance: { increment: adjustment } },
        });
      }

      // Delete all transactions
      await tx.transaction.deleteMany({
        where: { id: { in: transactionIds }, userId: user.id },
      });
    },
    {
      timeout: 30000,
      maxWait: 10000,
    }
  );

  revalidatePath("/dashboard");
  revalidatePath("/activity");
  revalidatePath("/investments");
  revalidatePath("/net-worth");
  revalidatePath("/analysis");
  revalidatePath("/accounts");
  return { success: true, count: transactions.length };
}

export async function scanReceipt(base64Image: string, mimeType: string = "image/jpeg") {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    const model = geminiModel;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: base64Image,
        },
      },
      {
        text: `You are an expert receipt parser. Analyze this receipt image and extract the key transaction information in strictly valid JSON format:
{
  "amount": <total amount as a positive number, e.g. 450.00>,
  "date": "<date in YYYY-MM-DD format>",
  "description": "<merchant or store name and brief item summary>",
  "category": "<one of: Housing, Transportation, Food & Drink, Shopping, Entertainment, Healthcare, Education, Travel, Personal, Bills & Utilities, Other>",
  "merchantName": "<name of the merchant/store>"
}

If you cannot determine a specific field, use sensible defaults (e.g. today's date if date is missing, "Receipt Purchase" for description).
Return ONLY the raw JSON object, no explanation, no markdown text before or after.`,
      },
    ]);

    const response = result.response.text();
    // Robustly extract the JSON object even if the model wrapped it in markdown or comments
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON structure found in model response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      success: true,
      data: parsed,
    };
  } catch (error: any) {
    console.error("Receipt scan error:", error?.message || error);
    return {
      success: false,
      error: "Failed to scan receipt. Please try again or enter details manually.",
    };
  }
}

export async function getAllTransactions(filters?: {
  accountId?: string;
  type?: string;
  category?: string;
  recurring?: boolean;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await getCachedUser(userId);
  if (!user) throw new Error("User not found");

  const whereClause: any = {
    userId: user.id,
  };

  if (filters?.accountId) {
    whereClause.accountId = filters.accountId;
  }
  if (filters?.type && filters.type !== "all") {
    whereClause.type = filters.type;
  }
  if (filters?.category && filters.category !== "all") {
    whereClause.category = filters.category;
  }
  if (filters?.recurring !== undefined) {
    whereClause.isRecurring = filters.recurring;
  }

  const transactions = await db.transaction.findMany({
    where: whereClause,
    include: {
      account: { select: { id: true, name: true, type: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return serializeTransaction(transactions);
}

// Helper function
function calculateNextRecurringDate(
  date: Date,
  interval: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY"
): Date {
  const next = new Date(date);
  switch (interval) {
    case "DAILY":
      next.setUTCDate(next.getUTCDate() + 1);
      break;
    case "WEEKLY":
      next.setUTCDate(next.getUTCDate() + 7);
      break;
    case "MONTHLY":
      next.setUTCMonth(next.getUTCMonth() + 1);
      break;
    case "YEARLY":
      next.setUTCFullYear(next.getUTCFullYear() + 1);
      break;
  }
  return next;
}

