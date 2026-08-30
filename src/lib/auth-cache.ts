import { db } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";

// In-memory cache for clerkUserId -> { id, email, name }
const userCache = new Map<string, { id: string; email: string; name?: string | null; cachedAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function getCachedUser(clerkUserId: string) {
  const now = Date.now();
  const cached = userCache.get(clerkUserId);

  if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
    return cached;
  }

  let user = await db.user.findUnique({
    where: { clerkUserId },
    select: { id: true, email: true, name: true },
  });

  // Auto-sync from Clerk if user is not in DB yet (e.g. after DB cleanup or new signup)
  if (!user) {
    try {
      const clerkUser = await currentUser();
      if (clerkUser && clerkUser.id === clerkUserId) {
        user = await db.user.upsert({
          where: { clerkUserId },
          update: {
            email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
            name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim(),
            imageUrl: clerkUser.imageUrl,
          },
          create: {
            clerkUserId,
            email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
            name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim(),
            imageUrl: clerkUser.imageUrl,
          },
          select: { id: true, email: true, name: true },
        });
      }
    } catch (e) {
      console.error("Error auto-syncing Clerk user to DB:", e);
    }
  }

  if (user) {
    userCache.set(clerkUserId, { ...user, cachedAt: now });
  }

  return user;
}

export function invalidateUserCache(clerkUserId: string) {
  userCache.delete(clerkUserId);
}
