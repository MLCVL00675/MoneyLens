"use client";

import React from "react";
import { SidebarProvider, useSidebar } from "@/components/layout/sidebar-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { cn } from "@/lib/utils";

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-cream-100 flex flex-col">
      <React.Suspense fallback={<div className="hidden md:flex fixed left-0 top-0 bottom-0 bg-navy-900 w-[220px]" />}>
        <Sidebar />
      </React.Suspense>
      <div
        className={cn(
          "transition-all duration-300 ease-in-out flex-1 flex flex-col",
          isCollapsed ? "ml-0 md:ml-[68px]" : "ml-0 md:ml-[220px]"
        )}
      >
        <Topbar />
        <main className="p-3.5 sm:p-6 pb-24 md:pb-8 max-w-7xl mx-auto w-full flex-1">{children}</main>
      </div>
      <React.Suspense fallback={null}>
        <MobileNav />
      </React.Suspense>
    </div>
  );
}

export function MainLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
}
