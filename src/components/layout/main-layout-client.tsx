"use client";

import React from "react";
import { SidebarProvider, useSidebar } from "@/components/layout/sidebar-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { cn } from "@/lib/utils";

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-cream-100">
      <Sidebar />
      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          isCollapsed ? "ml-[68px]" : "ml-[220px]"
        )}
      >
        <Topbar />
        <main className="p-6 max-w-7xl mx-auto">{children}</main>
      </div>
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
