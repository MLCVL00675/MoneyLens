import { inngest } from "@/lib/inngest";
import { db } from "@/lib/prisma";
import { geminiModel } from "@/lib/gemini";
import { resend } from "@/lib/resend";
import { getTimezoneMonthBounds } from "@/lib/utils";

// 1. Recurring Transaction Runner - Daily midnight (IST & UTC)
export const processRecurringTransactions = inngest.createFunction(
  {
    id: "process-recurring-transactions",
    triggers: [
      { cron: "TZ=Asia/Kolkata 0 0 * * *" },
      { cron: "0 0 * * *" },
    ],
  },
  async ({ step }: any) => {
    const now = new Date();
    // Timezone-aware threshold: include transactions due today (up to +6 hours for IST offset)
    const threshold = new Date(now.getTime() + 6 * 60 * 60 * 1000);

    // Step 1: Find all due recurring transactions
    const dueTransactions = await step.run("find-due-recurring-transactions", async () => {
      const txs = await db.transaction.findMany({
        where: {
          isRecurring: true,
          nextRecurringDate: { lte: threshold },
          status: "COMPLETED",
        },
        select: {
          id: true,
          type: true,
          amount: true,
          description: true,
          category: true,
          accountId: true,
          userId: true,
          recurringInterval: true,
          nextRecurringDate: true,
        },
      });
      // Serialize Decimal/Date for Inngest's step result storage
      return txs.map((tx) => ({
        ...tx,
        amount: tx.amount.toString(),
        nextRecurringDate: tx.nextRecurringDate?.toISOString() ?? null,
      }));
    });

    // Step 2: Process each recurring transaction in its own isolated step
    // This gives per-transaction retry isolation and proper Inngest fan-out behaviour,
    // so a failure in one transaction never blocks others.
    for (const tx of dueTransactions) {
      await step.run(`process-recurring-tx-${tx.id}`, async () => {
        const targetDate = tx.nextRecurringDate ? new Date(tx.nextRecurringDate) : now;
        const amountNumber = parseFloat(tx.amount);

        // Create the new (non-recurring) transaction entry
        await db.transaction.create({
          data: {
            type: tx.type,
            amount: amountNumber,
            description: tx.description,
            date: targetDate,
            category: tx.category,
            accountId: tx.accountId,
            userId: tx.userId,
            isRecurring: false,
            recurringInterval: tx.recurringInterval,
            status: "COMPLETED",
          },
        });

        // Update account balance
        const balanceChange =
          tx.type === "INCOME" ? amountNumber : -amountNumber;

        await db.account.update({
          where: { id: tx.accountId },
          data: { balance: { increment: balanceChange } },
        });

        // Calculate next recurring date using UTC methods to prevent timezone drift
        const nextDate = new Date(tx.nextRecurringDate ?? now);
        switch (tx.recurringInterval) {
          case "DAILY":
            nextDate.setUTCDate(nextDate.getUTCDate() + 1);
            break;
          case "WEEKLY":
            nextDate.setUTCDate(nextDate.getUTCDate() + 7);
            break;
          case "MONTHLY":
            nextDate.setUTCMonth(nextDate.getUTCMonth() + 1);
            break;
          case "YEARLY":
            nextDate.setUTCFullYear(nextDate.getUTCFullYear() + 1);
            break;
        }

        // Advance the recurring template's next due date
        await db.transaction.update({
          where: { id: tx.id },
          data: {
            nextRecurringDate: nextDate,
            lastProcessed: now,
          },
        });

        return { txId: tx.id, nextRecurringDate: nextDate.toISOString() };
      });
    }

    return { processed: dueTransactions.length };
  }
);

