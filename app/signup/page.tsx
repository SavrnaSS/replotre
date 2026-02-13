// app/signup/page.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const trimmedName = useMemo(() => name.trim(), [name]);
  const trimmedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const emailValid = useMemo(() => {
    if (!trimmedEmail) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  }, [trimmedEmail]);

  const passwordScore = useMemo(() => {
    const p = password || "";
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return Math.min(score, 5);
  }, [password]);

  const canSubmit = useMemo(() => {
    if (loading) return false;
    if (!trimmedName) return false;
    if (!trimmedEmail || !emailValid) return false;
    if (!password || password.length < 6) return false;
    return true;
  }, [loading, trimmedName, trimmedEmail, emailValid, password]);

  const signupGoogle = () => {
    window.location.href = "/api/auth/google";
  };

  const signupManual = async () => {
    setError("");

    if (!trimmedName) return setError("Name is required.");
    if (!trimmedEmail) return setError("Email is required.");
    if (!emailValid) return setError("Please enter a valid email.");
    if (!password) return setError("Password is required.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          password,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Signup failed");

      router.push("/workspace");
    } catch (e: any) {
      setError(e?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const scoreLabel = ["Weak", "Fair", "Good", "Strong", "Very strong"][Math.max(0, passwordScore - 1)] || "Weak";
  const scorePct = (passwordScore / 5) * 100;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B0B10] text-white">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-48 left-[-80px] h-[560px] w-[560px] rounded-full bg-indigo-500/20 blur-[110px]" />
        <div className="absolute -bottom-48 right-[-120px] h-[560px] w-[560px] rounded-full bg-purple-500/25 blur-[110px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] bg-[length:22px_22px] opacity-40" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
        <div className="grid w-full items-center gap-8 lg:grid-cols-2">
          {/* Left */}
          <div className="hidden lg:block">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
              <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
              Create account • Start with 101 credits
            </div>

            <h1 className="mt-4 text-5xl font-semibold leading-tight tracking-tight">
              Create your{" "}
              <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                Gerox
              </span>{" "}
              account
            </h1>

            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/65">
              Use Google for instant signup, or create an email/password account. Your password is stored as a secure hash.
            </p>

            <div className="mt-8 grid max-w-md grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-white/60">Credits</div>
                <div className="mt-1 text-sm font-semibold">101 starting credits</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-white/60">Auth</div>
                <div className="mt-1 text-sm font-semibold">Google + Password</div>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="mx-auto w-full max-w-md">
            <div className="relative rounded-3xl border border-white/12 bg-white/[0.07] p-7 shadow-2xl backdrop-blur-xl">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/[0.06] to-transparent" />

              <div className="relative">
                <div className="mb-5">
                  <h2 className="text-2xl font-semibold tracking-tight">Sign up</h2>
                  <p className="mt-1 text-sm text-white/60">
                    Use Google or create an email/password account.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={signupGoogle}
                  className="relative w-full rounded-2xl border border-white/10 bg-white py-3.5 font-semibold text-black shadow-lg shadow-white/10 transition hover:bg-gray-200"
                >
                  Continue with Google
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
                    <label className="text-[11px] font-medium text-white/60">Name</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      required
                      autoComplete="name"
                      className="w-full rounded-2xl bg-black/30 px-4 py-3.5 text-sm outline-none ring-1 ring-white/10 transition focus:ring-2 focus:ring-purple-500/30"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-white/60">Email</label>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      type="email"
                      required
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
                      placeholder="Min 6 chars"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="w-full rounded-2xl bg-black/30 px-4 py-3.5 text-sm outline-none ring-1 ring-white/10 transition focus:ring-2 focus:ring-purple-500/30"
                    />

                    {/* Strength meter */}
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[11px] text-white/55">
                        <span>Password strength</span>
                        <span className="text-white/70">{scoreLabel}</span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-red-400 via-yellow-300 to-emerald-400 transition-all"
                          style={{ width: `${scorePct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!canSubmit}
                    onClick={signupManual}
                    className={`w-full rounded-2xl py-4 text-sm font-semibold shadow-lg transition ${
                      canSubmit
                        ? "bg-gradient-to-r from-white to-gray-200 text-black hover:opacity-95"
                        : "cursor-not-allowed border border-white/10 bg-white/10 text-white/50"
                    }`}
                  >
                    {loading ? "Creating..." : "Create account"}
                  </button>

                  <p className="text-[11px] leading-snug text-white/45">
                    By continuing, you agree to our Terms and Privacy Policy.
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between text-xs text-white/55">
                  <span>Already have an account?</span>
                  <Link href="/login" className="text-white underline underline-offset-4 hover:opacity-85">
                    Login
                  </Link>
                </div>
              </div>
            </div>

            <p className="mt-6 text-center text-[11px] text-white/45">
              Secure cookies • Prisma • Supabase
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
