'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Bell, X, Check, Clock } from 'lucide-react';

interface Reminder {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  isActive: boolean;
}

const SKIP_KEY = 'skippedReminders';
const ACCEPT_KEY = 'acceptedReminders';
const POP_INTERVAL = 10 * 60 * 1000;

function getStored(key: string): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}');
  } catch {
    return {};
  }
}

function setStored(key: string, value: Record<string, number>) {
  localStorage.setItem(key, JSON.stringify(value));
}

interface ReminderPopupProps {
  shopId?: string;
}

export default function ReminderPopup({ shopId: propShopId }: ReminderPopupProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [visible, setVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const shopId = propShopId || (typeof window !== 'undefined' ? localStorage.getItem('shopId') : null);

  const filterVisible = useCallback((list: Reminder[]) => {
    const skips = getStored(SKIP_KEY);
    const accepts = getStored(ACCEPT_KEY);
    const now = Date.now();
    return list.filter(r => {
      if (accepts[r.id]) return false;
      const skipTime = skips[r.id];
      if (skipTime && (now - skipTime) < POP_INTERVAL) return false;
      return r.isActive;
    });
  }, []);

  const fetchReminders = useCallback(async () => {
    if (!shopId) return;
    try {
      const res = await fetch('/api/reminders', { headers: { 'x-shop-id': shopId } });
      const data = await res.json();
      if (data.reminders) {
        const active = data.reminders.filter((r: Reminder) => r.isActive);
        const shown = filterVisible(active);
        setReminders(prev => visible ? prev : shown);
        if (shown.length > 0 && !visible) {
          setVisible(true);
          setCurrentIndex(0);
        }
      }
    } catch {}
  }, [shopId, filterVisible, visible]);

  useEffect(() => {
    fetchReminders();
    const interval = setInterval(fetchReminders, POP_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchReminders]);

  const accept = (id: string, now: number) => {
    const accepts = getStored(ACCEPT_KEY);
    accepts[id] = now;
    setStored(ACCEPT_KEY, accepts);
    dismiss();
  };

  const skip = (id: string, now: number) => {
    const skips = getStored(SKIP_KEY);
    skips[id] = now;
    setStored(SKIP_KEY, skips);
    dismiss();
  };

  const dismiss = () => {
    const remaining = reminders.filter((_, i) => i !== currentIndex);
    if (remaining.length > 0) {
      setReminders(remaining);
      setCurrentIndex(prev => Math.min(prev, remaining.length - 1));
    } else {
      setVisible(false);
      setReminders([]);
    }
  };

  if (!visible || reminders.length === 0) return null;

  const reminder = reminders[currentIndex];
  if (!reminder) return null;

  const isOverdue = reminder.dueDate && new Date(reminder.dueDate) < new Date();

  return (
    <div className="reminder-popup-overlay">
      <div className="reminder-popup">
        <div className="reminder-popup-icon">
          <Bell size={24} />
        </div>
        <div className="reminder-popup-body">
          <h4>{reminder.title}</h4>
          {reminder.description && <p>{reminder.description}</p>}
          {reminder.dueDate && (
            <div className="reminder-popup-due">
              <Clock size={12} />
              {new Date(reminder.dueDate).toLocaleDateString('en-US', {
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
              {isOverdue && <span className="reminder-popup-overdue">(overdue)</span>}
            </div>
          )}
        </div>
        <div className="reminder-popup-actions">
          <button className="reminder-popup-btn accept" onClick={() => accept(reminder.id, Date.now())} title="Accept">
            <Check size={18} /> Accept
          </button>
          <button className="reminder-popup-btn skip" onClick={() => skip(reminder.id, Date.now())} title="Skip (remind in 10 min)">
            <X size={18} /> Skip
          </button>
        </div>
      </div>
    </div>
  );
}
