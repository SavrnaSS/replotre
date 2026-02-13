// app/login/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (searchParams.get("error") === "db_unavailable") {
      setError("Login is temporarily unavailable. Please try again in a few minutes.");
    }
  }, [searchParams]);

  const trimmedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const emailValid = useMemo(() => {
    if (!trimmedEmail) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  }, [trimmedEmail]);

  const canSubmit = useMemo(() => {
    if (loading) return false;
    if (!trimmedEmail || !emailValid) return false;
    if (!password || password.length < 6) return false;
    return true;
  }, [loading, trimmedEmail, emailValid, password]);

  const loginGoogle = () => {
    window.location.href = "/api/auth/google";
  };

  const loginManual = async () => {
    setError("");

    if (!trimmedEmail) return setError("Email is required.");
    if (!emailValid) return setError("Please enter a valid email.");
    if (!password) return setError("Password is required.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Login failed");

      router.push("/workspace");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B0B10] text-white">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-purple-500/25 blur-[90px]" />
        <div className="absolute -bottom-40 right-[-120px] h-[520px] w-[520px] rounded-full bg-fuchsia-400/20 blur-[110px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] bg-[length:22px_22px] opacity-40" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
        <div className="grid w-full items-center gap-8 lg:grid-cols-2">
          {/* Left: Brand */}
          <div className="hidden lg:block">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
              <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
              Secure authentication • Supabase + Prisma
            </div>

            <h1 className="mt-4 text-5xl font-semibold leading-tight tracking-tight">
              Welcome back to{" "}
              <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                Gerox
              </span>
            </h1>

            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/65">
              Sign in to continue. Use Google for one-tap access or your email/password.
              Your session is stored securely in an HTTP-only cookie.
            </p>

            <div className="mt-8 grid max-w-md grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-white/60">Fast</div>
                <div className="mt-1 text-sm font-semibold">One-click Google login</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-white/60">Safe</div>
                <div className="mt-1 text-sm font-semibold">Encrypted credentials</div>
              </div>
            </div>
          </div>

          {/* Right: Card */}
          <div className="mx-auto w-full max-w-md">
            <div className="relative rounded-3xl border border-white/12 bg-white/[0.07] p-7 shadow-2xl backdrop-blur-xl">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/[0.06] to-transparent" />

              <div className="relative">
                <div className="mb-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-semibold tracking-tight">Gerox AI Login</h2>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/70">
                      v1
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-white/60">
                    Login with Google or use your email & password.
                  </p>
                </div>

                <button
                  onClick={loginGoogle}
                  className="group relative flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white text-black py-3.5 font-semibold shadow-lg shadow-white/10 transition hover:bg-gray-200"
                >
                  <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-black/0 via-black/0 to-black/5 opacity-0 transition group-hover:opacity-100" />
                  <span className="relative">Continue with Google</span>
                </button>

                <div className="my-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/15" />
                  <span className="text-[11px] text-white/45">OR</span>
                  <div className="h-px flex-1 bg-white/15" />
                </div>

                {error ? (
                  <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[12px] text-red-200 leading-snug">
                    {error}
                  </div>
                ) : null}

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-white/60">Email</label>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      inputMode="email"
                      autoComplete="email"
                      className={`w-full rounded-2xl bg-black/30 px-4 py-3.5 text-sm outline-none ring-1 transition focus:ring-2 ${
                        email.length === 0
                          ? "ring-white/10 focus:ring-purple-500/30"
                          : emailValid
                          ? "ring-emerald-400/30 focus:ring-emerald-500/20"
                          : "ring-red-400/30 focus:ring-red-500/20"
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-medium text-white/60">Password</label>
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/70 transition hover:bg-white/10"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>

                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      className="w-full rounded-2xl bg-black/30 px-4 py-3.5 text-sm outline-none ring-1 ring-white/10 transition focus:ring-2 focus:ring-purple-500/30"
                    />
                    <div className="text-[11px] text-white/45">
                      Minimum 6 characters.
                    </div>
                  </div>

                  <button
                    disabled={!canSubmit}
                    onClick={loginManual}
                    className={`w-full rounded-2xl py-4 text-sm font-semibold shadow-lg transition ${
                      canSubmit
                        ? "bg-gradient-to-r from-white to-gray-200 text-black hover:opacity-95"
                        : "cursor-not-allowed border border-white/10 bg-white/10 text-white/50"
                    }`}
                  >
                    {loading ? "Logging in..." : "Login"}
                  </button>
                </div>

                <div className="mt-6 flex items-center justify-between text-xs text-white/55">
                  <span>Don’t have an account?</span>
                  <Link href="/signup" className="text-white underline underline-offset-4 hover:opacity-85">
                    Sign up
                  </Link>
                </div>

                <p className="mt-4 text-[11px] leading-snug text-white/45">
                  By continuing, you agree to our Terms and Privacy Policy.
                </p>
              </div>
            </div>

            <p className="mt-6 text-center text-[11px] text-white/45">
              Tip: For Vercel, use Supabase pooler in <span className="text-white/65">DATABASE_URL</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0B0B10] text-white grid place-items-center">
          <div className="text-sm text-white/70">Loading login…</div>
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
