import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = (process.env.GEMINI_API_KEY || "").trim();

export const genAI = new GoogleGenerativeAI(apiKey || "dummy_api_key");

export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-3.6-flash",
});
