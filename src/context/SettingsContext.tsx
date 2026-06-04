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
}

interface SettingsContextType {
  settings: Settings;
  logo: string | null;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const defaultSettings: Settings = {
  businessName: 'ISMS Pro Shop',
  businessPhone: '',
  businessEmail: '',
  businessAddress: '',
  currency: 'TZS',
  currencySymbol: 'TSh',
  taxRate: 0,
  lowStockAlert: true,
  expiryAlert: true,
  expiryAlertDays: 7,
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  logo: null,
  loading: true,
  refreshSettings: async () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [logo, setLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { shop } = useAuth();

  const fetchSettings = async (shopId?: string) => {
    try {
      if (!shopId) { setLoading(false); return; }
      const res = await fetch('/api/settings', { headers: { 'x-shop-id': shopId } });
      if (!res.ok) {
        const text = await res.text();
        console.error('Settings fetch failed:', res.status, text);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.settings) {
        setSettings({ ...defaultSettings, ...data.settings });
      }
      if (data.logo) setLogo(data.logo);
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
    <SettingsContext.Provider value={{ settings, logo, loading, refreshSettings: fetchSettings }}>
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
