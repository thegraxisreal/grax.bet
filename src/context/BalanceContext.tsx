"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@/context/UserContext";
import { updateUserBalance } from "@/lib/firestore";

const STORAGE_KEY = "tgrg_balance";
const STARTING_BALANCE = 50.0;

interface BalanceContextValue {
  balance: number;
  setBalance: (n: number) => void;
  addBalance: (n: number) => void;
  subtractBalance: (n: number) => void;
  resetBalance: () => void;
  isBroke: boolean;
  registerBet: () => void;
  unregisterBet: () => void;
  isCoolingDown: boolean;
  cooldownRemainingMs: number;
}

const BalanceContext = createContext<BalanceContextValue | null>(null);

export function BalanceProvider({ children }: { children: React.ReactNode }) {
  const { username } = useUser();
  const [balance, setBalanceState] = useState<number>(STARTING_BALANCE);
  const [hydrated, setHydrated] = useState(false);
  const [activeBets, setActiveBets] = useState(0);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      const parsed = parseFloat(stored);
      if (!isNaN(parsed)) setBalanceState(parsed);
    }
    setHydrated(true);
  }, []);

  // Debounce-sync balance to Firestore so the leaderboard stays accurate
  useEffect(() => {
    if (!hydrated || !username) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      updateUserBalance(username, balance).catch(() => {});
    }, 800);
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [balance, hydrated, username]);

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

  const registerBet = useCallback(() => {
    setActiveBets(n => n + 1);
  }, []);

  const unregisterBet = useCallback(() => {
    setActiveBets(n => Math.max(0, n - 1));
  }, []);

  const isBroke = hydrated && balance <= 0 && activeBets === 0;

  return (
    <BalanceContext.Provider
      value={{
        balance,
        setBalance: persistBalance,
        addBalance,
        subtractBalance,
        resetBalance,
        isBroke,
        registerBet,
        unregisterBet,
        isCoolingDown: false,
        cooldownRemainingMs: 0,
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
