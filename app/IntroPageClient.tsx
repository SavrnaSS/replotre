"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  AnimatePresence,
  MotionConfig,
  animate,
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
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
  Menu,
  Plus,
  Zap,
  Star,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  BadgeCheck,
  CalendarClock,
  ScanFace,
  Clapperboard,
  Layers3,
  Play,
} from "lucide-react";

import CreditsBar from "@/app/components/CreditsBar";
import InfluencerBuilder from "@/app/components/landing/InfluencerBuilder";
import ProfileAvatar from "@/app/components/ProfileAvatar";

type Pack = {
  c: number; // credits
  p: number; // price
  badge?: string;
  desc?: string;
};

type Plan = {
  key: string;
  name: string;
  subtitle: string;
  price: number;
  billed: number | null;
  credits: number;
  trainings: number;
  button: string;
  popular: boolean;
  features: { ok: boolean; label: string }[];
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

const BLUR_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEyIiBoZWlnaHQ9IjEyIiBmaWxsPSIjMDcwODE2Ii8+PC9zdmc+";

const NAV_LINKS = [
  { id: "top", label: "Home" },
  { id: "showcase", label: "Showcase" },
  { id: "how-it-works", label: "Workflow" },
  { id: "pricing", label: "Pricing" },
  { id: "faq", label: "FAQ" },
] as const;

const EASE = [0.22, 1, 0.36, 1] as const;

function scrollToId(id: string) {
  if (typeof window === "undefined") return;
  if (id === "top") {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

/** Delay for the CSS `rp-rise` entrance (visible before hydration and with reduced motion). */
function rise(delayMs: number): React.CSSProperties {
  return { animationDelay: `${delayMs}ms` };
}

/* ------------------------------------------
   Hooks
------------------------------------------- */

/** Highlights the nav link of the section currently under the header. */
function useActiveSection(ids: readonly string[]) {
  const [active, setActive] = useState<string>(ids[0]);

  useEffect(() => {
    let raf = 0;
    const calc = () => {
      raf = 0;
      const line = window.innerHeight * 0.35;
      let current: string = ids[0];
      for (const id of ids) {
        if (id === "top") continue;
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;
      if (atBottom) current = ids[ids.length - 1];
      setActive((prev) => (prev === current ? prev : current));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(calc);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [ids]);

  return active;
}

/** Horizontal scroll-snap carousel: index sync on swipe + programmatic scrolling. */
function useSnapCarousel() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);
  const touchedAt = useRef(0);
  const raf = useRef(0);
  const reduce = useReducedMotion();

  // Only scrolls the track horizontally — never moves the page.
  const scrollTo = useCallback(
    (i: number, smooth = true) => {
      const el = ref.current;
      if (!el) return;
      const max = el.children.length - 1;
      const clamped = Math.max(0, Math.min(i, max));
      const child = el.children.item(clamped) as HTMLElement | null;
      if (!child) return;
      el.scrollTo({
        left: child.offsetLeft - (el.clientWidth - child.clientWidth) / 2,
        behavior: smooth && !reduce ? "smooth" : "auto",
      });
    },
    [reduce]
  );

  const onScroll = useCallback(() => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      const el = ref.current;
      if (!el) return;
      const center = el.scrollLeft + el.clientWidth / 2;
      let best = 0;
      let bestDist = Infinity;
      Array.from(el.children).forEach((c, idx) => {
        const ch = c as HTMLElement;
        const d = Math.abs(ch.offsetLeft + ch.clientWidth / 2 - center);
        if (d < bestDist) {
          bestDist = d;
          best = idx;
        }
      });
      setActive((prev) => (prev === best ? prev : best));
    });
  }, []);

  const touch = useCallback(() => {
    touchedAt.current = Date.now();
  }, []);

  return { ref, active, scrollTo, onScroll, touch, touchedAt };
}

/* ------------------------------------------
   Small building blocks
------------------------------------------- */
function Reveal({
  children,
  className,
  delay = 0,
  y = 22,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

function CountUp({
  to,
  decimals = 0,
  suffix = "",
  className,
}: {
  to: number;
  decimals?: number;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(0, to, {
      duration: 1.4,
      ease: EASE,
      onUpdate: (v) => setVal(v),
    });
    return () => controls.stop();
  }, [inView, reduce, to]);

  const text = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(reduce ? to : val);

  return (
    <span ref={ref} className={cx("tabular-nums", className)}>
      {text}
      {suffix}
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  desc,
  center,
}: {
  eyebrow: string;
  title: React.ReactNode;
  desc?: React.ReactNode;
  center?: boolean;
}) {
  return (
    <Reveal className={cx("max-w-2xl", center && "mx-auto text-center")}>
      <p
        className={cx(
          "inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.24em] text-violet-200/70",
          center && "justify-center"
        )}
      >
        <span className="h-px w-6 bg-gradient-to-r from-transparent to-violet-300/70" />
        {eyebrow}
        {center && (
          <span className="h-px w-6 bg-gradient-to-l from-transparent to-violet-300/70" />
        )}
      </p>
      <h2 className="mt-3 text-balance text-[clamp(28px,4.4vw,48px)] font-semibold leading-[1.05] tracking-[-0.02em]">
        {title}
      </h2>
      {desc && (
        <p className="mt-4 text-pretty text-[15px] leading-relaxed text-white/60 sm:text-base">
          {desc}
        </p>
      )}
    </Reveal>
  );
}

/** Pointer-driven 3D tilt; inert for touch and reduced-motion users. */
function TiltCard({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [5, -5]), {
    stiffness: 140,
    damping: 18,
  });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-6, 6]), {
    stiffness: 140,
    damping: 18,
  });
  const glowX = useTransform(mx, [-0.5, 0.5], [0, 100]);
  const glowY = useTransform(my, [-0.5, 0.5], [0, 100]);
  const glow = useMotionTemplate`radial-gradient(420px circle at ${glowX}% ${glowY}%, rgba(255,255,255,0.16), transparent 60%)`;
  const glowOpacity = useSpring(0, { stiffness: 120, damping: 20 });

  return (
    <div
      className="relative [perspective:1400px]"
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
        glowOpacity.set(1);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
        glowOpacity.set(0);
      }}
    >
      <motion.div
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        className="relative"
      >
        {children}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[34px] mix-blend-soft-light"
          style={{ background: glow, opacity: glowOpacity }}
        />
      </motion.div>
    </div>
  );
}

