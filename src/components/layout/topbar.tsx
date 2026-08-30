"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Plus, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

export function Topbar() {
  const router = useRouter();

  return (
    <header className="h-14 bg-cream-100 border-b border-cream-300 flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Left: Status indicator */}
      <div className="flex items-center gap-2 text-sm">
        <div className="w-2 h-2 rounded-full bg-gold-500" />
        <span className="text-forest-700 font-medium">Your money, in focus</span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.refresh()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-cream-300 bg-white text-sm font-medium text-gray-700 hover:bg-cream-100 transition-default"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>

        <Link
          href="/transaction/create"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-navy-900 text-white text-sm font-medium hover:bg-navy-800 transition-default"
        >
          <Plus className="w-4 h-4" />
          Add transaction
        </Link>

        <UserButton
          appearance={{
            elements: {
              avatarBox: "w-8 h-8",
            },
          }}
        />
      </div>
    </header>
  );
}
