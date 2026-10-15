// app/login/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight } from "lucide-react";

import { peekPromptDraft } from "@/app/lib/promptDraft";
import AuthShell, {
  GoogleButton,
  OrDivider,
  PasswordField,
} from "@/app/components/auth/AuthShell";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitted, setSubmitted] = useState(false);

  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (searchParams.get("error") === "db_unavailable") {
      setError("Login is temporarily unavailable. Please try again in a few minutes.");
    }
  }, [searchParams]);

  const trimmedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const fieldErrors = useMemo(() => {
    const e: { email?: string; password?: string } = {};
    if (!trimmedEmail) e.email = "Email is required.";
    else if (!EMAIL_RE.test(trimmedEmail)) e.email = "Please enter a valid email.";
    if (!password) e.password = "Password is required.";
    else if (password.length < 6) e.password = "Password must be at least 6 characters.";
    return e;
  }, [trimmedEmail, password]);

  const showEmailError = (touched.email || submitted) && fieldErrors.email;
  const showPasswordError = (touched.password || submitted) && fieldErrors.password;

  const loginGoogle = () => {
    window.location.href = "/api/auth/google";
  };

  const loginManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setError("");

    if (fieldErrors.email) return emailRef.current?.focus();
    if (fieldErrors.password) return passwordRef.current?.focus();

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Login failed");

      // an idea typed on the homepage takes them straight to Generate
      router.push(peekPromptDraft() ? "/generate" : "/workspace");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Login failed");
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue to your creator studio."
      topLink={{ prompt: "New to Replotre?", label: "Create account", href: "/signup" }}
    >
      <GoogleButton onClick={loginGoogle} />
      <OrDivider />

      <form onSubmit={loginManual} noValidate className="space-y-5">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[13px] leading-snug text-rose-100"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-300" />
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="rp-label mb-2">
            Email
          </label>
          <input
            ref={emailRef}
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            placeholder="you@example.com"
            aria-invalid={showEmailError ? true : undefined}
            aria-describedby={showEmailError ? "email-error" : undefined}
            className="rp-input"
          />
          {showEmailError && (
            <p id="email-error" className="mt-2 text-[12px] text-rose-300">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <PasswordField
          id="password"
          label="Password"
          value={password}
          onChange={setPassword}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          inputRef={passwordRef}
          autoComplete="current-password"
          error={showPasswordError || undefined}
          show={showPassword}
          setShow={setShowPassword}
          capsLock={capsLock}
          setCapsLock={setCapsLock}
        />

        <button
          type="submit"
          disabled={loading}
          className="rp-btn h-12 w-full text-[15px] font-semibold"
        >
          {loading ? (
            <>
              <span className="rp-spinner" aria-hidden />
              Signing in…
            </>
          ) : (
            <>
              Sign in
              <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-[12px] leading-relaxed text-white/40">
        By continuing, you agree to our Terms and Privacy Policy.
      </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-[100dvh] place-items-center bg-[#050612] text-white">
          <span className="rp-spinner" aria-label="Loading sign-in" />
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
