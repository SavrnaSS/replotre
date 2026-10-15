// app/signup/page.tsx
"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Check } from "lucide-react";

import { peekPromptDraft } from "@/app/lib/promptDraft";
import AuthShell, {
  GoogleButton,
  OrDivider,
  PasswordField,
} from "@/app/components/auth/AuthShell";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState<string>("");
  const [touched, setTouched] = useState({ name: false, email: false, password: false });
  const [submitted, setSubmitted] = useState(false);

  const nameRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);

  const trimmedName = useMemo(() => name.trim(), [name]);
  const trimmedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const checks = useMemo(
    () => [
      { ok: password.length >= 6, label: "At least 6 characters", required: true },
      { ok: /[A-Z]/.test(password) && /[a-z]/.test(password), label: "Upper & lowercase" },
      { ok: /[0-9]/.test(password), label: "A number" },
      { ok: /[^A-Za-z0-9]/.test(password), label: "A symbol" },
    ],
    [password]
  );

  const passwordScore = useMemo(() => {
    if (!password) return 0;
    let score = checks.filter((c) => c.ok).length;
    if (password.length >= 10) score++;
    return Math.min(score, 5);
  }, [password, checks]);

  const strength = [
    { label: "Too short", color: "bg-rose-400" },
    { label: "Weak", color: "bg-rose-400" },
    { label: "Fair", color: "bg-amber-300" },
    { label: "Good", color: "bg-lime-300" },
    { label: "Strong", color: "bg-emerald-400" },
    { label: "Very strong", color: "bg-emerald-400" },
  ][password.length < 6 ? 0 : passwordScore];

  const fieldErrors = useMemo(() => {
    const e: { name?: string; email?: string; password?: string } = {};
    if (!trimmedName) e.name = "Name is required.";
    if (!trimmedEmail) e.email = "Email is required.";
    else if (!EMAIL_RE.test(trimmedEmail)) e.email = "Please enter a valid email.";
    if (!password) e.password = "Password is required.";
    else if (password.length < 6) e.password = "Password must be at least 6 characters.";
    return e;
  }, [trimmedName, trimmedEmail, password]);

  const show = (k: keyof typeof touched) => (touched[k] || submitted) && fieldErrors[k];

  const signupGoogle = () => {
    window.location.href = "/api/auth/google";
  };

  const signupManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setError("");

    if (fieldErrors.name) return nameRef.current?.focus();
    if (fieldErrors.email) return emailRef.current?.focus();
    if (fieldErrors.password) return passwordRef.current?.focus();

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

      // an idea typed on the homepage takes them straight to Generate
      router.push(peekPromptDraft() ? "/generate" : "/workspace");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Signup failed");
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start building your AI influencer in minutes."
      topLink={{ prompt: "Already have an account?", label: "Sign in", href: "/login" }}
    >
      <GoogleButton onClick={signupGoogle} label="Sign up with Google" />
      <OrDivider />

      <form onSubmit={signupManual} noValidate className="space-y-5">
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
          <label htmlFor="name" className="rp-label mb-2">
            Name
          </label>
          <input
            ref={nameRef}
            id="name"
            name="name"
            autoComplete="name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            placeholder="Your name"
            aria-invalid={show("name") ? true : undefined}
            aria-describedby={show("name") ? "name-error" : undefined}
            className="rp-input"
          />
          {show("name") && (
            <p id="name-error" className="mt-2 text-[12px] text-rose-300">
              {fieldErrors.name}
            </p>
          )}
        </div>

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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            placeholder="you@example.com"
            aria-invalid={show("email") ? true : undefined}
            aria-describedby={show("email") ? "email-error" : undefined}
            className="rp-input"
          />
          {show("email") && (
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
          autoComplete="new-password"
          error={show("password") || undefined}
          show={showPassword}
          setShow={setShowPassword}
          capsLock={capsLock}
          setCapsLock={setCapsLock}
          aside={
            password ? (
              <span className="text-[12px] text-white/55" aria-live="polite">
                {strength.label}
              </span>
            ) : null
          }
          hint={
            <div>
              {/* 5-segment strength meter */}
              <div className="grid grid-cols-5 gap-1" aria-hidden>
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={cx(
                      "h-1 rounded-full transition-colors duration-300",
                      password && i < Math.max(1, passwordScore) ? strength.color : "bg-white/10"
                    )}
                  />
                ))}
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
                {checks.map((c) => (
                  <li
                    key={c.label}
                    className={cx(
                      "flex items-center gap-1.5 transition-colors",
                      c.ok ? "text-emerald-300/90" : "text-white/40"
                    )}
                  >
                    <span
                      className={cx(
                        "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition-colors",
                        c.ok ? "border-transparent bg-emerald-400/90" : "border-white/20"
                      )}
                    >
                      {c.ok && <Check size={9} className="text-black" strokeWidth={3} />}
                    </span>
                    {c.label}
                    {c.required && !c.ok && <span className="sr-only"> (required)</span>}
                  </li>
                ))}
              </ul>
            </div>
          }
        />

        <button
          type="submit"
          disabled={loading}
          className="rp-btn h-12 w-full text-[15px] font-semibold"
        >
          {loading ? (
            <>
              <span className="rp-spinner" aria-hidden />
              Creating account…
            </>
          ) : (
            <>
              Create account
              <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-[12px] leading-relaxed text-white/40">
        By creating an account, you agree to our Terms and Privacy Policy.
      </p>
    </AuthShell>
  );
}
