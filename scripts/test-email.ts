import { PrismaClient } from "@prisma/client";
import { Resend } from "resend";

const db = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

async function main() {
  console.log("Checking users in database...");
  const users = await db.user.findMany();
  console.log("Users found:", users.map(u => ({ id: u.id, email: u.email, name: u.name })));

  if (users.length === 0) {
    console.log("No users found in database!");
    return;
  }

  const recipient = "luckymlcvl@gmail.com";
  console.log(`Attempting to send test email to ${recipient}...`);
  try {
    const result = await resend.emails.send({
      from: "FinanceAI <onboarding@resend.dev>",
      to: recipient,
      subject: "🧪 FinanceAI Resend Test Email",
      html: "<p>This is a test email from FinanceAI to verify Resend delivery.</p>",
    });
    console.log("Resend API Result:", JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error("Resend Error:", err);
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
