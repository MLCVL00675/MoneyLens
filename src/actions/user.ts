"use server";

import { db } from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";

export async function checkUser() {
  const { userId } = await auth();
  if (!userId) return null;

  const existingUser = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (existingUser) return existingUser;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const newUser = await db.user.create({
    data: {
      clerkUserId: userId,
      email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
      name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim(),
      imageUrl: clerkUser.imageUrl,
    },
  });

  return newUser;
}

export async function getUserByClerkId() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      accounts: { orderBy: { createdAt: "desc" } },
      budget: true,
    },
  });

  if (!user) throw new Error("User not found");
  return user;
}
