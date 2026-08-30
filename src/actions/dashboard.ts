"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { serializeTransaction } from "@/lib/utils";
import { getCachedUser } from "@/lib/auth-cache";
import { revalidatePath } from "next/cache";
import { startOfMonth, endOfMonth, subMonths, subDays } from "date-fns";

export async function getDashboardData(days: number = 30) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await getCachedUser(userId);
  if (!user) throw new Error("User not found");

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  // Parallel lean queries
  const [
    accounts,
    currentMonthTransactions,
    lastMonthTransactions,
    recentTransactions,
    budget,
    goals,
    goalContributions,
  ] = await Promise.all([
    db.account.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        type: true,
        balance: true,
        isDefault: true,
        createdAt: true,
        _count: { select: { transactions: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.transaction.findMany({
      where: {
        userId: user.id,
        date: { gte: monthStart, lte: monthEnd },
        status: "COMPLETED",
      },
      select: {
        type: true,
        amount: true,
        category: true,
      },
    }),
    db.transaction.findMany({
      where: {
        userId: user.id,
        date: { gte: lastMonthStart, lte: lastMonthEnd },
        status: "COMPLETED",
      },
      select: {
        type: true,
        amount: true,
      },
    }),
    db.transaction.findMany({
      where: { userId: user.id, status: "COMPLETED" },
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        date: true,
        createdAt: true,
        category: true,
        account: { select: { name: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 3,
    }),
    db.budget.findUnique({
      where: { userId: user.id },
      select: { id: true, amount: true, lastAlertSent: true },
    }),
    db.goal.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        targetAmount: true,
        currentAmount: true,
        deadline: true,
        status: true,
      },
    }),
    db.goalContribution.findMany({
      where: {
        goal: { userId: user.id, status: "ACTIVE" },
      },
      select: {
        amount: true,
        accountId: true,
      },
    }),
  ]);

  // Calculate goal allocations per account
  const goalAllocationsByAccount: Record<string, number> = {};
  let totalGoalAllocations = 0;
  for (const contribution of goalContributions) {
    const amount = contribution.amount.toNumber();
    goalAllocationsByAccount[contribution.accountId] =
      (goalAllocationsByAccount[contribution.accountId] || 0) + amount;
    totalGoalAllocations += amount;
  }

  // Calculate totals
  const totalBalance = accounts.reduce(
    (sum, a) => sum + a.balance.toNumber(),
    0
  );
  const effectiveBalance = totalBalance - totalGoalAllocations;

  const currentMonthIncome = currentMonthTransactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + t.amount.toNumber(), 0);

  const currentMonthExpense = currentMonthTransactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + t.amount.toNumber(), 0);

  const lastMonthIncome = lastMonthTransactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + t.amount.toNumber(), 0);

  const lastMonthExpense = lastMonthTransactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + t.amount.toNumber(), 0);

  const savingsRate =
    currentMonthIncome > 0
      ? ((currentMonthIncome - currentMonthExpense) / currentMonthIncome) * 100
      : 0;

  const lastMonthSavingsRate =
    lastMonthIncome > 0
      ? ((lastMonthIncome - lastMonthExpense) / lastMonthIncome) * 100
      : 0;

  // Category breakdown for pie chart
  const categoryBreakdown: Record<string, number> = {};
  currentMonthTransactions
    .filter((t) => t.type === "EXPENSE")
    .forEach((t) => {
      categoryBreakdown[t.category] =
        (categoryBreakdown[t.category] || 0) + t.amount.toNumber();
    });

  const expenseByCategory = Object.entries(categoryBreakdown)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return serializeTransaction({
    accounts: accounts.map((a) => ({
      ...a,
      goalAllocations: goalAllocationsByAccount[a.id] || 0,
      effectiveBalance:
        a.balance.toNumber() - (goalAllocationsByAccount[a.id] || 0),
    })),
    stats: {
      totalBalance,
      effectiveBalance,
      totalGoalAllocations,
      currentMonthIncome,
      currentMonthExpense,
      lastMonthIncome,
      lastMonthExpense,
      savingsRate,
      lastMonthSavingsRate,
    },
    recentTransactions,
    budget,
    goals,
    expenseByCategory,
  });
}

export async function getBalanceHistory(days: number = 30) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await getCachedUser(userId);
  if (!user) throw new Error("User not found");

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const transactions = await db.transaction.findMany({
    where: {
      userId: user.id,
      date: { gte: startDate },
      status: "COMPLETED",
    },
    orderBy: { date: "asc" },
  });

  // Group by date
  const dailyData: Record<string, { income: number; expense: number }> = {};

  transactions.forEach((t) => {
    const dateKey = t.date.toISOString().split("T")[0];
    if (!dailyData[dateKey]) {
      dailyData[dateKey] = { income: 0, expense: 0 };
    }
    if (t.type === "INCOME") {
      dailyData[dateKey].income += t.amount.toNumber();
    } else if (t.type === "EXPENSE") {
      dailyData[dateKey].expense += t.amount.toNumber();
    }
  });

  return Object.entries(dailyData)
    .map(([date, data]) => ({
      date,
      income: data.income,
      expense: data.expense,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function updateBudget(amount: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });
  if (!user) throw new Error("User not found");

  const budget = await db.budget.upsert({
    where: { userId: user.id },
    update: { amount },
    create: { amount, userId: user.id },
  });

  revalidatePath("/dashboard");
  return serializeTransaction(budget);
}
