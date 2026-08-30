"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { serializeTransaction } from "@/lib/utils";
import { getCachedUser } from "@/lib/auth-cache";
import { revalidatePath } from "next/cache";

export async function createGoal(data: {
  name: string;
  targetAmount: number;
  deadline?: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await getCachedUser(userId);
  if (!user) throw new Error("User not found");

  const goal = await db.goal.create({
    data: {
      name: data.name,
      targetAmount: data.targetAmount,
      deadline: data.deadline ? new Date(data.deadline) : null,
      userId: user.id,
    },
  });

  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return serializeTransaction(goal);
}

export async function getGoals() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await getCachedUser(userId);
  if (!user) throw new Error("User not found");

  const goals = await db.goal.findMany({
    where: { userId: user.id },
    include: {
      contributions: {
        include: { account: { select: { id: true, name: true, type: true } } },
        orderBy: { date: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return serializeTransaction(goals);
}

export async function contributeToGoal(data: {
  goalId: string;
  amount: number;
  accountId: string;
  description?: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await getCachedUser(userId);
  if (!user) throw new Error("User not found");

  const goal = await db.goal.findUnique({
    where: { id: data.goalId, userId: user.id },
  });
  if (!goal) throw new Error("Goal not found");

  const target = goal.targetAmount.toNumber();
  const current = goal.currentAmount.toNumber();
  const remainingNeeded = Math.max(0, target - current);

  if (remainingNeeded <= 0) {
    throw new Error("This goal has already reached 100% of its target amount.");
  }

  // Only take up to the maximum unfunded amount
  const actualContributionAmount = Math.min(data.amount, remainingNeeded);

  const result = await db.$transaction(async (tx) => {
    // Create contribution record with clamped amount
    const contribution = await tx.goalContribution.create({
      data: {
        amount: actualContributionAmount,
        description: data.description || "Goal contribution",
        goalId: data.goalId,
        accountId: data.accountId,
      },
    });

    // Update goal current amount
    const newCurrent = current + actualContributionAmount;
    const isCompleted = newCurrent >= target;

    await tx.goal.update({
      where: { id: data.goalId },
      data: {
        currentAmount: newCurrent,
        ...(isCompleted ? { status: "COMPLETED" } : {}),
      },
    });

    return {
      ...contribution,
      adjustedAmount: actualContributionAmount,
      wasClamped: actualContributionAmount < data.amount,
    };
  });

  revalidatePath("/goals");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return serializeTransaction(result);
}

export async function redeemGoal(goalId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await getCachedUser(userId);
  if (!user) throw new Error("User not found");

  const goal = await db.goal.findUnique({
    where: { id: goalId, userId: user.id },
    include: {
      contributions: true,
    },
  });

  if (!goal) throw new Error("Goal not found");

  // Enforce 100% completion rule
  if (
    goal.currentAmount.toNumber() < goal.targetAmount.toNumber() &&
    goal.status !== "COMPLETED"
  ) {
    throw new Error(
      "Goal can only be redeemed once 100% of the target amount has been saved."
    );
  }

  await db.$transaction(async (tx) => {
    // Group contributions by account to create expense transactions
    const accountTotals: Record<string, number> = {};
    for (const contribution of goal.contributions) {
      accountTotals[contribution.accountId] =
        (accountTotals[contribution.accountId] || 0) +
        contribution.amount.toNumber();
    }

    const now = new Date();

    for (const [accountId, amount] of Object.entries(accountTotals)) {
      // Create expense transaction for this redemption
      await tx.transaction.create({
        data: {
          type: "EXPENSE",
          amount,
          description: `Goal Redeemed: ${goal.name}`,
          date: now,
          category: "Shopping",
          accountId,
          userId: user.id,
          status: "COMPLETED",
          isRecurring: false,
        },
      });

      // Deduct from bank account balance
      await tx.account.update({
        where: { id: accountId },
        data: {
          balance: { decrement: amount },
        },
      });
    }

    // Mark goal as redeemed
    await tx.goal.update({
      where: { id: goalId },
      data: { status: "REDEEMED" },
    });
  });

  revalidatePath("/goals");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  revalidatePath("/activity");
  return { success: true };
}

export async function deleteGoal(goalId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await getCachedUser(userId);
  if (!user) throw new Error("User not found");

  await db.goal.delete({
    where: { id: goalId, userId: user.id },
  });

  revalidatePath("/goals");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateGoalContribution(data: {
  id: string;
  amount: number;
  accountId: string;
  description?: string;
  date?: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await getCachedUser(userId);
  if (!user) throw new Error("User not found");

  const contribution = await db.goalContribution.findUnique({
    where: { id: data.id },
    include: { goal: true },
  });

  if (!contribution || contribution.goal.userId !== user.id) {
    throw new Error("Goal transaction not found");
  }

  const oldAmount = contribution.amount.toNumber();
  const newAmount = Number(data.amount);
  if (isNaN(newAmount) || newAmount <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  const delta = newAmount - oldAmount;
  const target = contribution.goal.targetAmount.toNumber();
  const current = contribution.goal.currentAmount.toNumber();
  const newGoalCurrent = Math.max(0, current + delta);

  const updatedContribution = await db.$transaction(async (tx) => {
    const updated = await tx.goalContribution.update({
      where: { id: data.id },
      data: {
        amount: newAmount,
        accountId: data.accountId,
        description: data.description || "Goal contribution",
        date: data.date ? new Date(data.date) : contribution.date,
      },
      include: {
        account: { select: { id: true, name: true, type: true } },
      },
    });

    const isCompleted = newGoalCurrent >= target;
    const shouldBeActive = newGoalCurrent < target && contribution.goal.status === "COMPLETED";

    await tx.goal.update({
      where: { id: contribution.goalId },
      data: {
        currentAmount: newGoalCurrent,
        ...(isCompleted ? { status: "COMPLETED" } : shouldBeActive ? { status: "ACTIVE" } : {}),
      },
    });

    return updated;
  });

  revalidatePath("/goals");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return serializeTransaction(updatedContribution);
}

export async function deleteGoalContribution(contributionId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await getCachedUser(userId);
  if (!user) throw new Error("User not found");

  const contribution = await db.goalContribution.findUnique({
    where: { id: contributionId },
    include: { goal: true },
  });

  if (!contribution || contribution.goal.userId !== user.id) {
    throw new Error("Goal transaction not found");
  }

  const amount = contribution.amount.toNumber();
  const target = contribution.goal.targetAmount.toNumber();
  const current = contribution.goal.currentAmount.toNumber();
  const newGoalCurrent = Math.max(0, current - amount);

  await db.$transaction(async (tx) => {
    await tx.goalContribution.delete({
      where: { id: contributionId },
    });

    const shouldRevertToActive = newGoalCurrent < target && contribution.goal.status === "COMPLETED";

    await tx.goal.update({
      where: { id: contribution.goalId },
      data: {
        currentAmount: newGoalCurrent,
        ...(shouldRevertToActive ? { status: "ACTIVE" } : {}),
      },
    });
  });

  revalidatePath("/goals");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return { success: true };
}

