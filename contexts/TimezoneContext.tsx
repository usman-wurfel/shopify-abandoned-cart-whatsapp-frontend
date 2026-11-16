'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import apiClient from '@/lib/axios';

interface TimezoneContextType {
  timezone: string;
  setTimezone: (tz: string) => void;
  formatDate: (dateString: string, options?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (dateString: string) => string;
  convertToTimezone: (dateString: string, targetTimezone?: string) => Date;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

export function TimezoneProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage if available, otherwise default to UTC
  const [timezone, setTimezoneState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('customer_timezone');
      if (stored) {
        return stored;
      }
    }
    return 'UTC';
  });
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    // Only fetch once if not already fetched and not in localStorage
    if (hasFetched || (typeof window !== 'undefined' && localStorage.getItem('customer_timezone'))) {
      setLoading(false);
      return;
    }

    // Fetch customer settings to get timezone (only once on initial load)
    const fetchTimezone = async () => {
      try {
        const userResponse = await apiClient.get('/user');
        const userData = userResponse.data.user || userResponse.data;
        
        if (userData && userData.role === 'customer') {
          const settingsResponse = await apiClient.get('/customer/settings');
          const settings = settingsResponse.data?.settings || settingsResponse.data;
          if (settings && settings.timezone) {
            setTimezoneState(settings.timezone);
            // Store in localStorage for persistence
            if (typeof window !== 'undefined') {
              localStorage.setItem('customer_timezone', settings.timezone);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch timezone:', err);
      } finally {
        setLoading(false);
        setHasFetched(true);
      }
    };

    fetchTimezone();
  }, [hasFetched]);

  const setTimezone = (tz: string) => {
    setTimezoneState(tz);
    // Update localStorage when timezone is changed
    if (typeof window !== 'undefined') {
      localStorage.setItem('customer_timezone', tz);
    }
  };

  // Convert UTC date string to customer's timezone
  const convertToTimezone = (dateString: string, targetTimezone?: string): Date => {
    if (!dateString) return new Date();
    
    const tz = targetTimezone || timezone;
    const utcDate = new Date(dateString);
    
    // Create a date formatter for the target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    
    // Format the UTC date in the target timezone
    const parts = formatter.formatToParts(utcDate);
    const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
    const month = parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1;
    const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    const second = parseInt(parts.find(p => p.type === 'second')?.value || '0');
    
    return new Date(year, month, day, hour, minute, second);
  };

  // Format date in customer's timezone
  const formatDate = (dateString: string, options?: Intl.DateTimeFormatOptions): string => {
    if (!dateString) return '';
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
    };

    const mergedOptions = { ...defaultOptions, ...options };
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', mergedOptions);
    } catch (err) {
      console.error('Date formatting error:', err);
      return dateString;
    }
  };

  // Format date and time in customer's timezone
  const formatDateTime = (dateString: string): string => {
    return formatDate(dateString, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
    });
  };

  // Always provide context, even during loading (with default UTC)
  return (
    <TimezoneContext.Provider
      value={{
        timezone,
        setTimezone,
        formatDate,
        formatDateTime,
        convertToTimezone,
      }}
    >
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone() {
  const context = useContext(TimezoneContext);
  if (context === undefined) {
    throw new Error('useTimezone must be used within a TimezoneProvider');
  }
  return context;
}
