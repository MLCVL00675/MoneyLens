"use client";

import { useEffect, useState } from "react";
import { getInvestmentDetails } from "@/actions/investments";
import { formatCurrency } from "@/lib/utils";
import {
  X,
  TrendingUp,
  TrendingDown,
  Layers,
  Calendar,
  Wallet,
  ArrowUpRight,
  Sparkles,
  Receipt,
  FileText,
  Clock,
} from "lucide-react";
import { BarLoader } from "react-spinners";

interface HoldingDetailsModalProps {
  holdingId: string | null;
  onClose: () => void;
  onEdit?: (holding: any) => void;
}

export function HoldingDetailsModal({
  holdingId,
  onClose,
  onEdit,
}: HoldingDetailsModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!holdingId) return;
    let isMounted = true;
    setLoading(true);

    getInvestmentDetails(holdingId)
      .then((res) => {
        if (isMounted) setData(res);
      })
      .catch((err) => {
        console.error("Failed to load holding details:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [holdingId]);

  if (!holdingId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-cream-300 shadow-2xl overflow-hidden my-8 animate-scale-in">
        {/* Modal Header */}
        <div className="p-6 bg-cream-50/80 border-b border-cream-200 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-forest-500/10 text-forest-700 border border-forest-500/20">
                {data?.investment?.assetType === "MUTUAL_FUND" ? "Mutual Fund" : data?.investment?.assetType || "Investment"}
              </span>
              {data?.investment?.symbol && (
                <span className="text-xs font-mono font-medium text-gray-500 bg-white px-2 py-0.5 rounded border border-cream-300">
                  {data.investment.symbol}
                </span>
              )}
              {data?.investment?.folioOrAccount && (
                <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded border border-cream-300">
                  Folio: {data.investment.folioOrAccount}
                </span>
              )}
            </div>
            <h2 className="text-xl font-serif text-gray-900 font-bold">
              {data?.investment?.name || "Holding Details"}
            </h2>
            {data?.investment?.category && (
              <p className="text-xs text-gray-500">{data.investment.category}</p>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-cream-100 transition-default shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <BarLoader color="#4A8B6E" width={160} />
            <p className="text-xs text-gray-400 font-medium">Fetching transaction history &amp; allotments...</p>
          </div>
        ) : !data?.investment ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            Could not find investment information.
          </div>
        ) : (
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* Top Summary KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Total Units Held */}
              <div className="bg-cream-50/60 p-4 rounded-xl border border-cream-200">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block mb-1">
                  Total Units Held
                </span>
                <span className="text-xl font-bold font-serif text-gray-900 block font-mono">
                  {data.investment.units.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </span>
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Aggregate portfolio units
                </span>
              </div>

              {/* Avg Buy NAV */}
              <div className="bg-cream-50/60 p-4 rounded-xl border border-cream-200">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block mb-1">
                  Avg Buy NAV
                </span>
                <span className="text-xl font-bold font-serif text-gray-900 block">
                  {formatCurrency(data.investment.buyPrice)}
                </span>
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Weighted purchase cost
                </span>
              </div>

              {/* Current NAV */}
              <div className="bg-cream-50/60 p-4 rounded-xl border border-cream-200">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block mb-1">
                  Live NAV / CMP
                </span>
                <span className="text-xl font-bold font-serif text-gray-900 block">
                  {formatCurrency(data.investment.currentPrice)}
                </span>
                <span className="text-[10px] text-forest-600 mt-1 block font-medium">
                  Latest AMFI Valuation
                </span>
              </div>

              {/* Total Current Value & Return */}
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800 block mb-1">
                  Current Value
                </span>
                <span className="text-xl font-bold font-serif text-emerald-950 block">
                  {formatCurrency(data.investment.currentValue)}
                </span>
                <span
                  className={`text-[10px] font-semibold mt-1 flex items-center gap-0.5 ${
                    data.investment.totalReturn >= 0 ? "text-forest-600" : "text-coral-600"
                  }`}
                >
                  {data.investment.totalReturn >= 0 ? "+" : ""}
                  {formatCurrency(data.investment.totalReturn)} ({data.investment.returnPercent.toFixed(2)}%)
                </span>
              </div>
            </div>

            {/* Transactions & Allotment History */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-forest-600" />
                    Allotment &amp; Transaction History
                  </h3>
                  <p className="text-xs text-gray-400">
                    Detailed ledger of units credited and NAV at each transaction
                  </p>
                </div>
                <span className="text-xs font-medium text-gray-500 bg-cream-100 px-2.5 py-1 rounded-full">
                  {(data.openingBalance ? 1 : 0) + (data.transactions?.length || 0)} Lot(s)
                </span>
              </div>

              {/* Table */}
              <div className="border border-cream-300 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-cream-100/70 border-b border-cream-200 text-[10px] font-semibold tracking-wider uppercase text-gray-600">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Transaction / Description</th>
                      <th className="py-2.5 px-3 text-right">Amount Paid</th>
                      <th className="py-2.5 px-3 text-right">Allotment NAV</th>
                      <th className="py-2.5 px-3 text-right">Units Allotted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-100">
                    {/* 1. All Linked SIP & Expense Transactions */}
                    {data.transactions && data.transactions.length > 0 &&
                      data.transactions.map((t: any) => (
                        <tr key={t.id} className="hover:bg-cream-50/50 transition-default">
                          <td className="py-3 px-3 text-gray-700 whitespace-nowrap">
                            {new Date(t.date).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-3 px-3 font-medium text-gray-900">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-forest-100 text-forest-800">
                                {t.expenseType === "INVESTMENT" ? "SIP Allotment" : "Purchase"}
                              </span>
                              <span className="truncate max-w-[220px]" title={t.description}>
                                {t.description}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                            {formatCurrency(t.amount)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-medium text-gray-700 whitespace-nowrap">
                            {t.nav ? `₹${Number(t.nav).toFixed(4)}` : "—"}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-forest-700 whitespace-nowrap">
                            {t.units ? `+${Number(t.units).toFixed(4)}` : "—"}
                          </td>
                        </tr>
                      ))}

                    {/* 2. Opening Balance / Initial CAS Statement Import */}
                    {data.openingBalance && (
                      <tr className="bg-cream-50/30 hover:bg-cream-50/60 transition-default text-gray-600">
                        <td className="py-3 px-3 whitespace-nowrap">
                          {new Date(data.openingBalance.date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3 px-3 font-medium text-gray-800">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-navy-100 text-navy-800">
                              Opening Lot
                            </span>
                            <span>{data.openingBalance.description}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-gray-800 whitespace-nowrap">
                          {formatCurrency(data.openingBalance.amount)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-medium text-gray-700 whitespace-nowrap">
                          ₹{Number(data.openingBalance.nav).toFixed(4)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-forest-700 whitespace-nowrap">
                          +{Number(data.openingBalance.units).toFixed(4)}
                        </td>
                      </tr>
                    )}
                  </tbody>

                  {/* Summary Footer */}
                  <tfoot>
                    <tr className="bg-cream-100/90 border-t-2 border-cream-300 font-semibold text-gray-900 text-xs">
                      <td colSpan={2} className="py-3 px-3 text-gray-800 uppercase tracking-wider font-bold">
                        Total Holding Summary
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-gray-900 whitespace-nowrap">
                        {formatCurrency(data.investment.totalInvested)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-gray-800 whitespace-nowrap">
                        ₹{Number(data.investment.buyPrice).toFixed(4)} (Avg)
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-forest-800 whitespace-nowrap">
                        {Number(data.investment.units).toFixed(4)} Units
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 bg-cream-50/60 border-t border-cream-200 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Holdings are live synced with AMFI NAV updates &amp; transaction recordings.
          </p>
          <div className="flex items-center gap-2">
            {onEdit && data?.investment && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(data.investment);
                }}
                className="px-4 py-2 bg-white border border-cream-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-cream-100 transition-default"
              >
                Edit Holding
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-forest-600 text-white rounded-lg text-xs font-medium hover:bg-forest-700 transition-default"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
