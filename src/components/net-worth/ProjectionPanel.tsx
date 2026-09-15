"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Sparkles, ArrowUpRight } from "lucide-react";

interface SliderMark {
  value: number;
  label: string;
}

interface AccurateSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: React.ReactNode;
  marks: SliderMark[];
  onChange: (val: number) => void;
}

function AccurateSlider({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  marks,
  onChange,
}: AccurateSliderProps) {
  const fillPct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="text-foreground/80 font-semibold">{label}</span>
        <span className="text-foreground font-bold text-sm font-serif bg-muted/60 px-2.5 py-0.5 rounded-lg border border-border/60">
          {displayValue}
        </span>
      </div>

      <div className="relative pt-1 pb-5">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${fillPct}%, hsl(var(--border)) ${fillPct}%, hsl(var(--border)) 100%)`,
          }}
          className="w-full accent-primary h-2.5 rounded-full cursor-pointer appearance-none bg-border border border-border/80 shadow-inner focus:outline-hidden"
        />

        {/* Mathematically precise tick indicators and labels aligned with range thumb */}
        <div className="relative w-full h-5 mt-1.5 pointer-events-none">
          {marks.map((mark, idx) => {
            const pct = Math.min(
              100,
              Math.max(0, ((mark.value - min) / (max - min)) * 100)
            );
            const isFirst = idx === 0;
            const isLast = idx === marks.length - 1;
            const isSelected = Math.abs(value - mark.value) < step / 2;

            // Offset calculation accounts for thumb center across standard range thumb
            const leftPosition = isFirst
              ? "0%"
              : isLast
              ? "100%"
              : `calc(${pct}% + ${(0.5 - pct / 100) * 16}px)`;

            const transformStyle = isFirst
              ? "translateX(0)"
              : isLast
              ? "translateX(-100%)"
              : "translateX(-50%)";

            return (
              <div
                key={mark.value}
                className="absolute top-0 flex flex-col items-center pointer-events-auto cursor-pointer group select-none"
                style={{
                  left: leftPosition,
                  transform: transformStyle,
                }}
                onClick={() => onChange(mark.value)}
                title={`Click to set ${mark.label}`}
              >
                {!isFirst && !isLast && (
                  <div
                    className={`w-1.5 h-1.5 rounded-full mb-1 transition-all ${
                      isSelected
                        ? "bg-primary ring-2 ring-primary/30 scale-125"
                        : "bg-muted-foreground/40 group-hover:bg-primary/80"
                    }`}
                  />
                )}
                <span
                  className={`text-[10px] sm:text-[11px] whitespace-nowrap transition-colors ${
                    isSelected
                      ? "text-primary font-bold"
                      : "text-muted-foreground group-hover:text-foreground font-medium"
                  }`}
                >
                  {mark.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ProjectionPanel() {
  const [monthlySIP, setMonthlySIP] = useState<number>(50000);
  const [expectedReturn, setExpectedReturn] = useState<number>(12);
  const [years, setYears] = useState<number>(10);
  const [annualStepUp, setAnnualStepUp] = useState<number>(10); // 10% step up each year

  // Calculate future value with step-up
  let totalInvested = 0;
  let currentMonthly = monthlySIP;
  let futureValue = 0;
  const monthlyRate = expectedReturn / 100 / 12;

  for (let y = 1; y <= years; y++) {
    for (let m = 1; m <= 12; m++) {
      totalInvested += currentMonthly;
      const monthsRemaining = (years - y) * 12 + (12 - m + 1);
      futureValue += currentMonthly * Math.pow(1 + monthlyRate, monthsRemaining);
    }
    // Apply step-up at end of year
    currentMonthly = Math.round(currentMonthly * (1 + annualStepUp / 100));
  }

  const wealthGained = Math.max(0, futureValue - totalInvested);
  const wealthMultiplier =
    totalInvested > 0 ? (futureValue / totalInvested).toFixed(1) : "1.0";

  const monthlySIPMarks: SliderMark[] = [
    { value: 1000, label: "₹1K" },
    { value: 100000, label: "₹1L" },
    { value: 200000, label: "₹2L" },
    { value: 300000, label: "₹3L" },
  ];

  const expectedReturnMarks: SliderMark[] = [
    { value: 6, label: "6%" },
    { value: 12, label: "12%" },
    { value: 20, label: "20%" },
  ];

  const yearMarks: SliderMark[] = [
    { value: 1, label: "1" },
    { value: 10, label: "10" },
    { value: 20, label: "20" },
    { value: 30, label: "30" },
  ];

  const stepUpMarks: SliderMark[] = [
    { value: 0, label: "0%" },
    { value: 5, label: "5%" },
    { value: 10, label: "10%" },
    { value: 15, label: "15%" },
    { value: 20, label: "20%" },
    { value: 25, label: "25%" },
  ];

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-foreground font-serif">
              Wealth Compounding Simulator
            </h3>
            <p className="text-xs text-muted-foreground">
              Dynamic SIP projection with annual step-up growth
            </p>
          </div>
        </div>
        <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
          Power of Compounding
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-center">
        {/* Sliders & Inputs */}
        <div className="lg:col-span-7 space-y-3">
          {/* Monthly Investment */}
          <AccurateSlider
            label="Monthly Investment"
            value={monthlySIP}
            min={1000}
            max={300000}
            step={1000}
            displayValue={formatCurrency(monthlySIP)}
            marks={monthlySIPMarks}
            onChange={setMonthlySIP}
          />

          {/* Expected Return Rate */}
          <AccurateSlider
            label="Expected Return (p.a.)"
            value={expectedReturn}
            min={6}
            max={20}
            step={0.5}
            displayValue={`${expectedReturn}%`}
            marks={expectedReturnMarks}
            onChange={setExpectedReturn}
          />

          {/* Time Horizon and Annual Step-Up */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
            <AccurateSlider
              label="Horizon (Years)"
              value={years}
              min={1}
              max={30}
              step={1}
              displayValue={`${years} Yrs`}
              marks={yearMarks}
              onChange={setYears}
            />

            <AccurateSlider
              label="Annual Step-up"
              value={annualStepUp}
              min={0}
              max={25}
              step={1}
              displayValue={`${annualStepUp}%`}
              marks={stepUpMarks}
              onChange={setAnnualStepUp}
            />
          </div>
        </div>

        {/* Projected Wealth Output Card */}
        <div className="lg:col-span-5 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:p-5 space-y-3.5 sm:space-y-4">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Projected Portfolio Corpus
            </span>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground font-serif mt-1 break-words">
              {formatCurrency(Math.round(futureValue))}
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              {wealthMultiplier}x Total Investment Multiple
            </p>
          </div>

          <div className="space-y-1.5 sm:space-y-2 pt-2.5 sm:pt-3 border-t border-border/40 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total Invested Amount:</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(Math.round(totalInvested))}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Estimated Wealth Gain:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                +{formatCurrency(Math.round(wealthGained))}
              </span>
            </div>
          </div>

          {/* Visual Bar of Invested vs Gain */}
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden flex">
            <div
              className="bg-primary h-full transition-all"
              style={{
                width: `${Math.round((totalInvested / futureValue) * 100)}%`,
              }}
              title="Invested Amount"
            />
            <div
              className="bg-emerald-500 h-full transition-all"
              style={{
                width: `${Math.round((wealthGained / futureValue) * 100)}%`,
              }}
              title="Wealth Gain"
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-primary" /> Invested (
              {Math.round((totalInvested / futureValue) * 100)}%)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Gain (
              {Math.round((wealthGained / futureValue) * 100)}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
