"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  BarChart3,
  Target,
  TrendingUp,
} from "lucide-react";

export function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/accounts", label: "Accounts", icon: Wallet },
    { href: "/investments", label: "Invest", icon: TrendingUp },
    { href: "/activity", label: "Activity", icon: ArrowLeftRight },
    { href: "/analysis", label: "Analysis", icon: BarChart3 },
    { href: "/goals", label: "Goals", icon: Target },
  ];

  const getIsActive = (itemHref: string) => {
    if (itemHref === "/dashboard") return pathname === "/dashboard";
    if (itemHref === "/accounts") return pathname.startsWith("/accounts") || pathname.startsWith("/account/");
    return pathname.startsWith(itemHref);
  };

  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-navy-900/95 backdrop-blur-md border-t border-white/10 px-2 py-1.5 shadow-2xl"
      style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = getIsActive(item.href);

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 min-w-[56px]",
                isActive
                  ? "text-gold-400 font-semibold"
                  : "text-gray-400 hover:text-white"
              )}
            >
              <div className="relative">
                <item.icon className={cn("w-5 h-5 transition-transform", isActive && "scale-110 text-gold-400")} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gold-400" />
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
