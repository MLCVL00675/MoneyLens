export interface CategoryIconDef {
  id: string;
  name: string;
  categoryType: "EXPENSE" | "INCOME" | "BOTH";
}

export const AVAILABLE_CATEGORY_ICONS: CategoryIconDef[] = [
  // General & Living
  { id: "home", name: "Housing / Rent", categoryType: "BOTH" },
  { id: "car", name: "Transportation", categoryType: "EXPENSE" },
  { id: "fuel", name: "Fuel & Gas", categoryType: "EXPENSE" },
  { id: "utensils", name: "Food & Dining", categoryType: "EXPENSE" },
  { id: "coffee", name: "Coffee & Drinks", categoryType: "EXPENSE" },
  { id: "shopping", name: "Shopping", categoryType: "EXPENSE" },
  { id: "cart", name: "Groceries", categoryType: "EXPENSE" },
  { id: "film", name: "Entertainment", categoryType: "EXPENSE" },
  { id: "music", name: "Music & Events", categoryType: "EXPENSE" },
  { id: "heart", name: "Healthcare & Meds", categoryType: "EXPENSE" },
  { id: "dumbbell", name: "Fitness & Gym", categoryType: "EXPENSE" },
  { id: "book", name: "Education", categoryType: "EXPENSE" },
  { id: "plane", name: "Travel & Flights", categoryType: "EXPENSE" },
  { id: "hotel", name: "Hotel & Stays", categoryType: "EXPENSE" },
  { id: "user", name: "Personal Care", categoryType: "EXPENSE" },
  { id: "scissors", name: "Salon & Grooming", categoryType: "EXPENSE" },
  { id: "zap", name: "Utilities & Power", categoryType: "EXPENSE" },
  { id: "wifi", name: "Internet & Tech", categoryType: "EXPENSE" },
  { id: "phone", name: "Phone & Mobile", categoryType: "EXPENSE" },
  { id: "receipt", name: "Bills & Subscriptions", categoryType: "EXPENSE" },
  { id: "wrench", name: "Repairs & Maintenance", categoryType: "EXPENSE" },
  { id: "paw", name: "Pets", categoryType: "EXPENSE" },
  { id: "gift", name: "Gifts & Charity", categoryType: "EXPENSE" },
  { id: "tag", name: "General / Other", categoryType: "BOTH" },

  // Income
  { id: "briefcase", name: "Salary / Job", categoryType: "INCOME" },
  { id: "laptop", name: "Freelance & Projects", categoryType: "INCOME" },
  { id: "trending", name: "Investments & Stocks", categoryType: "INCOME" },
  { id: "building", name: "Business", categoryType: "INCOME" },
  { id: "coins", name: "Dividends & Returns", categoryType: "INCOME" },
  { id: "landmark", name: "Rental Income", categoryType: "INCOME" },
  { id: "piggy", name: "Savings", categoryType: "BOTH" },
  { id: "wallet", name: "Cash / Misc", categoryType: "BOTH" },
];

export const DEFAULT_CATEGORIES = [
  // Expense Categories
  { name: "Housing", icon: "home", type: "EXPENSE" },
  { name: "Transportation", icon: "car", type: "EXPENSE" },
  { name: "Food & Drink", icon: "utensils", type: "EXPENSE" },
  { name: "Shopping", icon: "shopping", type: "EXPENSE" },
  { name: "Entertainment", icon: "film", type: "EXPENSE" },
  { name: "Healthcare", icon: "heart", type: "EXPENSE" },
  { name: "Education", icon: "book", type: "EXPENSE" },
  { name: "Travel", icon: "plane", type: "EXPENSE" },
  { name: "Personal", icon: "user", type: "EXPENSE" },
  { name: "Bills & Utilities", icon: "zap", type: "EXPENSE" },
  { name: "Other Expense", icon: "tag", type: "EXPENSE" },

  // Income Categories
  { name: "Salary", icon: "briefcase", type: "INCOME" },
  { name: "Freelance", icon: "laptop", type: "INCOME" },
  { name: "Investments", icon: "trending", type: "INCOME" },
  { name: "Business", icon: "building", type: "INCOME" },
  { name: "Dividends", icon: "coins", type: "INCOME" },
  { name: "Rental Income", icon: "landmark", type: "INCOME" },
  { name: "Other Income", icon: "wallet", type: "INCOME" },
] as const;
