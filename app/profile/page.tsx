"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LogOut, Mail, User } from "lucide-react";

type UserAccount = {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  credits?: number | null;
};

export default function ProfilePage() {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        const data = await res.json();
        if (active) setUser(data?.user ?? null);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07070B] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute -bottom-56 right-[-120px] h-[520px] w-[520px] rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.04]" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-black/40" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-4 pb-16 pt-10 sm:px-6">
        <Link
          href="/playground"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 transition hover:bg-white/10"
        >
          <ArrowLeft size={14} /> Back to playground
        </Link>

        <div className="mt-6 rounded-[26px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.22em] text-white/45">Profile</p>
          <h1 className="mt-2 text-2xl font-semibold">Account details</h1>
          <p className="mt-1 text-sm text-white/55">
            Manage your personal information and session.
          </p>

          {loading ? (
            <div className="mt-6 text-sm text-white/60">Loading profile…</div>
          ) : (
            <div className="mt-6 grid gap-4">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-center gap-3">
                  <User size={16} className="text-indigo-200" />
                  <div>
                    <p className="text-xs text-white/45">Name</p>
                    <p className="text-sm font-semibold text-white/90">
                      {user?.name || "—"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-indigo-200" />
                  <div>
                    <p className="text-xs text-white/45">Email</p>
                    <p className="text-sm font-semibold text-white/90">
                      {user?.email || "—"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs text-white/45">Credits</p>
                <p className="mt-1 text-sm font-semibold text-white/90">
                  {user?.credits ?? "—"}
                </p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={async () => {
              await fetch("/api/logout", { method: "POST" });
              window.location.href = "/";
            }}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-rose-300/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-100 transition hover:bg-rose-500/20"
          >
            <LogOut size={16} /> Log out
          </button>
        </div>
      </div>
    </main>
  );
}
