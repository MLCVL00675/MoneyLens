"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AllocationSlice } from "@/lib/net-worth/types";
import { formatCurrency } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { PieChart as PieIcon } from "lucide-react";

interface AllocationDonutProps {
  allocation: AllocationSlice[];
  totalAssets: number;
}

export function AllocationDonut({ allocation, totalAssets }: AllocationDonutProps) {
  const router = useRouter();
  const [hoveredSlice, setHoveredSlice] = useState<AllocationSlice | null>(null);

  if (!allocation || allocation.length === 0 || totalAssets === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm flex flex-col items-center justify-center min-h-[280px] text-center">
        <div className="p-4 rounded-full bg-muted mb-3 text-muted-foreground">
          <PieIcon className="h-8 w-8" />
        </div>
        <h4 className="font-medium text-foreground text-sm">No Asset Data Yet</h4>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Add FDs, Bonds, SIPs, Gold, or link your investments to see your dynamic portfolio allocation.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6 shadow-sm transition-all">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-semibold text-lg text-foreground font-serif">
            Asset Allocation Portfolio
          </h3>
          <p className="text-xs text-muted-foreground">Comprehensive multi-asset weighting and distribution</p>
        </div>
        <div className="p-2 rounded-xl bg-primary/10 text-primary">
          <PieIcon className="h-5 w-5" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-6 pt-2">
        {/* Big Prominent Donut Chart to the Left */}
        <div className="md:col-span-5 relative flex items-center justify-center min-h-[280px]">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={allocation}
                cx="50%"
                cy="50%"
                innerRadius={78}
                outerRadius={114}
                paddingAngle={2.5}
                dataKey="value"
                onMouseEnter={(_, index) => setHoveredSlice(allocation[index])}
                onMouseLeave={() => setHoveredSlice(null)}
              >
                {allocation.map((entry, index) => {
                  const isHovered = hoveredSlice?.name === entry.name;
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke={isHovered ? "hsl(var(--foreground))" : "transparent"}
                      strokeWidth={isHovered ? 2 : 0}
                      onClick={() => {
                        if (entry.href) router.push(entry.href);
                      }}
                      className="transition-all duration-200 cursor-pointer outline-none hover:opacity-90"
                      style={{
                        filter: hoveredSlice && !isHovered ? "opacity(0.65)" : "opacity(1)",
                        transformOrigin: "center center",
                      }}
                    />
                  );
                })}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Dynamic Center Callout (Hero Display with 0 Overlapping Popups) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
            {hoveredSlice ? (
              <div className="animate-in fade-in zoom-in-95 duration-150 flex flex-col items-center max-w-[145px]">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: hoveredSlice.color }}
                  />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate max-w-[120px]">
                    {hoveredSlice.name}
                  </span>
                </div>
                <span className="text-base sm:text-lg font-bold text-foreground font-serif truncate max-w-[140px]">
                  {formatCurrency(hoveredSlice.value)}
                </span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 border"
                  style={{
                    backgroundColor: `${hoveredSlice.color}15`,
                    borderColor: `${hoveredSlice.color}40`,
                    color: hoveredSlice.color,
                  }}
                >
                  {hoveredSlice.percentage}% of assets
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center max-w-[145px] transition-all duration-200">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Total Assets
                </span>
                <span className="text-lg sm:text-xl font-bold text-foreground font-serif truncate max-w-[145px] mt-0.5">
                  {formatCurrency(totalAssets)}
                </span>
                <span className="text-[10px] font-semibold text-primary mt-0.5">
                  {allocation.length} Asset Classes
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Legend Grid on the Right */}
        <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[320px] overflow-y-auto pr-1">
          {allocation.map((slice) => {
            const isHovered = hoveredSlice?.name === slice.name;
            return (
              <div
                key={slice.name}
                onClick={() => {
                  if (slice.href) {
                    router.push(slice.href);
                  }
                }}
                onMouseEnter={() => setHoveredSlice(slice)}
                onMouseLeave={() => setHoveredSlice(null)}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                  isHovered
                    ? "bg-accent/60 border-primary/50 shadow-xs"
                    : "border-border/50 bg-card hover:bg-muted/40"
                }`}
                title={slice.href ? `Click to view ${slice.name}` : undefined}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: slice.color }}
                  />
                  <div className="min-w-0 truncate">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {slice.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {slice.category}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 pl-2">
                  <p className="text-xs font-bold text-foreground font-mono">
                    {formatCurrency(slice.value)}
                  </p>
                  <p className="text-[10px] font-semibold text-muted-foreground">
                    {slice.percentage}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
