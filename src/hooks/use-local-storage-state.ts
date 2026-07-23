"use client";

import { useCallback, useState, type SetStateAction } from "react";

export function useLocalStorageState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setPersistedValue = useCallback((next: SetStateAction<T>) => {
    setValue((current) => {
      const resolved = typeof next === "function" ? (next as (previous: T) => T)(current) : next;
      window.localStorage.setItem(key, JSON.stringify(resolved));
      return resolved;
    });
  }, [key]);

  return [value, setPersistedValue] as const;
}
