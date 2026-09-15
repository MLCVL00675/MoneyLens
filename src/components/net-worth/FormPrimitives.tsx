"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2, CheckCircle2, Sparkles } from "lucide-react";

export interface FormFieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  label,
  required,
  hint,
  className = "",
  children,
}: FormFieldProps) {
  return (
    <div className={className}>
      <label className="text-muted-foreground font-medium block mb-1 text-xs">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
      {hint && <span className="text-[10px] text-muted-foreground mt-0.5 block">{hint}</span>}
    </div>
  );
}

export function FormRow({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${className}`}>
      {children}
    </div>
  );
}

export function FormRow3({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${className}`}>
      {children}
    </div>
  );
}

export interface SearchItem {
  id?: string;
  name: string;
  symbol?: string;
  category?: string;
  fundHouse?: string;
  defaultReturn?: number;
  defaultPrice?: number;
  price?: number;
  units?: number;
  exchange?: string;
  distributionYield?: number;
  isInvested?: boolean;
  isPreset?: boolean;
  raw?: any;
}

interface AssetSearchSelectProps {
  label: string;
  placeholder: string;
  value: string;
  selectedItem: SearchItem | null;
  manualMode: boolean;
  onToggleManualMode: (isManual: boolean) => void;
  onSelect: (item: SearchItem) => void;
  onChangeManualValue: (val: string) => void;
  onSearch: (query: string) => Promise<SearchItem[]>;
  initialItems?: SearchItem[];
  userInvestedItems?: SearchItem[];
  popularChips?: SearchItem[];
}

export function AssetSearchSelect({
  label,
  placeholder,
  value,
  selectedItem,
  manualMode,
  onToggleManualMode,
  onSelect,
  onChangeManualValue,
  onSearch,
  initialItems = [],
  userInvestedItems = [],
  popularChips = [],
}: AssetSearchSelectProps) {
  const [query, setQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchItem[]>(initialItems);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  useEffect(() => {
    if (manualMode) return;
    if (!query || query.trim().length < 2) {
      setResults(initialItems);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await onSearch(query);
        setResults(res);
      } catch (err) {
        console.error("Asset search error:", err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, manualMode, initialItems, onSearch]);

  return (
    <div className="space-y-2" ref={dropdownRef}>
      <div className="flex items-center justify-between">
        <label className="text-muted-foreground font-medium text-xs flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          {label} <span className="text-rose-500">*</span>
        </label>
        <button
          type="button"
          onClick={() => {
            onToggleManualMode(!manualMode);
            setDropdownOpen(false);
          }}
          className="text-[11px] text-primary hover:underline font-medium"
        >
          {manualMode ? "← Search Live Directory" : "Enter Manually"}
        </button>
      </div>

      {value && !manualMode ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 p-3 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-foreground truncate">{value}</span>
                {selectedItem?.symbol && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground">
                    #{selectedItem.symbol}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {selectedItem?.category || selectedItem?.exchange || "Asset Holding"}
                {selectedItem?.price ? ` • Current Price: ₹${selectedItem.price}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onChangeManualValue("");
              setDropdownOpen(true);
            }}
            className="text-xs font-medium text-muted-foreground hover:text-foreground underline decoration-dotted shrink-0"
          >
            Change
          </button>
        </div>
      ) : manualMode ? (
        <input
          type="text"
          required
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChangeManualValue(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
      ) : (
        <div className="space-y-2.5 relative">
          {userInvestedItems.length > 0 && !query && (
            <div className="p-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 dark:bg-emerald-950/20 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-900 dark:text-emerald-300 text-[11px]">
                  Funds You Currently Hold:
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                  {userInvestedItems.length} Owned
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {userInvestedItems.map((inv, idx) => (
                  <button
                    key={inv.id || `${inv.name}-${idx}`}
                    type="button"
                    onClick={() => {
                      onSelect(inv);
                      setDropdownOpen(false);
                    }}
                    className="px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-card hover:border-emerald-500 text-left text-xs text-foreground truncate max-w-[240px]"
                  >
                    <span className="font-semibold">{inv.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder={placeholder}
              value={query}
              onFocus={() => setDropdownOpen(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                setDropdownOpen(true);
              }}
              className="w-full pl-9 pr-9 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {popularChips.length > 0 && !query && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
              <span className="text-muted-foreground text-[10px] uppercase font-semibold shrink-0">
                Popular:
              </span>
              {popularChips.map((chip, idx) => (
                <button
                  key={chip.symbol || chip.name || idx}
                  type="button"
                  onClick={() => {
                    onSelect(chip);
                    setDropdownOpen(false);
                  }}
                  className="px-2 py-0.5 rounded-full border border-border/60 bg-card hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-all shrink-0 text-left truncate max-w-[150px]"
                >
                  {chip.name.split(" ")[0]} {chip.symbol ? `(${chip.symbol})` : ""}
                </button>
              ))}
            </div>
          )}

          {dropdownOpen && results.length > 0 && (
            <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto rounded-xl border border-border/70 bg-popover/95 p-1.5 shadow-xl backdrop-blur-md space-y-1">
              {results.map((item, idx) => (
                <div
                  key={`${item.symbol || item.name}-${idx}`}
                  onClick={() => {
                    onSelect(item);
                    setDropdownOpen(false);
                  }}
                  className={`p-2 rounded-lg hover:bg-accent/70 cursor-pointer transition-all text-left flex items-center justify-between gap-2 ${
                    item.isInvested ? "bg-emerald-50/60 dark:bg-emerald-950/20" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-semibold text-foreground truncate">{item.name}</p>
                      {item.isInvested && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-semibold">
                          ★ In Portfolio
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                      {item.symbol && <span className="font-mono text-primary/80">#{item.symbol}</span>}
                      {item.category && <span>• {item.category}</span>}
                      {item.exchange && <span>• {item.exchange}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
