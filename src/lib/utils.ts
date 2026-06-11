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

/** Robust money parse for APIs/forms (comma-separated decimals, stray spaces). */
export function parseMoney(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const s = String(value).trim().replace(/,/g, '');
  if (!s) return 0;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function normalizeCurrencyCode(currency: unknown): keyof typeof CURRENCY_CONFIG {
  if (currency === null || currency === undefined) return 'TZS';
  const raw = String(currency).trim().toUpperCase();
  if (raw in CURRENCY_CONFIG) return raw as keyof typeof CURRENCY_CONFIG;
  if (raw === 'TSH') return 'TZS';
  return 'TZS';
}

export function formatCurrency(amount: unknown, currency: string = 'TZS'): string {
  const iso = normalizeCurrencyCode(currency);
  const n = typeof amount === 'number' ? (Number.isFinite(amount) ? amount : parseMoney(amount)) : parseMoney(amount);
  const config = CURRENCY_CONFIG[iso];
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: iso,
    minimumFractionDigits: iso === 'USD' || iso === 'EUR' || iso === 'GBP' ? 2 : 0,
    maximumFractionDigits: iso === 'USD' || iso === 'EUR' || iso === 'GBP' ? 2 : 0,
  }).format(n);
}

export function getCurrencySymbol(currency: string = 'TZS'): string {
  const iso = normalizeCurrencyCode(currency);
  return CURRENCY_CONFIG[iso]?.symbol || 'TSh';
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

export function formatShortDate(date: Date | string): string {
  const d = new Date(date);
  const month = d.toLocaleString('en-us', { month: 'short' }).toLowerCase();
  const day = d.getDate();
  const year = d.getFullYear().toString().slice(-2);
  return `${month} ${day}, ${year}`;
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
