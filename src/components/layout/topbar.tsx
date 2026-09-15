"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Plus, RefreshCw, Wallet, Landmark } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();

  // Active mode check: Net Worth & Investments are under Net Worth Tracker
  const isNetWorthMode =
    pathname.startsWith("/net-worth") || pathname.startsWith("/investments");

  return (
    <header className="h-14 bg-cream-100 border-b border-cream-300 flex items-center justify-between px-3 sm:px-6 sticky top-0 z-30">
      {/* Left: Mobile Logo & Header Mode Switcher */}
      <div className="flex items-center gap-2 sm:gap-4">
        <Link href="/dashboard" className="flex md:hidden items-center gap-1.5 group shrink-0">
          <div className="w-7 h-7 rounded-lg bg-navy-900 flex items-center justify-center p-1">
            <Logo variant="light" size={16} />
          </div>
        </Link>

        {/* ─── Top Switch Button: Finance Manager vs Net Worth Tracker ─── */}
        <div className="inline-flex items-center p-1 rounded-xl bg-cream-200/90 border border-cream-300/80 shadow-2xs">
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
              !isNetWorthMode
                ? "bg-navy-900 text-white shadow-xs font-semibold"
                : "text-gray-600 hover:text-navy-900 hover:bg-cream-100/70"
            )}
          >
            <Wallet className="w-4 h-4" />
            <span className="hidden sm:inline">Finance Manager</span>
            <span className="sm:hidden">Finance</span>
          </Link>

          <Link
            href="/net-worth"
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
              isNetWorthMode
                ? "bg-forest-600 text-white shadow-xs font-semibold"
                : "text-gray-600 hover:text-navy-900 hover:bg-cream-100/70"
            )}
          >
            <Landmark className="w-4 h-4" />
            <span className="hidden sm:inline">Net Worth Tracker</span>
            <span className="sm:hidden">Net Worth</span>
          </Link>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {!isNetWorthMode && (
          <>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("refresh-net-worth"));
                }
                router.refresh();
              }}
              title="Refresh data"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cream-300 bg-white text-sm font-medium text-gray-700 hover:bg-cream-100 transition-default cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <Link
              href="/transaction/create"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-navy-900 text-white text-sm font-medium hover:bg-navy-800 transition-default shrink-0 shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add <span className="hidden sm:inline">transaction</span></span>
            </Link>
          </>
        )}

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
