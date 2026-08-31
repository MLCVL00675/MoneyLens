"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Plus, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/logo";

export function Topbar() {
  const router = useRouter();

  return (
    <header className="h-14 bg-cream-100 border-b border-cream-300 flex items-center justify-between px-3.5 sm:px-6 sticky top-0 z-30">
      {/* Left: Mobile Logo & Desktop Status */}
      <div className="flex items-center gap-2.5">
        <Link href="/dashboard" className="flex md:hidden items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg bg-navy-900 flex items-center justify-center p-1">
            <Logo variant="light" size={16} />
          </div>
          <span className="text-navy-900 font-serif font-bold text-base">MoneyLens</span>
        </Link>

        <div className="hidden md:flex items-center gap-2 text-sm">
          <div className="w-2 h-2 rounded-full bg-gold-500" />
          <span className="text-forest-700 font-medium">Your money, in focus</span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={() => router.refresh()}
          title="Refresh data"
          className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-lg border border-cream-300 bg-white text-xs sm:text-sm font-medium text-gray-700 hover:bg-cream-100 transition-default"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Refresh</span>
        </button>

        <Link
          href="/transaction/create"
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-navy-900 text-white text-xs sm:text-sm font-medium hover:bg-navy-800 transition-default shrink-0 shadow-2xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add <span className="hidden sm:inline">transaction</span></span>
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
