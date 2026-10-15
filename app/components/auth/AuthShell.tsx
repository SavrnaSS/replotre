"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check, Eye, EyeOff, ShieldCheck, Sparkles, Zap } from "lucide-react";

export function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

export function GoogleButton({
  onClick,
  label = "Continue with Google",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rp-focus flex h-12 w-full items-center justify-center gap-3 rounded-full bg-white text-[15px] font-semibold text-[#111] shadow-[0_10px_40px_rgba(255,255,255,0.08)] transition hover:bg-white/90 active:scale-[0.99]"
    >
      <GoogleIcon />
      {label}
    </button>
  );
}

export function OrDivider() {
  return (
    <div className="my-6 flex items-center gap-3" role="separator">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/15" />
      <span className="text-[11px] uppercase tracking-[0.2em] text-white/40">
        or with email
      </span>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/15" />
    </div>
  );
}

const BENEFITS = [
  { icon: Sparkles, text: "Realistic AI influencer trained on your photos" },
  { icon: Zap, text: "Daily content generated in seconds" },
  { icon: ShieldCheck, text: "Brand-safe, fully controlled, private by default" },
];

export default function AuthShell({
  title,
  subtitle,
  topLink,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  /** Small link in the top bar, e.g. "New here? Create account". */
  topLink: { prompt: string; label: string; href: string };
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-x-clip bg-[#050612] text-white antialiased">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-56 left-1/2 h-[520px] w-[900px] max-w-[160vw] -translate-x-1/2 rounded-full bg-violet-600/25 blur-[130px]" />
        <div className="absolute -bottom-40 -right-40 h-[480px] w-[480px] rounded-full bg-sky-500/10 blur-[130px]" />
        <div className="rp-grid-bg absolute inset-0 opacity-[0.04]" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.035]" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pt-6">
        <Link
          href="/"
          className="rp-focus relative h-10 w-[130px] shrink-0 rounded-lg sm:w-[160px]"
          aria-label="Replotre home"
        >
          <Image
            src="/logo.png"
            alt="Replotre"
            fill
            unoptimized
            priority
            sizes="160px"
            className="origin-left scale-[1.35] object-contain object-left"
          />
        </Link>
        <p className="text-right text-[13px] text-white/55">
          <span className="hidden sm:inline">{topLink.prompt} </span>
          <Link
            href={topLink.href}
            className="rp-focus rounded font-semibold text-white underline decoration-white/25 underline-offset-4 transition hover:decoration-white"
          >
            {topLink.label}
          </Link>
        </p>
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[1fr_minmax(0,440px)] lg:gap-16 xl:gap-24">
        {/* Brand panel (lg+) */}
        <section className="hidden lg:block" aria-hidden>
          <div className="rp-rise relative max-w-lg">
            <h2 className="text-balance text-[clamp(40px,4.2vw,56px)] font-semibold leading-[1.02] tracking-[-0.03em]">
              Your AI influencer,{" "}
              <span className="rp-text-shine">always on.</span>
            </h2>
            <ul className="mt-8 space-y-3.5">
              {BENEFITS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-[15px] text-white/70">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-violet-500/20 to-sky-500/10">
                    <Icon size={16} className="text-sky-200" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>

            {/* Preview card */}
            <div className="relative mt-10 w-[300px]">
              <div className="absolute -inset-6 rounded-[40px] bg-gradient-to-br from-violet-500/25 to-sky-500/10 blur-2xl" />
              <div className="rp-float relative overflow-hidden rounded-[28px] border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.6)]">
                <div className="relative aspect-[4/5]">
                  <Image
                    src="/model/face-2-v2.jpg"
                    alt=""
                    fill
                    sizes="300px"
                    className="object-cover"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute inset-x-4 bottom-4 flex items-center justify-between rounded-2xl border border-white/10 bg-black/50 px-3 py-2 backdrop-blur-md">
                  <span className="text-[12px] text-white/70">Identity match</span>
                  <span className="text-[13px] font-semibold text-sky-200">97%</span>
                </div>
              </div>
              <div className="absolute -right-16 top-10 flex items-center gap-2 rounded-full border border-white/10 bg-[#0b0c1f]/90 px-3 py-1.5 text-[12px] text-white/80 shadow-xl backdrop-blur-md">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400/90">
                  <Check size={10} className="text-black" />
                </span>
                16 posts scheduled
              </div>
            </div>
          </div>
        </section>

        {/* Form card */}
        <section className="mx-auto w-full max-w-[440px]">
          <div className="rp-rise rp-card p-6 sm:p-8" style={{ animationDelay: "80ms" }}>
            <h1 className="text-[26px] font-semibold tracking-tight sm:text-[28px]">
              {title}
            </h1>
            <p className="mt-1.5 text-[14px] leading-relaxed text-white/55">
              {subtitle}
            </p>
            <div className="mt-7">{children}</div>
          </div>
          {footer}
          <Link
            href="/"
            className="rp-focus mx-auto mt-6 flex w-fit items-center gap-1.5 rounded text-[13px] text-white/45 transition hover:text-white"
          >
            <ArrowLeft size={14} />
            Back to home
          </Link>
        </section>
      </main>
    </div>
  );
}

/** Eye toggle + caps-lock aware password input. */
export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  error,
  hint,
  inputRef,
  onBlur,
  aside,
  show,
  setShow,
  capsLock,
  setCapsLock,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: "current-password" | "new-password";
  error?: string;
  hint?: React.ReactNode;
  inputRef?: React.Ref<HTMLInputElement>;
  onBlur?: () => void;
  aside?: React.ReactNode;
  show: boolean;
  setShow: (fn: (v: boolean) => boolean) => void;
  capsLock: boolean;
  setCapsLock: (v: boolean) => void;
}) {
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <label htmlFor={id} className="rp-label">
          {label}
        </label>
        {aside}
      </div>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          name={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onKeyUp={(e) => setCapsLock(e.getModifierState?.("CapsLock") ?? false)}
          onKeyDown={(e) => setCapsLock(e.getModifierState?.("CapsLock") ?? false)}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className="rp-input pr-12"
          placeholder={autoComplete === "new-password" ? "Create a password" : "Enter your password"}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          className="rp-focus absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-white/50 transition hover:bg-white/10 hover:text-white"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {capsLock && (
        <p className="mt-2 text-[12px] text-amber-300/90">Caps Lock is on</p>
      )}
      {error ? (
        <p id={`${id}-error`} className="mt-2 text-[12px] text-rose-300">
          {error}
        </p>
      ) : hint ? (
        <div id={`${id}-hint`} className="mt-2 text-[12px] text-white/45">
          {hint}
        </div>
      ) : null}
    </div>
  );
}
