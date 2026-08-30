import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { serializeTransaction } from "@/lib/utils";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const transaction = await db.transaction.findUnique({
    where: { id, userId: user.id },
    include: { account: { select: { name: true } } },
  });

  if (!transaction) {
    return NextResponse.json(
      { error: "Transaction not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(serializeTransaction(transaction));
}
