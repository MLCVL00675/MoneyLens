"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { CategoryIcon } from "@/components/ui/category-icon";

export interface CategoryOption {
  id?: string;
  name: string;
  icon?: string;
  type?: string;
}

interface CategorySelectProps {
  categories: CategoryOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CategorySelect({
  categories,
  value,
  onChange,
  placeholder = "Select category",
  disabled = false,
}: CategorySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedCategory = categories.find((c) => c.name === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 border border-cream-300 rounded-lg text-sm bg-white text-left transition-default focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent ${
          disabled ? "opacity-50 cursor-not-allowed" : "hover:border-gray-400"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {selectedCategory ? (
            <>
              <div className="w-6 h-6 rounded-md bg-cream-100 flex items-center justify-center shrink-0">
                <CategoryIcon
                  icon={selectedCategory.icon}
                  category={selectedCategory.name}
                  className="w-3.5 h-3.5 text-gray-900"
                  strokeWidth={2}
                />
              </div>
              <span className="text-gray-900 font-medium truncate">{selectedCategory.name}</span>
            </>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${
            isOpen ? "rotate-180 text-gray-700" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-cream-300 rounded-xl shadow-lg z-50 max-h-[260px] overflow-y-auto p-1.5 animate-scale-in">
          {categories.length > 0 ? (
            categories.map((cat) => {
              const isSelected = cat.name === value;
              return (
                <button
                  key={cat.id || cat.name}
                  type="button"
                  onClick={() => {
                    onChange(cat.name);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-default ${
                    isSelected
                      ? "bg-navy-900 text-white font-semibold"
                      : "text-gray-800 hover:bg-cream-100"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                        isSelected ? "bg-white/20 text-white" : "bg-cream-100 text-gray-900"
                      }`}
                    >
                      <CategoryIcon
                        icon={cat.icon}
                        category={cat.name}
                        className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-gray-900"}`}
                        strokeWidth={2}
                      />
                    </div>
                    <span className="truncate">{cat.name}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-white shrink-0 ml-2" />}
                </button>
              );
            })
          ) : (
            <div className="py-4 text-center text-xs text-gray-400">No categories found</div>
          )}
        </div>
      )}
    </div>
  );
}
