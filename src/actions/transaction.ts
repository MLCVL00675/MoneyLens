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

      return transaction;
    }
  });

  revalidatePath("/dashboard");
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

export async function deleteTransaction(transactionId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await getCachedUser(userId);
  if (!user) throw new Error("User not found");

  const transaction = await db.transaction.findUnique({
    where: { id: transactionId, userId: user.id },
  });
  if (!transaction) throw new Error("Transaction not found");

  await db.$transaction(async (tx) => {
    // Reverse balance effect
    const balanceChange =
      transaction.type === "INCOME"
        ? -transaction.amount.toNumber()
        : transaction.amount.toNumber();

    await tx.account.update({
      where: { id: transaction.accountId },
      data: { balance: { increment: balanceChange } },
    });

    await tx.transaction.delete({
      where: { id: transactionId },
    });
  });

  revalidatePath("/dashboard");
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

  await db.$transaction(async (tx) => {
    // Group balance adjustments by account
    const accountAdjustments: Record<string, number> = {};

    for (const t of transactions) {
      const adjustment =
        t.type === "INCOME" ? -t.amount.toNumber() : t.amount.toNumber();
      accountAdjustments[t.accountId] =
        (accountAdjustments[t.accountId] || 0) + adjustment;
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
  });

  revalidatePath("/dashboard");
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

