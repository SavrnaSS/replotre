"use client";

import { useEffect, useState } from "react";

export default function AuthButtons() {
  const [loading, setLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!mounted) return;
        setIsAuthed(!!data?.user);
      } catch {
        if (!mounted) return;
        setIsAuthed(false);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <button
        type="button"
        className="px-4 py-2 rounded-2xl bg-white/10 border border-white/15 text-white/70 font-semibold"
        disabled
      >
        Loading…
      </button>
    );
  }

  if (isAuthed) {
    return (
      <button
        type="button"
        onClick={() => (window.location.href = "/")}
        className="px-4 py-2 rounded-2xl bg-white/10 border border-white/15 text-white font-semibold hover:bg-white/15 transition"
      >
        Go Home
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => (window.location.href = "/login")}
      className="px-4 py-2 rounded-2xl bg-white/10 border border-white/15 text-white font-semibold hover:bg-white/15 transition"
    >
      Login
    </button>
  );
}
