"use client";

import React from "react";
import { AVAILABLE_CATEGORY_ICONS } from "@/lib/category-icons";
import { CategoryIcon } from "@/components/ui/category-icon";

interface IconPickerProps {
  selectedIcon: string;
  onSelectIcon: (iconId: string) => void;
  type?: "EXPENSE" | "INCOME" | "BOTH";
}

export function IconPicker({ selectedIcon, onSelectIcon, type = "BOTH" }: IconPickerProps) {
  const filteredIcons = AVAILABLE_CATEGORY_ICONS.filter(
    (item) => type === "BOTH" || item.categoryType === "BOTH" || item.categoryType === type
  );

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
        Choose Icon
      </label>
      <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 p-2.5 bg-cream-50 border border-cream-200 rounded-xl max-h-[180px] overflow-y-auto">
        {filteredIcons.map((item) => {
          const isSelected = selectedIcon === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectIcon(item.id)}
              title={item.name}
              className={`p-2.5 rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${
                isSelected
                  ? "bg-navy-900 text-white shadow-sm ring-2 ring-navy-900 ring-offset-1"
                  : "bg-white text-gray-800 hover:bg-cream-100 border border-cream-200"
              }`}
            >
              <CategoryIcon
                icon={item.id}
                className={`w-4 h-4 ${isSelected ? "text-white" : "text-gray-900"}`}
                strokeWidth={2}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
