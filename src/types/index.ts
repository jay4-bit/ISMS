export type Role = 'ADMIN' | 'MANAGER' | 'CASHIER' | 'ACCOUNTANT';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  categoryId: string;
  category?: Category;
  purchaseCost: number;
  sellingPrice: number;
  stockQuantity: number;
  lowStockThreshold: number;
  isFaulty: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT' | 'RETURN_RESELLABLE' | 'RETURN_FAULTY';
  quantity: number;
  reason?: string;
  createdAt: Date;
  createdBy?: string;
}

export interface Sale {
  id: string;
  receiptNumber: string;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: 'CASH' | 'CARD' | 'MOBILE';
  createdAt: Date;
  cashierId: string;
  cashier?: User;
  items: SaleItem[];
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface Return {
  id: string;
  returnNumber: string;
  reason: string;
  createdAt: Date;
  processedBy: string;
  items: ReturnItem[];
}

export interface ReturnItem {
  id: string;
  returnId: string;
  productId: string;
  product?: Product;
  quantity: number;
  reason: string;
  status: 'PENDING' | 'RESELLABLE' | 'FAULTY' | 'REFUNDED' | 'DISCARDED';
  refundAmount: number;
  createdAt: Date;
}

export interface DashboardStats {
  totalProducts: number;
  lowStockCount: number;
  totalInventoryValue: number;
  todaySales: number;
  todayProfit: number;
  fastMovingItems: Product[];
  slowMovingItems: Product[];
}

export interface ReportFilter {
  startDate?: Date;
  endDate?: Date;
  categoryId?: string;
  productId?: string;
}

export interface ReportData {
  sales: Sale[];
  totalRevenue: number;
  totalProfit: number;
  totalDiscount: number;
  itemsSold: number;
  returns: Return[];
  totalRefunds: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
}
