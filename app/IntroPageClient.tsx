"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Check,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Lock,
  X,
  CreditCard,
  ShieldCheck,
  Upload,
  Wand2,
  Download,
} from "lucide-react";

import CreditsBar from "@/app/components/CreditsBar";
import ProfileAvatar from "@/app/components/ProfileAvatar";

type Pack = {
  c: number; // credits
  p: number; // price
  badge?: string;
  desc?: string;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function formatUSD(n: number) {
  try {
    return new Intl.NumberFormat("en-IN").format(n);
  } catch {
    return String(n);
  }
}

function getDefaultPack(packs: Pack[]) {
  const popular = packs.find((x) =>
    (x.badge || "").toLowerCase().includes("popular")
  );
  return popular ?? packs[Math.min(1, packs.length - 1)] ?? packs[0];
}

function safeSetSelectedPack(pack: Pack) {
  try {
    localStorage.setItem(
      "mitux_selected_pack",
      JSON.stringify({ c: pack.c, p: pack.p })
    );
  } catch {
    // ignore
  }
}

function safeGetSelectedPack(): { c?: number; p?: number } | null {
  try {
    const raw = localStorage.getItem("mitux_selected_pack");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------
   Paywall modal
------------------------------------------- */
function PaywallModal({
  open,
  onClose,
  onContinue,
  packs,
  selectedCredits,
  setSelectedCredits,
  isAuthed,
  onLogin,
}: {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
  packs: Pack[];
  selectedCredits: number | null;
  setSelectedCredits: (c: number) => void;
  isAuthed: boolean;
  onLogin: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;
  const selectedPack = packs.find((p) => p.c === selectedCredits) ?? null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-[6px]"
        onClick={onClose}
      />

      <div className="absolute inset-0 flex items-end justify-center p-3 sm:items-center sm:p-6">
        <div
          className="w-full max-w-3xl overflow-hidden rounded-[28px] border border-white/10 bg-[#050612]/95 shadow-[0_40px_140px_rgba(0,0,0,0.8)]"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">
                Upgrade
              </p>
              <h3 className="truncate text-lg font-semibold sm:text-xl">
                Buy credits
              </h3>
              <p className="mt-0.5 text-xs text-white/55">
                Credits are used when training or generating with your AI
                influencer.
              </p>
            </div>

            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 transition hover:bg-white/10"
              aria-label="Close"
              type="button"
            >
              <X size={18} />
            </button>
          </div>

          <div className="max-h-[78vh] overflow-y-auto overscroll-contain sm:max-h-[70vh]">
            <div className="px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex items-center gap-2 text-xs text-white/70">
                  <ShieldCheck size={16} className="text-white/70" />
                  Secure billing · Pay once, generate anytime
                </div>
                <div className="inline-flex items-center gap-2 text-xs text-white/60">
                  <CreditCard size={16} />
                  USD ($)
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {packs.map((pack) => {
                  const active = pack.c === selectedCredits;

                  return (
                    <div
                      key={pack.c}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedCredits(pack.c);
                        safeSetSelectedPack(pack);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedCredits(pack.c);
                          safeSetSelectedPack(pack);
                        }
                      }}
                      className={cx(
                        "relative cursor-pointer rounded-[26px] border bg-black/40 p-5 transition",
                        "focus:outline-none focus:ring-2 focus:ring-violet-500/40",
                        active
                          ? "border-violet-400/70 ring-2 ring-violet-500/30"
                          : "border-white/10 hover:border-white/25"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className={cx(
                              "rounded-full border px-2.5 py-1 text-[11px]",
                              active
                                ? "border-violet-400/40 bg-violet-500/15 text-violet-100"
                                : "border-white/10 bg-white/5 text-white/80"
                            )}
                          >
                            {pack.badge || "Pack"}
                          </span>

                          {active && (
                            <span className="rounded-full border border-violet-400/25 bg-violet-500/10 px-2.5 py-1 text-[11px] text-violet-200">
                              Selected
                            </span>
                          )}
                        </div>

                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                          <CreditCard size={18} className="text-white/70" />
                        </div>
                      </div>

                      <div className="mt-5">
                        <p className="text-5xl font-bold leading-none">
                          {pack.c}
                        </p>
                        <p className="mt-2 text-white/70">Credits</p>

                        <p className="mt-6 text-2xl font-semibold">
                          ${formatUSD(pack.p)}
                        </p>
                        <p className="mt-2 text-sm text-white/55">
                          {pack.desc || "Instant top-up, no expiry"}
                        </p>
                      </div>

                      <div className="mt-6">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCredits(pack.c);
                            safeSetSelectedPack(pack);
                          }}
                          className={cx(
                            "w-full rounded-2xl border py-3 font-semibold transition",
                            active
                              ? "gx-btn gx-btn-sm border-transparent text-white"
                              : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                          )}
                        >
                          {active ? "Selected" : "Choose pack"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm leading-snug text-white/60">
                <span className="font-semibold text-white/85">Tip:</span>{" "}
                Creators usually start with{" "}
                <span className="font-medium text-violet-200">5k–8k credits</span>{" "}
                to train one AI influencer and keep it posting for a month.
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 bg-black/30 px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-white/55">
                Selected:{" "}
                <span className="font-semibold text-white/85">
                  {selectedPack
                    ? `${selectedPack.c} credits ($${formatUSD(selectedPack.p)})`
                    : "None"}
                </span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10 sm:flex-none"
                  type="button"
                >
                  Not now
                </button>

                {isAuthed ? (
                  <button
                    onClick={onContinue}
                    className="gx-btn flex-1 px-5 py-3 text-sm font-semibold sm:flex-none"
                    type="button"
                  >
                    <span>Continue to billing</span>
                  </button>
                ) : (
                  <button
                    onClick={onLogin}
                    className="gx-btn flex-1 px-5 py-3 text-sm font-semibold sm:flex-none"
                    type="button"
                  >
                    <span>Login to buy credits</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------
   Page
------------------------------------------- */
export default function IntroPageClient() {
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);
  const [authUser, setAuthUser] = useState<any>(null);
  const isLocked = authChecked && !authUser;
  const isAuthed = !!authUser;

  const packs: Pack[] = useMemo(
    () => [
      { c: 500, p: 19, badge: "Starter", desc: "Test your first AI twin" },
      {
        c: 1000,
        p: 39,
        badge: "Most popular",
        desc: "Daily posting for 1–2 AI influencers",
      },
      { c: 4000, p: 79, badge: "Studio", desc: "For agencies & power users" },
    ],
    []
  );

  const defaultPack = getDefaultPack(packs);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [selectedCredits, setSelectedCredits] = useState<number | null>(
    defaultPack?.c ?? null
  );

  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly"
  );

  const showcaseImages = useMemo(
    () => [
      { src: "/model/face-1-v2.jpg", alt: "Showcase model 1" },
      { src: "/model/face-2-v2.jpg", alt: "Showcase model 2" },
      { src: "/model/face-3-v2.jpg", alt: "Showcase model 3" },
    ],
    []
  );
  const [imgError, setImgError] = useState<Record<number, boolean>>({});

// ✅ Mobile one-by-one slider state (keeps your existing logic intact)
const showcaseRef = useRef<HTMLDivElement | null>(null);
const showcaseSectionRef = useRef<HTMLElement | null>(null);
const [showcaseActive, setShowcaseActive] = useState(0);

const scrollShowcaseTo = (i: number) => {
  const el = showcaseRef.current;
  if (!el) return;

  const max = Math.max(0, showcaseImages.length - 1);
  const clamped = Math.max(0, Math.min(i, max));

  const child = el.children.item(clamped) as HTMLElement | null;
  if (!child) return;

  child.scrollIntoView({
    behavior: "smooth",
    inline: "center",
    block: "nearest",
  });
};

// ✅ autoplay should run ONLY when user is near showcase (within ~2 screens)
const isNearShowcase = () => {
  const sec = showcaseSectionRef.current;
  if (!sec) return false;

  const vh = window.innerHeight || 1;
  const rect = sec.getBoundingClientRect();

  // within 2 viewport heights
  const threshold = vh * 2;

  // distance from viewport to section (0 if overlapping)
  const dist =
    rect.bottom < 0 ? -rect.bottom : rect.top > vh ? rect.top - vh : 0;

  return dist <= threshold;
};

useEffect(() => {
  // autoplay only on mobile
  if (typeof window === "undefined") return;
  if (window.matchMedia("(min-width: 768px)").matches) return; // md+

  if (showcaseImages.length <= 1) return;

  const id = window.setInterval(() => {
    // ✅ don't autoplay if user is far away
    if (!isNearShowcase()) return;

    setShowcaseActive((prev) => {
      const next = (prev + 1) % showcaseImages.length;
      scrollShowcaseTo(next);
      return next;
    });
  }, 7500);

  return () => window.clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [showcaseImages.length]);


  useEffect(() => {
    const ac = new AbortController();
    let mounted = true;

    (async () => {
      try {
        const res = await fetch("/api/me", {
          cache: "no-store",
          signal: ac.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (!mounted) return;
        setAuthUser(data?.user || null);
      } catch {
        if (!mounted) return;
        setAuthUser(null);
      } finally {
        if (!mounted) return;
        setAuthChecked(true);
      }
    })();

    return () => {
      mounted = false;
      ac.abort();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = safeGetSelectedPack();
    if (saved?.c && saved.c !== selectedCredits) {
      setSelectedCredits(saved.c);
    }
  }, [selectedCredits]);

  const start = () => {
    if (!isAuthed) {
      goLogin();
      return;
    }
    router.push("/workspace");
  };
  const goLogin = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  const continueToBilling = () => {
    if (!isAuthed) {
      goLogin();
      return;
    }

    const pack =
      packs.find((p) => p.c === selectedCredits) ?? getDefaultPack(packs);
    if (pack) safeSetSelectedPack(pack);

    setPaywallOpen(false);

    if (typeof window !== "undefined") {
      window.location.href = `/checkout`;
    }
  };

  const pricingCards = useMemo(() => {
    const commonFeatures = [
      { ok: true, label: "Video face swap" },
      { ok: true, label: "Access to all features" },
    ];

    if (billingCycle === "yearly") {
      return [
        {
          key: "builder",
          name: "Builder",
          subtitle: "For growing creators",
          price: 2.99,
          billed: 35.88,
          credits: 500,
          trainings: 1,
          button: "Get Credits",
          popular: false,
          features: [
            { ok: true, label: "1 Influencer trainings" },
            { ok: true, label: "500 credits/month" },
            { ok: false, label: "Image & video generation" },
            ...commonFeatures,
            { ok: true, label: "Standard support" },
          ],
        },
        {
          key: "launch",
          name: "Launch",
          subtitle: "Ready to scale",
          price: 7.99,
          billed: 95.88,
          credits: 1000,
          trainings: 2,
          button: "Get Credits",
          popular: true,
          features: [
            { ok: true, label: "2 Influencer trainings" },
            { ok: true, label: "1,000 credits/month" },
            { ok: true, label: "Image & video generation" },
            ...commonFeatures,
            { ok: true, label: "Standard support" },
          ],
        },
        {
          key: "growth",
          name: "Growth",
          subtitle: "Best for businesses",
          price: 15.99,
          billed: 191.88,
          credits: 4000,
          trainings: 5,
          button: "Get Credits",
          popular: false,
          features: [
            { ok: true, label: "5 Influencer trainings" },
            { ok: true, label: "4,000 credits/month" },
            { ok: true, label: "Image & video generation" },
            ...commonFeatures,
            { ok: true, label: "Priority support" },
          ],
        },
      ];
    }

    return [
      {
        key: "builder",
        name: "Builder",
        subtitle: "For growing creators",
        price: 15,
        billed: null as number | null,
        credits: 500,
        trainings: 1,
        button: "Get Credits",
        popular: false,
        features: [
          { ok: true, label: "1 Influencer trainings" },
          { ok: true, label: "500 credits/month" },
          { ok: false, label: "Image & video generation" },
          ...commonFeatures,
          { ok: true, label: "Standard support" },
        ],
      },
      {
        key: "launch",
        name: "Launch",
        subtitle: "Ready to scale",
        price: 29,
        billed: null,
        credits: 1000,
        trainings: 2,
        button: "Get Credits",
        popular: true,
        features: [
          { ok: true, label: "2 Influencer trainings" },
          { ok: true, label: "1,000 credits/month" },
          { ok: true, label: "Image & video generation" },
          ...commonFeatures,
          { ok: true, label: "Standard support" },
        ],
      },
      {
        key: "growth",
        name: "Growth",
        subtitle: "Best for businesses",
        price: 79,
        billed: null,
        credits: 4000,
        trainings: 5,
        button: "Get Credits",
        popular: false,
        features: [
          { ok: true, label: "5 Influencer trainings" },
          { ok: true, label: "4,000 credits/month" },
          { ok: true, label: "Image & video generation" },
          ...commonFeatures,
          { ok: true, label: "Priority support" },
        ],
      },
    ];
  }, [billingCycle]);

  return (
    <div className="relative min-h-screen w-full overflow-x-clip bg-[#050612] text-white">
      <style jsx global>{`
        /* Gradient buttons like your screenshot */
        .gx-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          border-radius: 9999px;
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.22);
          background: linear-gradient(
            100deg,
            #2f3340 0%,
            #6d5dfc 45%,
            #6aa7ff 100%
          );
          box-shadow: 0 18px 60px rgba(109, 93, 252, 0.28);
          transform: translateZ(0);
        }
        .gx-btn::before {
          content: "";
          position: absolute;
          inset: 2px;
          border-radius: 9999px;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.1) 0%,
            rgba(0, 0, 0, 0.22) 100%
          );
          opacity: 0.75;
          pointer-events: none;
        }
        .gx-btn > * {
          position: relative;
          z-index: 1;
        }
        .gx-btn:hover {
          filter: brightness(1.06);
        }
        .gx-btn:active {
          transform: translateY(1px);
        }
        .gx-btn-sm::before {
          inset: 1px;
        }

        @media (max-width: 459px) {
          html,
          body {
            overflow-x: hidden !important;
          }
          * {
            max-width: 100%;
          }
          .gx-grid {
            justify-items: center !important;
          }
          .gx-hero-section {
            display: flex !important;
            justify-content: center !important;
            width: 100% !important;
          }
          .gx-hero-card {
            width: min(90vw, 720px) !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }
          .gx-hero-title {
            font-size: 30px !important;
            line-height: 1.05 !important;
            letter-spacing: -0.02em !important;
          }
          .gx-hero-desc {
            font-size: 13px !important;
            line-height: 1.6 !important;
          }
        }

        .gx-scrollbar::-webkit-scrollbar {
          height: 10px;
        }
        .gx-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.12);
          border-radius: 999px;
        }
        .gx-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.06);
          border-radius: 999px;
        }

        /* ✅ hide scrollbar for the showcase one-by-one slider only */
        .gx-hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Ambient BG */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-56 left-1/2 h-[520px] w-[930px] -translate-x-1/2 rounded-full bg-violet-500/30 blur-[120px]" />
        <div className="absolute -bottom-56 right-[-120px] h-[520px] w-[520px] rounded-full bg-sky-400/25 blur-[120px]" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.04]" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-black/60" />
      </div>

      {/* Top Nav */}
      <header className="relative z-10 mx-auto w-full max-w-7xl px-3 pt-4 sm:px-6 sm:pt-6">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
          {/* Main row */}
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:h-[72px] sm:px-6">
            {/* Brand */}
            <div className="flex items-center justify-start">
              <div className="relative h-14 w-[220px] sm:h-16 sm:w-[260px]">
                <Image
                  src="/logo.png"
                  alt="Replotre"
                  fill
                  unoptimized
                  sizes="(max-width: 640px) 275px, 330px"
                  className="object-contain object-left"
                  priority
                />
              </div>
            </div>

            {/* Desktop nav + actions */}
            <div className="hidden items-center gap-6 md:flex">
              <nav className="flex items-center gap-5 text-[13px] text-white/70">
                <Link
                  href="#"
                  className="transition hover:text-white hover:underline hover:underline-offset-4"
                >
                  Home
                </Link>
                <Link
                  href="#how-it-works"
                  className="transition hover:text-white hover:underline hover:underline-offset-4"
                >
                  Workflow
                </Link>
                <Link
                  href="#pricing"
                  className="transition hover:text-white hover:underline hover:underline-offset-4"
                >
                  Pricing
                </Link>
                <Link
                  href="#faq"
                  className="transition hover:text-white hover:underline hover:underline-offset-4"
                >
                  FAQ
                </Link>
              </nav>

              {isAuthed ? (
                <>
                  <div className="hidden lg:block">
                    <CreditsBar />
                  </div>

                  <button
                    onClick={() => setPaywallOpen(true)}
                    className="gx-btn h-11 px-5 text-sm font-semibold"
                    type="button"
                  >
                    <span>Get credits</span>
                  </button>

                  <ProfileAvatar />
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={goLogin}
                    className="h-11 rounded-full border border-white/15 bg-white/[0.05] px-5 text-sm font-semibold text-white/90 transition hover:bg-white/[0.10]"
                    type="button"
                  >
                    Sign in
                  </button>

                  <button
                    onClick={() => setPaywallOpen(true)}
                    className="gx-btn h-11 px-5 text-sm font-semibold"
                    type="button"
                  >
                    <span>Get credits</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile actions */}
            <div className="flex shrink-0 items-center gap-2 md:hidden">
              {isAuthed ? (
                <>
                  <button
                    onClick={() => setPaywallOpen(true)}
                    className="gx-btn h-10 px-3 text-[12px] font-semibold"
                    type="button"
                  >
                    <span>Credits</span>
                  </button>
                  <ProfileAvatar />
                </>
              ) : (
                <>
                  <button
                    onClick={goLogin}
                    className="h-10 rounded-full border border-white/15 bg-white/[0.05] px-3 text-[12px] font-semibold text-white/90 transition hover:bg-white/[0.10]"
                    type="button"
                  >
                    Sign in
                  </button>
                  <button
                    onClick={() => setPaywallOpen(true)}
                    className="gx-btn h-10 px-3 text-[12px] font-semibold"
                    type="button"
                  >
                    <span>Get credits</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Mobile credits bar */}
          {isAuthed && (
            <div className="border-t border-white/10 px-4 py-3 md:hidden">
              <CreditsBar />
            </div>
          )}
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 mx-auto w-full max-w-7xl px-3 pb-20 pt-8 sm:px-6 sm:pt-10 md:pt-14">
        <div className="gx-grid grid items-stretch lg:grid-cols-12 lg:gap-8">
          {/* LEFT hero */}
          <section className="gx-hero-section col-span-12 min-w-0 lg:col-span-6 xl:col-span-7">
            <div className="gx-hero-card max-w-full overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-8">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-[11px] text-violet-200 ring-1 ring-violet-400/30">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-300" />
                <span className="truncate">The future of AI influencers</span>
              </div>

              <h1 className="gx-hero-title mt-6 max-w-full break-words [overflow-wrap:anywhere] text-[clamp(30px,7.2vw,56px)] font-semibold leading-[1.05]">
                Create Your{" "}
                <span className="break-words [overflow-wrap:anywhere] bg-gradient-to-r from-violet-200 via-indigo-200 to-sky-200 bg-clip-text text-transparent">
                  AI Influencer
                </span>{" "}
                Empire
              </h1>

              <p className="gx-hero-desc mt-4 max-w-full break-words [overflow-wrap:anywhere] text-[13px] leading-relaxed text-white/70 sm:max-w-xl sm:text-[16px]">
                Train a realistic AI influencer that looks and acts like you —
                but never sleeps. Our models routinely beat human influencers on{" "}
                <span className="font-semibold text-violet-200">
                  reach, engagement and consistency
                </span>{" "}
                across Instagram, TikTok and YouTube.
              </p>

              <div className="mt-5 flex max-w-full flex-col gap-2 text-[11px] text-white/70 sm:flex-row sm:flex-wrap">
                <span className="inline-flex max-w-full items-start gap-2 rounded-full bg-black/50 px-3 py-1">
                  <Check size={12} className="mt-[2px] shrink-0 text-sky-300" />
                  <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                    3× more reach than baseline creators
                  </span>
                </span>
                <span className="inline-flex max-w-full items-start gap-2 rounded-full bg-black/50 px-3 py-1">
                  <Check size={12} className="mt-[2px] shrink-0 text-sky-300" />
                  <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                    Always-on posting, zero burnout
                  </span>
                </span>
                <span className="inline-flex max-w-full items-start gap-2 rounded-full bg-black/50 px-3 py-1">
                  <Check size={12} className="mt-[2px] shrink-0 text-sky-300" />
                  <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                    Brand-safe &amp; fully controlled
                  </span>
                </span>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  onClick={start}
                  className="gx-btn w-full px-5 py-4 text-[15px] font-semibold leading-snug sm:w-auto sm:px-6"
                  type="button"
                >
                  <span className="min-w-0 text-center break-words [overflow-wrap:anywhere]">
                    Start AI model generation
                  </span>
                  <ArrowRight size={18} className="shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("showcase");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                    else {
                      const el2 = document.getElementById("how-it-works");
                      if (el2) el2.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-black/40 px-5 py-4 text-[13px] font-semibold leading-snug text-white/85 transition hover:bg-white/5 sm:w-auto"
                >
                  <span className="min-w-0 text-center break-words [overflow-wrap:anywhere]">
                    View styles &amp; case studies
                  </span>
                </button>
              </div>

              {isLocked && (
                <div className="mt-4 max-w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-4">
                  <div className="flex min-w-0 items-center gap-2 text-white/85">
                    <Lock size={16} className="shrink-0" />
                    <p className="min-w-0 break-words [overflow-wrap:anywhere] text-sm font-semibold">
                      Login required to save trainings
                    </p>
                  </div>
                  <p className="mt-1 break-words [overflow-wrap:anywhere] text-[12px] leading-snug text-white/60">
                    You can preview the workflow now. Saving trainings and
                    influencer models unlocks after you sign in.
                  </p>
                  <button
                    onClick={goLogin}
                    className="gx-btn gx-btn-sm mt-3 w-full px-3 py-2.5 text-[13px] font-semibold"
                    type="button"
                  >
                    <span>Sign in to keep progress</span>
                  </button>
                </div>
              )}

              <div className="mt-5 flex flex-col gap-3 text-[12px] text-white/60 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-black/50 px-3 py-1">
                    <Upload size={13} className="shrink-0 text-sky-300" />
                    <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                      Upload training set (20–40 photos)
                    </span>
                  </span>
                  <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-black/50 px-3 py-1">
                    <Sparkles size={13} className="shrink-0 text-sky-300" />
                    <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                      Generate daily content in seconds
                    </span>
                  </span>
                  <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-black/50 px-3 py-1">
                    <Download size={13} className="shrink-0 text-sky-300" />
                    <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                      Export 4K reels &amp; story assets
                    </span>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/55">
                  <span className="inline-flex -space-x-2 overflow-hidden rounded-full bg-black/40 px-2 py-1">
                    <span className="h-5 w-5 rounded-full bg-gradient-to-br from-violet-500 to-indigo-700" />
                    <span className="h-5 w-5 rounded-full bg-gradient-to-br from-sky-500 to-blue-700" />
                    <span className="h-5 w-5 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-700" />
                  </span>
                  <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                    1,000+ creators using AI influencers
                  </span>
                  <span className="whitespace-nowrap text-yellow-300">
                    ★★★★★ 4.9/5
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* RIGHT – comparison board (desktop only) */}
          <section className="hidden min-w-0 lg:col-span-6 lg:block xl:col-span-5">
            {/* ... unchanged (your full comparison board stays as-is) */}
            {/* (Keeping your exact block to avoid touching working logic) */}
            <div className="relative lg:mt-4">
              <div className="pointer-events-none absolute inset-x-6 -bottom-6 h-32 rounded-full bg-black/90 blur-2xl" />
              <div className="pointer-events-none absolute -inset-x-10 -top-10 h-48 rounded-[40px] bg-gradient-to-br from-violet-500/25 via-indigo-500/15 to-sky-500/10 blur-3xl" />
              <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
                <div className="rounded-[42px] bg-gradient-to-br from-violet-500/60 via-indigo-500/20 to-black/95 p-[1.5px] shadow-[0_32px_120px_rgba(0,0,0,0.9)]">
                  <div className="relative overflow-hidden rounded-[38px] bg-[#060717]">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(109,93,252,0.22),transparent_55%),radial-gradient(circle_at_bottom,rgba(106,167,255,0.18),transparent_60%)] opacity-90" />
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:26px_26px] opacity-[0.12]" />

                    <div className="relative p-5 sm:p-6">
                      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-white/70">
                        <span className="inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 shadow-sm shadow-black/60">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-300" />
                          Realtime model comparison
                        </span>
                        <span className="rounded-full bg-white/5 px-3 py-1 text-[10px]">
                          Benchmark: other AI tools vs Replotre
                        </span>
                      </div>

                      <div className="mt-6 grid gap-5 text-[11px] text-white/75 md:grid-cols-2">
                        <div className="rounded-2xl bg-black/70 p-3 shadow-sm shadow-black/50">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <Sparkles
                                size={14}
                                className="shrink-0 text-sky-300"
                              />
                              <span className="truncate font-semibold">
                                Identity match accuracy
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 space-y-1.5 text-[10px]">
                            <div className="flex items-center justify-between">
                              <span className="text-white/55">
                                Other AI model tools
                              </span>
                              <span className="text-white/60">82%</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                              <div className="h-full w-[82%] rounded-full bg-zinc-500/80" />
                            </div>

                            <div className="mt-1 flex items-center justify-between">
                              <span className="font-semibold text-violet-100">
                                Replotre GXR
                              </span>
                              <span className="font-semibold text-sky-200">
                                97%
                              </span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                              <div className="h-full w-[97%] rounded-full bg-gradient-to-r from-[#6d5dfc] to-[#6aa7ff]" />
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl bg-black/70 p-3 shadow-sm shadow-black/50">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <Wand2
                                size={14}
                                className="shrink-0 text-sky-300"
                              />
                              <span className="truncate font-semibold">
                                Engagement lift vs normal posts
                              </span>
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                            <div className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-2">
                              <p className="text-white/60">Other AI models</p>
                              <p className="mt-1 text-lg font-semibold">1.3×</p>
                              <p className="text-[9px] text-white/50">
                                Average reach boost
                              </p>
                            </div>
                            <div className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-2.5 py-2">
                              <p className="text-violet-100">Replotre GXR</p>
                              <p className="mt-1 text-lg font-semibold text-sky-200">
                                3.1×
                              </p>
                              <p className="text-[9px] text-white/70">
                                Tuned for realistic creator content
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl bg-black/70 p-3 shadow-sm shadow-black/50">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <ShieldCheck
                                size={14}
                                className="shrink-0 text-sky-300"
                              />
                              <span className="truncate font-semibold">
                                Trust &amp; control
                              </span>
                            </div>
                            <span className="text-sky-200">Advanced</span>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-white/60">
                            <div className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-2">
                              <p className="font-semibold text-white/75">
                                Other tools
                              </p>
                              <ul className="mt-1 space-y-1">
                                <li>Generic base models</li>
                                <li>Limited audit trail</li>
                              </ul>
                            </div>
                            <div className="rounded-xl border border-violet-400/25 bg-violet-500/10 px-2.5 py-2">
                              <p className="font-semibold text-violet-100">
                                Replotre
                              </p>
                              <ul className="mt-1 space-y-1 text-white/70">
                                <li>Creator-first training stack</li>
                                <li>Versioned models &amp; rollbacks</li>
                                <li>Fine-grained prompts &amp; limits</li>
                              </ul>
                            </div>
                          </div>
                        </div>

                        <div className="relative flex items-center justify-center overflow-hidden rounded-2xl bg-black/70 p-4 shadow-sm shadow-black/50 md:p-5">
                          <div className="relative flex h-36 w-36 items-center justify-center rounded-full border border-violet-400/30 bg-black/70 shadow-[0_0_40px_rgba(109,93,252,0.25)] sm:h-40 sm:w-40">
                            <div className="h-28 w-28 rounded-full border border-violet-400/25 bg-violet-500/10 sm:h-32 sm:w-32" />
                            <div className="absolute flex h-24 w-24 flex-col items-center justify-center rounded-full border border-white/15 bg-black/90 sm:h-28 sm:w-28">
                              <p className="text-[10px] text-white/70">
                                Replotre core model
                              </p>
                              <p className="text-xl font-semibold tracking-wide">
                                GXR
                              </p>
                              <p className="px-2 text-center text-[9px] text-white/60">
                                Outperforming 9/10 providers
                              </p>
                            </div>

                            <div className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/90 px-2.5 py-1 text-[10px] text-white/80 shadow-lg shadow-black/80">
                              Batch · 16 posts
                            </div>
                            <div className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-black/90 px-2.5 py-1 text-[10px] text-white/80 shadow-lg shadow-black/80">
                              Training · 32 photos
                            </div>
                            <div className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/90 px-2.5 py-1 text-[10px] text-white/80 shadow-lg shadow-black/80">
                              Latency · 2.1s/gen
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 flex flex-wrap gap-2 text-[10px] text-white/70">
                        <span className="rounded-full bg-white/5 px-2.5 py-1">
                          Built for creators, not generic avatars
                        </span>
                        <span className="rounded-full bg-white/5 px-2.5 py-1">
                          Trains in minutes, not hours
                        </span>
                        <span className="rounded-full bg-white/5 px-2.5 py-1">
                          Ready for UGC ads, brand work &amp; fan content
                        </span>
                        <span className="rounded-full bg-white/5 px-2.5 py-1">
                          Better identity + control than most AI tools
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ✅ SHOWCASE SECTION */}
        <section
  id="showcase"
  ref={(el) => {
    showcaseSectionRef.current = el;
  }}
  className="mt-10 sm:mt-12 lg:mt-14"
>
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.05] shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="border-b border-white/10 px-5 py-6 sm:px-8 sm:py-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">
                    Showcase
                  </p>
                  <h2 className="mt-2 text-xl font-semibold sm:text-2xl">
                    Quality That Sells
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-white/65">
                    Creator-grade realism for Instagram, TikTok, and YouTube —
                    the same quality your subscribers pay $50+ for.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/60">
                  <span className="inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-1.5">
                    <Sparkles size={14} className="text-sky-300" />
                    4K-ready exports
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-1.5">
                    <ShieldCheck size={14} className="text-sky-300" />
                    Brand-safe control
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop grid */}
            <div className="hidden gap-5 px-5 py-6 md:grid md:grid-cols-3 sm:px-8 sm:py-8">
              {showcaseImages.map((img, idx) => {
                const fallback = imgError[idx];
                return (
                  <div
                    key={idx}
                    className="group relative overflow-hidden rounded-[26px] border border-white/10  bg-black/30 shadow-[0_20px_80px_rgba(0,0,0,0.45)]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent opacity-90" />
                    <div className="relative aspect-[4/5] w-full">
                      {!fallback ? (
                        <Image
                        src={img.src}
                        alt={img.alt}
                        fill
                        sizes="(min-width: 768px) 33vw, 100vw"
                        className="object-cover transition duration-500 group-hover:scale-[1.03]"
                        priority={idx === 0}
                        loading={idx === 0 ? "eager" : "lazy"}
                        placeholder="blur"
                        blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEyIiBoZWlnaHQ9IjEyIiBmaWxsPSIjMDcwODE2Ii8+PC9zdmc+"
                        onError={() => setImgError((p) => ({ ...p, [idx]: true }))}
                       />                      
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-violet-500/15 via-indigo-500/10 to-sky-500/10" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ✅ Mobile: modern one-by-one slider (snap-stop + arrows + dots) */}
            <div className="md:hidden relative">
              {/* edge fades */}
              <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-8 bg-gradient-to-r from-black/30 to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-8 bg-gradient-to-l from-black/30 to-transparent" />

              {/* arrows */}
              <button
                type="button"
                aria-label="Previous"
                onClick={() => scrollShowcaseTo(showcaseActive - 1)}
                disabled={showcaseActive <= 0}
                className={cx(
                  "absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/10 bg-black/40 p-2 text-white/80 backdrop-blur-md transition hover:bg-black/55 active:scale-[0.98]",
                  showcaseActive <= 0 && "opacity-40 pointer-events-none"
                )}
              >
                <ArrowLeft size={18} />
              </button>

              <button
                type="button"
                aria-label="Next"
                onClick={() => scrollShowcaseTo(showcaseActive + 1)}
                disabled={showcaseActive >= showcaseImages.length - 1}
                className={cx(
                  "absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/10 bg-black/40 p-2 text-white/80 backdrop-blur-md transition hover:bg-black/55 active:scale-[0.98]",
                  showcaseActive >= showcaseImages.length - 1 &&
                    "opacity-40 pointer-events-none"
                )}
              >
                <ArrowRight size={18} />
              </button>

              {/* slider */}
              <div
                ref={showcaseRef}
                className={cx(
                  "gx-hide-scrollbar -mx-5 flex snap-x snap-mandatory overflow-x-auto px-5 pb-3 touch-pan-x overscroll-x-contain",
                  "[scrollbar-width:none] [-ms-overflow-style:none]"
                )}
              >
                {showcaseImages.map((img, idx) => {
                  const fallback = imgError[idx];
                  return (
                    <div
                      key={idx}
                      className="w-full shrink-0 snap-center [scroll-snap-stop:always] pr-4 last:pr-0"
                    >
                      <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-black/30 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent opacity-90" />
                        <div className="relative aspect-[4/5] w-full">
                          {!fallback ? (
                            <Image
                               src={img.src}
                               alt={img.alt}
                                 fill
                               sizes="(max-width: 767px) 100vw, 33vw"
                               className="object-cover"
                               priority={idx === 0}
                               loading={idx === 0 ? "eager" : "lazy"}
                               placeholder="blur"
                               blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEyIiBoZWlnaHQ9IjEyIiBmaWxsPSIjMDcwODE2Ii8+PC9zdmc+"
                               onError={() => setImgError((p) => ({ ...p, [idx]: true }))}
                             />
                          ) : (
                            <div className="h-full w-full bg-gradient-to-br from-violet-500/15 via-indigo-500/10 to-sky-500/10" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* dots */}
              <div className="mt-3 flex items-center justify-center gap-2 pb-1">
                {showcaseImages.map((_, i) => {
                  const active = i === showcaseActive;
                  return (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Go to slide ${i + 1}`}
                      onClick={() => scrollShowcaseTo(i)}
                      className={cx(
                        "h-2 rounded-full transition-all",
                        active
                          ? "w-7 bg-white/80"
                          : "w-2 bg-white/25 hover:bg-white/40"
                      )}
                    />
                  );
                })}
              </div>
            </div>

            {/* bottom CTA */}
            <div className="border-t border-white/10 px-5 py-6 sm:px-8">
              <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
                <p className="text-sm text-white/70">
                  Ready to create content that sells for $50+ per PPV?
                </p>

                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById("pricing");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10 sm:w-auto"
                  >
                    View pricing
                  </button>

                  <button
                    type="button"
                    onClick={start}
                    className="gx-btn w-full px-5 py-3 text-sm font-semibold sm:w-auto"
                  >
                    <Check size={18} />
                    <span>Get started</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="mt-12 sm:mt-14 lg:mt-16">
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.05] shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="border-b border-white/10 px-5 py-6 sm:px-8 sm:py-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">
                    Workflow
                  </p>
                  <h2 className="mt-2 text-xl font-semibold sm:text-2xl">
                    Launch a realistic AI influencer in three steps
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-white/65">
                    Train once on your real photos; your AI twin keeps posting,
                    replying and generating sponsor-ready content on demand.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/60">
                  <span className="inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-1.5">
                    <ShieldCheck size={14} />
                    Likeness and controls built-in
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-1.5">
                    <Download size={14} />
                    4K exports for ads &amp; socials
                  </span>
                </div>
              </div>
            </div>

            <div className="px-5 py-6 sm:px-8 sm:py-8">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3 sm:gap-5">
                <div className="rounded-3xl border border-white/10 bg-black/30 p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-white/70">
                      Step 1
                    </span>
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                      <Upload size={18} className="text-sky-300" />
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold">
                    Train your AI influencer
                  </h3>
                  <p className="mt-2 text-sm leading-snug text-white/65">
                    Upload 20–40 selfies and lifestyle photos. We normalize
                    lighting, poses and outfits automatically to build a strong
                    base model.
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/30 p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-white/70">
                      Step 2
                    </span>
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                      <Sparkles size={18} className="text-sky-300" />
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold">
                    Define persona &amp; boundaries
                  </h3>
                  <p className="mt-2 text-sm leading-snug text-white/65">
                    Choose your niche, tone of voice and limits. Your AI stays
                    on-brand and consistent.
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/30 p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-white/70">
                      Step 3
                    </span>
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                      <Wand2 size={18} className="text-sky-300" />
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold">
                    Deploy to socials &amp; ads
                  </h3>
                  <p className="mt-2 text-sm leading-snug text-white/65">
                    Generate packs of reels, posts and stories. Export for
                    Instagram, TikTok and YouTube.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-[11px] text-white/60">
                  <span className="font-semibold text-white/80">Note:</span>{" "}
                  Be transparent with your audience about AI-assisted content.
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="#pricing"
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white/85 transition hover:bg-white/10"
                  >
                    View pricing
                  </Link>
                  <button
                    onClick={start}
                    className="gx-btn px-5 py-3 text-sm font-semibold"
                    type="button"
                  >
                    <span>Open workspace</span>
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        {/* ... unchanged (your pricing + FAQ stays exactly as-is below) */}

        {/* Pricing */}
        <section id="pricing" className="mt-14 sm:mt-16 lg:mt-20">
          {/* (unchanged pricing section) */}
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/50">
              Pricing
            </p>

            <h2 className="mt-2 text-[clamp(34px,5.6vw,64px)] font-semibold leading-[1.02]">
              Pay as you{" "}
              <span className="bg-gradient-to-r from-violet-200 via-indigo-200 to-sky-200 bg-clip-text text-transparent">
                grow
              </span>
            </h2>

            <p className="mt-3 text-sm text-white/65">
              Credits that scale with your business. No hidden fees.
            </p>

            {/* Toggle */}
            <div className="mt-6 flex justify-center">
              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 p-1 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
                <button
                  type="button"
                  onClick={() => setBillingCycle("monthly")}
                  className={cx(
                    "rounded-full px-6 py-2 text-[13px] font-semibold transition",
                    billingCycle === "monthly"
                      ? "gx-btn gx-btn-sm px-6 py-2"
                      : "text-white/65 hover:text-white"
                  )}
                >
                  <span>Monthly</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle("yearly")}
                  className={cx(
                    "rounded-full px-6 py-2 text-[13px] font-semibold transition",
                    billingCycle === "yearly"
                      ? "gx-btn gx-btn-sm px-6 py-2"
                      : "text-white/65 hover:text-white"
                  )}
                >
                  <span>Yearly</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3 lg:gap-7">
            {pricingCards.map((card) => {
              const popular = !!card.popular;

              return (
                <div key={card.key} className="relative">
                  {popular && (
                    <div className="pointer-events-none absolute -top-4 left-1/2 z-10 -translate-x-1/2">
                      <span className="rounded-full border border-white/15 bg-white/10 px-4 py-1 text-[12px] font-semibold text-white shadow-[0_14px_60px_rgba(109,93,252,0.18)]">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div
                    className={cx(
                      "h-full overflow-hidden rounded-[26px] border bg-black/40 shadow-[0_24px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl",
                      popular ? "border-violet-400/20" : "border-white/10"
                    )}
                  >
                    <div className="p-6">
                      <h3 className="text-lg font-semibold">{card.name}</h3>
                      <p className="mt-1 text-sm text-white/55">
                        {card.subtitle}
                      </p>

                      <div className="mt-6 flex items-end justify-center gap-1">
                        <span className="text-5xl font-semibold leading-none">
                          ${String(card.price)}
                        </span>
                        <span className="pb-1 text-sm text-white/55">/mo</span>
                      </div>

                      {billingCycle === "yearly" && card.billed != null ? (
                        <p className="mt-2 text-center text-[12px] text-white/45">
                          Billed ${formatUSD(card.billed)} yearly
                        </p>
                      ) : (
                        <p className="mt-2 text-center text-[12px] text-white/45">
                          Billed monthly
                        </p>
                      )}

                      <div className="mt-6 space-y-3">
                        <div className="rounded-xl bg-white/10 px-3 py-2 text-center text-[13px] font-semibold text-white">
                          ★&nbsp;&nbsp;{formatUSD(card.credits)} credits
                        </div>

                        <div className="rounded-xl bg-white/10 px-3 py-2 text-center text-[13px] font-semibold text-white">
                          {card.trainings} Influencer Training
                          {card.trainings > 1 ? "s" : ""}
                        </div>
                      </div>

                      <button
                        onClick={() => setPaywallOpen(true)}
                        type="button"
                        className={cx(
                          "mt-6 w-full px-4 py-3 text-sm font-semibold",
                          popular
                            ? "gx-btn"
                            : "rounded-full border border-white/12 bg-white/10 text-white transition hover:bg-white/15"
                        )}
                      >
                        {popular ? <span>{card.button}</span> : card.button}
                      </button>

                      <div className="mt-6 h-px bg-white/10" />

                      <ul className="mt-5 space-y-3 text-[13px] text-white/75">
                        {card.features.map((f, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span
                              className={cx(
                                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                                f.ok
                                  ? "bg-white/10 text-sky-200"
                                  : "bg-red-500/10 text-red-300"
                              )}
                            >
                              {f.ok ? <Check size={14} /> : <X size={14} />}
                            </span>
                            <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                              {f.label}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pointer-events-none h-8 w-full bg-gradient-to-b from-transparent to-black/40" />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 text-center text-[11px] text-white/50">
            Tip: Switch to <span className="text-white/70">Yearly</span> for a
            lower monthly rate.
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto mt-14 max-w-3xl sm:mt-16 lg:mt-20">
          <p className="text-center text-[11px] uppercase tracking-[0.24em] text-white/50">
            FAQ
          </p>
          <h2 className="mt-2 text-center text-2xl font-semibold sm:text-3xl">
            Everything you need to know
          </h2>
          <div className="mt-6 space-y-3">
            <details className="group rounded-2xl border border-white/10 bg-white/5 p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-white/85">
                Are AI influencers allowed on social platforms?
                <span className="text-xs text-white/60 transition group-open:rotate-90">
                  ❯
                </span>
              </summary>
              <p className="mt-2 text-sm text-white/65">
                Most platforms allow AI-generated content as long as you follow
                their guidelines. Avoid impersonation and be transparent where
                needed.
              </p>
            </details>

            <details className="group rounded-2xl border border-white/10 bg-white/5 p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-white/85">
                Do I keep full rights to my AI influencer?
                <span className="text-xs text-white/60 transition group-open:rotate-90">
                  ❯
                </span>
              </summary>
              <p className="mt-2 text-sm text-white/65">
                Yes — you control your training data and can use your AI model
                commercially within platform and policy guidelines.
              </p>
            </details>

            <details className="group rounded-2xl border border-white/10 bg-white/5 p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-white/85">
                How is Replotre different from other AI model providers?
                <span className="text-xs text-white/60 transition group-open:rotate-90">
                  ❯
                </span>
              </summary>
              <p className="mt-2 text-sm text-white/65">
                Most tools are built for generic avatars. Replotre is tuned for
                realistic AI influencers: stronger identity match, better
                engagement and creator-grade control.
              </p>
            </details>
          </div>
        </section>
      </main>

      {/* Paywall */}
      <PaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        onContinue={continueToBilling}
        packs={packs}
        selectedCredits={selectedCredits}
        setSelectedCredits={(c) => setSelectedCredits(c)}
        isAuthed={isAuthed}
        onLogin={goLogin}
      />
    </div>
  );
}
