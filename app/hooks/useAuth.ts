"use client";

import { useEffect, useState } from "react";

/** 🔔 Global event name for auth sync */
const AUTH_EVENT = "auth:user-updated";

export default function useAuth() {
  const isClient = typeof window !== "undefined";

  const [user, setUserState] = useState<any>(() => {
    if (!isClient) return null;
    return window.__auth_user__ ?? null;
  });

  const [loading, setLoading] = useState(true);

  /** 🔄 Internal unified setter (single source of truth) */
  function updateUser(value: any) {
    if (!isClient) return;

    const prev = window.__auth_user__;
    const newValue = typeof value === "function" ? value(prev) : value;

    // update global cache
    window.__auth_user__ = newValue;

    // update local state
    setUserState(newValue);

    // 🔥 notify ALL other hook instances
    window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: newValue }));
  }

  /** 🌍 Expose global setter (for legacy usage if any) */
  useEffect(() => {
    if (!isClient) return;
    window.__auth_setUser__ = updateUser;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient]);

  /** 🔔 Listen for auth updates from OTHER components */
  useEffect(() => {
    if (!isClient) return;

    const onAuthUpdate = (e: Event) => {
      const ce = e as CustomEvent<any>;
      setUserState(ce.detail);
    };

    window.addEventListener(AUTH_EVENT, onAuthUpdate);
    return () => window.removeEventListener(AUTH_EVENT, onAuthUpdate);
  }, [isClient]);

  /** 📡 Load user from backend */
  async function loadUser() {
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      updateUser(data?.user ?? null);
    } catch {
      updateUser(null);
    } finally {
      setLoading(false);
    }
  }

  /** 🚀 Initial load */
  useEffect(() => {
    if (isClient) loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient]);

  return {
    user,
    loading,
    refresh: loadUser,

    // ✅ SAFE shared setter
    setUser: updateUser,
  };
}
