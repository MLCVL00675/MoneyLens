import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import {
  processRecurringTransactions,
  checkBudgetAlerts,
  monthlyFinancialReport,
} from "@/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processRecurringTransactions,
    checkBudgetAlerts,
    monthlyFinancialReport,
  ],
});
