"use client";

import { useCallback, useEffect, useState } from "react";
import type { ClientAccountDTO } from "@/lib/express/accountDto";

/** Loads the signed-in client's own Express account (null if they have not applied). */
export function useExpressAccount() {
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

  return { account, loading, error, reload: load };
}
