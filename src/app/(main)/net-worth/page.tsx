import { Suspense } from "react";
import { NetWorthTrackerTab } from "@/components/net-worth/NetWorthTrackerTab";
import { LoadingState } from "@/components/ui/loading-state";

export const metadata = {
  title: "Net Worth Tracker — MoneyLens",
  description: "Track your complete net worth across equities, fixed deposits, bonds, gold, retirement, and liabilities.",
};

export default function NetWorthPage() {
  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      <Suspense
        fallback={
          <div className="py-20 flex justify-center">
            <LoadingState message="Loading your asset portfolio..." />
          </div>
        }
      >
        <NetWorthTrackerTab />
      </Suspense>
    </div>
  );
}
