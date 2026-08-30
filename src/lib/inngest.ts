import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "moneylens",
  name: "MoneyLens",
  isDev: process.env.NODE_ENV === "development",
});
