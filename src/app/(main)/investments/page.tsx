"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getInvestments,
  createInvestment,
  updateInvestment,
  deleteInvestment,
  syncInvestmentPrices,
  parseInvestmentStatement,
  importInvestments,
  ParsedHolding,
} from "@/actions/investments";
import { searchAssets, getAssetLiveQuote, MarketSearchResult } from "@/lib/market-api";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { LoadingState } from "@/components/ui/loading-state";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  RefreshCw,
  Sparkles,
  Upload,
  Trash2,
  Pencil,
  Search,
  PieChart as PieIcon,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  FileText,
  Check,
  X,
  Building2,
  Coins,
  ChevronRight,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const ALLOCATION_COLORS = ["#4A8B6E", "#6366F1", "#D4A843", "#EC4899", "#8B5CF6", "#F59E0B"];

export default function InvestmentsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<"ALL" | "MUTUAL_FUND" | "STOCK">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Manual Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [assetSearch, setAssetSearch] = useState("");
  const [searchResults, setSearchResults] = useState<MarketSearchResult[]>([]);
  const [searchingAssets, setSearchingAssets] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<MarketSearchResult | null>(null);
  const [formName, setFormName] = useState("");
  const [formSymbol, setFormSymbol] = useState("");
  const [formAssetType, setFormAssetType] = useState<"MUTUAL_FUND" | "STOCK" | "ETF">("MUTUAL_FUND");
  const [formUnits, setFormUnits] = useState("");
  const [formBuyPrice, setFormBuyPrice] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formFolio, setFormFolio] = useState("");
  const [addingInvestment, setAddingInvestment] = useState(false);

  // AI Statement Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importingFile, setImportingFile] = useState(false);
  const [parsedHoldings, setParsedHoldings] = useState<ParsedHolding[]>([]);
  const [selectedHoldingIndices, setSelectedHoldingIndices] = useState<Set<number>>(new Set());
  const [savingImport, setSavingImport] = useState(false);

  // Edit Modal State
  const [editHolding, setEditHolding] = useState<any | null>(null);
  const [editUnits, setEditUnits] = useState("");
  const [editBuyPrice, setEditBuyPrice] = useState("");
  const [editFolio, setEditFolio] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Confirm
  const [deleteHoldingItem, setDeleteHoldingItem] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await getInvestments();
      setData(res);
    } catch {
      toast.error("Failed to load investment portfolio");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Live Asset Search Debounce
  useEffect(() => {
    if (!assetSearch || assetSearch.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingAssets(true);
      try {
        const results = await searchAssets(assetSearch);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchingAssets(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [assetSearch]);

  const handleSelectAsset = async (asset: MarketSearchResult) => {
    setSelectedAsset(asset);
    setFormName(asset.name);
    setFormSymbol(asset.symbol);
    setFormAssetType(asset.assetType as any);
    setFormCategory(asset.category || "");
    setSearchResults([]);
    setAssetSearch("");

    // Fetch live quote to pre-fill buy price
    try {
      const quote = await getAssetLiveQuote(asset.symbol, asset.assetType);
      if (quote?.price) {
        setFormBuyPrice(String(quote.price));
        if (quote.category) setFormCategory(quote.category);
      }
    } catch {
      // Ignore
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const units = parseFloat(formUnits);
    const buyPrice = parseFloat(formBuyPrice);

    if (!formName.trim() || isNaN(units) || units <= 0 || isNaN(buyPrice) || buyPrice <= 0) {
      toast.error("Please enter valid name, units, and purchase price");
      return;
    }

    setAddingInvestment(true);
    try {
      await createInvestment({
        name: formName.trim(),
        symbol: formSymbol.trim() || formName.trim(),
        assetType: formAssetType,
        units,
        buyPrice,
        category: formCategory.trim() || undefined,
        folioOrAccount: formFolio.trim() || undefined,
      });

      toast.success(`"${formName}" added to portfolio!`);
      setShowAddModal(false);
      resetAddForm();
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to add investment");
    } finally {
      setAddingInvestment(false);
    }
  };

  const resetAddForm = () => {
    setSelectedAsset(null);
    setFormName("");
    setFormSymbol("");
    setFormUnits("");
    setFormBuyPrice("");
    setFormCategory("");
    setFormFolio("");
    setAssetSearch("");
    setSearchResults([]);
  };

  // Sync Live Prices
  const handleSyncPrices = async () => {
    setSyncing(true);
    try {
      const res = await syncInvestmentPrices();
      toast.success(`Updated live prices for ${res.updatedCount} assets`);
      loadData();
    } catch {
      toast.error("Failed to sync live market prices");
    } finally {
      setSyncing(false);
    }
  };

  // Handle Statement File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportingFile(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const res = await parseInvestmentStatement(base64, file.type);
        if (res.success && res.data && res.data.length > 0) {
          setParsedHoldings(res.data);
          setSelectedHoldingIndices(new Set(res.data.map((_, i) => i)));
          toast.success(`AI extracted ${res.data.length} holdings from statement!`);
        } else {
          toast.error(res.error || "Could not find holdings in statement");
        }
        setImportingFile(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Failed to read file");
      setImportingFile(false);
    }
  };

  const handleConfirmImport = async () => {
    const selected = parsedHoldings.filter((_, i) => selectedHoldingIndices.has(i));
    if (selected.length === 0) {
      toast.error("Please select at least one holding to import");
      return;
    }

    setSavingImport(true);
    try {
      const res = await importInvestments(selected);
      toast.success(`Successfully imported ${res.count} investments to your portfolio!`);
      setShowImportModal(false);
      setParsedHoldings([]);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to import investments");
    } finally {
      setSavingImport(false);
    }
  };

  // Edit Holding
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editHolding) return;
    const units = parseFloat(editUnits);
    const buyPrice = parseFloat(editBuyPrice);

    if (isNaN(units) || units <= 0 || isNaN(buyPrice) || buyPrice <= 0) {
      toast.error("Please enter valid units and purchase price");
      return;
    }

    setSavingEdit(true);
    try {
      await updateInvestment(editHolding.id, {
        units,
        buyPrice,
        folioOrAccount: editFolio.trim() || undefined,
      });
      toast.success("Holding updated");
      setEditHolding(null);
      loadData();
    } catch {
      toast.error("Failed to update holding");
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete Holding
  const handleDeleteHolding = async () => {
    if (!deleteHoldingItem) return;
    setDeleting(true);
    try {
      await deleteInvestment(deleteHoldingItem.id);
      toast.success("Investment removed from portfolio");
      setDeleteHoldingItem(null);
      loadData();
    } catch {
      toast.error("Failed to delete investment");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <LoadingState
        title="Loading Investments"
        message="Fetching your mutual funds, stock holdings, and live NAV prices..."
      />
    );
  }

  const { summary, assetAllocation, holdings } = data || {
    summary: { totalInvested: 0, totalCurrentValue: 0, totalReturn: 0, totalReturnPercent: 0, totalDayChange: 0, holdingCount: 0 },
    assetAllocation: [],
    holdings: [],
  };

  const filteredHoldings = holdings.filter((h: any) => {
    if (activeTab === "MUTUAL_FUND" && h.assetType !== "MUTUAL_FUND") return false;
    if (activeTab === "STOCK" && h.assetType !== "STOCK" && h.assetType !== "ETF") return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        h.name.toLowerCase().includes(q) ||
        h.symbol.toLowerCase().includes(q) ||
        (h.category && h.category.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-500 mb-1">
            Wealth &amp; Portfolio
          </p>
          <h1 className="text-3xl font-serif text-gray-900">Investments</h1>
          <p className="text-gray-500 text-sm mt-1">
            Track Mutual Funds and Stocks with live AMFI NAVs and market updates.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleSyncPrices}
            disabled={syncing || holdings.length === 0}
            title="Refresh latest NAV and CMP market prices"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-cream-300 text-xs sm:text-sm font-medium text-navy-900 hover:bg-cream-50 transition-default shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin text-forest-600" : ""}`} />
            <span>{syncing ? "Syncing..." : "Sync Live Prices"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-navy-900 text-white text-xs sm:text-sm font-medium hover:bg-navy-800 transition-default shadow-2xs"
          >
            <Sparkles className="w-4 h-4 text-gold-400" />
            <span>AI Import Statement</span>
          </button>

          <button
            type="button"
            onClick={() => {
              resetAddForm();
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-forest-500 text-white text-xs sm:text-sm font-medium hover:bg-forest-600 transition-default shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Asset</span>
          </button>
        </div>
      </div>

      {/* Portfolio Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Current Value */}
        <div className="stat-card bg-gradient-to-br from-navy-900 to-navy-950 text-white border-0 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-400">
              Portfolio Value
            </p>
            <Building2 className="w-4 h-4 text-gold-400" />
          </div>
          <p className="text-2xl font-bold">{formatCurrency(summary.totalCurrentValue)}</p>
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
            <span>{summary.holdingCount} Assets held</span>
          </p>
        </div>

        {/* Total Invested */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-500">
              Total Invested
            </p>
            <Coins className="w-4 h-4 text-forest-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(summary.totalInvested)}
          </p>
          <p className="text-xs text-gray-400 mt-2">Cost basis</p>
        </div>

        {/* All-Time Returns */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-500">
              All-Time Gain / Loss
            </p>
            {summary.totalReturn >= 0 ? (
              <TrendingUp className="w-4 h-4 text-forest-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-coral-600" />
            )}
          </div>
          <p className={`text-2xl font-bold ${summary.totalReturn >= 0 ? "text-forest-600" : "text-coral-600"}`}>
            {summary.totalReturn >= 0 ? "+" : ""}{formatCurrency(summary.totalReturn)}
          </p>
          <p className="text-xs mt-2">
            <span className={`font-semibold ${summary.totalReturnPercent >= 0 ? "text-forest-600" : "text-coral-600"}`}>
              {summary.totalReturnPercent >= 0 ? "+" : ""}{summary.totalReturnPercent.toFixed(2)}%
            </span>
            <span className="text-gray-400"> overall</span>
          </p>
        </div>

        {/* 1-Day Returns */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-500">
              Today&apos;s Movement
            </p>
            {summary.totalDayChange >= 0 ? (
              <ArrowUpRight className="w-4 h-4 text-forest-600" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-coral-600" />
            )}
          </div>
          <p className={`text-2xl font-bold ${summary.totalDayChange >= 0 ? "text-forest-600" : "text-coral-600"}`}>
            {summary.totalDayChange >= 0 ? "+" : ""}{formatCurrency(summary.totalDayChange)}
          </p>
          <p className="text-xs mt-2">
            <span className={`font-semibold ${summary.totalDayChangePercent >= 0 ? "text-forest-600" : "text-coral-600"}`}>
              {summary.totalDayChangePercent >= 0 ? "+" : ""}{summary.totalDayChangePercent.toFixed(2)}%
            </span>
            <span className="text-gray-400"> 1D change</span>
          </p>
        </div>
      </div>

      {/* Asset Allocation & Top Performers Grid */}
      {assetAllocation.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Portfolio Distribution with Centered Donut and Progress Bars */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-cream-300 p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-cream-200">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-500 mb-0.5">
                  Asset Allocation
                </p>
                <h3 className="text-base font-serif text-gray-900">Portfolio Distribution</h3>
              </div>
              <span className="text-xs font-semibold text-gray-500 bg-cream-100 px-2.5 py-1 rounded-full">
                {holdings.length} Assets
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 my-auto py-2">
              {/* Donut Chart with Center Metric */}
              <div className="w-40 h-40 relative shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assetAllocation}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={72}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {assetAllocation.map((_: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: any) => formatCurrency(Number(val) || 0)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-1">
                  <p className="text-[9px] uppercase font-bold tracking-wider text-gray-400">Total</p>
                  <p
                    className="text-xs font-bold text-gray-900 truncate max-w-[85px]"
                    title={formatCurrency(summary.totalCurrentValue)}
                  >
                    {formatCurrency(summary.totalCurrentValue).split(".")[0]}
                  </p>
                </div>
              </div>

              {/* Segmented Asset Bars & Values */}
              <div className="flex-1 w-full space-y-3.5">
                {assetAllocation.map((item: any, i: number) => (
                  <div key={item.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length] }}
                        />
                        <span className="font-semibold text-gray-800">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-gray-900">{formatCurrency(item.value)}</span>
                        <span className="text-gray-400 text-[11px] ml-1 font-medium">
                          ({item.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-cream-200/80 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(item.percentage, 3)}%`,
                          backgroundColor: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Performers / Portfolio Highlights Card */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-cream-300 p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-cream-200">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-500 mb-0.5">
                  Performance
                </p>
                <h3 className="text-base font-serif text-gray-900">Top Performers</h3>
              </div>
              <span className="text-xs font-semibold text-forest-700 bg-forest-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Gainers</span>
              </span>
            </div>

            {holdings.length > 0 ? (
              <div className="divide-y divide-cream-100 my-auto">
                {[...holdings]
                  .sort((a: any, b: any) => b.returnPercent - a.returnPercent)
                  .slice(0, 3)
                  .map((h: any) => {
                    const isProfit = h.totalReturn >= 0;
                    return (
                      <div key={h.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate" title={h.name}>
                            {h.name}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                            {h.symbol} · {h.assetType === "MUTUAL_FUND" ? "Mutual Fund" : h.assetType}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-xs font-bold ${isProfit ? "text-forest-600" : "text-coral-600"}`}>
                            {isProfit ? "+" : ""}{formatCurrency(h.totalReturn)}
                          </p>
                          <p className={`text-[10px] font-semibold ${isProfit ? "text-forest-600" : "text-coral-600"}`}>
                            {isProfit ? "+" : ""}{h.returnPercent.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400 text-xs">
                No performance data yet.
              </div>
            )}

            <div className="pt-3 mt-2 border-t border-cream-200 flex items-center justify-between text-[11px] text-gray-500">
              <span>Overall Portfolio ROI:</span>
              <strong className={summary.totalReturnPercent >= 0 ? "text-forest-600 font-bold" : "text-coral-600 font-bold"}>
                {summary.totalReturnPercent >= 0 ? "+" : ""}{summary.totalReturnPercent.toFixed(2)}%
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Holdings Section */}
      <div className="bg-white rounded-2xl border border-cream-300 overflow-hidden shadow-sm">
        {/* Filter Bar */}
        <div className="p-4 border-b border-cream-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-cream-50/40">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-default ${
                activeTab === "ALL"
                  ? "bg-navy-900 text-white"
                  : "bg-white text-gray-600 hover:bg-cream-100 border border-cream-300"
              }`}
            >
              All Assets ({holdings.length})
            </button>
            <button
              onClick={() => setActiveTab("MUTUAL_FUND")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-default ${
                activeTab === "MUTUAL_FUND"
                  ? "bg-navy-900 text-white"
                  : "bg-white text-gray-600 hover:bg-cream-100 border border-cream-300"
              }`}
            >
              Mutual Funds ({holdings.filter((h: any) => h.assetType === "MUTUAL_FUND").length})
            </button>
            <button
              onClick={() => setActiveTab("STOCK")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-default ${
                activeTab === "STOCK"
                  ? "bg-navy-900 text-white"
                  : "bg-white text-gray-600 hover:bg-cream-100 border border-cream-300"
              }`}
            >
              Stocks &amp; ETFs ({holdings.filter((h: any) => h.assetType === "STOCK" || h.assetType === "ETF").length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your holdings..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-cream-300 text-xs focus:outline-none focus:ring-1 focus:ring-forest-500 bg-white"
            />
          </div>
        </div>

        {/* Holdings List Header (Desktop) */}
        <div className="hidden md:grid md:grid-cols-[1.4fr_100px_100px_110px_120px_130px_70px] gap-3 px-5 py-3 border-b border-cream-200 text-[10px] font-semibold tracking-[0.1em] uppercase text-gray-500 bg-cream-50/30">
          <div>Holding Name</div>
          <div className="text-right">Units</div>
          <div className="text-right">Avg Cost</div>
          <div className="text-right">Live CMP / NAV</div>
          <div className="text-right">Current Value</div>
          <div className="text-right">Total Gain / Loss</div>
          <div className="text-right">Actions</div>
        </div>

        {/* Holdings Rows */}
        {filteredHoldings.length > 0 ? (
          <div className="divide-y divide-cream-200">
            {filteredHoldings.map((h: any) => {
              const isProfit = h.totalReturn >= 0;
              const isDayProfit = h.dayChange >= 0;

              return (
                <div
                  key={h.id}
                  className="p-4 sm:px-5 sm:py-3.5 hover:bg-cream-50/60 transition-default"
                >
                  {/* Desktop Tabular Grid */}
                  <div className="hidden md:grid md:grid-cols-[1.4fr_100px_100px_110px_120px_130px_70px] gap-3 items-center">
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            h.assetType === "MUTUAL_FUND"
                              ? "bg-forest-500/10 text-forest-700"
                              : h.assetType === "ETF"
                              ? "bg-purple-500/10 text-purple-700"
                              : "bg-blue-500/10 text-blue-700"
                          }`}
                        >
                          {h.assetType === "MUTUAL_FUND" ? "MF" : h.assetType}
                        </span>
                        <h4 className="text-sm font-semibold text-gray-900 truncate" title={h.name}>
                          {h.name}
                        </h4>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                        {h.symbol && <span className="font-mono text-gray-500">{h.symbol}</span>}
                        {h.category && <span> · {h.category}</span>}
                        {h.folioOrAccount && <span> · Folio: {h.folioOrAccount}</span>}
                      </p>
                    </div>

                    <div className="text-right text-sm font-medium text-gray-800">
                      {h.units.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </div>

                    <div className="text-right text-sm text-gray-600">
                      {formatCurrency(h.buyPrice)}
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(h.currentPrice)}</p>
                      {h.dayChangePercent !== 0 && (
                        <p className={`text-[10px] font-semibold ${isDayProfit ? "text-forest-600" : "text-coral-600"}`}>
                          {isDayProfit ? "+" : ""}{h.dayChangePercent.toFixed(2)}%
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(h.currentValue)}</p>
                      <p className="text-[10px] text-gray-400">Inv: {formatCurrency(h.investedAmount)}</p>
                    </div>

                    <div className="text-right">
                      <p className={`text-sm font-bold ${isProfit ? "text-forest-600" : "text-coral-600"}`}>
                        {isProfit ? "+" : ""}{formatCurrency(h.totalReturn)}
                      </p>
                      <p className={`text-[10px] font-semibold ${isProfit ? "text-forest-600" : "text-coral-600"}`}>
                        {isProfit ? "+" : ""}{h.returnPercent.toFixed(2)}%
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => {
                          setEditHolding(h);
                          setEditUnits(String(h.units));
                          setEditBuyPrice(String(h.buyPrice));
                          setEditFolio(h.folioOrAccount || "");
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-navy-900 hover:bg-cream-100 transition-default"
                        title="Edit holding"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteHoldingItem(h)}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-coral-500 hover:bg-coral-50 transition-default"
                        title="Delete holding"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Mobile Card View */}
                  <div className="flex md:hidden flex-col gap-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                              h.assetType === "MUTUAL_FUND"
                                ? "bg-forest-500/10 text-forest-700"
                                : "bg-blue-500/10 text-blue-700"
                            }`}
                          >
                            {h.assetType === "MUTUAL_FUND" ? "MF" : h.assetType}
                          </span>
                          <h4 className="text-sm font-semibold text-gray-900 truncate">
                            {h.name}
                          </h4>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {h.units.toLocaleString(undefined, { maximumFractionDigits: 4 })} units @ {formatCurrency(h.buyPrice)}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(h.currentValue)}</p>
                        <p className={`text-[11px] font-semibold ${isProfit ? "text-forest-600" : "text-coral-600"}`}>
                          {isProfit ? "+" : ""}{formatCurrency(h.totalReturn)} ({h.returnPercent.toFixed(1)}%)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-cream-200 text-xs text-gray-500">
                      <div>
                        <span>Live NAV/CMP: </span>
                        <strong className="text-gray-900">{formatCurrency(h.currentPrice)}</strong>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditHolding(h);
                            setEditUnits(String(h.units));
                            setEditBuyPrice(String(h.buyPrice));
                            setEditFolio(h.folioOrAccount || "");
                          }}
                          className="p-1 rounded text-gray-500 hover:text-navy-900"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteHoldingItem(h)}
                          className="p-1 rounded text-gray-400 hover:text-coral-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-16 text-center text-gray-400 text-sm">
            <div className="w-12 h-12 rounded-2xl bg-cream-100 flex items-center justify-center mx-auto mb-3">
              <Coins className="w-5 h-5 text-gray-400" />
            </div>
            <p className="font-serif text-base text-gray-700 mb-1">No investment holdings found</p>
            <p className="text-xs text-gray-400 mb-4">
              Add your mutual funds or stocks, or import an account statement.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2 rounded-xl bg-navy-900 text-white text-xs font-medium hover:bg-navy-800 transition-default flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-gold-400" />
                <span>AI Statement Import</span>
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 rounded-xl bg-forest-500 text-white text-xs font-medium hover:bg-forest-600 transition-default flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Asset Manually</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Manual Add Asset Modal ────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 animate-scale-in text-gray-900 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-500">
                  New Holding
                </p>
                <h2 className="text-xl font-serif text-gray-900">Add to Portfolio</h2>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Asset Search Bar */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Search Indian Mutual Fund (AMFI) or Stock (NSE/BSE)
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  placeholder="e.g. Parag Parikh, Quant Small Cap, RELIANCE, TCS..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-cream-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                />
                {searchingAssets && (
                  <RefreshCw className="w-4 h-4 text-forest-600 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                )}
              </div>

              {/* Search Suggestions Dropdown */}
              {searchResults.length > 0 && (
                <div className="mt-1 bg-white border border-cream-300 rounded-xl shadow-lg divide-y divide-cream-100 max-h-48 overflow-y-auto">
                  {searchResults.map((item) => (
                    <button
                      key={item.symbol + item.name}
                      type="button"
                      onClick={() => handleSelectAsset(item)}
                      className="w-full text-left p-2.5 hover:bg-cream-50 text-xs flex items-center justify-between gap-2 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{item.symbol} · {item.exchange || item.assetType}</p>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-cream-100 font-bold uppercase text-gray-600 shrink-0">
                        {item.assetType}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Asset Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-cream-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                  placeholder="e.g. Parag Parikh Flexi Cap Fund"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Symbol / Scheme Code</label>
                  <input
                    type="text"
                    value={formSymbol}
                    onChange={(e) => setFormSymbol(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-cream-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 font-mono"
                    placeholder="122639 or RELIANCE.NS"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Asset Type</label>
                  <select
                    value={formAssetType}
                    onChange={(e) => setFormAssetType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-cream-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest-500"
                  >
                    <option value="MUTUAL_FUND">Mutual Fund</option>
                    <option value="STOCK">Stock</option>
                    <option value="ETF">ETF</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Units / Quantity *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formUnits}
                    onChange={(e) => setFormUnits(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-cream-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                    placeholder="e.g. 150.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Avg Purchase Price (NAV) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formBuyPrice}
                      onChange={(e) => setFormBuyPrice(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-cream-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category (Optional)</label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-cream-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                    placeholder="e.g. Equity - Flexi Cap"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Folio / Demat (Optional)</label>
                  <input
                    type="text"
                    value={formFolio}
                    onChange={(e) => setFormFolio(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-cream-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                    placeholder="e.g. 1048291"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-cream-300 text-sm font-medium text-gray-700 hover:bg-cream-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingInvestment}
                  className="flex-1 py-2.5 rounded-xl bg-forest-500 text-white text-sm font-medium hover:bg-forest-600 transition-default disabled:opacity-50"
                >
                  {addingInvestment ? "Adding..." : "Add to Portfolio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── AI Statement Import Modal ─────────────────────────────────────── */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 animate-scale-in text-gray-900 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-navy-900 text-gold-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-serif text-gray-900">AI Statement Import</h2>
                  <p className="text-xs text-gray-500">
                    Upload CAMS / KFintech CAS PDF or Zerodha/Groww portfolio exports.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setParsedHoldings([]);
                }}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Upload Zone */}
            {parsedHoldings.length === 0 ? (
              <div className="border-2 border-dashed border-cream-300 hover:border-forest-500 rounded-2xl p-8 text-center transition-colors">
                <input
                  type="file"
                  id="casFileInput"
                  accept="application/pdf,image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="casFileInput"
                  className="cursor-pointer flex flex-col items-center justify-center"
                >
                  <div className="w-14 h-14 rounded-2xl bg-cream-100 text-forest-600 flex items-center justify-center mb-3 shadow-2xs">
                    {importingFile ? (
                      <RefreshCw className="w-6 h-6 animate-spin text-forest-600" />
                    ) : (
                      <Upload className="w-6 h-6" />
                    )}
                  </div>
                  <p className="font-semibold text-gray-900 text-sm mb-1">
                    {importingFile ? "Gemini is analyzing statement..." : "Click to upload statement"}
                  </p>
                  <p className="text-xs text-gray-400 max-w-sm leading-relaxed">
                    Supports CAMS Consolidated Account Statement (CAS PDF), KFintech, CDSL Demat Statement, or broker screenshot.
                  </p>
                </label>
              </div>
            ) : (
              /* Preview Extracted Holdings */
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-forest-50 border border-forest-200 rounded-xl px-4 py-2.5 text-xs text-forest-800">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-forest-600" />
                    <span>
                      Found <strong>{parsedHoldings.length} holdings</strong>. Select items to import:
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (selectedHoldingIndices.size === parsedHoldings.length) {
                        setSelectedHoldingIndices(new Set());
                      } else {
                        setSelectedHoldingIndices(new Set(parsedHoldings.map((_, i) => i)));
                      }
                    }}
                    className="font-semibold underline"
                  >
                    {selectedHoldingIndices.size === parsedHoldings.length ? "Deselect All" : "Select All"}
                  </button>
                </div>

                <div className="border border-cream-300 rounded-xl divide-y divide-cream-200 max-h-64 overflow-y-auto">
                  {parsedHoldings.map((h, index) => (
                    <label
                      key={index}
                      className="p-3 hover:bg-cream-50 flex items-center gap-3 cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={selectedHoldingIndices.has(index)}
                        onChange={() => {
                          const next = new Set(selectedHoldingIndices);
                          if (next.has(index)) next.delete(index);
                          else next.add(index);
                          setSelectedHoldingIndices(next);
                        }}
                        className="w-4 h-4 rounded border-cream-300 text-forest-600 focus:ring-forest-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{h.name}</p>
                        <p className="text-gray-400 text-[11px]">
                          {h.units} units @ {formatCurrency(h.buyPrice)}
                          {h.category && ` · ${h.category}`}
                          {h.folioOrAccount && ` · Folio: ${h.folioOrAccount}`}
                        </p>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cream-100 font-bold uppercase text-gray-600">
                        {h.assetType}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setParsedHoldings([])}
                    className="py-2.5 px-4 rounded-xl border border-cream-300 text-sm font-medium text-gray-700 hover:bg-cream-100"
                  >
                    Upload Another
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={savingImport || selectedHoldingIndices.size === 0}
                    className="flex-1 py-2.5 rounded-xl bg-navy-900 text-white text-sm font-medium hover:bg-navy-800 transition-default disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {savingImport ? "Importing to Portfolio..." : `Import ${selectedHoldingIndices.size} Holdings`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Edit Holding Modal ─────────────────────────────────────────────── */}
      {editHolding && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-scale-in text-gray-900 shadow-xl">
            <h3 className="text-lg font-serif text-gray-900 mb-1">Edit Holding</h3>
            <p className="text-xs text-gray-500 mb-4 truncate">{editHolding.name}</p>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Units Held</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={editUnits}
                  onChange={(e) => setEditUnits(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-cream-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Average Buy Price (NAV)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editBuyPrice}
                    onChange={(e) => setEditBuyPrice(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-cream-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Folio / Demat (Optional)</label>
                <input
                  type="text"
                  value={editFolio}
                  onChange={(e) => setEditFolio(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-cream-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditHolding(null)}
                  className="flex-1 py-2.5 rounded-xl border border-cream-300 text-sm font-medium text-gray-700 hover:bg-cream-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 py-2.5 rounded-xl bg-navy-900 text-white text-sm font-medium hover:bg-navy-800 transition-default disabled:opacity-50"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Delete Confirm Modal ───────────────────────────────────────────── */}
      {deleteHoldingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 animate-scale-in text-gray-900 shadow-xl">
            <div className="w-10 h-10 rounded-xl bg-coral-50 text-coral-600 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-serif text-gray-900 mb-1">Remove Investment?</h3>
            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              Are you sure you want to remove <strong>{deleteHoldingItem.name}</strong> from your portfolio?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteHoldingItem(null)}
                className="flex-1 py-2 rounded-xl border border-cream-300 text-xs font-medium text-gray-700 hover:bg-cream-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteHolding}
                disabled={deleting}
                className="flex-1 py-2 rounded-xl bg-coral-600 text-white text-xs font-medium hover:bg-coral-700 transition-default disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Yes, Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
