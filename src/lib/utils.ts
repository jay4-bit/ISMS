import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CURRENCY_CONFIG: Record<string, { locale: string; symbol: string }> = {
  TZS: { locale: 'sw-TZ', symbol: 'TSh' },
  USD: { locale: 'en-US', symbol: '$' },
  KES: { locale: 'en-KE', symbol: 'KSh' },
  UGX: { locale: 'en-UG', symbol: 'USh' },
  EUR: { locale: 'de-DE', symbol: '€' },
  GBP: { locale: 'en-GB', symbol: '£' },
};

export function formatCurrency(amount: number, currency: string = 'TZS'): string {
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.TZS;
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: currency === 'USD' || currency === 'EUR' || currency === 'GBP' ? 2 : 0,
    maximumFractionDigits: currency === 'USD' || currency === 'EUR' || currency === 'GBP' ? 2 : 0,
  }).format(amount);
}

export function getCurrencySymbol(currency: string = 'TZS'): string {
  return CURRENCY_CONFIG[currency]?.symbol || 'TSh';
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function generateReceiptNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RCP-${timestamp}-${random}`;
}

export function generateReturnNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RET-${timestamp}-${random}`;
}

export function calculateProfit(purchaseCost: number, sellingPrice: number): number {
  return sellingPrice - purchaseCost;
}

export function calculateTotalProfit(items: { quantity: number; unitPrice: number; product: { purchaseCost: number } }[]): number {
  return items.reduce((total, item) => {
    const profit = item.unitPrice - item.product.purchaseCost;
    return total + profit * item.quantity;
  }, 0);
}
