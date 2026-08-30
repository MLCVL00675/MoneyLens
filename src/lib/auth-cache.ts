import { db } from "@/lib/prisma";

// In-memory cache for clerkUserId -> { id, email, name }
const userCache = new Map<string, { id: string; email: string; name?: string | null; cachedAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function getCachedUser(clerkUserId: string) {
  const now = Date.now();
  const cached = userCache.get(clerkUserId);

  if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
    return cached;
  }

  const user = await db.user.findUnique({
    where: { clerkUserId },
    select: { id: true, email: true, name: true },
  });

  if (user) {
    userCache.set(clerkUserId, { ...user, cachedAt: now });
  }

  return user;
}

export function invalidateUserCache(clerkUserId: string) {
  userCache.delete(clerkUserId);
}