// 2. Budget Threshold Alert - Every 6 hours
export const checkBudgetAlerts = inngest.createFunction(
  { id: "check-budget-alerts", triggers: [{ cron: "0 */6 * * *" }] },
  async ({ step }: any) => {
    await step.run("check-budgets", async () => {
      const budgets = await db.budget.findMany({
        include: { user: true },
      });

      const now = new Date();
      const { currentMonthStart } = getTimezoneMonthBounds(now);
      let alertsSent = 0;

      for (const budget of budgets) {
        // Check if alert already sent this month
        if (
          budget.lastAlertSent &&
          budget.lastAlertSent >= currentMonthStart
        ) {
          continue;
        }

        // Calculate current month spending
        const monthExpenses = await db.transaction.aggregate({
          where: {
            userId: budget.userId,
            type: "EXPENSE",
            date: { gte: currentMonthStart },
            status: "COMPLETED",
          },
          _sum: { amount: true },
        });

        const spent = monthExpenses._sum.amount?.toNumber() || 0;
        const budgetAmount = budget.amount.toNumber();
        const percentage = (spent / budgetAmount) * 100;

        if (percentage >= 80) {
          // Send alert email
          try {
            const recipient = process.env.RESEND_OVERRIDE_EMAIL || budget.user.email;
            const sendResult = await resend.emails.send({
              from: process.env.RESEND_FROM_EMAIL || "MoneyLens <onboarding@resend.dev>",
              to: recipient,
              subject: `⚠️ Budget Alert: ${percentage.toFixed(0)}% of your monthly budget used`,
              html: `
                <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
                  <div style="background: linear-gradient(135deg, #1C2536, #243044); border-radius: 16px; padding: 32px; color: white; margin-bottom: 24px;">
                    <h1 style="font-family: 'Georgia', serif; font-size: 24px; margin: 0 0 8px;">Budget Alert</h1>
                    <p style="color: #9CA3AF; font-size: 14px; margin: 0;">Hi ${budget.user.name || "there"}, your spending needs attention.</p>
                  </div>
                  <div style="background: white; border: 1px solid #E8E0D4; border-radius: 16px; padding: 24px;">
                    <p style="font-size: 14px; color: #374151; margin: 0 0 16px;">
                      You've spent <strong style="color: ${percentage >= 100 ? '#C75C5C' : '#D4A843'}">₹${spent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> 
                      out of your <strong>₹${budgetAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> monthly budget.
                    </p>
                    <div style="background: #F3EBE0; border-radius: 8px; height: 12px; overflow: hidden; margin-bottom: 8px;">
                      <div style="background: ${percentage >= 100 ? '#C75C5C' : percentage >= 90 ? '#D4A843' : '#4A8B6E'}; height: 100%; width: ${Math.min(percentage, 100)}%; border-radius: 8px;"></div>
                    </div>
                    <p style="font-size: 12px; color: #9CA3AF; text-align: right;">${percentage.toFixed(0)}% used</p>
                  </div>
                  <p style="font-size: 12px; color: #9CA3AF; text-align: center; margin-top: 24px;">
                    — MoneyLens · Your personal money command centre
                  </p>
                </div>
              `,
            });
            console.log(`Budget alert sent to ${budget.user.email}:`, sendResult);

            if (sendResult.error) {
              console.error(`Resend API Error for ${budget.user.email}:`, sendResult.error);
            } else {
              await db.budget.update({
                where: { id: budget.id },
                data: { lastAlertSent: now },
              });
              alertsSent++;
            }
          } catch (error) {
            console.error("Failed to send budget alert:", error);
          }
        }
      }

      return { alertsSent };
    });
  }
);

// 3. Monthly Financial AI Report - 1st of every month at 9 AM
export const monthlyFinancialReport = inngest.createFunction(
  { id: "monthly-financial-report", triggers: [{ cron: "0 9 1 * *" }] },
  async ({ step }: any) => {
    await step.run("generate-reports", async () => {
      const users = await db.user.findMany();
      const { lastMonthStart, lastMonthEnd } = getTimezoneMonthBounds(new Date());
      const monthName = lastMonthStart.toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      });

      let reportsSent = 0;

      for (const user of users) {
        let transactions = await db.transaction.findMany({
          where: {
            userId: user.id,
            date: { gte: lastMonthStart, lte: lastMonthEnd },
            status: "COMPLETED",
          },
        });

        // If no transactions in previous month, fallback to recent transactions for testing
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
          console.log(`User ${user.email} has no transactions. Skipping report.`);
          continue;
        }

        const totalIncome = transactions
          .filter((t) => t.type === "INCOME")
          .reduce((sum, t) => sum + t.amount.toNumber(), 0);

        const totalExpense = transactions
          .filter((t) => t.type === "EXPENSE")
          .reduce((sum, t) => sum + t.amount.toNumber(), 0);

        const netSavings = totalIncome - totalExpense;

        // Category breakdown
        const categories: Record<string, number> = {};
        transactions
          .filter((t) => t.type === "EXPENSE")
          .forEach((t) => {
            categories[t.category] = (categories[t.category] || 0) + t.amount.toNumber();
          });

        const topCategories = Object.entries(categories)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

        // Get AI insights
        let aiInsights = "";
        try {
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

        // Send report
        try {
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
          console.log(`Monthly report sent to ${user.email}:`, sendResult);

          if (sendResult.error) {
            console.error(`Resend API Error for ${user.email}:`, sendResult.error);
          } else {
            reportsSent++;
          }
        } catch (error) {
          console.error("Failed to send monthly report:", error);
        }
      }

      return { reportsSent };
    });
  }
);
