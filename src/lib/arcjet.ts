import arcjet, { shield, detectBot, tokenBucket } from "@arcjet/next";

export const aj = arcjet({
  key: process.env.ARCJET_KEY || "ajkey_placeholder",
  characteristics: ["userId"],
  rules: [
    shield({ mode: "LIVE" }),
    detectBot({
      mode: "LIVE",
      allow: [
        "CATEGORY:SEARCH_ENGINE",
        "CATEGORY:MONITOR",
        "CATEGORY:PREVIEW",
      ],
    }),
  ],
});

// Rate limiter for transaction creation
export const transactionRateLimiter = aj.withRule(
  tokenBucket({
    mode: "LIVE",
    refillRate: 10,
    interval: 3600,
    capacity: 10,
  })
);
