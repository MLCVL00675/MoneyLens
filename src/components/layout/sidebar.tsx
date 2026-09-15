"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  BarChart3,
  Target,
  TrendingUp,
  Landmark,
  ShieldCheck,
  Coins,
  Building2,
  Sparkles,
  Home,
  CreditCard,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { useSidebar } from "@/components/layout/sidebar-context";

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get("category");
  const { isCollapsed, toggleSidebar } = useSidebar();

  // Mode detection: /net-worth and /investments belong to the Net Worth Tracker
  const isNetWorthMode =
    pathname.startsWith("/net-worth") || pathname.startsWith("/investments");

  // Finance Manager Navigation (No investments or net-worth items)
  const financeNavItems = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/accounts", label: "Accounts", icon: Wallet },
    { href: "/activity", label: "Activity", icon: ArrowLeftRight },
    { href: "/analysis", label: "Analysis", icon: BarChart3 },
    { href: "/goals", label: "Goals", icon: Target },
  ];

  // Net Worth Tracker Navigation (Dedicated tabs for all investment categories)
  const netWorthNavItems = [
    { href: "/net-worth", label: "Overview", icon: LayoutDashboard, category: null },
    { href: "/investments", label: "Stocks & MFs", icon: TrendingUp, category: "STOCKS_MFS" },
    { href: "/net-worth?category=FIXED_DEPOSIT", label: "Fixed Deposits & RD", icon: Landmark, category: "FIXED_DEPOSIT" },
    { href: "/net-worth?category=BOND", label: "Bonds & G-Sec", icon: ShieldCheck, category: "BOND" },
    { href: "/net-worth?category=REIT", label: "REITs & InvITs", icon: Building2, category: "REIT" },
    { href: "/net-worth?category=REAL_ESTATE", label: "Physical Real Estate", icon: Home, category: "REAL_ESTATE" },
    { href: "/net-worth?category=GOLD", label: "Physical Gold & Commodities", icon: Sparkles, category: "GOLD" },
    { href: "/net-worth?category=RETIREMENT", label: "Retirement (EPF/PPF)", icon: ShieldCheck, category: "RETIREMENT" },
    { href: "/net-worth?category=LIABILITY", label: "Liabilities & Loans", icon: CreditCard, category: "LIABILITY" },
  ];

  const currentNavItems = isNetWorthMode ? netWorthNavItems : financeNavItems;

  const getIsActive = (item: any) => {
    if (isNetWorthMode) {
      if (item.category === "STOCKS_MFS") {
        return pathname.startsWith("/investments");
      }
      if (item.category) {
        return pathname.startsWith("/net-worth") && currentCategory === item.category;
      }
      return pathname === "/net-worth" && !currentCategory;
    }

    if (item.href === "/dashboard") return pathname === "/dashboard";
    if (item.href === "/accounts") return pathname.startsWith("/accounts") || pathname.startsWith("/account/");
    return pathname.startsWith(item.href);
  };

  return (
    <aside
      className={cn(
        "hidden md:flex fixed left-0 top-0 bottom-0 bg-navy-900 flex-col z-40 transition-all duration-300 ease-in-out border-r border-white/5 select-none",
        isCollapsed ? "w-[68px]" : "w-[220px]"
      )}
    >
      {/* Header & Logo */}
      <div className={cn("p-4 pb-3 flex items-center", isCollapsed ? "justify-center" : "justify-between")}>
        <Link href={isNetWorthMode ? "/net-worth" : "/dashboard"} className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 p-1 group-hover:bg-white/15 transition-default">
            <Logo variant="light" size={20} />
          </div>
          {!isCollapsed && (
            <span className="text-white font-semibold text-base tracking-tight truncate">
              MoneyLens
            </span>
          )}
        </Link>

        {!isCollapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            title="Collapse sidebar"
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-default"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5 mt-3 flex flex-col overflow-y-auto scrollbar-none">
        <div className="space-y-1.5">
          {currentNavItems.map((item) => {
            const isActive = getIsActive(item);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "group relative flex items-center rounded-xl text-sm font-medium transition-all duration-200",
                  isCollapsed ? "justify-center h-10 w-full" : "gap-3 px-3.5 py-2.5",
                  isActive
                    ? "bg-navy-800 text-white shadow-sm font-semibold before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-gold-500 before:rounded-r"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon
                  className={cn(
                    "w-4 h-4 shrink-0 transition-colors",
                    isActive ? "text-gold-400" : "text-gray-400 group-hover:text-white"
                  )}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}

                {/* Floating Tooltip in Collapsed Mode */}
                {isCollapsed && (
                  <div className="opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 bg-navy-800 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none border border-white/10 flex items-center gap-1.5">
                    <span>{item.label}</span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* Clickable empty space when collapsed to quickly expand */}
        {isCollapsed && (
          <div
            onClick={toggleSidebar}
            title="Click to expand sidebar"
            className="flex-1 cursor-pointer w-full"
          />
        )}
      </nav>

      {/* Clickable Bottom Area to Toggle / Open Sidebar */}
      <div
        onClick={toggleSidebar}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleSidebar();
          }
        }}
        title={isCollapsed ? "Click to expand sidebar" : "Click to collapse sidebar"}
        className={cn(
          "border-t border-white/5 cursor-pointer hover:bg-white/5 transition-default group",
          isCollapsed ? "p-3 flex items-center justify-center" : "p-3.5 flex items-center justify-between"
        )}
      >
        {isCollapsed ? (
          <div className="relative flex items-center justify-center text-gray-400 group-hover:text-white transition-colors">
            <PanelLeftOpen className="w-4 h-4" />
            <div className="opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 bg-navy-800 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none border border-white/10">
              Expand sidebar
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-[10px] leading-relaxed truncate group-hover:text-gray-400 transition-colors">
            MoneyLens · Command centre
          </p>
        )}
      </div>
    </aside>
  );
}
