"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { DEFAULT_CATEGORIES } from "@/lib/utils";
import { getCachedUser } from "@/lib/auth-cache";
import { revalidatePath } from "next/cache";

export async function getCategories(type?: "EXPENSE" | "INCOME") {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await getCachedUser(userId);
  if (!user) throw new Error("User not found");

  let customCategories: any[] = [];
  try {
    if (type) {
      customCategories = await db.$queryRaw<any[]>`
        SELECT "id", "name", "icon", "type"::text as "type", "isDefault", "userId"
        FROM "Category"
        WHERE "userId" = ${user.id} AND "type" = ${type}::"TransactionType"
        ORDER BY "name" ASC;
      `;
    } else {
      customCategories = await db.$queryRaw<any[]>`
        SELECT "id", "name", "icon", "type"::text as "type", "isDefault", "userId"
        FROM "Category"
        WHERE "userId" = ${user.id}
        ORDER BY "name" ASC;
      `;
    }
  } catch {
    customCategories = await db.category.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
    });
  }

  // Combine with defaults
  let defaults = DEFAULT_CATEGORIES.map((c) => ({
    id: c.name,
    name: c.name,
    icon: c.icon,
    type: c.type,
    isDefault: true,
    userId: null,
  }));

  if (type) {
    defaults = defaults.filter((c) => c.type === type);
  }

  return [...defaults, ...customCategories];
}

export async function createCategory(data: { name: string; icon?: string; type?: "EXPENSE" | "INCOME" }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await getCachedUser(userId);
  if (!user) throw new Error("User not found");

  const categoryName = data.name.trim();
  const categoryIcon = data.icon || "◇";
  const categoryType = data.type || "EXPENSE";

  // Check if it matches a default category of the SAME type
  const isDefault = DEFAULT_CATEGORIES.some(
    (c) => c.type === categoryType && c.name.toLowerCase() === categoryName.toLowerCase()
  );
  if (isDefault) {
    throw new Error(`"${categoryName}" is already a default ${categoryType.toLowerCase()} category`);
  }

  const id = crypto.randomUUID();

  try {
    await db.$executeRaw`
      INSERT INTO "Category" ("id", "name", "icon", "type", "isDefault", "userId")
      VALUES (${id}, ${categoryName}, ${categoryIcon}, ${categoryType}::"TransactionType", false, ${user.id})
      ON CONFLICT ("name", "type", "userId") DO UPDATE SET "icon" = ${categoryIcon};
    `;
  } catch {
    await db.category.upsert({
      where: { name_type_userId: { name: categoryName, type: categoryType, userId: user.id } } as any,
      update: { icon: categoryIcon },
      create: {
        name: categoryName,
        icon: categoryIcon,
        type: categoryType,
        isDefault: false,
        userId: user.id,
      } as any,
    });
  }

  revalidatePath("/transaction/create");
  return { id, name: categoryName, icon: categoryIcon, type: categoryType };
}

export async function deleteCategory(categoryId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await getCachedUser(userId);
  if (!user) throw new Error("User not found");

  await db.$executeRaw`
    DELETE FROM "Category"
    WHERE ("id" = ${categoryId} OR "name" = ${categoryId}) AND "userId" = ${user.id};
  `;

  revalidatePath("/transaction/create");
  return { success: true };
}
