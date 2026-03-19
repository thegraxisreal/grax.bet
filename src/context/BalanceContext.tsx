"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "tgrg_balance";
const STARTING_BALANCE = 50.0;

interface BalanceContextValue {
  balance: number;
  setBalance: (n: number) => void;
  addBalance: (n: number) => void;
  subtractBalance: (n: number) => void;
  resetBalance: () => void;
  isBroke: boolean;
}

const BalanceContext = createContext<BalanceContextValue | null>(null);

export function BalanceProvider({ children }: { children: React.ReactNode }) {
  const [balance, setBalanceState] = useState<number>(STARTING_BALANCE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      const parsed = parseFloat(stored);
      if (!isNaN(parsed)) setBalanceState(parsed);
    }
    setHydrated(true);
  }, []);

  const persistBalance = useCallback((n: number) => {
    const rounded = Math.round(n * 100) / 100;
    setBalanceState(rounded);
    localStorage.setItem(STORAGE_KEY, String(rounded));
  }, []);

  const addBalance = useCallback((n: number) => {
    setBalanceState(prev => {
      const next = Math.round((prev + n) * 100) / 100;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const subtractBalance = useCallback((n: number) => {
    setBalanceState(prev => {
      const next = Math.max(0, Math.round((prev - n) * 100) / 100);
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const resetBalance = useCallback(() => {
    persistBalance(STARTING_BALANCE);
  }, [persistBalance]);

  const isBroke = hydrated && balance <= 0;

  return (
    <BalanceContext.Provider
      value={{
        balance,
        setBalance: persistBalance,
        addBalance,
        subtractBalance,
        resetBalance,
        isBroke,
      }}
    >
      {children}
    </BalanceContext.Provider>
  );
}

export function useBalance() {
  const ctx = useContext(BalanceContext);
  if (!ctx) throw new Error("useBalance must be used inside BalanceProvider");
  return ctx;
}
