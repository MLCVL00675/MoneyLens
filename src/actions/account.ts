"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { serializeTransaction } from "@/lib/utils";
import { getCachedUser } from "@/lib/auth-cache";

export async function createAccount(data: {
  name: string;
  type: "CURRENT" | "SAVINGS";
  balance: number;
  isDefault: boolean;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await getCachedUser(userId);
  if (!user) throw new Error("User not found");

  // If setting as default, unset other defaults
  if (data.isDefault) {
    await db.account.updateMany({
      where: { userId: user.id, isDefault: true },
      data: { isDefault: false },
    });
  }

  // If this is the first account, make it default
  const existingAccounts = await db.account.count({
    where: { userId: user.id },
  });

  const account = await db.account.create({
    data: {
      name: data.name,
      type: data.type,
      balance: data.balance,
      isDefault: data.isDefault || existingAccounts === 0,
      userId: user.id,
    },
  });

  revalidatePath("/dashboard");
  return serializeTransaction(account);
}

export async function getAccounts() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await getCachedUser(userId);
  if (!user) throw new Error("User not found");

  const [accounts, goalContributions] = await Promise.all([
    db.account.findMany({
      where: { userId: user.id },
      include: {
        _count: { select: { transactions: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.goalContribution.findMany({
      where: {
        goal: { userId: user.id, status: "ACTIVE" },
      },
      include: { account: { select: { id: true } } },
    }),
  ]);

  const goalAllocationsByAccount: Record<string, number> = {};
  for (const contribution of goalContributions) {
    const amount = contribution.amount.toNumber();
    goalAllocationsByAccount[contribution.account.id] =
      (goalAllocationsByAccount[contribution.account.id] || 0) + amount;
  }

  const enrichedAccounts = accounts.map((a) => {
    const goalAllocations = goalAllocationsByAccount[a.id] || 0;
    const balanceNum = a.balance.toNumber();
    return {
      ...a,
      goalAllocations,
      effectiveBalance: balanceNum - goalAllocations,
    };
  });

  return serializeTransaction(enrichedAccounts);
}

export async function getAccountById(accountId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await getCachedUser(userId);
  if (!user) throw new Error("User not found");

  const [account, goalContributions] = await Promise.all([
    db.account.findUnique({
      where: { id: accountId, userId: user.id },
      include: {
        transactions: {
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        },
        _count: { select: { transactions: true } },
      },
    }),
    db.goalContribution.findMany({
      where: {
        accountId,
        goal: { userId: user.id, status: "ACTIVE" },
      },
    }),
  ]);

  if (!account) throw new Error("Account not found");

  const goalAllocations = goalContributions.reduce(
    (sum, c) => sum + c.amount.toNumber(),
    0
  );
  const balanceNum = account.balance.toNumber();

  const enrichedAccount = {
    ...account,
    goalAllocations,
    effectiveBalance: balanceNum - goalAllocations,
  };

  return serializeTransaction(enrichedAccount);
}

export async function updateDefaultAccount(accountId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await getCachedUser(userId);
  if (!user) throw new Error("User not found");

  await db.$transaction(async (tx) => {
    // Unset all defaults
    await tx.account.updateMany({
      where: { userId: user.id, isDefault: true },
      data: { isDefault: false },
    });

    // Set new default
    await tx.account.update({
      where: { id: accountId, userId: user.id },
      data: { isDefault: true },
    });
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteAccount(accountId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await getCachedUser(userId);
  if (!user) throw new Error("User not found");

  await db.account.delete({
    where: { id: accountId, userId: user.id },
  });

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function decommissionAccount(accountId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await getCachedUser(userId);
  if (!user) throw new Error("User not found");

  const account = await db.account.findUnique({
    where: { id: accountId, userId: user.id },
    include: {
      goalContributions: {
        where: { goal: { status: "ACTIVE" } },
      },
    },
  });

  if (!account) throw new Error("Account not found");

  const balance = account.balance.toNumber();
  const goalAllocations = account.goalContributions.reduce(
    (sum, c) => sum + c.amount.toNumber(),
    0
  );
  const usableBalance = balance - goalAllocations;

  if (usableBalance !== 0 || balance !== 0) {
    throw new Error(
      `Account balance must be ₹0.00 to decommission. Current usable balance: ₹${usableBalance.toFixed(2)}`
    );
  }

  await db.$transaction(async (tx) => {
    // If it was default, make another active account default
    if (account.isDefault) {
      const anotherActive = await tx.account.findFirst({
        where: {
          userId: user.id,
          id: { not: accountId },
          isDecommissioned: false,
        },
      });

      if (anotherActive) {
        await tx.account.update({
          where: { id: anotherActive.id },
          data: { isDefault: true },
        });
      }
    }

    await tx.account.update({
      where: { id: accountId },
      data: {
        isDecommissioned: true,
        isDefault: false,
      },
    });
  });

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  revalidatePath("/goals");
  revalidatePath("/transaction/create");
  return { success: true };
}

export async function recommissionAccount(accountId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await getCachedUser(userId);
  if (!user) throw new Error("User not found");

  const account = await db.account.findUnique({
    where: { id: accountId, userId: user.id },
  });

  if (!account) throw new Error("Account not found");

  await db.account.update({
    where: { id: accountId },
    data: { isDecommissioned: false },
  });

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  revalidatePath("/goals");
  revalidatePath("/transaction/create");
  return { success: true };
}

export const reactivateAccount = recommissionAccount;


