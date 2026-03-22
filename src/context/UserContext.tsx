"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { checkUsernameAvailable, createUser, getUser } from "@/lib/firestore";

export interface UserContextValue {
  username: string | null;
  needsUsername: boolean;
  isLoading: boolean;
  saveUsername: (username: string) => Promise<{ success: boolean; error?: string }>;
}

const UserContext = createContext<UserContextValue | null>(null);

const USERNAME_KEY = "grax_username";
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,16}$/;

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [needsUsername, setNeedsUsername] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(USERNAME_KEY);
    if (stored) {
      getUser(stored)
        .then((user) => {
          if (user) {
            setUsername(user.username);
          } else {
            setNeedsUsername(true);
          }
        })
        .catch(() => {
          setNeedsUsername(true);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setNeedsUsername(true);
      setIsLoading(false);
    }
  }, []);

  async function saveUsername(name: string): Promise<{ success: boolean; error?: string }> {
    if (!USERNAME_REGEX.test(name)) {
      return { success: false, error: "Username must be 3–16 characters: letters, numbers, underscores only." };
    }

    const available = await checkUsernameAvailable(name);
    if (!available) {
      return { success: false, error: "That username is already taken." };
    }

    await createUser(name, 50);
    localStorage.setItem(USERNAME_KEY, name);
    setUsername(name);
    setNeedsUsername(false);

    return { success: true };
  }

  return (
    <UserContext.Provider value={{ username, needsUsername, isLoading, saveUsername }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within a UserProvider");
  return ctx;
}