/** Cycles words in place; keeps trailing punctuation attached to the word. */
function RotatingWord({
  words,
  after = "",
  className = "font-semibold text-sky-200",
}: {
  words: string[];
  after?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduce || words.length < 2) return;
    const id = window.setInterval(
      () => setI((p) => (p + 1) % words.length),
      2400
    );
    return () => window.clearInterval(id);
  }, [reduce, words.length]);

  return (
    <span className="inline-block whitespace-nowrap">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={words[i]}
          className={cx("inline-block", className)}
          initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          {words[i]}
        </motion.span>
      </AnimatePresence>
      {after}
    </span>
  );
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
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    const prevFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // Keep keyboard focus inside the dialog.
      if (e.key === "Tab" && dialogRef.current) {
        const f = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        );
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => {
      dialogRef.current
        ?.querySelector<HTMLElement>('[aria-checked="true"]')
        ?.focus();
    }, 50);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
      prevFocus?.focus?.();
    };
  }, [open, onClose]);

  const selectedPack = packs.find((p) => p.c === selectedCredits) ?? null;

  const choose = (pack: Pack) => {
    setSelectedCredits(pack.c);
    safeSetSelectedPack(pack);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={onClose}
          />

          <div className="pointer-events-none absolute inset-0 flex items-end justify-center sm:items-center sm:p-6">
            <motion.div
              ref={dialogRef}
              className="pointer-events-auto flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-[#070816]/95 shadow-[0_40px_140px_rgba(0,0,0,0.8)] sm:rounded-[28px]"
              role="dialog"
              aria-modal="true"
              aria-labelledby="paywall-title"
              initial={{ y: 40, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-white/20 sm:hidden" />

              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">
                    Upgrade
                  </p>
                  <h3
                    id="paywall-title"
                    className="truncate text-lg font-semibold sm:text-xl"
                  >
                    Buy credits
                  </h3>
                  <p className="mt-0.5 text-xs text-white/55">
                    Credits are used when training or generating with your AI
                    influencer.
                  </p>
                </div>

                <button
                  onClick={onClose}
                  className="rp-ghost h-11 w-11 shrink-0 rounded-2xl"
                  aria-label="Close"
                  type="button"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <div className="px-5 py-5 sm:px-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="inline-flex items-center gap-2 text-xs text-white/70">
                      <ShieldCheck size={16} className="text-emerald-300/80" />
                      Secure billing · Pay once, generate anytime
                    </div>
                    <div className="inline-flex items-center gap-2 text-xs text-white/60">
                      <CreditCard size={16} />
                      USD ($)
                    </div>
                  </div>

                  <div
                    className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3"
                    role="radiogroup"
                    aria-label="Credit packs"
                  >
                    {packs.map((pack) => {
                      const active = pack.c === selectedCredits;

                      return (
                        <button
                          key={pack.c}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => choose(pack)}
                          className={cx(
                            "rp-focus relative rounded-[22px] border p-4 text-left transition sm:p-5",
                            active
                              ? "border-violet-400/60 bg-violet-500/[0.08] ring-1 ring-violet-400/30"
                              : "border-white/10 bg-black/40 hover:border-white/25"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
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
                            <span
                              className={cx(
                                "flex h-6 w-6 items-center justify-center rounded-full border transition",
                                active
                                  ? "border-transparent bg-gradient-to-br from-[#6d5dfc] to-[#6aa7ff]"
                                  : "border-white/20"
                              )}
                            >
                              {active && <Check size={14} />}
                            </span>
                          </div>

                          <div className="mt-4 flex items-end justify-between gap-3 sm:block">
                            <div>
                              <p className="text-4xl font-bold leading-none sm:text-5xl">
                                {formatUSD(pack.c)}
                              </p>
                              <p className="mt-1.5 text-sm text-white/60">
                                Credits
                              </p>
                            </div>
                            <div className="text-right sm:mt-5 sm:text-left">
                              <p className="text-2xl font-semibold">
                                ${formatUSD(pack.p)}
                              </p>
                              <p className="mt-1 text-xs text-white/50 sm:text-sm">
                                {pack.desc || "Instant top-up, no expiry"}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm leading-snug text-white/60">
                    <span className="font-semibold text-white/85">Tip:</span>{" "}
                    Creators usually start with{" "}
                    <span className="font-medium text-violet-200">
                      5k–8k credits
                    </span>{" "}
                    to train one AI influencer and keep it posting for a month.
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 bg-black/30 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-white/55">
                    Selected:{" "}
                    <span className="font-semibold text-white/85">
                      {selectedPack
                        ? `${formatUSD(selectedPack.c)} credits ($${formatUSD(
                            selectedPack.p
                          )})`
                        : "None"}
                    </span>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      className="rp-ghost h-12 shrink-0 px-5 text-sm font-semibold"
                      type="button"
                    >
                      Not now
                    </button>

                    <button
                      onClick={isAuthed ? onContinue : onLogin}
                      className="rp-btn h-12 min-w-0 flex-1 px-5 text-sm font-semibold sm:flex-none"
                      type="button"
                    >
                      {isAuthed ? "Continue to billing" : "Login to buy credits"}
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------
   Hero visual: an AI influencer's post as it appears in a feed,
   with floating cards for the product's key outcomes.
   Container queries keep the floats inside the frame at every width.
------------------------------------------- */
type PreviewPost = {
  src: string;
  caption: string;
  tag: string;
  likes: number;
  time: string;
  /** Present when the post is a reel; shown as its duration. */
  video?: string;
};

const PREVIEW_POSTS: PreviewPost[] = [
  {
    src: "/model/face-1-v2.jpg",
    caption: "Slow mornings, soft light ☁️",
    tag: "#lifestyle",
    likes: 12480,
    time: "2m",
  },
  {
    src: "/model/face-2-v2.jpg",
    caption: "New set just dropped ✨",
    tag: "#editorial",
    likes: 15230,
    time: "1h",
  },
  {
    src: "/model/face-3-v2.jpg",
    caption: "City heat, summer mood 🌆",
    tag: "#streetstyle",
    likes: 9860,
    time: "3h",
    video: "0:12",
  },
];

function FloatCard({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: EASE, delay: 0.5 + delay }}
      className={cx("absolute z-20", className)}
    >
      <div
        className="rp-float rounded-2xl border border-white/10 bg-[#0b0c1f]/85 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl"
        style={{ animationDelay: `${delay * 2}s` }}
      >
        {children}
      </div>
    </motion.div>
  );
}

/**
 * The composition is laid out on a fixed design canvas and scaled as one unit,
 * so the post, floating cards, type and spacing keep their proportions at every
 * width. Narrow columns switch to a compact canvas so text never gets too small.
 */
const PREVIEW_CANVAS = {
  wide: { width: 560, maxScale: 1.12 },
  compact: { width: 400, maxScale: 1 },
} as const;
const COMPACT_BELOW = 480; // px of available column width

function useFitToWidth() {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [fit, setFit] = useState<{ scale: number; height: number; compact: boolean } | null>(null);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    let raf = 0;
    const measure = () => {
      raf = 0;
      const w = outer.clientWidth;
      const compact = w < COMPACT_BELOW;
      const canvas = compact ? PREVIEW_CANVAS.compact : PREVIEW_CANVAS.wide;
      const scale = Math.min(canvas.maxScale, w / canvas.width);
      // offsetHeight ignores transforms, so this is the unscaled canvas height
      const height = inner.offsetHeight * scale;
      setFit((prev) =>
        prev &&
        prev.compact === compact &&
        Math.abs(prev.scale - scale) < 0.001 &&
        Math.abs(prev.height - height) < 0.5
          ? prev
          : { scale, height, compact }
      );
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };

    const ro = new ResizeObserver(schedule);
    ro.observe(outer);
    ro.observe(inner);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return { outerRef, innerRef, fit };
}

function CreatorPreview() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [liked, setLiked] = useState(false);
  const post = PREVIEW_POSTS[i];
  const { outerRef, innerRef, fit } = useFitToWidth();
  const compact = fit?.compact ?? false;
  const canvasWidth = compact ? PREVIEW_CANVAS.compact.width : PREVIEW_CANVAS.wide.width;

  // Cycle posts like a live feed; each new post gets "liked" shortly after it lands.
  useEffect(() => {
    if (reduce) return;
    const likeT = window.setTimeout(() => setLiked(true), 1400);
    const nextT = window.setTimeout(() => {
      setLiked(false);
      setI((p) => (p + 1) % PREVIEW_POSTS.length);
    }, 4200);
    return () => {
      window.clearTimeout(likeT);
      window.clearTimeout(nextT);
    };
  }, [i, reduce]);

  const likes = post.likes + (liked ? 1 : 0);
  const queue = [
    PREVIEW_POSTS[(i + 1) % PREVIEW_POSTS.length],
    PREVIEW_POSTS[(i + 2) % PREVIEW_POSTS.length],
  ];

  return (
    <TiltCard>
      <div
        ref={outerRef}
        className={cx("relative mx-auto w-full max-w-[630px]", !fit && "aspect-[560/640]")}
        style={fit ? { height: fit.height } : undefined}
      >
        <div
          ref={innerRef}
          className={cx(
            "absolute left-1/2 top-0 origin-top transition-opacity duration-300",
            fit ? "opacity-100" : "opacity-0"
          )}
          style={{
            width: canvasWidth,
            transform: `translateX(-50%) scale(${fit?.scale ?? 1})`,
          }}
        >
          {/* glow + orbit rings */}
          <div className="pointer-events-none absolute inset-x-10 bottom-12 top-12 rounded-[48px] bg-gradient-to-br from-violet-600/35 via-indigo-500/20 to-sky-500/20 blur-3xl" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[86%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.05]" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[104%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/[0.04]" />

          <div className="relative py-12">
            {/* ---------- the post ---------- */}
            <article
              className={cx(
                "relative z-10 mx-auto overflow-hidden rounded-[28px] border border-white/10 bg-[#0b0c1d] shadow-[0_40px_120px_rgba(0,0,0,0.7)]",
                compact ? "w-[272px]" : "w-[300px]"
              )}
              aria-label="Example post by an AI influencer"
            >
              {/* header */}
              <div className="flex items-center gap-2.5 px-3.5 py-3">
                <span className="relative h-9 w-9 shrink-0 rounded-full bg-gradient-to-tr from-[#6d5dfc] via-fuchsia-400 to-[#6aa7ff] p-[2px]">
                  <span className="relative block h-full w-full overflow-hidden rounded-full border-2 border-[#0b0c1d]">
                    <Image src="/model/face-2-v2.jpg" alt="" fill sizes="72px" className="object-cover" />
                  </span>
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="flex items-center gap-1 text-[13px] font-semibold">
                    ava.creates
                    <BadgeCheck size={14} className="text-sky-300" aria-label="Verified" />
                  </p>
                  <p className="text-[11px] text-white/45">AI influencer · {post.time}</p>
                </div>
                <span className="rounded-full border border-violet-400/30 bg-violet-500/15 px-2.5 py-1 text-[10px] font-semibold text-violet-100">
                  Follow
                </span>
              </div>

              {/* media */}
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-black/40">
                <AnimatePresence initial={false}>
                  <motion.div
                    key={post.src}
                    className="absolute inset-0"
                    initial={{ opacity: 0, scale: 1.06 }}
                    // reels get a slow push-in so the post reads as motion
                    animate={{ opacity: 1, scale: post.video && !reduce ? 1.14 : 1 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      opacity: { duration: 0.9, ease: EASE },
                      scale: post.video && !reduce ? { duration: 4.6, ease: "linear" } : { duration: 0.9, ease: EASE },
                    }}
                  >
                    <Image
                      src={post.src}
                      alt="AI-generated photo of a virtual influencer"
                      fill
                      sizes="(max-width: 640px) 80vw, 360px"
                      priority={i === 0}
                      className="object-cover"
                    />
                  </motion.div>
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

                {/* story-style progress */}
                <div className="absolute inset-x-3 top-3 flex gap-1" aria-hidden>
                  {PREVIEW_POSTS.map((p, idx) => (
                    <span key={p.src} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
                      <motion.span
                        key={`${p.src}-${i}`}
                        className="block h-full rounded-full bg-white"
                        initial={{ width: idx < i ? "100%" : "0%" }}
                        animate={{ width: idx <= i ? "100%" : "0%" }}
                        transition={{ duration: idx === i && !reduce ? 4.2 : 0, ease: "linear" }}
                      />
                    </span>
                  ))}
                </div>

                <AnimatePresence>
                  {post.video && (
                    <motion.span
                      key="reel"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute right-3 top-6 inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/45 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-md"
                    >
                      <Clapperboard size={10} />
                      Reel · {post.video}
                    </motion.span>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {post.video && !liked && (
                    <motion.span
                      key="play"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/35 backdrop-blur-md"
                      aria-hidden
                    >
                      <Play size={22} className="ml-0.5" fill="currentColor" />
                    </motion.span>
                  )}
                </AnimatePresence>

                <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/45 px-2 py-1 text-[10px] font-medium text-white/90 backdrop-blur-md">
                  <Sparkles size={10} className="text-sky-200" />
                  AI generated
                </span>

                {/* heart burst */}
                <AnimatePresence>
                  {liked && !reduce && (
                    <motion.span
                      key={`burst-${i}`}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white drop-shadow-[0_6px_24px_rgba(0,0,0,0.5)]"
                      initial={{ scale: 0.3, opacity: 0 }}
                      animate={{ scale: [0.3, 1.15, 1], opacity: [0, 1, 1] }}
                      exit={{ scale: 1.3, opacity: 0 }}
                      transition={{ duration: 0.6, ease: EASE }}
                      aria-hidden
                    >
                      <Heart size={72} fill="currentColor" strokeWidth={0} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {/* actions */}
              <div className="px-3.5 pb-4 pt-3">
                <div className="flex items-center gap-3.5 text-white/85">
                  <motion.span
                    animate={liked ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                    transition={{ duration: 0.35 }}
                    className={liked ? "text-rose-400" : ""}
                  >
                    <Heart size={20} fill={liked ? "currentColor" : "none"} />
                  </motion.span>
                  <MessageCircle size={20} />
                  <Send size={19} />
                  <Bookmark size={19} className="ml-auto" />
                </div>
                <p className="mt-2.5 text-[13px] font-semibold tabular-nums">
                  {new Intl.NumberFormat("en-US").format(likes)} likes
                </p>
                <p className="mt-0.5 truncate text-[12.5px] text-white/70">
                  <span className="font-semibold text-white">ava.creates</span>{" "}
                  {post.caption} <span className="text-sky-300/90">{post.tag}</span>
                </p>
              </div>
            </article>

            {/* ---------- floating outcome cards (positions are canvas px) ---------- */}
            <FloatCard className="right-[14px] top-[10px]" delay={0.45}>
              <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-white/80">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span>
                  <span className="font-semibold text-white">16 posts</span> generated
                </span>
              </div>
            </FloatCard>

            <FloatCard
              className={compact ? "left-[2px] top-[150px]" : "left-[24px] top-[150px]"}
              delay={0}
            >
              <div className="flex items-center gap-2.5 px-3 py-2.5">
                <span className="relative h-9 w-9 shrink-0">
                  <svg viewBox="0 0 36 36" className="h-9 w-9 -rotate-90" aria-hidden>
                    <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                    <motion.circle
                      cx="18"
                      cy="18"
                      r="15"
                      fill="none"
                      stroke="url(#rp-id-ring)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray="94.25"
                      initial={{ strokeDashoffset: 94.25 }}
                      animate={{ strokeDashoffset: 94.25 * (1 - 0.97) }}
                      transition={{ duration: 1.4, ease: EASE, delay: 0.8 }}
                    />
                    <defs>
                      <linearGradient id="rp-id-ring" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#6d5dfc" />
                        <stop offset="100%" stopColor="#6aa7ff" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <ScanFace size={14} className="absolute inset-0 m-auto text-sky-200" />
                </span>
                <span className="leading-tight">
                  <span className="block text-[10px] text-white/50">Identity match</span>
                  <CountUp to={97} suffix="%" className="text-[15px] font-semibold" />
                </span>
              </div>
            </FloatCard>

            <FloatCard
              className={compact ? "bottom-[170px] left-[2px]" : "bottom-[190px] left-[6px]"}
              delay={0.15}
            >
              <div className="px-3 py-2.5">
                <span className="block text-[10px] text-white/50">Engagement</span>
                <span className="flex items-end gap-2">
                  <CountUp
                    to={3.1}
                    decimals={1}
                    suffix="×"
                    className="bg-gradient-to-r from-violet-200 to-sky-200 bg-clip-text text-[18px] font-semibold leading-none text-transparent"
                  />
                  <svg viewBox="0 0 64 22" className="h-[22px] w-16" aria-hidden>
                    <defs>
                      <linearGradient id="rp-spark" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#6d5dfc" />
                        <stop offset="100%" stopColor="#6aa7ff" />
                      </linearGradient>
                    </defs>
                    <motion.path
                      d="M1 19 L10 16 L18 17 L27 12 L36 13 L45 8 L54 6 L63 2"
                      fill="none"
                      stroke="url(#rp-spark)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.4, ease: EASE, delay: 1 }}
                    />
                  </svg>
                </span>
                <span className="mt-0.5 block text-[10px] text-white/45">vs. average creator</span>
              </div>
            </FloatCard>

            {/* queue: the wide canvas has room for it beside the post */}
            {!compact && (
              <FloatCard className="right-[4px] top-[300px]" delay={0.3}>
                <div className="w-[172px] p-3">
                  <p className="flex items-center justify-between text-[10px] text-white/50">
                    <span className="flex items-center gap-1.5">
                      <CalendarClock size={12} className="text-sky-300" />
                      Up next
                    </span>
                    <span className="flex items-center gap-1 text-emerald-300/90">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Auto
                    </span>
                  </p>
                  <ul className="mt-2 space-y-2">
                    {queue.map((q, idx) => (
                      <li key={q.src} className="flex items-center gap-2">
                        <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-white/10">
                          <Image src={q.src} alt="" fill sizes="64px" className="object-cover" />
                        </span>
                        <span className="min-w-0 leading-tight">
                          <span className="block truncate text-[11px] font-medium text-white/85">
                            {idx === 0 ? "Today · 6:00 PM" : "Tomorrow · 10 AM"}
                          </span>
                          <span className="block truncate text-[10px] text-white/40">{q.tag}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </FloatCard>
            )}
          </div>
        </div>
      </div>
    </TiltCard>
  );
}

/* ------------------------------------------
   "Next generation" comparison — only claims about Replotre's own features.
------------------------------------------- */
const NEXT_GEN_ROWS = [
  {
    before: "Images only",
    after: "Photos and video from one trained model",
    icon: Clapperboard,
  },
  {
    before: "Faces drift between shoots",
    after: "Face-locked identity with 97% match accuracy",
    icon: ScanFace,
  },
  {
    before: "Separate tools to upscale and post",
    after: "Generate, upscale to 4K and schedule in one studio",
    icon: Layers3,
  },
  {
    before: "Manual uploads every day",
    after: "Auto-publishing on your schedule, 24/7",
    icon: CalendarClock,
  },
  {
    before: "Generic, one-size avatars",
    after: "Creator-tuned for UGC, brand deals and fan content",
    icon: Sparkles,
  },
];

function NextGenSection() {
  return (
    <section aria-labelledby="next-gen-title" className="pt-16 sm:pt-20">
      <div className="relative overflow-hidden rounded-[32px] border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.015] p-5 sm:p-8 lg:p-10">
        <div className="rp-grid-bg pointer-events-none absolute inset-0 opacity-[0.05]" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-600/20 blur-[100px]" />

        <div className="relative grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
          <Reveal>
            <p className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-100">
              <Zap size={12} /> Gen 2
            </p>
            <h2
              id="next-gen-title"
              className="mt-4 text-balance text-[clamp(28px,3.8vw,44px)] font-semibold leading-[1.05] tracking-[-0.02em]"
            >
              The next generation of{" "}
              <span className="rp-text-shine">AI influencer</span> studios
            </h2>
            <p className="mt-4 max-w-md text-pretty text-[15px] leading-relaxed text-white/60">
              First-gen tools stop at a picture. Replotre takes your AI
              influencer from training to a posting, earning account — in one
              place, on one credit balance.
            </p>
            <button
              type="button"
              onClick={() => scrollToId("how-it-works")}
              className="rp-ghost mt-6 h-11 px-5 text-sm font-semibold"
            >
              See how it works
              <ArrowRight size={15} />
            </button>
          </Reveal>

          <ul className="space-y-2.5" aria-label="First-generation tools compared with Replotre">
            {NEXT_GEN_ROWS.map(({ before, after, icon: Icon }, i) => (
              <Reveal key={after} delay={i * 0.06}>
                <li className="grid items-center gap-2 rounded-2xl border border-white/[0.07] bg-black/30 p-3.5 sm:grid-cols-[minmax(0,0.85fr)_auto_minmax(0,1.15fr)] sm:gap-4 sm:p-4">
                  <span className="flex items-center gap-2 text-[13px] text-white/40">
                    <X size={14} className="shrink-0 text-white/30" aria-hidden />
                    <span className="line-through decoration-white/20">
                      <span className="sr-only">Before: </span>
                      {before}
                    </span>
                  </span>
                  <ArrowRight size={16} className="hidden text-white/25 sm:block" aria-hidden />
                  <span className="flex items-center gap-2.5 text-[14px] font-medium text-white/90">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-violet-500/25 to-sky-500/15">
                      <Icon size={15} className="text-sky-200" aria-hidden />
                    </span>
                    <span>
                      <span className="sr-only">With Replotre: </span>
                      {after}
                    </span>
                  </span>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------
   Page
------------------------------------------- */
export default function IntroPageClient() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

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
  // Logged-out visitors build their influencer first; sign-in comes at the end.
  const [builderOpen, setBuilderOpen] = useState(false);
  const closeBuilder = useCallback(() => setBuilderOpen(false), []);

  const [selectedCredits, setSelectedCredits] = useState<number | null>(
    defaultPack?.c ?? null
  );

  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly"
  );

  const showcaseImages = useMemo(
    () => [
      {
        src: "/model/face-1-v2.jpg",
        alt: "AI-generated lifestyle photo of a virtual influencer relaxing at home in soft daylight",
        tag: "Lifestyle",
        title: "Soft daylight at home",
      },
      {
        src: "/model/face-2-v2.jpg",
        alt: "AI-generated editorial portrait of a virtual influencer posing in a living room",
        tag: "Editorial",
        title: "Living-room portrait",
      },
      {
        src: "/model/face-3-v2.jpg",
        alt: "AI-generated summer photo of a virtual influencer in a floral swimsuit against a sunlit concrete wall",
        tag: "Summer",
        title: "Sunlit concrete set",
      },
    ],
    []
  );
  const [imgError, setImgError] = useState<Record<number, boolean>>({});

  /* ---------- header ---------- */
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navIds = useMemo(() => NAV_LINKS.map((l) => l.id), []);
  const activeSection = useActiveSection(navIds);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, {
    stiffness: 160,
    damping: 30,
    mass: 0.3,
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    const mq = window.matchMedia("(min-width: 1024px)");
    const onMq = () => mq.matches && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
    };
  }, [menuOpen]);

  /* ---------- mobile sticky CTA ---------- */
  const heroCtaRef = useRef<HTMLDivElement | null>(null);
  const finalCtaRef = useRef<HTMLElement | null>(null);
  const [heroCtaHidden, setHeroCtaHidden] = useState(false);
  const finalCtaVisible = useInView(finalCtaRef, { margin: "0px 0px -10% 0px" });

  useEffect(() => {
    const el = heroCtaRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      setHeroCtaHidden(
        !entry.isIntersecting && entry.boundingClientRect.top < 0
      );
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const showStickyCta =
    heroCtaHidden && !finalCtaVisible && !paywallOpen && !menuOpen && !builderOpen;

  /* ---------- showcase carousel (phones) ---------- */
  const showcase = useSnapCarousel();
  const showcaseSectionRef = useRef<HTMLElement | null>(null);
  const showcaseInView = useInView(showcaseSectionRef, {
    margin: "100% 0px 100% 0px",
  });
  const {
    ref: showcaseTrackRef,
    scrollTo: scrollShowcaseTo,
    touchedAt: showcaseTouchedAt,
  } = showcase;

  // Autoplay: phones only, only near the section, paused after user interaction.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (reduceMotion) return;
    if (window.matchMedia("(min-width: 768px)").matches) return;
    if (showcaseImages.length <= 1 || !showcaseInView) return;

    const id = window.setInterval(() => {
      if (Date.now() - showcaseTouchedAt.current < 10000) return;
      const el = showcaseTrackRef.current;
      if (!el) return;
      // derive the current slide from scroll position (stays correct after manual swipes)
      const w = (el.children.item(0) as HTMLElement | null)?.clientWidth || 1;
      const current = Math.round(el.scrollLeft / w);
      scrollShowcaseTo((current + 1) % showcaseImages.length);
    }, 6000);

    return () => window.clearInterval(id);
  }, [
    showcaseImages.length,
    showcaseInView,
    scrollShowcaseTo,
    showcaseTouchedAt,
    showcaseTrackRef,
    reduceMotion,
  ]);

  /* ---------- auth ---------- */
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

  const goLogin = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  const start = () => {
    if (!isAuthed) {
      setBuilderOpen(true);
      return;
    }
    router.push("/workspace");
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

  const closePaywall = useCallback(() => setPaywallOpen(false), []);

  /* ---------- pricing ---------- */
  const plans = useMemo(() => {
    const commonFeatures = [
      { ok: true, label: "Video face swap" },
      { ok: true, label: "Access to all features" },
    ];

    const yearly: Plan[] = [
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

    const monthly: Plan[] = [
      {
        key: "builder",
        name: "Builder",
        subtitle: "For growing creators",
        price: 15,
        billed: null,
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

    // Savings derived from the real plan prices, never hard-coded.
    const savings: Record<string, number> = {};
    yearly.forEach((y) => {
      const m = monthly.find((x) => x.key === y.key);
      if (m && m.price > 0) {
        savings[y.key] = Math.round((1 - y.price / m.price) * 100);
      }
    });
    const maxSaving = Math.max(0, ...Object.values(savings));

    return { monthly, yearly, savings, maxSaving };
  }, []);

  const pricingCards = billingCycle === "yearly" ? plans.yearly : plans.monthly;
  const popularIdx = Math.max(
    0,
    pricingCards.findIndex((p) => p.popular)
  );

  // Below lg the plans become a swipeable carousel; open it on the popular plan.
  const planCarousel = useSnapCarousel();
  const { scrollTo: scrollPlansTo } = planCarousel;
  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    scrollPlansTo(popularIdx, false);
  }, [scrollPlansTo, popularIdx]);

  /* ---------- content ---------- */
  const faqs = [
    {
      q: "Are AI influencers allowed on social platforms?",
      a: "Most platforms allow AI-generated content as long as you follow their guidelines. Avoid impersonation and be transparent where needed.",
    },
    {
      q: "Do I keep full rights to my AI influencer?",
      a: "Yes — you control your training data and can use your AI model commercially within platform and policy guidelines.",
    },
    {
      q: "How is Replotre different from other AI model providers?",
      a: "Most tools are built for generic avatars. Replotre is tuned for realistic AI influencers: stronger identity match, better engagement and creator-grade control.",
    },
    {
      q: "What are credits used for?",
      a: "Credits are used when training or generating with your AI influencer. Top-up packs are a one-time purchase — pay once, generate anytime.",
    },
  ];
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const steps = [
    {
      icon: Upload,
      title: "Train your AI influencer",
      desc: "Upload 20–40 selfies and lifestyle photos. We normalize lighting, poses and outfits automatically to build a strong base model.",
      meta: "20–40 photos",
    },
    {
      icon: Sparkles,
      title: "Define persona & boundaries",
      desc: "Choose your niche, tone of voice and limits. Your AI stays on-brand and consistent.",
      meta: "Full control",
    },
    {
      icon: Wand2,
      title: "Deploy to socials & ads",
      desc: "Generate packs of reels, posts and stories. Export for Instagram, TikTok and YouTube.",
      meta: "4K exports",
    },
  ];

  const stats = [
    { to: 1000, suffix: "+", decimals: 0, label: "Creators using AI influencers" },
    { to: 4.9, suffix: "/5", decimals: 1, label: "Average creator rating" },
    { to: 97, suffix: "%", decimals: 0, label: "Identity match accuracy" },
    { to: 2.1, suffix: "s", decimals: 1, label: "Per generation" },
  ];

  const marqueeItems = [
    "Instagram Reels",
    "TikTok",
    "YouTube Shorts",
    "UGC Ads",
    "Brand Deals",
    "Stories",
    "Fan Content",
    "Product Shoots",
  ];

  return (
    <MotionConfig reducedMotion="user">
      <div
        id="top"
        className="relative min-h-[100dvh] w-full overflow-x-clip bg-[#050612] text-white antialiased selection:bg-violet-500/40"
      >
        <style jsx global>{`
          html {
            scroll-behavior: smooth;
            scroll-padding-top: 96px;
            background: #050612;
          }
          @media (prefers-reduced-motion: reduce) {
            html {
              scroll-behavior: auto;
            }
          }
        `}</style>

        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-black"
        >
          Skip to content
        </a>

        {/* Ambient BG */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-64 left-1/2 h-[560px] w-[1000px] max-w-[160vw] -translate-x-1/2 rounded-full bg-violet-600/25 blur-[130px]" />
          <div className="absolute top-[30%] -left-40 h-[420px] w-[420px] rounded-full bg-indigo-500/10 blur-[120px]" />
          <div className="absolute top-[55%] -right-40 h-[520px] w-[520px] rounded-full bg-sky-400/10 blur-[130px]" />
          <div className="rp-grid-bg absolute inset-x-0 top-0 h-[900px] opacity-[0.035]" />
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.035]" />
        </div>

        {/* Scroll progress */}
        <motion.div
          aria-hidden
          className="fixed inset-x-0 top-0 z-[55] h-[2px] origin-left bg-gradient-to-r from-[#6d5dfc] via-indigo-400 to-[#6aa7ff]"
          style={{ scaleX: progress }}
        />

        {/* ================= Header ================= */}
        <header className="sticky top-0 z-50 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 sm:pt-4">
          <div
            className={cx(
              "mx-auto w-full max-w-7xl rounded-[22px] border transition-[background-color,border-color,box-shadow] duration-300",
              scrolled || menuOpen
                ? "border-white/10 bg-[#0a0b1c]/80 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl"
                : "border-white/[0.06] bg-white/[0.03] backdrop-blur-md"
            )}
          >
            <div
              className={cx(
                "flex items-center justify-between gap-3 px-3 transition-[height] duration-300 sm:px-5",
                scrolled ? "h-14 sm:h-16" : "h-16 sm:h-[72px]"
              )}
            >
              <button
                type="button"
                onClick={() => scrollToId("top")}
                className="rp-focus relative h-10 w-[130px] shrink-0 rounded-lg sm:h-12 sm:w-[170px]"
                aria-label="Replotre home"
              >
                <Image
                  src="/logo.png"
                  alt="Replotre"
                  fill
                  unoptimized
                  sizes="170px"
                  className="origin-left scale-[1.35] object-contain object-left"
                  priority
                />
              </button>

              {/* Desktop nav (lg+ so it never collides with actions on tablets) */}
              <nav
                className="hidden items-center rounded-full border border-white/[0.06] bg-black/20 p-1 lg:flex"
                aria-label="Primary"
              >
                {NAV_LINKS.map((l) => {
                  const active = activeSection === l.id;
                  return (
                    <a
                      key={l.id}
                      href={l.id === "top" ? "#" : `#${l.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToId(l.id);
                      }}
                      aria-current={active ? "location" : undefined}
                      className={cx(
                        "rp-focus relative rounded-full px-4 py-1.5 text-[13px] transition-colors",
                        active ? "text-white" : "text-white/60 hover:text-white"
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="nav-pill"
                          className="absolute inset-0 rounded-full border border-white/10 bg-white/[0.08]"
                          transition={{ type: "spring", stiffness: 380, damping: 32 }}
                        />
                      )}
                      <span className="relative">{l.label}</span>
                    </a>
                  );
                })}
              </nav>

              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                {isAuthed ? (
                  <>
                    <div className="hidden xl:block">
                      <CreditsBar />
                    </div>
                    <button
                      onClick={() => setPaywallOpen(true)}
                      className="rp-btn hidden h-10 px-4 text-[13px] font-semibold sm:inline-flex"
                      type="button"
                    >
                      <Zap size={15} />
                      Get credits
                    </button>
                    <ProfileAvatar />
                  </>
                ) : (
                  <>
                    <button
                      onClick={goLogin}
                      className="rp-ghost hidden h-10 px-4 text-[13px] font-semibold sm:inline-flex"
                      type="button"
                    >
                      Sign in
                    </button>
                    <button
                      onClick={() => setPaywallOpen(true)}
                      className="rp-btn h-10 px-3.5 text-[13px] font-semibold max-[379px]:w-10 max-[379px]:px-0 sm:px-4"
                      type="button"
                    >
                      <Zap size={15} />
                      <span className="max-[379px]:sr-only">Get credits</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="rp-ghost h-10 w-10 lg:hidden"
                  aria-label={menuOpen ? "Close menu" : "Open menu"}
                  aria-expanded={menuOpen}
                  aria-controls="mobile-menu"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={menuOpen ? "x" : "menu"}
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex"
                    >
                      {menuOpen ? <X size={18} /> : <Menu size={18} />}
                    </motion.span>
                  </AnimatePresence>
                </button>
              </div>
            </div>

            {/* Mobile / tablet menu */}
            <AnimatePresence initial={false}>
              {menuOpen && (
                <motion.div
                  id="mobile-menu"
                  className="overflow-hidden lg:hidden"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                >
                  <div className="max-h-[calc(100dvh-6rem)] overflow-y-auto border-t border-white/10 px-3 pb-4 pt-2">
                    <nav
                      className="grid gap-1 sm:grid-cols-2"
                      aria-label="Mobile"
                    >
                      {NAV_LINKS.map((l, i) => (
                        <motion.button
                          key={l.id}
                          type="button"
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.04 * i }}
                          onClick={() => {
                            setMenuOpen(false);
                            // let the menu collapse before measuring the target
                            window.setTimeout(() => scrollToId(l.id), 180);
                          }}
                          className={cx(
                            "rp-focus flex min-h-12 items-center justify-between rounded-2xl px-4 text-left text-[15px] transition",
                            activeSection === l.id
                              ? "bg-white/[0.07] text-white"
                              : "text-white/70 hover:bg-white/[0.04]"
                          )}
                        >
                          {l.label}
                          <ArrowRight size={16} className="text-white/30" />
                        </motion.button>
                      ))}
                    </nav>

                    {isAuthed ? (
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <CreditsBar />
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            setPaywallOpen(true);
                          }}
                          className="rp-btn h-12 px-5 text-sm font-semibold sm:hidden"
                          type="button"
                        >
                          <Zap size={16} />
                          Get credits
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={goLogin}
                        className="rp-ghost mt-3 h-12 w-full text-sm font-semibold sm:hidden"
                        type="button"
                      >
                        Sign in
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        <main
          id="main"
          className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6"
        >
          {/* ================= Hero ================= */}
          <section className="grid items-center gap-10 pb-12 pt-10 sm:gap-12 sm:pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pb-20 lg:pt-20 xl:grid-cols-[1.15fr_1fr] xl:gap-14">
            <div className="text-center sm:text-left">
              <div
                style={rise(0)}
                className="rp-rise inline-flex max-w-full items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/[0.08] py-1 pl-1 pr-3 text-[12px] text-violet-100"
              >
                <span className="rounded-full bg-gradient-to-r from-[#6d5dfc] to-[#6aa7ff] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                  New
                </span>
                <span className="truncate">The future of AI influencers</span>
              </div>

              <h1
                style={rise(60)}
                className="rp-rise mt-6 text-balance text-[clamp(40px,8vw,60px)] font-semibold leading-[0.98] tracking-[-0.035em] lg:text-[clamp(48px,5.4vw,78px)]"
              >
                Create Your <span className="rp-text-shine">AI Influencer</span>{" "}
                Empire
              </h1>

              <p
                style={rise(140)}
                className="rp-rise mx-auto mt-6 max-w-xl text-pretty text-[16px] leading-relaxed text-white/65 sm:mx-0 sm:text-[18px]"
              >
                Train a realistic AI influencer that looks and acts like you —
                but never sleeps. Beat human creators on{" "}
                <span className="font-medium text-white">
                  reach, engagement and consistency
                </span>{" "}
                across{" "}
                <RotatingWord words={["Instagram", "TikTok", "YouTube"]} after="." />
              </p>

              <ul className="mt-6 flex flex-wrap justify-center gap-2 text-[12.5px] text-white/75 sm:justify-start">
                {[
                  "3× more reach than baseline creators",
                  "Always-on posting, zero burnout",
                  "Brand-safe & fully controlled",
                ].map((t, i) => (
                  <li
                    key={t}
                    style={rise(220 + i * 60)}
                    className="rp-rise inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.04] px-3 py-1.5"
                  >
                    <Check size={13} className="shrink-0 text-sky-300" />
                    {t}
                  </li>
                ))}
              </ul>

              <div
                ref={heroCtaRef}
                style={rise(380)}
                className="rp-rise mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
              >
                <button
                  onClick={start}
                  className="rp-btn group h-14 w-full px-7 text-[15px] font-semibold sm:w-auto"
                  type="button"
                >
                  Start AI model generation
                  <ArrowRight
                    size={18}
                    className="shrink-0 transition-transform group-hover:translate-x-1"
                  />
                </button>

                <button
                  type="button"
                  onClick={() => scrollToId("showcase")}
                  className="rp-ghost h-14 w-full px-6 text-[14px] font-semibold sm:w-auto"
                >
                  View styles &amp; case studies
                </button>
              </div>

              <AnimatePresence>
                {isLocked && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mx-auto mt-4 flex max-w-xl items-start gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 pr-4 text-left text-[13px] sm:mx-0">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
                        <Lock size={15} className="text-violet-200" />
                      </span>
                      <p className="min-w-0 leading-snug text-white/60">
                        <span className="font-semibold text-white/85">
                          Preview freely.
                        </span>{" "}
                        Saving trainings and influencer models unlocks after you{" "}
                        <button
                          type="button"
                          onClick={goLogin}
                          className="rp-focus rounded font-semibold text-violet-200 underline decoration-violet-300/40 underline-offset-4 transition hover:text-white hover:decoration-white"
                        >
                          sign in to keep progress
                        </button>
                        .
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div
                style={rise(480)}
                className="rp-rise mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12px] text-white/55 sm:justify-start"
              >
                <span className="flex -space-x-2" aria-hidden>
                  {[
                    "from-violet-400 to-indigo-700",
                    "from-sky-400 to-blue-700",
                    "from-fuchsia-400 to-purple-700",
                    "from-emerald-300 to-teal-700",
                  ].map((g) => (
                    <span
                      key={g}
                      className={cx(
                        "h-7 w-7 rounded-full bg-gradient-to-br ring-2 ring-[#050612]",
                        g
                      )}
                    />
                  ))}
                </span>
                <span>
                  <span className="font-semibold text-white/85">1,000+</span>{" "}
                  creators using AI influencers
                </span>
                <span
                  className="inline-flex items-center gap-1 text-amber-300"
                  aria-label="Rated 4.9 out of 5"
                >
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={12} fill="currentColor" aria-hidden />
                  ))}
                  <span className="ml-1 text-white/70">4.9/5</span>
                </span>
              </div>
            </div>

            <div
              style={rise(200)}
              className="rp-rise mx-auto w-full max-w-[640px] lg:max-w-none"
            >
              <CreatorPreview />
            </div>
          </section>

          <NextGenSection />

          {/* ================= Use-case marquee ================= */}
          <section
            aria-label="Use cases"
            className="rp-marquee-wrap relative -mx-4 overflow-hidden border-y border-white/[0.06] py-5 [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)] sm:-mx-6"
          >
            <div className="rp-marquee flex w-max gap-10 pr-10">
              {[...marqueeItems, ...marqueeItems].map((t, i) => (
                <span
                  key={i}
                  aria-hidden={i >= marqueeItems.length}
                  className="inline-flex items-center gap-3 whitespace-nowrap text-sm text-white/45"
                >
                  <Sparkles size={13} className="text-violet-300/60" />
                  {t}
                </span>
              ))}
            </div>
          </section>

          {/* ================= Stats ================= */}
          <section aria-label="Key numbers" className="pt-10 sm:pt-12">
            <dl className="grid grid-cols-2 overflow-hidden rounded-[24px] border border-white/[0.07] bg-white/[0.025] md:grid-cols-4">
              {stats.map((s, i) => (
                <div
                  key={s.label}
                  className={cx(
                    "flex flex-col-reverse gap-1.5 p-5 text-center sm:p-7",
                    i % 2 === 1 && "border-l border-white/[0.07]",
                    i >= 2 && "border-t border-white/[0.07] md:border-t-0",
                    i === 2 && "md:border-l"
                  )}
                >
                  <dt className="text-[12px] text-white/50 sm:text-[13px]">
                    {s.label}
                  </dt>
                  <dd className="text-[clamp(28px,4.5vw,44px)] font-semibold leading-none tracking-tight">
                    <CountUp to={s.to} decimals={s.decimals} suffix={s.suffix} />
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* ================= Showcase ================= */}
          <section
            id="showcase"
            ref={(el) => {
              showcaseSectionRef.current = el;
            }}
            className="pt-20 sm:pt-24 lg:pt-28"
          >
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <SectionHeading
                eyebrow="Showcase"
                title={
                  <>
                    Quality that <span className="rp-text-shine">sells</span>
                  </>
                }
                desc="Creator-grade realism for Instagram, TikTok, and YouTube — the same quality your subscribers pay $50+ for."
              />
              <Reveal className="flex shrink-0 flex-wrap gap-2 text-[12px] text-white/65">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5">
                  <Sparkles size={14} className="text-sky-300" />
                  4K-ready exports
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5">
                  <ShieldCheck size={14} className="text-sky-300" />
                  Brand-safe control
                </span>
              </Reveal>
            </div>

            {/* Tablet & desktop grid */}
            <div className="mt-10 hidden gap-4 md:grid md:grid-cols-3 lg:gap-5">
              {showcaseImages.map((img, idx) => {
                const fallback = imgError[idx];
                return (
                  <Reveal
                    key={idx}
                    delay={idx * 0.08}
                    className={cx(idx === 1 && "md:-translate-y-6")}
                  >
                    <figure className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-black/30 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
                      <div className="relative aspect-[4/5] w-full">
                        {!fallback ? (
                          <Image
                            src={img.src}
                            alt={img.alt}
                            fill
                            sizes="(min-width: 1280px) 400px, 33vw"
                            className="object-cover transition duration-700 ease-out group-hover:scale-[1.05]"
                            loading="lazy"
                            placeholder="blur"
                            blurDataURL={BLUR_DATA_URL}
                            onError={() =>
                              setImgError((p) => ({ ...p, [idx]: true }))
                            }
                          />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-violet-500/15 via-indigo-500/10 to-sky-500/10" />
                        )}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-transparent" />
                      <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-5">
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">
                            {img.tag}
                            <span aria-hidden className="h-1 w-1 rounded-full bg-white/30" />
                            <span className="inline-flex items-center gap-1 normal-case tracking-normal text-sky-200/90">
                              <Sparkles size={11} aria-hidden />
                              AI generated
                            </span>
                          </p>
                          <p className="mt-1.5 truncate text-[17px] font-semibold tracking-tight">
                            {img.title}
                          </p>
                        </div>
                        <span className="rounded-full border border-white/15 bg-black/50 px-2.5 py-1 text-[10px] text-white/80 backdrop-blur-md transition duration-300 [@media(hover:hover)]:translate-y-2 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100">
                          4K · 4:5
                        </span>
                      </figcaption>
                    </figure>
                  </Reveal>
                );
              })}
            </div>

            {/* Phone carousel */}
            <div className="relative mt-8 md:hidden">
              <div
                ref={showcase.ref}
                onScroll={showcase.onScroll}
                onPointerDown={showcase.touch}
                className="rp-noscrollbar relative -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-[7.5%] pb-2"
                aria-roledescription="carousel"
                aria-label="Showcase"
              >
                {showcaseImages.map((img, idx) => {
                  const fallback = imgError[idx];
                  const active = idx === showcase.active;
                  return (
                    <div
                      key={idx}
                      className="w-[85%] max-w-[420px] shrink-0 snap-center [scroll-snap-stop:always]"
                      aria-roledescription="slide"
                      aria-label={`${idx + 1} of ${showcaseImages.length}`}
                    >
                      <div
                        className={cx(
                          "relative overflow-hidden rounded-[24px] border border-white/10 bg-black/30 transition duration-500",
                          active ? "scale-100 opacity-100" : "scale-[0.94] opacity-60"
                        )}
                      >
                        <div className="relative aspect-[4/5] w-full">
                          {!fallback ? (
                            <Image
                              src={img.src}
                              alt={img.alt}
                              fill
                              sizes="85vw"
                              className="object-cover"
                              loading="lazy"
                              placeholder="blur"
                              blurDataURL={BLUR_DATA_URL}
                              onError={() =>
                                setImgError((p) => ({ ...p, [idx]: true }))
                              }
                            />
                          ) : (
                            <div className="h-full w-full bg-gradient-to-br from-violet-500/15 via-indigo-500/10 to-sky-500/10" />
                          )}
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                        <div className="absolute inset-x-4 bottom-4">
                          <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-white/60">
                            {img.tag}
                            <span aria-hidden className="h-1 w-1 rounded-full bg-white/30" />
                            <span className="inline-flex items-center gap-1 normal-case tracking-normal text-sky-200/90">
                              <Sparkles size={10} aria-hidden />
                              AI generated
                            </span>
                          </p>
                          <p className="mt-1 truncate text-base font-semibold tracking-tight">
                            {img.title}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  aria-label="Previous"
                  onClick={() => {
                    showcase.touch();
                    showcase.scrollTo(showcase.active - 1);
                  }}
                  disabled={showcase.active <= 0}
                  className="rp-ghost h-11 w-11 disabled:opacity-30"
                >
                  <ArrowLeft size={17} />
                </button>
                <div className="flex items-center gap-1">
                  {showcaseImages.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Go to slide ${i + 1}`}
                      aria-current={i === showcase.active}
                      onClick={() => {
                        showcase.touch();
                        showcase.scrollTo(i);
                      }}
                      className="rp-focus flex h-11 items-center rounded-full px-1"
                    >
                      <span
                        className={cx(
                          "block h-2 rounded-full transition-all duration-300",
                          i === showcase.active
                            ? "w-7 bg-gradient-to-r from-[#6d5dfc] to-[#6aa7ff]"
                            : "w-2 bg-white/25"
                        )}
                      />
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  aria-label="Next"
                  onClick={() => {
                    showcase.touch();
                    showcase.scrollTo(showcase.active + 1);
                  }}
                  disabled={showcase.active >= showcaseImages.length - 1}
                  className="rp-ghost h-11 w-11 disabled:opacity-30"
                >
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>

            <Reveal className="mt-10">
              <div className="flex flex-col items-center justify-between gap-4 rounded-[24px] border border-white/[0.07] bg-white/[0.03] p-5 text-center sm:flex-row sm:p-6 sm:text-left">
                <p className="text-[15px] text-white/75">
                  Ready to create content that sells for{" "}
                  <span className="font-semibold text-white">$50+ per PPV</span>?
                </p>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                  <button
                    type="button"
                    onClick={() => scrollToId("pricing")}
                    className="rp-ghost h-12 px-5 text-sm font-semibold"
                  >
                    View pricing
                  </button>
                  <button
                    type="button"
                    onClick={start}
                    className="rp-btn h-12 px-6 text-sm font-semibold"
                  >
                    Get started
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </Reveal>
          </section>

          {/* ================= How it works ================= */}
          <section id="how-it-works" className="pt-20 sm:pt-24 lg:pt-28">
            <SectionHeading
              eyebrow="Workflow"
              title="Launch a realistic AI influencer in three steps"
              desc="Train once on your real photos; your AI twin keeps posting, replying and generating sponsor-ready content on demand."
            />

            <div className="relative mt-12">
              {/* connector line (md+) */}
              <div className="pointer-events-none absolute left-[16.6%] right-[16.6%] top-7 hidden h-px md:block">
                <motion.div
                  className="h-full origin-left bg-gradient-to-r from-violet-400/60 via-indigo-400/40 to-sky-400/60"
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2, ease: EASE }}
                />
              </div>

              {/* vertical connector (phones) */}
              <div className="pointer-events-none absolute bottom-10 left-7 top-10 w-px bg-gradient-to-b from-violet-400/50 via-indigo-400/30 to-sky-400/50 md:hidden" />

              <ol className="grid gap-6 md:grid-cols-3 md:gap-4 lg:gap-5">
                {steps.map(({ icon: Icon, title, desc, meta }, i) => (
                  <Reveal key={title} delay={i * 0.12}>
                    <li className="relative flex h-full gap-4 md:flex-col md:items-center md:text-center">
                      <span className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-[#0b0c1f] shadow-[0_0_40px_rgba(109,93,252,0.25)]">
                        <Icon size={22} className="text-sky-200" />
                        <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#6d5dfc] to-[#6aa7ff] text-[10px] font-bold">
                          {i + 1}
                        </span>
                      </span>
                      <div className="min-w-0 flex-1 rounded-[22px] border border-white/[0.07] bg-white/[0.03] p-5 transition hover:border-white/15 hover:bg-white/[0.05] md:mt-5 md:flex md:w-full md:flex-col md:items-center">
                        <h3 className="text-[17px] font-semibold">{title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-white/60 md:flex-1">
                          {desc}
                        </p>
                        <span className="mt-4 inline-flex rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] text-white/60">
                          {meta}
                        </span>
                      </div>
                    </li>
                  </Reveal>
                ))}
              </ol>
            </div>

            <Reveal className="mt-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-[12px] text-white/50">
                <span className="font-semibold text-white/75">Note:</span> Be
                transparent with your audience about AI-assisted content.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => scrollToId("pricing")}
                  className="rp-ghost h-12 px-5 text-sm font-semibold"
                >
                  View pricing
                </button>
                <button
                  onClick={start}
                  className="rp-btn h-12 px-6 text-sm font-semibold"
                  type="button"
                >
                  Open workspace
                  <ArrowRight size={16} />
                </button>
              </div>
            </Reveal>
          </section>

          {/* ================= Pricing ================= */}
          <section id="pricing" className="pt-20 sm:pt-24 lg:pt-28">
            <SectionHeading
              center
              eyebrow="Pricing"
              title={
                <>
                  Pay as you <span className="rp-text-shine">grow</span>
                </>
              }
              desc="Credits that scale with your business. No hidden fees."
            />

            <Reveal className="mt-8 flex justify-center">
              <div
                role="radiogroup"
                aria-label="Billing cycle"
                className="relative inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] p-1"
              >
                {(["monthly", "yearly"] as const).map((cycle) => {
                  const active = billingCycle === cycle;
                  return (
                    <button
                      key={cycle}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setBillingCycle(cycle)}
                      className={cx(
                        "rp-focus relative flex h-10 items-center gap-2 rounded-full px-5 text-[13px] font-semibold capitalize transition-colors sm:px-6",
                        active ? "text-white" : "text-white/60 hover:text-white"
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="billing-pill"
                          className="absolute inset-0 rounded-full bg-gradient-to-r from-[#6d5dfc] to-[#6aa7ff] shadow-[0_8px_30px_rgba(109,93,252,0.35)]"
                          transition={{ type: "spring", stiffness: 400, damping: 34 }}
                        />
                      )}
                      <span className="relative">{cycle}</span>
                      {cycle === "yearly" && plans.maxSaving > 0 && (
                        <span
                          className={cx(
                            "relative rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                            active
                              ? "bg-white/20 text-white"
                              : "bg-emerald-400/15 text-emerald-300"
                          )}
                        >
                          −{plans.maxSaving}%
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </Reveal>

            {/* Plan switcher for the carousel (below lg) */}
            <div className="mt-5 flex justify-center lg:hidden">
              <div className="inline-flex gap-1 rounded-full border border-white/[0.07] bg-black/30 p-1">
                {pricingCards.map((card, i) => {
                  const active = planCarousel.active === i;
                  return (
                    <button
                      key={card.key}
                      type="button"
                      onClick={() => planCarousel.scrollTo(i)}
                      aria-pressed={active}
                      className={cx(
                        "rp-focus relative h-9 rounded-full px-4 text-[12px] font-medium transition-colors",
                        active ? "text-white" : "text-white/50"
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="plan-pill"
                          className="absolute inset-0 rounded-full bg-white/[0.09]"
                          transition={{ type: "spring", stiffness: 400, damping: 34 }}
                        />
                      )}
                      <span className="relative">{card.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* One render path: swipeable carousel below lg, 3-col grid at lg+ */}
            <div
              ref={planCarousel.ref}
              onScroll={planCarousel.onScroll}
              className="rp-noscrollbar relative -mx-4 mt-2 flex snap-x snap-mandatory items-stretch gap-4 overflow-x-auto overscroll-x-contain px-[8%] pb-4 pt-6 sm:-mx-6 lg:mx-0 lg:mt-10 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible lg:px-0 lg:pt-4"
            >
              {pricingCards.map((card, idx) => {
                const popular = card.popular;
                const saving = plans.savings[card.key];

                return (
                  <div
                    key={card.key}
                    className={cx(
                      "relative w-[84%] max-w-[400px] shrink-0 snap-center sm:w-[58%] lg:w-auto lg:max-w-none",
                      popular && "lg:-my-3"
                    )}
                  >
                    {popular && (
                      <div className="pointer-events-none absolute -top-3.5 left-1/2 z-10 -translate-x-1/2">
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-gradient-to-r from-[#6d5dfc] to-[#6aa7ff] px-3.5 py-1 text-[11px] font-semibold shadow-[0_10px_40px_rgba(109,93,252,0.45)]">
                          <Star size={11} fill="currentColor" />
                          Most popular
                        </span>
                      </div>
                    )}

                    <div
                      className={cx(
                        "h-full rounded-[28px] p-px transition-opacity duration-300",
                        popular
                          ? "bg-gradient-to-b from-violet-400/70 via-indigo-400/25 to-sky-400/40 shadow-[0_30px_100px_rgba(109,93,252,0.25)]"
                          : "bg-white/10",
                        planCarousel.active !== idx && "max-lg:opacity-60"
                      )}
                    >
                      <div
                        className={cx(
                          "flex h-full flex-col rounded-[27px] p-6 sm:p-7",
                          popular ? "bg-[#0b0b20]" : "bg-[#08091a]"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-semibold">{card.name}</h3>
                            <p className="mt-0.5 text-sm text-white/50">
                              {card.subtitle}
                            </p>
                          </div>
                          <AnimatePresence>
                            {billingCycle === "yearly" && saving > 0 && (
                              <motion.span
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="whitespace-nowrap rounded-full bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300"
                              >
                                Save {saving}%
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </div>

                        <div className="mt-7 flex h-14 items-end gap-1 overflow-hidden">
                          <AnimatePresence mode="popLayout" initial={false}>
                            <motion.span
                              key={`${card.key}-${card.price}`}
                              initial={{ y: 30, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              exit={{ y: -30, opacity: 0 }}
                              transition={{ duration: 0.35, ease: EASE }}
                              className="text-5xl font-semibold leading-none tracking-tight tabular-nums"
                            >
                              ${String(card.price)}
                            </motion.span>
                          </AnimatePresence>
                          <span className="pb-1 text-sm text-white/50">/mo</span>
                        </div>
                        <p className="mt-2 text-[12px] text-white/45">
                          {billingCycle === "yearly" && card.billed != null
                            ? `Billed $${formatUSD(card.billed)} yearly`
                            : "Billed monthly"}
                        </p>

                        <div className="mt-6 grid grid-cols-2 gap-2">
                          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.04] px-3 py-2.5">
                            <p className="text-[11px] text-white/50">Credits / mo</p>
                            <p className="mt-0.5 text-[15px] font-semibold">
                              {formatUSD(card.credits)}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.04] px-3 py-2.5">
                            <p className="text-[11px] text-white/50">AI influencers</p>
                            <p className="mt-0.5 text-[15px] font-semibold">
                              {card.trainings}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => setPaywallOpen(true)}
                          type="button"
                          className={cx(
                            "mt-6 h-12 w-full text-sm font-semibold",
                            popular ? "rp-btn" : "rp-ghost"
                          )}
                        >
                          {card.button}
                          <ArrowRight size={16} />
                        </button>

                        <div className="my-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                        <ul className="space-y-3 text-[13.5px] text-white/75">
                          {card.features.map((f, i) => (
                            <li
                              key={i}
                              className={cx(
                                "flex items-start gap-3",
                                !f.ok && "text-white/40"
                              )}
                            >
                              <span
                                className={cx(
                                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                                  f.ok
                                    ? "bg-sky-400/10 text-sky-200"
                                    : "bg-white/[0.04] text-white/35"
                                )}
                              >
                                {f.ok ? <Check size={13} /> : <X size={13} />}
                              </span>
                              <span
                                className={cx(
                                  "min-w-0",
                                  !f.ok && "line-through decoration-white/20"
                                )}
                              >
                                <span className="sr-only">
                                  {f.ok ? "Included: " : "Not included: "}
                                </span>
                                {f.label}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[12px] text-white/50">
              <ShieldCheck size={14} className="text-emerald-300/70" />
              Secure billing · Switch to
              <button
                type="button"
                onClick={() => setBillingCycle("yearly")}
                className="rp-focus rounded text-white/75 underline decoration-white/20 underline-offset-4 hover:text-white"
              >
                Yearly
              </button>
              for a lower monthly rate
            </p>
          </section>

          {/* ================= FAQ ================= */}
          <section
            id="faq"
            className="grid gap-10 pt-20 sm:pt-24 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:pt-28"
          >
            <div className="lg:sticky lg:top-28 lg:self-start">
              <SectionHeading
                eyebrow="FAQ"
                title="Everything you need to know"
                desc="Still unsure? Preview the full workflow before you buy any credits."
              />
            </div>

            <div className="space-y-3">
              {faqs.map((f, i) => {
                const open = openFaq === i;
                return (
                  <Reveal key={f.q} delay={i * 0.05}>
                    <div
                      className={cx(
                        "rounded-[20px] border transition-colors",
                        open
                          ? "border-violet-400/25 bg-violet-500/[0.05]"
                          : "border-white/[0.08] bg-white/[0.025] hover:border-white/15"
                      )}
                    >
                      <h3>
                        <button
                          type="button"
                          aria-expanded={open}
                          aria-controls={`faq-${i}`}
                          id={`faq-btn-${i}`}
                          onClick={() => setOpenFaq(open ? null : i)}
                          className="rp-focus flex w-full items-center justify-between gap-4 rounded-[20px] px-5 py-4 text-left text-[15px] font-semibold text-white/90 sm:px-6 sm:py-5"
                        >
                          {f.q}
                          <motion.span
                            animate={{ rotate: open ? 45 : 0 }}
                            transition={{ duration: 0.25 }}
                            className={cx(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors",
                              open
                                ? "border-violet-400/40 bg-violet-500/15 text-violet-100"
                                : "border-white/10 text-white/60"
                            )}
                          >
                            <Plus size={16} />
                          </motion.span>
                        </button>
                      </h3>
                      <AnimatePresence initial={false}>
                        {open && (
                          <motion.div
                            id={`faq-${i}`}
                            role="region"
                            aria-labelledby={`faq-btn-${i}`}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: EASE }}
                            className="overflow-hidden"
                          >
                            <p className="px-5 pb-5 text-sm leading-relaxed text-white/60 sm:px-6">
                              {f.a}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </section>

          {/* ================= Final CTA ================= */}
          <section ref={finalCtaRef} className="pt-20 sm:pt-24 lg:pt-28">
            <Reveal>
              <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-violet-600/25 via-indigo-600/10 to-sky-500/15 px-6 py-14 text-center sm:px-12 sm:py-20">
                <div className="rp-grid-bg pointer-events-none absolute inset-0 opacity-[0.08]" />
                <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[640px] max-w-full -translate-x-1/2 rounded-full bg-violet-500/30 blur-[90px]" />
                <div className="relative">
                  <h2 className="mx-auto max-w-2xl text-balance text-[clamp(28px,5vw,52px)] font-semibold leading-[1.04] tracking-[-0.02em]">
                    Your AI twin is one upload away
                  </h2>
                  <p className="mx-auto mt-4 max-w-lg text-[15px] text-white/65">
                    Train once, post forever. Start generating creator-grade
                    content today.
                  </p>
                  <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                    <button
                      onClick={start}
                      type="button"
                      className="rp-btn group h-14 px-8 text-[15px] font-semibold"
                    >
                      Start AI model generation
                      <ArrowRight
                        size={18}
                        className="transition-transform group-hover:translate-x-1"
                      />
                    </button>
                    <button
                      onClick={() => setPaywallOpen(true)}
                      type="button"
                      className="rp-ghost h-14 px-7 text-[14px] font-semibold"
                    >
                      <Zap size={16} />
                      Get credits
                    </button>
                  </div>
                </div>
              </div>
            </Reveal>
          </section>
        </main>

        {/* ================= Footer ================= */}
        <footer className="relative z-10 mx-auto mt-20 w-full max-w-7xl px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-6 md:pb-10">
          <div className="grid gap-10 border-t border-white/[0.07] pt-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="relative h-10 w-[150px]">
                <Image
                  src="/logo.png"
                  alt="Replotre"
                  fill
                  unoptimized
                  sizes="150px"
                  className="origin-left scale-[1.35] object-contain object-left"
                />
              </div>
              <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-white/50">
                Realistic AI influencers that look and act like you — trained in
                minutes, posting forever.
              </p>
            </div>

            <nav aria-label="Product" className="text-[13px]">
              <p className="font-semibold text-white/80">Product</p>
              <ul className="mt-4 space-y-2.5 text-white/50">
                {NAV_LINKS.filter((l) => l.id !== "top").map((l) => (
                  <li key={l.id}>
                    <a
                      href={`#${l.id}`}
                      className="rp-focus rounded transition hover:text-white"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="Account" className="text-[13px]">
              <p className="font-semibold text-white/80">Account</p>
              <ul className="mt-4 space-y-2.5 text-white/50">
                <li>
                  <Link
                    href={isAuthed ? "/workspace" : "/login"}
                    className="rp-focus rounded transition hover:text-white"
                  >
                    {isAuthed ? "Open workspace" : "Sign in"}
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setPaywallOpen(true)}
                    className="rp-focus rounded transition hover:text-white"
                  >
                    Get credits
                  </button>
                </li>
              </ul>
            </nav>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/[0.05] pt-6 text-[12px] text-white/40 sm:flex-row">
            <p>© {new Date().getFullYear()} Replotre. All rights reserved.</p>
            <button
              type="button"
              onClick={() => scrollToId("top")}
              className="rp-focus inline-flex items-center gap-1.5 rounded transition hover:text-white"
            >
              Back to top
              <ArrowRight size={13} className="-rotate-90" />
            </button>
          </div>
        </footer>

        {/* ================= Mobile sticky CTA ================= */}
        <AnimatePresence>
          {showStickyCta && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
            >
              <div className="mx-auto flex max-w-md items-center gap-2 rounded-[22px] border border-white/10 bg-[#0a0b1c]/85 p-2 shadow-[0_-10px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl">
                <button
                  onClick={() => setPaywallOpen(true)}
                  type="button"
                  className="rp-ghost h-12 w-12 shrink-0"
                  aria-label="Get credits"
                >
                  <Zap size={18} />
                </button>
                <button
                  onClick={start}
                  type="button"
                  className="rp-btn h-12 flex-1 text-[14px] font-semibold"
                >
                  Start AI model generation
                  <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <InfluencerBuilder open={builderOpen} onClose={closeBuilder} isAuthed={isAuthed} />

        <PaywallModal
          open={paywallOpen}
          onClose={closePaywall}
          onContinue={continueToBilling}
          packs={packs}
          selectedCredits={selectedCredits}
          setSelectedCredits={(c) => setSelectedCredits(c)}
          isAuthed={isAuthed}
          onLogin={goLogin}
        />
      </div>
    </MotionConfig>
  );
}
