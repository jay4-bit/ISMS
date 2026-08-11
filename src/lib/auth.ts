export const SHOP_TYPE_CONFIG: Record<string, {
  name: string;
  icon: string;
  description: string;
  color: string;
  features: string[];
  roles: string[];
}> = {
  PHARMACY: {
    name: 'Pharmacy',
    icon: '💊',
    description: 'Manage prescriptions, medications, and health products',
    color: '#22c55e',
    features: ['Prescription Management', 'Batch Tracking', 'Expiry Alerts', 'Drug Interactions'],
    roles: ['OWNER', 'PHARMACIST', 'CASHIER', 'ASSISTANT']
  },
  GENERAL: {
    name: 'General Store',
    icon: '🏪',
    description: 'Handle daily essentials and household items',
    color: '#f59e0b',
    features: ['Multi-category Products', 'Supplier Management', 'Bulk Pricing', 'Stock Alerts'],
    roles: ['OWNER', 'MANAGER', 'CASHIER', 'ASSISTANT']
  },
  LIQUOR: {
    name: 'Liquor Store',
    icon: '🍷',
    description: 'Track beverages, wines, and spirits inventory',
    color: '#8b5cf6',
    features: ['Age Verification', 'License Tracking', 'Batch Numbers', 'Variety Management'],
    roles: ['OWNER', 'MANAGER', 'CASHIER', 'WINGER']
  },
  ELECTRONICS: {
    name: 'Electronics Shop',
    icon: '📱',
    description: 'Manage phones, gadgets, and tech accessories',
    color: '#3b82f6',
    features: ['Serial Number Tracking', 'Warranty Management', 'IMEI Tracking', 'Model Variants'],
    roles: ['OWNER', 'MANAGER', 'CASHIER', 'WINGER']
  },
  CLOTHING: {
    name: 'Clothing Store',
    icon: '👕',
    description: 'Track apparel, sizes, and fashion inventory',
    color: '#ec4899',
    features: ['Size Variants', 'Color Options', 'Seasonal Stock', 'Fashion Categories'],
    roles: ['OWNER', 'MANAGER', 'CASHIER', 'ASSISTANT']
  }
};

export const DEFAULT_CATEGORIES: Record<string, string[]> = {
  PHARMACY: ['Prescription Drugs', 'OTC Medicines', 'Vitamins & Supplements', 'First Aid', 'Medical Supplies', 'Baby Care', 'Skincare'],
  GENERAL: ['Food & Beverages', 'Household Items', 'Personal Care', 'Stationery', 'Cleaning Supplies', 'Pet Care', 'Garden'],
  LIQUOR: ['Beer', 'Wine', 'Spirits', 'Cocktail Mixers', 'Non-Alcoholic', 'Accessories', 'Tobacco'],
  ELECTRONICS: ['Phones & Tablets', 'Accessories', 'Networking', 'Audio', 'Power Solutions', 'Smart Home', 'Gaming'],
  CLOTHING: ["Men's Wear", "Women's Wear", 'Kids Wear', 'Accessories', 'Footwear', 'Sportswear', 'Underwear']
};
