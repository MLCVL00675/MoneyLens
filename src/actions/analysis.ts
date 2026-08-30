"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { serializeTransaction } from "@/lib/utils";
import { getCachedUser } from "@/lib/auth-cache";

export async function getAnalyticsData(params: {
  startDate: string;
  endDate: string;
  accountId?: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await getCachedUser(userId);
  if (!user) throw new Error("User not found");

  const start = new Date(params.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(params.endDate);
  end.setHours(23, 59, 59, 999);

  const whereClause: any = {
    userId: user.id,
    date: { gte: start, lte: end },
    status: "COMPLETED",
  };

  if (params.accountId) {
    whereClause.accountId = params.accountId;
  }

  const transactions = await db.transaction.findMany({
    where: whereClause,
    include: { account: { select: { name: true } } },
    orderBy: { date: "asc" },
  });

  // Total income & expense
  let totalIncome = 0;
  let totalExpense = 0;
  const categoryBreakdown: Record<string, { income: number; expense: number }> = {};
  const dailyData: Record<string, { date: string; income: number; expense: number }> = {};
  const monthlyData: Record<string, { month: string; income: number; expense: number }> = {};

  transactions.forEach((t) => {
    const amount = t.amount.toNumber();
    const dateKey = t.date.toISOString().split("T")[0];
    const monthKey = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, "0")}`;

    // Totals
    if (t.type === "INCOME") {
      totalIncome += amount;
    } else if (t.type === "EXPENSE") {
      totalExpense += amount;
    }

    // Category breakdown
    if (!categoryBreakdown[t.category]) {
      categoryBreakdown[t.category] = { income: 0, expense: 0 };
    }
    if (t.type === "INCOME") {
      categoryBreakdown[t.category].income += amount;
    } else if (t.type === "EXPENSE") {
      categoryBreakdown[t.category].expense += amount;
    }

    // Daily data for line chart
    if (!dailyData[dateKey]) {
      dailyData[dateKey] = { date: dateKey, income: 0, expense: 0 };
    }
    if (t.type === "INCOME") {
      dailyData[dateKey].income += amount;
    } else if (t.type === "EXPENSE") {
      dailyData[dateKey].expense += amount;
    }

    // Monthly data for bar chart
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { month: monthKey, income: 0, expense: 0 };
    }
    if (t.type === "INCOME") {
      monthlyData[monthKey].income += amount;
    } else if (t.type === "EXPENSE") {
      monthlyData[monthKey].expense += amount;
    }
  });

  const netSavings = totalIncome - totalExpense;
  const daysDiff = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const avgDailySpend = totalExpense / daysDiff;
  const expenseRatio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : totalExpense > 0 ? 100 : 0;

  const categoryData = Object.entries(categoryBreakdown)
    .map(([name, values]) => ({
      name,
      income: values.income,
      expense: values.expense,
      total: values.income + values.expense,
    }))
    .sort((a, b) => b.expense - a.expense);

  const topCategory = categoryData.find((c) => c.expense > 0)?.name || "N/A";

  return serializeTransaction({
    summary: {
      totalIncome,
      totalExpense,
      netSavings,
      avgDailySpend,
      expenseRatio,
      topCategory,
      transactionCount: transactions.length,
    },
    categoryData,
    dailyData: Object.values(dailyData).sort((a, b) =>
      a.date.localeCompare(b.date)
    ),
    monthlyData: Object.values(monthlyData).sort((a, b) =>
      a.month.localeCompare(b.month)
    ),
  });
}

export async function sendMonthlyReportEmail() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await getCachedUser(userId);
  if (!user) throw new Error("User not found");

  const now = new Date();
  const monthName = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  let transactions = await db.transaction.findMany({
    where: {
      userId: user.id,
      date: { gte: start, lte: end },
      status: "COMPLETED",
    },
  });

  if (transactions.length === 0) {
    transactions = await db.transaction.findMany({
      where: {
        userId: user.id,
        status: "COMPLETED",
      },
      take: 50,
    });
  }

  if (transactions.length === 0) {
    return { success: false, error: "No transactions found to generate a report." };
  }

  const totalIncome = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + t.amount.toNumber(), 0);

  const totalExpense = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + t.amount.toNumber(), 0);

  const netSavings = totalIncome - totalExpense;

  const categories: Record<string, number> = {};
  transactions
    .filter((t) => t.type === "EXPENSE")
    .forEach((t) => {
      categories[t.category] = (categories[t.category] || 0) + t.amount.toNumber();
    });

  const topCategories = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  let aiInsights = "";
  try {
    const { geminiModel } = await import("@/lib/gemini");
    const prompt = `Based on this monthly financial summary, provide exactly 3 concise, actionable financial tips:
    Month: ${monthName}
    Total Income: ₹${totalIncome.toLocaleString("en-IN")}
    Total Expenses: ₹${totalExpense.toLocaleString("en-IN")}
    Net Savings: ₹${netSavings.toLocaleString("en-IN")}
    Top spending categories: ${topCategories.map(([name, amount]) => `${name}: ₹${amount.toLocaleString("en-IN")}`).join(", ")}
    Format each tip as a short bullet point. Be specific and personalized.`;

    const result = await geminiModel.generateContent(prompt);
    aiInsights = result.response.text();
  } catch {
    aiInsights = "• Review your top spending categories for potential savings.\n• Consider automating savings transfers.\n• Track your recurring subscriptions monthly.";
  }

  try {
    const { resend } = await import("@/lib/resend");
    const categoryRows = topCategories
      .map(
        ([name, amount]) =>
          `<tr><td style="padding: 8px 0; font-size: 14px; color: #374151;">${name}</td><td style="padding: 8px 0; font-size: 14px; color: #374151; text-align: right;">₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td></tr>`
      )
      .join("");

    const recipient = process.env.RESEND_OVERRIDE_EMAIL || user.email;
    const emailPayload = {
      from: process.env.RESEND_FROM_EMAIL || "MoneyLens <onboarding@resend.dev>",
      to: recipient,
      subject: `📊 Your ${monthName} Financial Report`,
      html: `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="background: linear-gradient(135deg, #1C2536, #243044); border-radius: 16px; padding: 32px; color: white; margin-bottom: 24px;">
            <h1 style="font-family: 'Georgia', serif; font-size: 28px; margin: 0 0 8px;">Monthly Report</h1>
            <p style="color: #9CA3AF; font-size: 14px; margin: 0;">${monthName} · Your financial snapshot</p>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 24px;">
            <div style="background: white; border: 1px solid #E8E0D4; border-radius: 12px; padding: 16px; text-align: center;">
              <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #9CA3AF; margin: 0 0 4px;">Income</p>
              <p style="font-size: 20px; font-weight: bold; color: #4A8B6E; margin: 0;">₹${totalIncome.toLocaleString("en-IN")}</p>
            </div>
            <div style="background: white; border: 1px solid #E8E0D4; border-radius: 12px; padding: 16px; text-align: center;">
              <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #9CA3AF; margin: 0 0 4px;">Expenses</p>
              <p style="font-size: 20px; font-weight: bold; color: #C75C5C; margin: 0;">₹${totalExpense.toLocaleString("en-IN")}</p>
            </div>
            <div style="background: white; border: 1px solid #E8E0D4; border-radius: 12px; padding: 16px; text-align: center;">
              <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #9CA3AF; margin: 0 0 4px;">Saved</p>
              <p style="font-size: 20px; font-weight: bold; color: ${netSavings >= 0 ? '#4A8B6E' : '#C75C5C'}; margin: 0;">₹${netSavings.toLocaleString("en-IN")}</p>
            </div>
          </div>

          <div style="background: white; border: 1px solid #E8E0D4; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <h3 style="font-size: 14px; font-weight: 600; color: #374151; margin: 0 0 12px;">Top Spending Categories</h3>
            <table style="width: 100%; border-collapse: collapse;">
              ${categoryRows}
            </table>
          </div>

          <div style="background: #FAF5EE; border: 1px solid #E8E0D4; border-radius: 12px; padding: 20px;">
            <h3 style="font-size: 14px; font-weight: 600; color: #374151; margin: 0 0 12px;">💡 AI Financial Insights</h3>
            <div style="font-size: 13px; color: #6B7280; white-space: pre-line; line-height: 1.6;">
              ${aiInsights}
            </div>
          </div>

          <p style="font-size: 12px; color: #9CA3AF; text-align: center; margin-top: 24px;">
            — MoneyLens · Your personal money command centre
          </p>
        </div>
      `,
    };

    const sendResult = await resend.emails.send(emailPayload);
    if (sendResult.error) {
      return {
        success: false,
        error: sendResult.error.message || "Failed to send email via Resend",
      };
    }

    return { success: true, email: user.email };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to send email",
    };
  }
}
