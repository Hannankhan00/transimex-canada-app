"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ClientAccountDTO } from "@/lib/express/accountDto";

interface ExpressAccountState {
  account: ClientAccountDTO | null;
  loading: boolean;
  error: boolean;
  reload: () => Promise<void>;
}

const ExpressAccountContext = createContext<ExpressAccountState | null>(null);

/**
 * Loads the signed-in client's own Express account once for the whole Express portal
 * (null if they have not applied), so the sidebar and every page agree on its state.
 */
export function ExpressAccountProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<ClientAccountDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/express/account");
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error("load failed");
      setAccount(data.account);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return <ExpressAccountContext.Provider value={{ account, loading, error, reload: load }}>{children}</ExpressAccountContext.Provider>;
}

export function useExpressAccount(): ExpressAccountState {
  const ctx = useContext(ExpressAccountContext);
  if (!ctx) throw new Error("useExpressAccount must be used inside the Express portal");
  return ctx;
}
