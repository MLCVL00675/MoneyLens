"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  AssetCategory,
  ASSET_CATEGORY_LABELS,
  PropertyType,
} from "@/lib/net-worth/types";
import {
  saveFixedDeposit,
  saveBond,
  saveSIP,
  saveREIT,
  saveRealEstate,
  saveGoldHolding,
  saveRetirementAccount,
  saveLiability,
  searchSIPSchemes,
  searchREITs,
  fetchLiveQuote,
  getLivePreciousMetalRates,
  getUserInvestedFunds,
} from "@/actions/net-worth";
import {
  calculateFDMaturityValue,
  calculatePropertyCompoundedValue,
  calculateLoanRemainingTenure,
} from "@/lib/net-worth/calculators";
import {
  PreciousMetalRates,
  getSpotRateForPurity,
} from "@/lib/net-worth/metal-rates";
import { formatCurrency } from "@/lib/utils";
import {
  LISTED_REITS_AND_INVITS,
  POPULAR_SIP_SCHEMES,
  REITAsset,
} from "@/lib/net-worth/reit-directory";
import { toast } from "sonner";
import {
  X,
  Loader2,
  Check,
  RefreshCw,
} from "lucide-react";
import {
  FormField,
  FormRow,
  FormRow3,
  AssetSearchSelect,
  SearchItem,
} from "./FormPrimitives";

interface AddEditAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialCategory?: AssetCategory;
  initialData?: any | null;
}

