'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/components/AuthProvider';

interface Settings {
  businessName: string;
  businessPhone: string;
  businessEmail: string;
  businessAddress: string;
  currency: string;
  currencySymbol: string;
  taxRate: number;
  lowStockAlert: boolean;
  expiryAlert: boolean;
  expiryAlertDays: number;
  dashboardConfig: Record<string, boolean> | null;
}

interface SettingsContextType {
  settings: Settings;
  logo: string | null;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  updateSettings: (s: Partial<Settings>, logo?: string | null) => void;
}

const defaultSettings: Settings = {
  businessName: '',
  businessPhone: '',
  businessEmail: '',
  businessAddress: '',
  currency: 'TZS',
  currencySymbol: 'TSh',
  taxRate: 0,
  lowStockAlert: true,
  expiryAlert: true,
  expiryAlertDays: 7,
  dashboardConfig: null,
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  logo: null,
  loading: true,
  refreshSettings: async () => {},
  updateSettings: () => {},
});

const CACHE_KEY = 'inshop_settings';
const LOGO_CACHE_KEY = 'inshop_logo';

function loadCached(): Settings | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveCache(s: Settings) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(s)); } catch {}
}

function loadCachedLogo(): string | null {
  try { return localStorage.getItem(LOGO_CACHE_KEY); } catch { return null; }
}

function saveCacheLogo(logo: string | null) {
  try { if (logo) localStorage.setItem(LOGO_CACHE_KEY, logo); else localStorage.removeItem(LOGO_CACHE_KEY); } catch {}
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const cached = loadCached();
  const cachedLogo = loadCachedLogo();
  const [settings, setSettings] = useState<Settings>(cached || defaultSettings);
  const [logo, setLogo] = useState<string | null>(cachedLogo);
  const [loading, setLoading] = useState(true);
  const { shop } = useAuth();

  const persistSettings = (s: Settings) => {
    setSettings(s);
    saveCache(s);
  };
  const persistLogo = (l: string | null) => {
    setLogo(l);
    saveCacheLogo(l);
  };

  const updateSettings = (s: Partial<Settings>, logo?: string | null) => {
    const next = { ...settings, ...s };
    persistSettings(next);
    if (logo !== undefined) persistLogo(logo);
  };

  const fetchSettings = async (shopId?: string) => {
    try {
      if (!shopId) { setLoading(false); return; }
      setLoading(true);
      const res = await fetch('/api/settings', { headers: { 'x-shop-id': shopId } });
      if (!res.ok) {
        const text = await res.text();
        if (res.status === 404 && text.includes('Shop not found')) {
          localStorage.removeItem('user');
          localStorage.removeItem('shop');
          localStorage.removeItem('token');
          localStorage.removeItem('permissions');
          localStorage.removeItem('loginTime');
          window.location.href = '/';
          return;
        }
        console.error('Settings fetch failed:', res.status, text);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.settings) {
        const merged = { ...defaultSettings, ...data.settings };
        persistSettings(merged);
      }
      if (data.logo) persistLogo(data.logo);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shop?.id) fetchSettings(shop.id);
  }, [shop?.id]);

  return (
      <SettingsContext.Provider value={{ settings, logo, loading, refreshSettings: fetchSettings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

export const CURRENCIES = [
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh', locale: 'sw-TZ' },
  { code: 'USD', name: 'US Dollar', symbol: '$', locale: 'en-US' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', locale: 'en-KE' },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh', locale: 'en-UG' },
  { code: 'EUR', name: 'Euro', symbol: '€', locale: 'de-DE' },
  { code: 'GBP', name: 'British Pound', symbol: '£', locale: 'en-GB' },
];

export function getCurrencyInfo(code: string) {
  return CURRENCIES.find(c => c.code === code) || CURRENCIES[0];
}
