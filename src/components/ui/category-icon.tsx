"use client";

import React from "react";
import {
  Home,
  Car,
  Fuel,
  Utensils,
  Coffee,
  ShoppingBag,
  ShoppingCart,
  Film,
  Music,
  HeartPulse,
  Dumbbell,
  BookOpen,
  Plane,
  Building,
  User,
  Scissors,
  Zap,
  Wifi,
  Smartphone,
  Receipt,
  Wrench,
  PawPrint,
  Gift,
  Tag,
  Briefcase,
  Laptop,
  TrendingUp,
  Building2,
  Coins,
  Landmark,
  PiggyBank,
  Wallet,
  LucideIcon,
} from "lucide-react";

export const ICON_MAP: Record<string, LucideIcon> = {
  home: Home,
  housing: Home,
  rent: Landmark,

  car: Car,
  transportation: Car,
  fuel: Fuel,
  gas: Fuel,

  utensils: Utensils,
  food: Utensils,
  "food & drink": Utensils,
  dining: Utensils,
  coffee: Coffee,
  drinks: Coffee,

  shopping: ShoppingBag,
  "shopping & retail": ShoppingBag,
  cart: ShoppingCart,
  groceries: ShoppingCart,

  film: Film,
  movies: Film,
  entertainment: Film,
  music: Music,
  events: Music,

  heart: HeartPulse,
  healthcare: HeartPulse,
  medical: HeartPulse,
  health: HeartPulse,

  dumbbell: Dumbbell,
  fitness: Dumbbell,
  gym: Dumbbell,

  book: BookOpen,
  education: BookOpen,
  school: BookOpen,

  plane: Plane,
  travel: Plane,
  flights: Plane,
  hotel: Building,

  user: User,
  personal: User,
  scissors: Scissors,
  salon: Scissors,

  zap: Zap,
  "bills & utilities": Zap,
  utilities: Zap,
  power: Zap,
  electricity: Zap,

  wifi: Wifi,
  internet: Wifi,
  phone: Smartphone,
  mobile: Smartphone,

  receipt: Receipt,
  bills: Receipt,
  subscription: Receipt,

  wrench: Wrench,
  repairs: Wrench,
  maintenance: Wrench,

  paw: PawPrint,
  pets: PawPrint,

  gift: Gift,
  charity: Gift,

  tag: Tag,
  "other expense": Tag,
  other: Tag,

  briefcase: Briefcase,
  salary: Briefcase,
  job: Briefcase,

  laptop: Laptop,
  freelance: Laptop,
  tech: Laptop,

  trending: TrendingUp,
  investments: TrendingUp,
  stocks: TrendingUp,

  building: Building2,
  business: Building2,

  coins: Coins,
  dividends: Coins,
  returns: Coins,

  landmark: Landmark,
  "rental income": Landmark,

  piggy: PiggyBank,
  savings: PiggyBank,

  wallet: Wallet,
  "other income": Wallet,
  cash: Wallet,
};

interface CategoryIconProps {
  icon?: string | null;
  category?: string | null;
  className?: string;
  size?: number;
  strokeWidth?: number;
}

export function CategoryIcon({
  icon,
  category,
  className = "w-4 h-4 text-gray-900",
  size,
  strokeWidth = 2,
}: CategoryIconProps) {
  const key = (icon || category || "").trim().toLowerCase();
  const IconComponent = ICON_MAP[key] || Tag;

  return (
    <IconComponent
      className={className}
      size={size}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

export function getIconComponent(iconOrCategory?: string | null): LucideIcon {
  const key = (iconOrCategory || "").trim().toLowerCase();
  return ICON_MAP[key] || Tag;
}