export function AddEditAssetModal({
  isOpen,
  onClose,
  onSuccess,
  initialCategory = "FIXED_DEPOSIT",
  initialData = null,
}: AddEditAssetModalProps) {
  const [mounted, setMounted] = useState(false);
  const [category, setCategory] = useState<AssetCategory>(initialCategory);
  const [submitting, setSubmitting] = useState(false);

  // FD/RD
  const [bankName, setBankName] = useState("");
  const [fdType, setFdType] = useState<"FD" | "RD">("FD");
  const [principalAmount, setPrincipalAmount] = useState("");
  const [interestRate, setInterestRate] = useState("7.5");
  const [compoundingFreq, setCompoundingFreq] = useState("QUARTERLY");
  const [tenureMonths, setTenureMonths] = useState("12");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [monthlyInstallment, setMonthlyInstallment] = useState("");

  // Bond
  const [bondName, setBondName] = useState("");
  const [bondType, setBondType] = useState("GOVERNMENT");
  const [faceValue, setFaceValue] = useState("1000");
  const [couponRate, setCouponRate] = useState("7.26");
  const [couponFrequency, setCouponFrequency] = useState("ANNUALLY");
  const [purchasePrice, setPurchasePrice] = useState("1000");
  const [quantity, setQuantity] = useState("10");
  const [maturityYear, setMaturityYear] = useState(String(new Date().getFullYear() + 5));

  // SIP
  const [schemeName, setSchemeName] = useState("");
  const [schemeCode, setSchemeCode] = useState("");
  const [monthlyAmount, setMonthlyAmount] = useState("5000");
  const [sipStartDate, setSipStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [currentNAV, setCurrentNAV] = useState("");
  const [expectedReturn, setExpectedReturn] = useState("14");
  const [stepUpRate, setStepUpRate] = useState("10");
  const [manualSIPMode, setManualSIPMode] = useState(false);
  const [selectedSIP, setSelectedSIP] = useState<SearchItem | null>(null);
  const [userInvestedFunds, setUserInvestedFunds] = useState<SearchItem[]>([]);

  // REIT
  const [reitName, setReitName] = useState("");
  const [reitSymbol, setReitSymbol] = useState("");
  const [reitExchange, setReitExchange] = useState("NSE");
  const [reitUnits, setReitUnits] = useState("100");
  const [reitBuyPrice, setReitBuyPrice] = useState("385");
  const [reitCurrentPrice, setReitCurrentPrice] = useState("385");
  const [distributionYield, setDistributionYield] = useState("6.8");
  const [manualREITMode, setManualREITMode] = useState(false);
  const [selectedREIT, setSelectedREIT] = useState<SearchItem | null>(null);

  // Real Estate
  const [reName, setReName] = useState("");
  const [rePropertyType, setRePropertyType] = useState<PropertyType>("SELF_OCCUPIED");
  const [reLocation, setReLocation] = useState("");
  const [reAreaSqFt, setReAreaSqFt] = useState("");
  const [rePurchasePrice, setRePurchasePrice] = useState("");
  const [rePurchaseDate, setRePurchaseDate] = useState(
    new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [reAppreciationRate, setReAppreciationRate] = useState("5.0");
  const [reCurrentValuation, setReCurrentValuation] = useState("");
  const [reIsRental, setReIsRental] = useState(false);
  const [reMonthlyRent, setReMonthlyRent] = useState("");

  // Gold
  const [goldType, setGoldType] = useState("PHYSICAL");
  const [weightGrams, setWeightGrams] = useState("10");
  const [goldUnits, setGoldUnits] = useState("");
  const [goldBuyPrice, setGoldBuyPrice] = useState("60000");
  const [goldSpotRate, setGoldSpotRate] = useState("14108");
  const [purity, setPurity] = useState("24K (99.9% Bullion)");
  const [metalRates, setMetalRates] = useState<PreciousMetalRates | null>(null);
  const [loadingRates, setLoadingRates] = useState(false);

  // Retirement
  const [retType, setRetType] = useState("EPF");
  const [employeeContr, setEmployeeContr] = useState("");
  const [employerContr, setEmployerContr] = useState("");
  const [retInterestRate, setRetInterestRate] = useState("8.25");
  const [currentCorpus, setCurrentCorpus] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  // Liability
  const [liabilityType, setLiabilityType] = useState("HOME_LOAN");
  const [lenderName, setLenderName] = useState("");
  const [principalRemaining, setPrincipalRemaining] = useState("");
  const [originalPrincipal, setOriginalPrincipal] = useState("");
  const [loanRate, setLoanRate] = useState("8.75");
  const [monthlyEMI, setMonthlyEMI] = useState("");
  const [remainingTenure, setRemainingTenure] = useState("");

  const [notes, setNotes] = useState("");

  const suggestedTenure = (() => {
    if (category !== "LIABILITY") return null;
    const p = parseFloat(principalRemaining);
    const emi = parseFloat(monthlyEMI);
    const rate = parseFloat(loanRate) || 0;
    if (p > 0 && emi > 0) {
      return calculateLoanRemainingTenure(p, emi, rate);
    }
    return null;
  })();

  const formatTenureSummary = (months: number) => {
    const yrs = Math.floor(months / 12);
    const rem = months % 12;
    if (yrs === 0) return `${months} mos`;
    if (rem === 0) return `${yrs} yr${yrs > 1 ? "s" : ""}`;
    return `${yrs} yr${yrs > 1 ? "s" : ""}, ${rem} mo${rem > 1 ? "s" : ""}`;
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Load user's invested funds for SIP selector
  useEffect(() => {
    if (category !== "SIP") return;
    let isSubscribed = true;
    getUserInvestedFunds()
      .then((funds) => {
        if (isSubscribed && funds) {
          setUserInvestedFunds(
            funds.map((f) => ({
              name: f.name,
              symbol: f.symbol || "",
              category: f.category || "In Portfolio",
              price: f.currentPrice || 0,
              units: f.units,
              isInvested: true,
            }))
          );
        }
      })
      .catch((err) => console.error("Error loading invested funds:", err));
    return () => {
      isSubscribed = false;
    };
  }, [category]);

  // Live metal rates loader
  useEffect(() => {
    if (category !== "GOLD") return;
    let isSubscribed = true;
    const fetchRates = async () => {
      setLoadingRates(true);
      try {
        const rates = await getLivePreciousMetalRates();
        if (isSubscribed && rates) {
          setMetalRates(rates);
          const spot = getSpotRateForPurity(purity, rates);
          setGoldSpotRate(String(spot));
        }
      } catch (err) {
        console.error("Gold rate sync error:", err);
      } finally {
        if (isSubscribed) setLoadingRates(false);
      }
    };
    fetchRates();
    return () => {
      isSubscribed = false;
    };
  }, [category, purity]);

  // Real estate valuation sync
  const updateCompoundedValuation = (priceStr: string, rateStr: string, dateStr: string) => {
    const p = parseFloat(priceStr) || 0;
    const r = parseFloat(rateStr) || 5.0;
    if (p > 0 && dateStr) {
      const compounded = calculatePropertyCompoundedValue(p, r, dateStr);
      setReCurrentValuation(String(compounded));
    }
  };

  // Populate initial editing data
  useEffect(() => {
    if (initialCategory) setCategory(initialCategory);
    if (!initialData) return;

    if (initialCategory === "FIXED_DEPOSIT") {
      setBankName(initialData.bankName || "");
      setFdType(initialData.fdType || "FD");
      setPrincipalAmount(String(initialData.principalAmount || ""));
      setInterestRate(String(initialData.interestRate || "7.5"));
      setCompoundingFreq(initialData.compoundingFreq || "QUARTERLY");
      setTenureMonths(String(initialData.tenureMonths || "12"));
      setStartDate(
        initialData.startDate
          ? new Date(initialData.startDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0]
      );
      setMonthlyInstallment(String(initialData.monthlyInstallment || ""));
    } else if (initialCategory === "BOND") {
      setBondName(initialData.name || "");
      setBondType(initialData.bondType || "GOVERNMENT");
      setFaceValue(String(initialData.faceValue || "1000"));
      setCouponRate(String(initialData.couponRate || "7.26"));
      setCouponFrequency(initialData.couponFrequency || "ANNUALLY");
      setPurchasePrice(String(initialData.purchasePrice || "1000"));
      setQuantity(String(initialData.quantity || "10"));
      setMaturityYear(String(initialData.maturityYear || 2030));
    } else if (initialCategory === "SIP") {
      setSchemeName(initialData.schemeName || "");
      setSchemeCode(initialData.schemeCode || "");
      setMonthlyAmount(String(initialData.monthlyAmount || "5000"));
      setSipStartDate(
        initialData.startDate
          ? new Date(initialData.startDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0]
      );
      setCurrentNAV(String(initialData.currentNAV || ""));
      setExpectedReturn(String(initialData.expectedReturn || "14"));
      setStepUpRate(String(initialData.stepUpRate || "10"));
      setManualSIPMode(true);
    } else if (initialCategory === "REIT") {
      setReitName(initialData.name || "");
      setReitSymbol(initialData.symbol || "");
      setReitExchange(initialData.exchange || "NSE");
      setReitUnits(String(initialData.units || "100"));
      setReitBuyPrice(String(initialData.purchasePrice || "385"));
      setReitCurrentPrice(String(initialData.currentPrice || "385"));
      setDistributionYield(String(initialData.distributionYield || "6.8"));
      setManualREITMode(true);
    } else if (initialCategory === "REAL_ESTATE") {
      setReName(initialData.name || "");
      setRePropertyType(initialData.propertyType || "SELF_OCCUPIED");
      setReLocation(initialData.location || "");
      setReAreaSqFt(String(initialData.areaSqFt || ""));
      setRePurchasePrice(String(initialData.purchasePrice || ""));
      setRePurchaseDate(
        initialData.purchaseDate
          ? new Date(initialData.purchaseDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0]
      );
      setReAppreciationRate(String(initialData.appreciationRate || "5.0"));
      setReCurrentValuation(String(initialData.currentValuation || ""));
      setReIsRental(Boolean(initialData.isRental));
      setReMonthlyRent(String(initialData.monthlyRent || ""));
    } else if (initialCategory === "GOLD") {
      setGoldType(initialData.goldType || "PHYSICAL");
      setWeightGrams(String(initialData.weightGrams || "10"));
      setGoldUnits(String(initialData.units || ""));
      setGoldBuyPrice(String(initialData.purchasePrice || "60000"));
      setGoldSpotRate(String(initialData.currentSpotRate || "14108"));
      setPurity(initialData.purity || "24K (99.9% Bullion)");
    } else if (initialCategory === "RETIREMENT") {
      setRetType(initialData.accountType || "EPF");
      setEmployeeContr(String(initialData.employeeContribution || ""));
      setEmployerContr(String(initialData.employerContribution || ""));
      setRetInterestRate(String(initialData.interestRate || "8.25"));
      setCurrentCorpus(String(initialData.currentCorpus || ""));
      setAccountNumber(initialData.accountNumber || "");
    } else if (initialCategory === "LIABILITY") {
      setLiabilityType(initialData.liabilityType || "HOME_LOAN");
      setLenderName(initialData.lenderName || "");
      setPrincipalRemaining(String(initialData.principalRemaining || ""));
      setOriginalPrincipal(String(initialData.originalPrincipal || ""));
      setLoanRate(String(initialData.interestRate || "8.75"));
      setMonthlyEMI(String(initialData.monthlyEMI || ""));
      setRemainingTenure(String(initialData.remainingTenureMonths || ""));
      setStartDate(initialData.startDate ? initialData.startDate.slice(0, 10) : "");
    }
    setNotes(initialData.notes || "");
  }, [initialData, initialCategory]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (category === "FIXED_DEPOSIT") {
        const p = parseFloat(principalAmount) || 0;
        const r = parseFloat(interestRate) || 0;
        const tenure = parseInt(tenureMonths) || 12;
        const start = new Date(startDate);
        const mat = new Date(start);
        mat.setMonth(mat.getMonth() + tenure);

        const maturityVal = calculateFDMaturityValue(p, r, tenure, compoundingFreq as any);

        await saveFixedDeposit({
          id: initialData?.id,
          bankName,
          fdType,
          principalAmount: p,
          interestRate: r,
          compoundingFreq,
          tenureMonths: tenure,
          startDate,
          maturityDate: mat.toISOString(),
          maturityValue: maturityVal,
          currentValue: p,
          monthlyInstallment: monthlyInstallment ? parseFloat(monthlyInstallment) : null,
          notes,
        });
      } else if (category === "BOND") {
        await saveBond({
          id: initialData?.id,
          name: bondName,
          bondType,
          faceValue: parseFloat(faceValue) || 1000,
          couponRate: parseFloat(couponRate) || 7.2,
          couponFrequency,
          purchasePrice: parseFloat(purchasePrice) || 1000,
          quantity: parseInt(quantity) || 1,
          maturityYear: parseInt(maturityYear) || 2030,
          notes,
        });
      } else if (category === "SIP") {
        if (!schemeName.trim()) {
          toast.error("Please enter or select a mutual fund scheme name");
          setSubmitting(false);
          return;
        }
        const nav = currentNAV ? parseFloat(currentNAV) : null;
        const existingUnits = initialData?.totalUnitsHeld ? Number(initialData.totalUnitsHeld) : null;
        const existingInvested = initialData?.totalInvested ? Number(initialData.totalInvested) : 0;
        const curVal = nav && existingUnits ? nav * existingUnits : (initialData?.currentValue || existingInvested);

        await saveSIP({
          id: initialData?.id,
          schemeName: schemeName.trim(),
          schemeCode: schemeCode || null,
          monthlyAmount: parseFloat(monthlyAmount) || 0,
          startDate: sipStartDate,
          currentNAV: nav,
          totalUnitsHeld: existingUnits,
          totalInvested: existingInvested,
          currentValue: curVal,
          expectedReturn: expectedReturn ? parseFloat(expectedReturn) : null,
          stepUpRate: stepUpRate ? parseFloat(stepUpRate) : null,
          notes,
        });
      } else if (category === "REIT") {
        const units = parseFloat(reitUnits) || 0;
        const buyPrice = parseFloat(reitBuyPrice) || 0;
        const curPrice = parseFloat(reitCurrentPrice) || buyPrice;
        await saveREIT({
          id: initialData?.id,
          name: reitName,
          symbol: reitSymbol || null,
          exchange: reitExchange || null,
          units,
          purchasePrice: buyPrice,
          currentPrice: curPrice,
          distributionYield: distributionYield ? parseFloat(distributionYield) : null,
          notes,
        });
      } else if (category === "REAL_ESTATE") {
        const p = parseFloat(rePurchasePrice) || 0;
        const rate = parseFloat(reAppreciationRate) || 5.0;
        const curVal = parseFloat(reCurrentValuation) || p;
        const rent = reIsRental && reMonthlyRent ? parseFloat(reMonthlyRent) : null;
        const sqFt = reAreaSqFt ? parseFloat(reAreaSqFt) : null;

        await saveRealEstate({
          id: initialData?.id,
          name: reName,
          propertyType: rePropertyType,
          location: reLocation,
          areaSqFt: sqFt,
          purchasePrice: p,
          purchaseDate: rePurchaseDate,
          appreciationRate: rate,
          currentValuation: curVal,
          isRental: reIsRental,
          monthlyRent: rent,
          notes,
        });
      } else if (category === "GOLD") {
        await saveGoldHolding({
          id: initialData?.id,
          goldType,
          weightGrams: weightGrams ? parseFloat(weightGrams) : null,
          units: goldUnits ? parseFloat(goldUnits) : null,
          purchasePrice: parseFloat(goldBuyPrice) || 0,
          currentSpotRate: parseFloat(goldSpotRate) || 14108,
          purity,
          notes,
        });
      } else if (category === "RETIREMENT") {
        await saveRetirementAccount({
          id: initialData?.id,
          accountType: retType,
          employeeContribution: parseFloat(employeeContr) || 0,
          employerContribution: retType === "PPF" ? 0 : employerContr ? parseFloat(employerContr) : 0,
          interestRate:
            parseFloat(retInterestRate) || (retType === "PPF" ? 7.1 : retType === "NPS" ? 10.0 : 8.25),
          currentCorpus: parseFloat(currentCorpus) || 0,
          accountNumber: accountNumber || null,
          notes,
        });
      } else if (category === "LIABILITY") {
        const finalTenure = remainingTenure
          ? parseInt(remainingTenure)
          : suggestedTenure ?? null;

        await saveLiability({
          id: initialData?.id,
          liabilityType,
          lenderName,
          principalRemaining: parseFloat(principalRemaining) || 0,
          originalPrincipal: originalPrincipal ? parseFloat(originalPrincipal) : null,
          interestRate: parseFloat(loanRate) || 0,
          monthlyEMI: parseFloat(monthlyEMI) || 0,
          remainingTenureMonths: finalTenure,
          startDate: startDate || null,
          notes,
        });
      }

      toast.success(`${initialData ? "Updated" : "Added"} ${ASSET_CATEGORY_LABELS[category]} successfully`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save asset");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="fixed inset-0 -z-10" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-border/80 bg-card shadow-2xl my-4 sm:my-8 flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border/60 p-5 pb-4 shrink-0 bg-card z-10">
          <div>
            <h3 className="font-semibold text-lg text-foreground font-serif">
              {initialData ? `Edit ${ASSET_CATEGORY_LABELS[category]}` : `Add ${ASSET_CATEGORY_LABELS[category]}`}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure parameters, valuation rules, and expected compounding yields
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Category Pill Switcher (only when creating without preselected category) */}
        {!initialData && !initialCategory && (
          <div className="px-5 pt-3 pb-3 border-b border-border/40 shrink-0 bg-card z-10">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Asset Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(ASSET_CATEGORY_LABELS) as AssetCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                    category === cat
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
                  }`}
                >
                  {ASSET_CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Dynamic Category Forms */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
            {/* 1. FIXED DEPOSIT / RD */}
            {category === "FIXED_DEPOSIT" && (
              <>
                <FormRow>
                  <FormField label="Bank / Institution" required>
                    <input
                      type="text"
                      required
                      placeholder="e.g. HDFC Bank, SBI"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground"
                    />
                  </FormField>
                  <FormField label="Deposit Type">
                    <select
                      value={fdType}
                      onChange={(e) => setFdType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground"
                    >
                      <option value="FD">Fixed Deposit (FD)</option>
                      <option value="RD">Recurring Deposit (RD)</option>
                    </select>
                  </FormField>
                </FormRow>

                <FormRow>
                  <FormField label={fdType === "FD" ? "Principal Amount (₹)" : "Total Invested (₹)"} required>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 100000"
                      value={principalAmount}
                      onChange={(e) => setPrincipalAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground"
                    />
                  </FormField>
                  <FormField label="Interest Rate (% p.a.)" required>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 7.5"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground"
                    />
                  </FormField>
                </FormRow>

                <FormRow>
                  <FormField label="Compounding Frequency">
                    <select
                      value={compoundingFreq}
                      onChange={(e) => setCompoundingFreq(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground"
                    >
                      <option value="QUARTERLY">Quarterly (Bank Standard)</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="HALF_YEARLY">Half-Yearly</option>
                      <option value="ANNUALLY">Annually</option>
                    </select>
                  </FormField>
                  <FormField label="Tenure (Months)" required>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 12"
                      value={tenureMonths}
                      onChange={(e) => setTenureMonths(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground"
                    />
                  </FormField>
                </FormRow>

                <FormField label="Deposit Start Date" required>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground"
                  />
                </FormField>

                {principalAmount && interestRate && tenureMonths && (
                  <div className="p-3 rounded-xl border border-border/60 bg-muted/20 flex items-center justify-between">
                    <span className="text-muted-foreground">Estimated Maturity Value:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-bold font-serif text-sm">
                      {formatCurrency(
                        calculateFDMaturityValue(
                          parseFloat(principalAmount) || 0,
                          parseFloat(interestRate) || 0,
                          parseInt(tenureMonths) || 12,
                          compoundingFreq as any
                        )
                      )}
                    </strong>
                  </div>
                )}
              </>
            )}

            {/* 2. BOND */}
            {category === "BOND" && (
              <>
                <FormRow>
                  <FormField label="Bond Name / Ticker" required>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 7.26% GS 2033"
                      value={bondName}
                      onChange={(e) => setBondName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground"
                    />
                  </FormField>
                  <FormField label="Bond Type">
                    <select
                      value={bondType}
                      onChange={(e) => setBondType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground"
                    >
                      <option value="GOVERNMENT">Government Security (G-Sec)</option>
                      <option value="CORPORATE">Corporate Bond</option>
                      <option value="MUNICIPAL">Municipal / PSU Bond</option>
                    </select>
                  </FormField>
                </FormRow>

                <FormRow3>
                  <FormField label="Quantity" required>
                    <input
                      type="number"
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground"
                    />
                  </FormField>
                  <FormField label="Buy Price (₹)" required>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground"
                    />
                  </FormField>
                  <FormField label="Coupon Rate (%)" required>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={couponRate}
                      onChange={(e) => setCouponRate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground"
                    />
                  </FormField>
                </FormRow3>

                <FormRow>
                  <FormField label="Maturity Year" required>
                    <input
                      type="number"
                      required
                      value={maturityYear}
                      onChange={(e) => setMaturityYear(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground"
                    />
                  </FormField>
                  <FormField label="Coupon Frequency">
                    <select
                      value={couponFrequency}
                      onChange={(e) => setCouponFrequency(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground"
                    >
                      <option value="ANNUALLY">Annually</option>
                      <option value="SEMI_ANNUALLY">Semi-Annually</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="ZERO_COUPON">Zero Coupon</option>
                    </select>
                  </FormField>
                </FormRow>
              </>
            )}

            {/* 3. SIP */}
            {category === "SIP" && (
              <>
                <AssetSearchSelect
                  label="Mutual Fund Scheme"
                  placeholder="Search 18,000+ mutual funds (e.g. Parag Parikh, HDFC, SBI)..."
                  value={schemeName}
                  selectedItem={selectedSIP}
                  manualMode={manualSIPMode}
                  onToggleManualMode={setManualSIPMode}
                  onChangeManualValue={setSchemeName}
                  onSelect={async (item) => {
                    setSchemeName(item.name);
                    setSchemeCode(item.symbol || "");
                    setSelectedSIP(item);
                    if (item.defaultReturn) setExpectedReturn(String(item.defaultReturn));
                    let liveNav = item.price || 0;
                    if (!liveNav && item.symbol) {
                      try {
                        const quote = await fetchLiveQuote(item.symbol, "MUTUAL_FUND", item.name);
                        if (quote?.price) liveNav = quote.price;
                      } catch {}
                    }
                    if (liveNav > 0) setCurrentNAV(String(liveNav));
                  }}
                  onSearch={async (q) => {
                    const results = await searchSIPSchemes(q);
                    return (results || []).map((r: any) => ({
                      name: r.name,
                      symbol: r.symbol,
                      category: r.category,
                      fundHouse: r.fundHouse,
                      defaultReturn: r.defaultReturn,
                      price: r.price,
                    }));
                  }}
                  userInvestedItems={userInvestedFunds}
                  popularChips={POPULAR_SIP_SCHEMES.slice(0, 6).map((pop) => ({
                    name: pop.name,
                    symbol: pop.schemeCode,
                    category: pop.category,
                    fundHouse: pop.fundHouse,
                    defaultReturn: pop.defaultReturn,
                  }))}
                />

                <FormRow>
                  <FormField label="Monthly SIP Amount (₹)" required hint="Fixed installment per cycle">
                    <input
                      type="number"
                      required
                      placeholder="e.g. 15000"
                      value={monthlyAmount}
                      onChange={(e) => setMonthlyAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground font-mono font-semibold"
                    />
                  </FormField>
                  <FormField label="SIP Start Date / Debit Day" required hint="Scheduled monthly cycle">
                    <input
                      type="date"
                      required
                      value={sipStartDate}
                      onChange={(e) => setSipStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground"
                    />
                  </FormField>
                </FormRow>

                <FormRow>
                  <FormField label="Current Market NAV (₹)" hint="Live AMFI benchmark price">
                    <input
                      type="number"
                      step="0.0001"
                      placeholder="e.g. 17.8191"
                      value={currentNAV}
                      onChange={(e) => setCurrentNAV(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground font-mono"
                    />
                  </FormField>
                  <FormField label="Expected Return (% p.a.)" hint="Historical baseline CAGR">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 14"
                      value={expectedReturn}
                      onChange={(e) => setExpectedReturn(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground"
                    />
                  </FormField>
                </FormRow>
              </>
            )}

            {/* 4. REIT */}
            {category === "REIT" && (
              <>
                <AssetSearchSelect
                  label="REIT / InvIT Trust"
                  placeholder="Search REITs / InvITs (e.g. Embassy, Nexus, Mindspace, PGInvIT)..."
                  value={reitName}
                  selectedItem={selectedREIT}
                  manualMode={manualREITMode}
                  onToggleManualMode={setManualREITMode}
                  onChangeManualValue={setReitName}
                  onSelect={async (item: any) => {
                    setReitName(item.name);
                    setReitSymbol(item.symbol || "");
                    setReitExchange(item.exchange || "NSE");
                    setSelectedREIT(item);
                    let livePrice = item.defaultPrice || item.price || 100;
                    if (item.symbol) {
                      try {
                        const quote = await fetchLiveQuote(item.symbol, "STOCK", item.name);
                        if (quote?.price && quote.price > 0) livePrice = quote.price;
                      } catch {}
                    }
                    setReitCurrentPrice(String(livePrice));
                    if (!reitBuyPrice || reitBuyPrice === "385" || reitBuyPrice === "0") {
                      setReitBuyPrice(String(livePrice));
                    }
                    if (item.distributionYield) setDistributionYield(String(item.distributionYield));
                  }}
                  onSearch={async (q) => {
                    const results = await searchREITs(q);
                    return (results || []).map((r) => ({
                      name: r.name,
                      symbol: r.symbol,
                      exchange: r.exchange,
                      defaultPrice: r.defaultPrice,
                      distributionYield: r.distributionYield,
                    }));
                  }}
                  initialItems={LISTED_REITS_AND_INVITS.map((r) => ({
                    name: r.name,
                    symbol: r.symbol,
                    exchange: r.exchange,
                    defaultPrice: r.defaultPrice,
                    distributionYield: r.distributionYield,
                  }))}
                  popularChips={LISTED_REITS_AND_INVITS.slice(0, 5).map((r) => ({
                    name: r.name,
                    symbol: r.symbol,
                    exchange: r.exchange,
                    defaultPrice: r.defaultPrice,
                    distributionYield: r.distributionYield,
                  }))}
                />

                <FormRow>
                  <FormField label="Units Allotted / Held" required hint="Total units in Demat">
                    <input
                      type="number"
                      step="0.0001"
                      required
                      placeholder="e.g. 100"
                      value={reitUnits}
                      onChange={(e) => setReitUnits(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground font-mono"
                    />
                  </FormField>
                  <FormField label="Avg Allotment / Buy Price (₹)" required hint="Purchase cost per unit">
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 385.00"
                      value={reitBuyPrice}
                      onChange={(e) => setReitBuyPrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground font-mono"
                    />
                  </FormField>
                </FormRow>

                <FormRow>
                  <FormField label="Current Market / Spot Price (₹)" required hint="Live exchange market quote">
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={reitCurrentPrice}
                      onChange={(e) => setReitCurrentPrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground font-mono"
                    />
                  </FormField>
                  <FormField label="Annual Distribution Yield (%)" hint="Quarterly dividend payout">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 6.8"
                      value={distributionYield}
                      onChange={(e) => setDistributionYield(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground font-mono"
                    />
                  </FormField>
                </FormRow>
              </>
            )}

            {/* 5. REAL ESTATE */}
            {category === "REAL_ESTATE" && (
              <>
                <FormRow>
                  <FormField label="Property Name / Identifier" required>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Prestige Lakeview Flat #402"
                      value={reName}
                      onChange={(e) => setReName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground"
                    />
                  </FormField>
                  <FormField label="Property Type">
                    <select
                      value={rePropertyType}
                      onChange={(e) => {
                        const t = e.target.value as PropertyType;
                        setRePropertyType(t);
                        setReIsRental(t === "RENTAL" || t === "COMMERCIAL");
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground"
                    >
                      <option value="SELF_OCCUPIED">Staying Home (Self-Occupied)</option>
                      <option value="LAND_PLOT">Land / Open Plot</option>
                      <option value="RENTAL">Rental Property (Residential)</option>
                      <option value="COMMERCIAL">Commercial Space</option>
                    </select>
                  </FormField>
                </FormRow>

                <FormRow>
                  <FormField label="Location / City">
                    <input
                      type="text"
                      placeholder="e.g. Whitefield, Bengaluru"
                      value={reLocation}
                      onChange={(e) => setReLocation(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground"
                    />
                  </FormField>
                  <FormField label="Built-up Area (Sq. Ft.)">
                    <input
                      type="number"
                      placeholder="e.g. 1450"
                      value={reAreaSqFt}
                      onChange={(e) => setReAreaSqFt(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground"
                    />
                  </FormField>
                </FormRow>

                <FormRow>
                  <FormField label="Purchase Price / Cost (₹)" required>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 7500000"
                      value={rePurchasePrice}
                      onChange={(e) => {
                        setRePurchasePrice(e.target.value);
                        updateCompoundedValuation(e.target.value, reAppreciationRate, rePurchaseDate);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground"
                    />
                  </FormField>
                  <FormField label="Purchase Date" required>
                    <input
                      type="date"
                      required
                      value={rePurchaseDate}
                      onChange={(e) => {
                        setRePurchaseDate(e.target.value);
                        updateCompoundedValuation(rePurchasePrice, reAppreciationRate, e.target.value);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground"
                    />
                  </FormField>
                </FormRow>

                <FormRow>
                  <FormField label="Appreciation Rate (% p.a.)" hint="Standard 4%–6% compounding rate">
                    <input
                      type="number"
                      step="0.1"
                      value={reAppreciationRate}
                      onChange={(e) => {
                        setReAppreciationRate(e.target.value);
                        updateCompoundedValuation(rePurchasePrice, e.target.value, rePurchaseDate);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground"
                    />
                  </FormField>
                  <FormField label="Current Compounded Valuation (₹)" hint="Auto-calculated from CAGR">
                    <input
                      type="number"
                      value={reCurrentValuation}
                      onChange={(e) => setReCurrentValuation(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground font-semibold"
                    />
                  </FormField>
                </FormRow>

                {reIsRental && (
                  <FormField label="Monthly Rental Income (₹/month)">
                    <input
                      type="number"
                      placeholder="e.g. 35000"
                      value={reMonthlyRent}
                      onChange={(e) => setReMonthlyRent(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground"
                    />
                  </FormField>
                )}
              </>
            )}

            {/* 6. GOLD & PRECIOUS METALS */}
            {category === "GOLD" && (
              <>
                <div className="flex items-center justify-between p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
                  <div>
                    <span className="text-xs font-semibold text-amber-900 dark:text-amber-300 block">
                      Live Internet Spot Rate
                    </span>
                    <span className="text-[11px] text-amber-700 dark:text-amber-400 font-mono">
                      ₹{goldSpotRate} / gram ({purity.split(" ")[0]})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setLoadingRates(true);
                      try {
                        const rates = await getLivePreciousMetalRates();
                        if (rates) {
                          setMetalRates(rates);
                          setGoldSpotRate(String(getSpotRateForPurity(purity, rates)));
                          toast.success("Updated live spot rates");
                        }
                      } finally {
                        setLoadingRates(false);
                      }
                    }}
                    className="p-1.5 rounded-lg border border-border/60 bg-card hover:bg-muted text-muted-foreground hover:text-foreground flex items-center gap-1 text-[11px]"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loadingRates ? "animate-spin text-amber-500" : ""}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                <FormRow>
                  <FormField label="Physical Form">
                    <select
                      value={goldType}
                      onChange={(e) => setGoldType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground text-xs"
                    >
                      <option value="PHYSICAL">Physical Gold Bullion Bar (24K)</option>
                      <option value="PHYSICAL">Minted Gold Coins (24K / 22K)</option>
                      <option value="PHYSICAL">Fine Gold Jewelry (22K / 18K)</option>
                      <option value="PHYSICAL">Physical Silver Bullion (999 Fine)</option>
                      <option value="PHYSICAL">Physical Silver Coins / Utensils</option>
                    </select>
                  </FormField>
                  <FormField label="Metal Purity">
                    <select
                      value={purity}
                      onChange={(e) => {
                        setPurity(e.target.value);
                        if (metalRates) {
                          setGoldSpotRate(String(getSpotRateForPurity(e.target.value, metalRates)));
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground text-xs"
                    >
                      <option value="24K (99.9% Bullion)">24K (99.9% Bullion)</option>
                      <option value="22K (91.6% Hallmark 916)">22K (91.6% Hallmark 916)</option>
                      <option value="18K (75.0% Fine 750)">18K (75.0% Fine 750)</option>
                      <option value="14K (58.5% 585)">14K (58.5% 585)</option>
                      <option value="Fine Silver (99.9% Pure)">Fine Silver (99.9% Pure)</option>
                      <option value="Sterling Silver (92.5%)">Sterling Silver (92.5%)</option>
                    </select>
                  </FormField>
                </FormRow>

                <FormRow>
                  <FormField label="Weight (Grams)" required>
                    <input
                      type="number"
                      step="0.001"
                      required
                      placeholder="e.g. 10"
                      value={weightGrams}
                      onChange={(e) => setWeightGrams(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground text-sm"
                    />
                  </FormField>
                  <FormField label="Amount Paid for Commodity (₹)" required>
                    <input
                      type="number"
                      step="1"
                      required
                      placeholder="e.g. 60000"
                      value={goldBuyPrice}
                      onChange={(e) => setGoldBuyPrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground text-sm"
                    />
                  </FormField>
                </FormRow>
              </>
            )}

            {/* 7. RETIREMENT */}
            {category === "RETIREMENT" && (
              <>
                <FormRow>
                  <FormField label="Account Type">
                    <select
                      value={retType}
                      onChange={(e) => {
                        const t = e.target.value;
                        setRetType(t);
                        if (t === "PPF") {
                          setRetInterestRate("7.10");
                          setEmployerContr("0");
                        } else if (t === "NPS") {
                          setRetInterestRate("10.00");
                        } else {
                          setRetInterestRate("8.25");
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground"
                    >
                      <option value="EPF">Employee Provident Fund (EPF)</option>
                      <option value="PPF">Public Provident Fund (PPF)</option>
                      <option value="NPS">National Pension System (NPS)</option>
                      <option value="VPF">Voluntary Provident Fund (VPF)</option>
                    </select>
                  </FormField>
                  <FormField label="Current Corpus Balance (₹)" required>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 350000"
                      value={currentCorpus}
                      onChange={(e) => setCurrentCorpus(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground"
                    />
                  </FormField>
                </FormRow>

                <div className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-3">
                  <span className="text-xs font-semibold text-foreground block">
                    Monthly Contribution Breakdown
                  </span>
                  <div className={`grid ${retType === "PPF" ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"} gap-3`}>
                    <FormField
                      label={retType === "PPF" ? "Monthly Deposit (₹/mo)" : "Employee Deduction (₹/mo)"}
                      required
                    >
                      <input
                        type="number"
                        step="any"
                        required
                        placeholder={retType === "PPF" ? "e.g. 12500" : "e.g. 10000"}
                        value={employeeContr}
                        onChange={(e) => setEmployeeContr(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-border/60 bg-background text-foreground text-sm"
                      />
                    </FormField>

                    {retType !== "PPF" && (
                      <FormField label="Employer Match (₹/mo)">
                        <input
                          type="number"
                          step="any"
                          placeholder="e.g. 10000"
                          value={employerContr}
                          onChange={(e) => setEmployerContr(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-border/60 bg-background text-foreground text-sm"
                        />
                      </FormField>
                    )}
                  </div>
                </div>

                <FormRow>
                  <FormField label="Interest / CAGR Rate (% p.a.)">
                    <input
                      type="number"
                      step="0.01"
                      value={retInterestRate}
                      onChange={(e) => setRetInterestRate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground"
                    />
                  </FormField>
                  <FormField label={retType === "NPS" ? "PRAN Number" : "UAN / Account Number"}>
                    <input
                      type="text"
                      placeholder="e.g. 101234567890"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground"
                    />
                  </FormField>
                </FormRow>
              </>
            )}

            {/* 8. LIABILITY */}
            {category === "LIABILITY" && (
              <>
                <div className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/20">
                  <div>
                    <span className="text-xs font-semibold text-foreground block">Loan Status</span>
                    <span className="text-[10px] text-muted-foreground">
                      {principalRemaining === "0" ? "Marked as fully paid off / closed" : "Active obligation"}
                    </span>
                  </div>
                  <div className="inline-flex rounded-lg border border-border/60 bg-background p-0.5 text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => {
                        if (principalRemaining === "0") setPrincipalRemaining(originalPrincipal || "100000");
                      }}
                      className={`rounded-md px-2.5 py-1 transition-all ${
                        principalRemaining !== "0"
                          ? "bg-rose-600 text-white font-semibold shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPrincipalRemaining("0");
                        setMonthlyEMI("0");
                        setRemainingTenure("0");
                      }}
                      className={`rounded-md px-2.5 py-1 transition-all ${
                        principalRemaining === "0"
                          ? "bg-emerald-600 text-white font-semibold shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Closed (₹0)
                    </button>
                  </div>
                </div>

                <FormRow>
                  <FormField label="Loan / Debt Type">
                    <select
                      value={liabilityType}
                      onChange={(e) => setLiabilityType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground"
                    >
                      <option value="HOME_LOAN">Home Loan / Mortgage</option>
                      <option value="AUTO_LOAN">Car / Auto Loan</option>
                      <option value="PERSONAL_LOAN">Personal Loan</option>
                      <option value="CREDIT_CARD">Credit Card Outstanding</option>
                      <option value="EDUCATION_LOAN">Education Loan</option>
                      <option value="OTHER">Other Debt</option>
                    </select>
                  </FormField>
                  <FormField label="Lender Name" required>
                    <input
                      type="text"
                      required
                      placeholder="e.g. HDFC Bank, SBI"
                      value={lenderName}
                      onChange={(e) => setLenderName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground"
                    />
                  </FormField>
                </FormRow>

                <FormRow>
                  <FormField label="Principal Remaining (₹)" required>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 250000"
                      value={principalRemaining}
                      onChange={(e) => setPrincipalRemaining(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground"
                    />
                  </FormField>
                  <FormField label="Original Sanctioned Amount (₹)">
                    <input
                      type="number"
                      placeholder="e.g. 1000000"
                      value={originalPrincipal}
                      onChange={(e) => setOriginalPrincipal(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground"
                    />
                  </FormField>
                </FormRow>

                <FormRow>
                  <FormField label="Monthly EMI (₹)" required>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 25000"
                      value={monthlyEMI}
                      onChange={(e) => setMonthlyEMI(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground"
                    />
                  </FormField>
                  <FormField label="Interest Rate (% p.a.)" required>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 8.75"
                      value={loanRate}
                      onChange={(e) => setLoanRate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground"
                    />
                  </FormField>
                </FormRow>

                <FormRow>
                  <FormField label="Remaining Tenure (Months)">
                    <div>
                      <input
                        type="number"
                        min="1"
                        placeholder={
                          suggestedTenure
                            ? `Auto-estimated: ${suggestedTenure} mos`
                            : "e.g. 60"
                        }
                        value={remainingTenure}
                        onChange={(e) => setRemainingTenure(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground"
                      />
                      {suggestedTenure && suggestedTenure !== parseInt(remainingTenure) && (
                        <button
                          type="button"
                          onClick={() => setRemainingTenure(String(suggestedTenure))}
                          className="mt-1 text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
                        >
                          Auto-fill: {suggestedTenure} mos ({formatTenureSummary(suggestedTenure)})
                        </button>
                      )}
                      {remainingTenure && parseInt(remainingTenure) > 0 && (
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          Equivalent to ~{formatTenureSummary(parseInt(remainingTenure))}
                        </p>
                      )}
                    </div>
                  </FormField>
                  <FormField label="Loan Start Date (Optional)">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground"
                    />
                  </FormField>
                </FormRow>
              </>
            )}

            {/* Notes Field for All */}
            <FormField label="Notes (Optional)">
              <input
                type="text"
                placeholder="e.g. Tax saving 80C, Joint holder, Folio #..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-foreground"
              />
            </FormField>
          </div>

          {/* Modal Footer */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 p-4 px-5 border-t border-border/60 bg-card rounded-b-2xl shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 rounded-xl border border-border/60 text-muted-foreground hover:text-foreground text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-xs"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" /> Save Asset
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
