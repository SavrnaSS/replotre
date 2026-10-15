"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  CalendarClock,
  ShieldCheck,
  Shuffle,
  BadgeCheck,
  BriefcaseBusiness,
  Camera,
  Check,
  Dumbbell,
  Film,
  Gamepad2,
  Instagram,
  Lock,
  Palette,
  PartyPopper,
  Pencil,
  Plane,
  Play,
  Shirt,
  Sparkles,
  UtensilsCrossed,
  Wand2,
  X,
  Youtube,
} from "lucide-react";

import { INFLUENCERS } from "@/app/data/influencers";
import { GoogleButton } from "@/app/components/auth/AuthShell";
import {
  saveBuilderDraft,
  type BuilderDraft,
  type BuilderFrequency,
  type BuilderNiche,
  type BuilderStyle,
} from "@/app/lib/builderDraft";
import OwnPhotos, { MIN_USABLE, type OwnPhotosSummary } from "@/app/components/landing/OwnPhotos";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const EASE = [0.22, 1, 0.36, 1] as const;

// The three looks featured on the homepage; the full catalog is in the studio.
const MODELS = INFLUENCERS.filter((m) => ["inf-1", "inf-2", "inf-3"].includes(m.id));

// Open on the middle look so the phone carousel shows a card on each side.
const DEFAULT_MODEL = MODELS[Math.floor(MODELS.length / 2)] ?? MODELS[0];

const NICHES: { k: BuilderNiche; label: string; icon: typeof Dumbbell }[] = [
  { k: "fashion", label: "Fashion & Beauty", icon: Shirt },
  { k: "fitness", label: "Fitness & Health", icon: Dumbbell },
  { k: "travel", label: "Travel & Lifestyle", icon: Plane },
  { k: "tech", label: "Gaming & Tech", icon: Gamepad2 },
  { k: "food", label: "Food & Cooking", icon: UtensilsCrossed },
  { k: "art", label: "Art & Creativity", icon: Palette },
  { k: "finance", label: "Business & Finance", icon: BriefcaseBusiness },
  { k: "other", label: "Something Else", icon: Wand2 },
];

const STYLES: { k: BuilderStyle; t: string; d: string }[] = [
  { k: "ultra", t: "Ultra Realistic", d: "Photoreal creator look" },
  { k: "stylized", t: "Stylized", d: "Creative art direction" },
  { k: "fantasy", t: "Fantasy", d: "Cinematic worlds" },
  { k: "anime", t: "Anime-inspired", d: "Clean illustrated vibe" },
];

const PLATFORMS: { k: keyof BuilderDraft["platforms"]; label: string; icon: typeof Film }[] = [
  { k: "instagram", label: "Instagram", icon: Instagram },
  { k: "tiktok", label: "TikTok", icon: Film },
  { k: "youtube", label: "YouTube", icon: Youtube },
];

const FREQS: { k: BuilderFrequency; t: string; d: string }[] = [
  { k: "daily", t: "Daily", d: "Fastest growth" },
  { k: "3x", t: "3–4× a week", d: "Balanced" },
  { k: "weekly", t: "Weekly", d: "Low effort" },
  { k: "occasionally", t: "Occasionally", d: "Just testing" },
];

const NICHE_IDEAS: Record<BuilderNiche, string> = {
  fashion: "outfit drops, get-ready-with-me, beauty routines",
  fitness: "workout clips, progress check-ins, healthy meals",
  travel: "city guides, hotel tours, golden-hour moments",
  tech: "setup tours, gameplay reactions, gadget first looks",
  food: "recipe reels, restaurant visits, kitchen vlogs",
  art: "studio process, finished pieces, creative challenges",
  finance: "money tips, day-in-the-life, founder stories",
  other: "anything you can describe — you set the brief",
};

const PLATFORM_TILE: Record<keyof BuilderDraft["platforms"], string> = {
  instagram: "bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white",
  tiktok: "bg-black text-white ring-1 ring-white/15",
  youtube: "bg-[#ff0033] text-white",
};

const PLATFORM_HINT: Record<keyof BuilderDraft["platforms"], string> = {
  instagram: "Reels, posts & stories",
  tiktok: "Short-form video",
  youtube: "Shorts & long-form",
};

// 1 = posting day, 0.5 = flexible, 0 = off (Mon → Sun)
const FREQ_WEEK: Record<BuilderFrequency, number[]> = {
  daily: [1, 1, 1, 1, 1, 1, 1],
  "3x": [1, 0, 1, 0, 1, 0, 1],
  weekly: [0, 0, 0, 0, 1, 0, 0],
  occasionally: [0, 0, 0.5, 0, 0, 0.5, 0],
};
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

const POSTS_PER_MONTH: Record<BuilderFrequency, string> = {
  daily: "30",
  "3x": "15",
  weekly: "4",
  occasionally: "2",
};

const NAME_IDEAS = [
  "Ava Reyes",
  "Nova Skye",
  "Luna Hart",
  "Mila Cruz",
  "Zara Bloom",
  "Ivy Lane",
  "Sienna Vale",
  "Kai Monroe",
];

/** Arrow keys move the selection inside a radio group (roving focus). */
function onRadioKeys(e: React.KeyboardEvent<HTMLElement>) {
  const forward = e.key === "ArrowRight" || e.key === "ArrowDown";
  const back = e.key === "ArrowLeft" || e.key === "ArrowUp";
  if (!forward && !back) return;
  const radios = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]'));
  const i = radios.indexOf(document.activeElement as HTMLElement);
  if (i < 0) return;
  e.preventDefault();
  const target = radios[(i + (forward ? 1 : -1) + radios.length) % radios.length];
  target.click();
  target.focus();
}

const STEPS = [
  { short: "Model", title: "Choose your base model", desc: "Start from a photoreal look — you can switch any time." },
  { short: "Persona", title: "Shape the persona", desc: "Give your influencer a name, a niche and a visual style." },
  { short: "Strategy", title: "Plan the growth", desc: "Where it posts, how often, and what it creates." },
  { short: "Launch", title: "Ready to launch", desc: "Save your influencer to start generating." },
];

const LAST = STEPS.length - 1;

/* ---------- image helper ---------- */

/** next/image for site assets; a plain <img> for the visitor's own photos (blob: URLs). */
function Pic({
  src,
  alt,
  sizes,
  className,
  style,
}: {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (src.startsWith("blob:")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={cx("absolute inset-0 h-full w-full", className)} style={style} />
    );
  }
  return <Image src={src} alt={alt} fill sizes={sizes} className={className} style={style} />;
}

/* ---------- live preview ---------- */

// Approximate look of each visual style, applied to the preview imagery only.
const STYLE_FILTER: Record<BuilderStyle, string> = {
  ultra: "none",
  stylized: "saturate(1.35) contrast(1.08)",
  fantasy: "hue-rotate(-28deg) saturate(1.45) brightness(0.95)",
  anime: "saturate(1.7) contrast(1.22) brightness(1.04)",
};
const STYLE_TINT: Record<BuilderStyle, string> = {
  ultra: "from-transparent to-transparent",
  stylized: "from-amber-400/10 to-rose-500/10",
  fantasy: "from-violet-600/25 to-sky-500/15",
  anime: "from-pink-400/15 to-sky-300/10",
};
const POSTS_PER_WEEK: Record<BuilderFrequency, string> = {
  daily: "7",
  "3x": "3–4",
  weekly: "1",
  occasionally: "Flex",
};
// Different crops of the same look stand in for a varied feed.
const FEED_CROPS = [
  { pos: "50% 18%", scale: 1.5 },
  { pos: "50% 55%", scale: 1.15 },
  { pos: "35% 80%", scale: 1.6 },
  { pos: "65% 35%", scale: 1.35 },
  { pos: "50% 95%", scale: 1.25 },
  { pos: "25% 25%", scale: 1.7 },
];

function handleOf(name: string) {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s.]/g, "")
    .trim()
    .replace(/\s+/g, ".");
  return slug || "your.ai";
}

function PreviewCard({
  draft,
  compact,
  photo,
  fallbackName,
  feed,
}: {
  draft: BuilderDraft;
  compact?: boolean;
  /** Visitor's own cover photo (custom mode). */
  photo?: string | null;
  fallbackName?: string;
  /** Visitor's own photos for the feed grid (custom mode). */
  feed?: string[];
}) {
  const model = MODELS.find((m) => m.id === draft.influencerId) ?? MODELS[0];
  const niche = NICHES.find((n) => n.k === draft.niche);
  const style = STYLES.find((s) => s.k === draft.visualStyle);
  const name = draft.aiName.trim() || fallbackName || model.name;
  const src = photo || model.src;
  const filter = STYLE_FILTER[draft.visualStyle];

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <span className="relative h-11 w-11 shrink-0 rounded-full bg-gradient-to-tr from-[#6d5dfc] via-fuchsia-400 to-[#6aa7ff] p-[2px]">
          <span className="relative block h-full w-full overflow-hidden rounded-full border-2 border-[#0b0c1d]">
            <Pic src={src} alt="" sizes="44px" className="object-cover" style={{ filter }} />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 truncate text-sm font-semibold">
            <span className="truncate">{name}</span>
            <BadgeCheck size={14} className="shrink-0 text-sky-300" />
          </p>
          <p className="truncate text-[12px] text-white/50">
            {niche?.label} · {style?.t}
          </p>
        </div>
      </div>
    );
  }

  const NicheIcon = niche?.icon ?? Sparkles;
  const activePlatforms = PLATFORMS.filter((p) => draft.platforms[p.k]);
  const formats = [draft.contentTypes.photos && "Photos", draft.contentTypes.videos && "Video"].filter(
    (f): f is string => Boolean(f)
  );
  // with both formats, every third tile is a reel; video-only makes all tiles reels
  const isReel = (i: number) =>
    draft.contentTypes.videos && (!draft.contentTypes.photos || i % 3 === 1);

  return (
    <div className="overflow-hidden rounded-[26px] border border-white/10 bg-[#0b0c1d] shadow-[0_30px_100px_rgba(0,0,0,0.6)]">
      {/* cover */}
      <div className="relative h-24 overflow-hidden">
        <Pic
          src={src}
          alt=""
          sizes="380px"
          className="scale-150 object-cover object-[50%_30%] opacity-70 blur-xl"
          style={{ filter }}
        />
        <div className={cx("absolute inset-0 bg-gradient-to-br", STYLE_TINT[draft.visualStyle])} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c1d] via-[#0b0c1d]/40 to-transparent" />
        <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/85 backdrop-blur-md">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 motion-reduce:animate-none" />
          Live preview
        </span>
      </div>

      {/* identity */}
      <div className="relative -mt-10 px-4">
        <div className="flex items-end justify-between gap-3">
          <span className="relative h-[76px] w-[76px] shrink-0 rounded-full bg-gradient-to-tr from-[#6d5dfc] via-fuchsia-400 to-[#6aa7ff] p-[3px] shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
            <span className="relative block h-full w-full overflow-hidden rounded-full border-[3px] border-[#0b0c1d]">
              <AnimatePresence initial={false}>
                <motion.span
                  key={src}
                  className="absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <Pic src={src} alt="" sizes="76px" className="object-cover object-top" style={{ filter }} />
                </motion.span>
              </AnimatePresence>
            </span>
          </span>
          <span className="mb-1 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-semibold text-black">Follow</span>
        </div>

        <p className="mt-3 flex items-center gap-1.5 text-[17px] font-semibold leading-tight">
          <span className="truncate">{name}</span>
          <BadgeCheck size={16} className="shrink-0 text-sky-300" aria-label="Verified" />
        </p>
        <p className="truncate text-[12px] text-white/45">@{handleOf(name)} · AI influencer</p>
        <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-white/75">
          <NicheIcon size={13} className="shrink-0 text-sky-300" />
          <span className="truncate">
            {niche?.label} · {style?.t}
          </span>
        </p>

        {/* stats */}
        <dl className="mt-3 grid grid-cols-3 divide-x divide-white/[0.07] rounded-2xl border border-white/[0.07] bg-white/[0.03] text-center">
          <div className="px-2 py-2">
            <dd className="text-[15px] font-semibold tabular-nums">{POSTS_PER_WEEK[draft.frequency]}</dd>
            <dt className="text-[10px] text-white/45">posts / week</dt>
          </div>
          <div className="px-2 py-2">
            <dd className="flex h-[22px] items-center justify-center gap-1.5 text-white/85">
              {activePlatforms.length ? (
                activePlatforms.map(({ k, icon: Icon, label }) => <Icon key={k} size={14} aria-label={label} />)
              ) : (
                <span className="text-white/35">—</span>
              )}
            </dd>
            <dt className="text-[10px] text-white/45">platforms</dt>
          </div>
          <div className="px-2 py-2">
            <dd className="flex h-[22px] items-center justify-center gap-1.5 text-white/85">
              {draft.contentTypes.photos && <Camera size={14} aria-label="Photos" />}
              {draft.contentTypes.videos && <Film size={14} aria-label="Video" />}
              {!formats.length && <span className="text-white/35">—</span>}
            </dd>
            <dt className="truncate text-[10px] text-white/45">
              {formats.length === 2 ? "photo + video" : formats[0]?.toLowerCase() || "formats"}
            </dt>
          </div>
        </dl>
      </div>

      {/* feed */}
      <div className="mt-3 grid grid-cols-3 gap-0.5" aria-label="Feed preview">
        {FEED_CROPS.map((crop, i) => {
          const own = feed && feed.length ? feed[i % feed.length] : null;
          const c = own ? { pos: "50% 30%", scale: 1 } : crop;
          const tileSrc = own ?? src;
          return (
          <div key={i} className="relative aspect-square overflow-hidden bg-white/[0.04]">
            <AnimatePresence initial={false}>
              <motion.div
                key={`${tileSrc}-${i}`}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, delay: i * 0.04 }}
              >
                <Pic
                  src={tileSrc}
                  alt=""
                  sizes="130px"
                  className="object-cover transition-[filter] duration-500"
                  style={{ objectPosition: c.pos, transform: `scale(${c.scale})`, filter }}
                />
              </motion.div>
            </AnimatePresence>
            <div className={cx("absolute inset-0 bg-gradient-to-br", STYLE_TINT[draft.visualStyle])} />
            {isReel(i) && (
              <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm">
                <Play size={10} fill="currentColor" className="ml-px" />
              </span>
            )}
          </div>
        );
        })}
      </div>
    </div>
  );
}

/* ---------- builder ---------- */

export default function InfluencerBuilder({
  open,
  onClose,
  isAuthed,
}: {
  open: boolean;
  onClose: () => void;
  isAuthed: boolean;
}) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [nameEdited, setNameEdited] = useState(false);
  // "market": a ready-made look · "custom": the visitor's own photos
  const [source, setSource] = useState<"market" | "custom">("market");
  const [own, setOwn] = useState<OwnPhotosSummary>({
    total: 0,
    usable: 0,
    checking: 0,
    coverUrl: null,
    feedUrls: [],
  });
  const onOwnChange = useCallback((sum: OwnPhotosSummary) => setOwn(sum), []);
  const [leaving, setLeaving] = useState<null | "google" | "signup" | "login" | "studio">(null);
  const [draft, setDraft] = useState<BuilderDraft>({
    influencerId: DEFAULT_MODEL?.id ?? "inf-1",
    aiName: DEFAULT_MODEL?.name ?? "",
    niche: "fashion",
    visualStyle: "ultra",
    platforms: { instagram: true, tiktok: true, youtube: false },
    frequency: "daily",
    contentTypes: { photos: true, videos: true },
  });

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const carouselRaf = useRef(0);
  const nextRef = useRef<() => void>(() => {});

  const update = (patch: Partial<BuilderDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const selectModel = (id: string) => {
    const m = MODELS.find((x) => x.id === id);
    // keep a custom name; otherwise follow the selected model's name
    update(nameEdited || !m ? { influencerId: id } : { influencerId: id, aiName: m.name });
  };

  const stepError = useMemo(() => {
    if (step === 0 && source === "custom") {
      if (own.usable < MIN_USABLE) {
        const more = MIN_USABLE - own.usable;
        return own.checking > 0
          ? `Checking photos… ${own.usable}/${MIN_USABLE} usable so far.`
          : `Add ${more} more usable photo${more > 1 ? "s" : ""} — or pick a ready-made look.`;
      }
    }
    if (step === 1 && !draft.aiName.trim()) return "Give your influencer a name.";
    if (step === 2 && !Object.values(draft.platforms).some(Boolean)) return "Pick at least one platform.";
    if (step === 2 && !Object.values(draft.contentTypes).some(Boolean)) return "Pick photos, video, or both.";
    return "";
  }, [step, draft, source, own]);

  const go = (to: number) => {
    setDir(to > step ? 1 : -1);
    setStep(Math.max(0, Math.min(LAST, to)));
    bodyRef.current?.scrollTo({ top: 0 });
  };
  const next = () => {
    if (!stepError && step < LAST) go(step + 1);
  };
  nextRef.current = next;

  // Cover-flow depth follows the scroll position continuously, so cards tilt,
  // shrink and dim in step with the finger instead of jumping when a card snaps.
  const reduceMotion = useReducedMotion();
  const applyCoverFlow = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    Array.from(el.children).forEach((c) => {
      const ch = c as HTMLElement;
      const span = ch.clientWidth + 8; // card + gap
      const offset = (ch.offsetLeft + ch.clientWidth / 2 - center) / span; // -1…1 around centre
      const t = Math.min(1, Math.abs(offset));
      const rotate = reduceMotion ? 0 : Math.max(-1, Math.min(1, offset)) * -18;
      ch.style.transformOrigin = offset < 0 ? "right center" : "left center";
      ch.style.transform = `rotateY(${rotate.toFixed(2)}deg) scale(${(1 - 0.14 * t).toFixed(4)})`;
      ch.style.opacity = (1 - 0.45 * t).toFixed(3);
      ch.style.setProperty("--dim", (0.35 * t).toFixed(3));
      // 1 when centred → 0 half a card away; drives the ring, tick and zoom
      const sel = Math.max(0, 1 - Math.abs(offset) * 2);
      ch.style.setProperty("--sel", (sel > 0.97 ? 1 : sel).toFixed(3)); // snap sub-pixel rest to full
    });
  }, [reduceMotion]);

  // A selection change re-renders the cards and resets --sel to 0/1; restore the
  // scroll-accurate values before paint so there's no one-frame flicker mid-swipe.
  useLayoutEffect(() => {
    if (step === 0 && source === "market") applyCoverFlow();
  }, [draft.influencerId, step, source, applyCoverFlow]);

  // Phone carousel: the card snapped to the centre is the selection.
  const onCarouselScroll = () => {
    if (carouselRaf.current) return;
    carouselRaf.current = requestAnimationFrame(() => {
      carouselRaf.current = 0;
      applyCoverFlow();
      const el = carouselRef.current;
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
      const id = MODELS[best]?.id;
      if (id && id !== draft.influencerId) selectModel(id);
    });
  };
  const centerModel = (id: string, smooth = true) => {
    const el = carouselRef.current;
    const idx = MODELS.findIndex((m) => m.id === id);
    const child = el?.children.item(idx) as HTMLElement | null;
    if (!el || !child) return;
    el.scrollTo({
      left: child.offsetLeft - (el.clientWidth - child.clientWidth) / 2,
      behavior: smooth ? "smooth" : "auto",
    });
  };

  // Arrow keys move the selection (radio-group behaviour) on the model grid.
  const onModelKeys = (e: React.KeyboardEvent) => {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const i = MODELS.findIndex((m) => m.id === draft.influencerId);
    const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
    const nextModel = MODELS[(i + delta + MODELS.length) % MODELS.length];
    selectModel(nextModel.id);
    centerModel(nextModel.id);
    (e.currentTarget.querySelector(`[data-model="${nextModel.id}"]`) as HTMLElement | null)?.focus();
  };

  // Keep the selected card centred when the builder opens on step 1.
  useEffect(() => {
    if (!open || step !== 0 || source !== "market") return;
    const t = window.setTimeout(() => {
      centerModel(draft.influencerId, false);
      applyCoverFlow();
    }, 60);
    window.addEventListener("resize", applyCoverFlow);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", applyCoverFlow);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step, source, applyCoverFlow]);

  // scroll lock, Escape, focus trap
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    const prevFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // Enter continues, unless a control that handles Enter itself has focus
      if (e.key === "Enter" && !e.isComposing) {
        const t = e.target as HTMLElement | null;
        const tag = t?.tagName;
        if (tag !== "BUTTON" && tag !== "A" && tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          nextRef.current();
        }
      }
      if (e.key === "Tab" && dialogRef.current) {
        const f = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]):not([tabindex="-1"]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
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
    const t = window.setTimeout(() => dialogRef.current?.focus(), 30);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
      prevFocus?.focus?.();
    };
  }, [open, onClose]);

  const finish = (via: NonNullable<typeof leaving>) => {
    setLeaving(via);
    saveBuilderDraft({
      ...draft,
      aiName: draft.aiName.trim(),
      method: source,
      photoCount: source === "custom" ? own.usable : 0,
    });
    const href =
      via === "google" ? "/api/auth/google" : via === "signup" ? "/signup" : via === "login" ? "/login" : "/workspace";
    window.location.href = href;
  };

  const model = MODELS.find((m) => m.id === draft.influencerId) ?? MODELS[0];
  const isCustom = source === "custom" && Boolean(own.coverUrl);
  const photoSrc = isCustom && own.coverUrl ? own.coverUrl : model.src;
  const fallbackName = source === "custom" ? "Your AI" : model?.name;
  const displayName = draft.aiName.trim() || fallbackName || "Your AI";

  const chooseSource = (next: "market" | "custom") => {
    setSource(next);
    // a custom model shouldn't inherit a ready-made look's name
    if (!nameEdited) update({ aiName: next === "custom" ? "" : model?.name ?? "" });
  };

  const nameIdea = useRef(0);
  const suggestName = () => {
    let idea = NAME_IDEAS[nameIdea.current % NAME_IDEAS.length];
    if (idea === draft.aiName.trim()) idea = NAME_IDEAS[++nameIdea.current % NAME_IDEAS.length];
    nameIdea.current++;
    setNameEdited(true);
    update({ aiName: idea });
  };

  const listNames = (names: string[]) =>
    names.length <= 1 ? names[0] ?? "" : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  const platformNames = listNames(PLATFORMS.filter((p) => draft.platforms[p.k]).map((p) => p.label));
  const formatNames = listNames(
    [draft.contentTypes.photos && "photos", draft.contentTypes.videos && "video"].filter(
      (f): f is string => Boolean(f)
    )
  );

  const recap = [
    {
      label: "Model",
      value: source === "custom" ? "Your own photos" : model?.name ?? "—",
      detail: source === "custom" ? `${own.usable} usable photos · custom model` : model?.subtitle ?? "",
      icon: Camera,
      to: 0,
    },
    {
      label: "Persona",
      value: displayName,
      detail: `${NICHES.find((n) => n.k === draft.niche)?.label} · ${STYLES.find((x) => x.k === draft.visualStyle)?.t}`,
      icon: Sparkles,
      to: 1,
    },
    {
      label: "Strategy",
      value: `${FREQS.find((f) => f.k === draft.frequency)?.t} · ≈ ${POSTS_PER_MONTH[draft.frequency]} posts a month`,
      detail: [platformNames || "No platforms yet", formatNames].filter(Boolean).join(" · "),
      icon: CalendarClock,
      to: 2,
    },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[65]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />

          <div className="pointer-events-none absolute inset-0 flex justify-center sm:items-center sm:p-6">
            <motion.div
              ref={dialogRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby="builder-title"
              initial={{ opacity: 0, y: 40, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.98 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="pointer-events-auto relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#08091a] outline-none sm:h-auto sm:max-h-[min(860px,92dvh)] sm:max-w-2xl sm:rounded-[28px] sm:border sm:border-white/10 sm:shadow-[0_40px_140px_rgba(0,0,0,0.8)] lg:grid lg:max-w-5xl lg:grid-cols-[minmax(0,1fr)_380px]"
            >
              {/* ================= main column ================= */}
              <div className="flex min-h-0 flex-1 flex-col lg:max-h-[min(860px,92dvh)]">
                {/* header */}
                <div className="shrink-0 border-b border-white/[0.07] px-4 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 sm:pt-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="flex min-w-0 items-center gap-2 text-[12.5px] text-white/50">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/10 bg-gradient-to-br from-violet-500/30 to-sky-500/20">
                        <Sparkles size={13} className="text-violet-100" />
                      </span>
                      <span className="truncate font-medium text-white/85">Build your AI influencer</span>
                      <span className="hidden shrink-0 sm:inline">· about a minute</span>
                    </p>
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="Close builder"
                      className="rp-ghost h-10 w-10 shrink-0"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <p className="sr-only" aria-live="polite">
                    Step {step + 1} of {STEPS.length}: {STEPS[step].short}
                  </p>
                  {/* stepper: completed steps are clickable */}
                  <ol className="mt-4 flex items-center" aria-label="Progress">
                    {STEPS.map((s, i) => {
                      const done = i < step;
                      const current = i === step;
                      return (
                        <li key={s.short} className={cx("flex items-center", i < LAST && "flex-1")}>
                          <button
                            type="button"
                            disabled={i > step}
                            onClick={() => go(i)}
                            aria-current={current ? "step" : undefined}
                            aria-label={`${s.short}${done ? " (done)" : ""}`}
                            className="rp-focus group flex items-center gap-2 rounded-full disabled:cursor-default"
                          >
                            <span
                              className={cx(
                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[12px] font-semibold transition-all duration-300",
                                done
                                  ? "border-transparent bg-gradient-to-br from-[#6d5dfc] to-[#6aa7ff] text-white group-hover:brightness-110"
                                  : current
                                    ? "border-violet-400/70 bg-violet-500/15 text-white shadow-[0_0_0_4px_rgba(109,93,252,0.16)]"
                                    : "border-white/15 text-white/35"
                              )}
                            >
                              {done ? <Check size={14} strokeWidth={3} /> : i + 1}
                            </span>
                            <span
                              className={cx(
                                "whitespace-nowrap text-[13px] font-medium transition-colors",
                                current ? "text-white" : done ? "text-white/55 group-hover:text-white/85" : "text-white/30",
                                current ? "inline" : "hidden md:inline"
                              )}
                            >
                              {s.short}
                            </span>
                          </button>
                          {i < LAST && (
                            <span className="mx-2 h-px min-w-3 flex-1 overflow-hidden rounded bg-white/10 sm:mx-3">
                              <motion.span
                                className="block h-full bg-gradient-to-r from-[#6d5dfc] to-[#6aa7ff]"
                                initial={false}
                                animate={{ width: done ? "100%" : "0%" }}
                                transition={{ duration: 0.45, ease: EASE }}
                              />
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </div>

                {/* compact live preview (below lg) */}
                {step > 0 && step < LAST && (
                  <div className="shrink-0 border-b border-white/[0.07] bg-white/[0.02] px-4 py-3 sm:px-6 lg:hidden">
                    <PreviewCard draft={draft} compact photo={isCustom ? photoSrc : null} fallbackName={fallbackName} feed={isCustom ? own.feedUrls : undefined} />
                  </div>
                )}

                {/* body */}
                <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-6">
                  <AnimatePresence mode="wait" initial={false} custom={dir}>
                    <motion.div
                      key={step}
                      custom={dir}
                      initial={{ opacity: 0, x: dir * 28 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: dir * -28 }}
                      transition={{ duration: 0.28, ease: EASE }}
                    >
                      <h2 id="builder-title" className="text-[22px] font-semibold tracking-tight sm:text-[26px]">
                        {step === LAST ? `${displayName} is ready to launch` : STEPS[step].title}
                      </h2>
                      <p className="mt-1 text-[14px] text-white/55">{STEPS[step].desc}</p>

                      <div className="mt-5">
                        {/* -------- step 1: model -------- */}
                        {step === 0 && (
                          <>
                            {/* source switch */}
                            <div
                              role="tablist"
                              aria-label="Start from"
                              className="mb-4 grid grid-cols-2 gap-1 rounded-2xl border border-white/[0.08] bg-black/30 p-1 sm:mb-5"
                            >
                              {(
                                [
                                  ["market", "Ready-made look", Sparkles],
                                  ["custom", "My own photos", Camera],
                                ] as const
                              ).map(([k, label, Icon]) => {
                                const active = source === k;
                                return (
                                  <button
                                    key={k}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => chooseSource(k)}
                                    className={cx(
                                      "rp-focus relative flex h-10 items-center justify-center gap-2 rounded-xl text-[12.5px] font-semibold transition-colors sm:h-11 sm:text-[13px]",
                                      active ? "text-white" : "text-white/50 hover:text-white/80"
                                    )}
                                  >
                                    {active && (
                                      <motion.span
                                        layoutId="builder-source-pill"
                                        className="absolute inset-0 rounded-xl border border-white/10 bg-white/[0.09]"
                                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                                      />
                                    )}
                                    <Icon size={15} className="relative" />
                                    <span className="relative">{label}</span>
                                    {k === "custom" && own.total > 0 && (
                                      <span className="relative rounded-full bg-white/15 px-1.5 text-[10.5px] tabular-nums">
                                        {own.usable}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            {source === "custom" ? (
                              <>
                                <OwnPhotos onChange={onOwnChange} />
                                <button
                                  type="button"
                                  onClick={() => chooseSource("market")}
                                  className="rp-focus mt-4 inline-flex items-center gap-1.5 rounded text-[12.5px] text-white/50 transition hover:text-white"
                                >
                                  <ArrowLeft size={13} />
                                  Prefer a ready-made look?
                                </button>
                              </>
                            ) : (
                              <>
                            {(() => {
                              const idx = Math.max(0, MODELS.findIndex((m) => m.id === draft.influencerId));
                              const pick = (i: number) => {
                                const target = MODELS[(i + MODELS.length) % MODELS.length];
                                selectModel(target.id);
                                centerModel(target.id);
                              };
                              // card width also follows viewport height so short phones keep Continue in view
                              // phones only (sm:hidden) and the builder is full-screen there, so the scroller
                              // spans 100vw — size cards and side padding against the same width to centre exactly.
                              const CARD_W = "min(70vw,280px,36dvh)";
                              return (
                                <div
                                  role="radiogroup"
                                  aria-label="Base model"
                                  onKeyDown={onModelKeys}
                                  className="relative sm:hidden"
                                >
                                  {/* static glow behind the centre slot — never clipped by the scroller */}
                                  <div
                                    aria-hidden
                                    className="pointer-events-none absolute left-1/2 top-[44%] h-[72%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-[48px] bg-gradient-to-b from-violet-600/40 to-sky-500/25 blur-[44px]"
                                  />

                                  {/* swipe: the centred card is the selection (cover-flow depth on neighbours) */}
                                  <div
                                    ref={carouselRef}
                                    onScroll={onCarouselScroll}
                                    className="rp-noscrollbar relative -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain py-2 [perspective:900px]"
                                    style={{ paddingInline: `calc((100vw - ${CARD_W}) / 2)` }}
                                  >
                                    {MODELS.map((m, i) => {
                                      const active = i === idx;
                                      return (
                                        <button
                                          key={m.id}
                                          data-model={m.id}
                                          type="button"
                                          role="radio"
                                          aria-checked={active}
                                          aria-label={`${m.name}, ${m.subtitle}`}
                                          tabIndex={active ? 0 : -1}
                                          onClick={() => pick(i)}
                                          // --sel is rewritten every frame by applyCoverFlow; the initial value
                                          // matches the selection so the first paint is already right.
                                          style={{ width: CARD_W, ["--sel" as string]: active ? 1 : 0 } as React.CSSProperties}
                                          className="rp-focus relative shrink-0 snap-center overflow-hidden rounded-[26px] text-left will-change-transform [backface-visibility:hidden]"
                                        >
                                          <span className="relative block aspect-[4/5]">
                                            <Image
                                              src={m.src}
                                              alt=""
                                              fill
                                              sizes="(max-width: 640px) 70vw, 280px"
                                              className="object-cover"
                                              style={{ transform: "scale(calc(1 + 0.04 * var(--sel, 0)))" }}
                                            />
                                            <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/20" />
                                            <span
                                              aria-hidden
                                              className="absolute inset-0 bg-[#08091a]"
                                              style={{ opacity: "var(--dim, 0)" }}
                                            />
                                          </span>
                                          <span className="absolute inset-x-3.5 bottom-3.5 drop-shadow">
                                            <span className="block truncate text-[17px] font-semibold">{m.name}</span>
                                            <span className="mt-1.5 flex flex-wrap gap-1">
                                              {m.subtitle.split("•").map((tag) => (
                                                <span
                                                  key={tag}
                                                  className="rounded-full border border-white/15 bg-black/35 px-2 py-0.5 text-[10.5px] text-white/80 backdrop-blur-sm"
                                                >
                                                  {tag.trim()}
                                                </span>
                                              ))}
                                            </span>
                                          </span>
                                          {/* check badge: gradient + tick fade in with --sel */}
                                          <span
                                            aria-hidden
                                            className="absolute right-3 top-3 grid h-7 w-7 place-items-center overflow-hidden rounded-full border border-white/40 bg-black/30"
                                          >
                                            <span
                                              className="absolute inset-0 bg-gradient-to-br from-[#6d5dfc] to-[#6aa7ff]"
                                              style={{ opacity: "var(--sel, 0)" }}
                                            />
                                            <Check
                                              size={14}
                                              strokeWidth={3}
                                              className="relative"
                                              style={{ opacity: "var(--sel, 0)", transform: "scale(calc(0.6 + 0.4 * var(--sel, 0)))" }}
                                            />
                                          </span>
                                          {/* rings: faint base + violet selection ring that fades in with --sel */}
                                          <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[26px] ring-1 ring-inset ring-white/10" />
                                          <span
                                            aria-hidden
                                            className="pointer-events-none absolute inset-0 rounded-[26px] ring-2 ring-inset ring-violet-400/90"
                                            style={{ opacity: "var(--sel, 0)" }}
                                          />
                                        </button>
                                      );
                                    })}
                                  </div>

                                  {/* compact control pill: prev · dots · next */}
                                  <div className="relative mx-auto mt-3 flex w-fit items-center gap-0.5 rounded-full border border-white/[0.08] bg-white/[0.04] p-1 backdrop-blur-md">
                                    <button
                                      type="button"
                                      onClick={() => pick(idx - 1)}
                                      aria-label="Previous model"
                                      tabIndex={-1}
                                      className="grid h-9 w-9 place-items-center rounded-full text-white/70 transition active:bg-white/10"
                                    >
                                      <ArrowLeft size={16} />
                                    </button>
                                    <div className="flex items-center px-1" aria-hidden>
                                      {MODELS.map((m, i) => (
                                        <button
                                          key={m.id}
                                          type="button"
                                          tabIndex={-1}
                                          onClick={() => pick(i)}
                                          className="flex h-9 items-center px-1"
                                        >
                                          <span
                                            className={cx(
                                              "block h-1.5 rounded-full transition-all duration-300",
                                              i === idx
                                                ? "w-6 bg-gradient-to-r from-[#6d5dfc] to-[#6aa7ff]"
                                                : "w-1.5 bg-white/25"
                                            )}
                                          />
                                        </button>
                                      ))}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => pick(idx + 1)}
                                      aria-label="Next model"
                                      tabIndex={-1}
                                      className="grid h-9 w-9 place-items-center rounded-full text-white/70 transition active:bg-white/10"
                                    >
                                      <ArrowRight size={16} />
                                    </button>
                                  </div>
                                  <p className="relative mt-2 text-center text-[11.5px] text-white/35">
                                    Swipe to explore · {idx + 1} of {MODELS.length}
                                  </p>
                                </div>
                              );
                            })()}

                            {/* tablet + desktop: grid (pt leaves room for the lifted selection) */}
                            <div
                              role="radiogroup"
                              aria-label="Base model"
                              onKeyDown={onModelKeys}
                              className="-mt-1 hidden grid-cols-3 gap-3 pt-2 sm:grid"
                            >
                              {MODELS.map((m) => {
                                const active = m.id === draft.influencerId;
                                return (
                                  <button
                                    key={m.id}
                                    data-model={m.id}
                                    type="button"
                                    role="radio"
                                    aria-checked={active}
                                    tabIndex={active ? 0 : -1}
                                    onClick={() => selectModel(m.id)}
                                    className={cx(
                                      "rp-focus group relative overflow-hidden rounded-[22px] border text-left transition duration-300",
                                      active
                                        ? "-translate-y-1 border-violet-400/70 shadow-[0_0_0_2px_rgba(139,124,255,0.35),0_24px_60px_rgba(109,93,252,0.28)]"
                                        : "border-white/10 hover:-translate-y-0.5 hover:border-white/25"
                                    )}
                                  >
                                    <span className="relative block aspect-[3/4]">
                                      <Image
                                        src={m.src}
                                        alt=""
                                        fill
                                        sizes="(min-width: 1024px) 190px, 30vw"
                                        className={cx(
                                          "object-cover transition duration-500",
                                          active ? "scale-[1.04]" : "saturate-[0.85] group-hover:scale-[1.04] group-hover:saturate-100"
                                        )}
                                      />
                                      <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                                    </span>
                                    <span className="absolute inset-x-3 bottom-3">
                                      <span className="block truncate text-[14px] font-semibold">{m.name}</span>
                                      <span className="block truncate text-[11.5px] text-white/55">{m.subtitle}</span>
                                    </span>
                                    <span
                                      aria-hidden
                                      className={cx(
                                        "absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full border transition",
                                        active
                                          ? "border-transparent bg-gradient-to-br from-[#6d5dfc] to-[#6aa7ff]"
                                          : "border-white/40 bg-black/30"
                                      )}
                                    >
                                      {active && <Check size={13} strokeWidth={3} />}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>

                            <button
                              type="button"
                              onClick={() => chooseSource("custom")}
                              className="rp-focus group mt-5 flex w-full items-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-3.5 text-left transition hover:border-violet-400/40 hover:bg-violet-500/[0.06]"
                            >
                              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500/25 to-sky-500/15">
                                <Camera size={17} className="text-sky-200" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-[13.5px] font-semibold text-white/90">Use your own face</span>
                                <span className="block text-[12px] leading-snug text-white/50">
                                  Add 20–40 photos — we check each one instantly, right in your browser.
                                </span>
                              </span>
                              <ArrowRight size={16} className="shrink-0 text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white" />
                            </button>
                              </>
                            )}
                          </>
                        )}

                        {/* -------- step 2: persona -------- */}
                        {step === 1 && (
                          <div className="space-y-7">
                            {/* name */}
                            <div>
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <label htmlFor="builder-name" className="rp-label">
                                  Influencer name
                                </label>
                                <span className="text-[11px] tabular-nums text-white/35">
                                  {draft.aiName.length}/40
                                </span>
                              </div>
                              <div className="relative">
                                <input
                                  id="builder-name"
                                  value={draft.aiName}
                                  maxLength={40}
                                  onChange={(e) => {
                                    setNameEdited(true);
                                    update({ aiName: e.target.value });
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      next();
                                    }
                                  }}
                                  placeholder="e.g. Ava Reyes"
                                  autoComplete="off"
                                  aria-invalid={stepError ? true : undefined}
                                  aria-describedby="builder-handle"
                                  className="rp-input pr-[7.5rem]"
                                />
                                <button
                                  type="button"
                                  onClick={suggestName}
                                  className="rp-focus absolute right-1.5 top-1/2 flex h-9 -translate-y-1/2 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] px-3 text-[12px] font-medium text-white/75 transition hover:bg-white/[0.12] hover:text-white"
                                >
                                  <Shuffle size={13} />
                                  Suggest
                                </button>
                              </div>
                              <p
                                id="builder-handle"
                                className="mt-2 flex items-center gap-1 text-[12px] text-white/45"
                              >
                                <AtSign size={12} className="shrink-0 text-violet-300/80" />
                                <span className="truncate font-medium text-white/70">
                                  {handleOf(displayName)}
                                </span>
                                <span className="shrink-0 text-white/30">· your handle</span>
                              </p>
                            </div>

                            {/* niche */}
                            <fieldset>
                              <legend className="rp-label mb-2.5">Niche</legend>
                              <div
                                role="radiogroup"
                                aria-label="Niche"
                                onKeyDown={onRadioKeys}
                                className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                              >
                                {NICHES.map(({ k, label, icon: Icon }) => {
                                  const active = draft.niche === k;
                                  return (
                                    <button
                                      key={k}
                                      type="button"
                                      role="radio"
                                      aria-checked={active}
                                      tabIndex={active ? 0 : -1}
                                      onClick={() => update({ niche: k })}
                                      className={cx(
                                        "rp-focus group flex items-center gap-2.5 rounded-2xl border p-2.5 text-left transition sm:flex-col sm:items-start sm:gap-3 sm:p-3",
                                        active
                                          ? "border-violet-400/60 bg-violet-500/[0.12] shadow-[0_0_0_1px_rgba(167,139,250,0.25)]"
                                          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                                      )}
                                    >
                                      <span
                                        className={cx(
                                          "grid h-9 w-9 shrink-0 place-items-center rounded-xl transition",
                                          active
                                            ? "bg-gradient-to-br from-[#6d5dfc] to-[#6aa7ff] text-white shadow-[0_6px_20px_rgba(109,93,252,0.4)]"
                                            : "bg-white/[0.06] text-sky-200 group-hover:bg-white/[0.1]"
                                        )}
                                      >
                                        <Icon size={17} />
                                      </span>
                                      <span className="min-w-0 text-[12.5px] font-medium leading-tight">
                                        {label}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                              <p className="mt-2.5 flex items-start gap-1.5 text-[12px] text-white/45" aria-live="polite">
                                <Sparkles size={12} className="mt-0.5 shrink-0 text-violet-300/70" />
                                <span>
                                  <span className="text-white/65">Content ideas:</span> {NICHE_IDEAS[draft.niche]}
                                </span>
                              </p>
                            </fieldset>

                            {/* visual style: previewed on the chosen model */}
                            <fieldset>
                              <legend className="rp-label mb-2.5">Visual style</legend>
                              <div
                                role="radiogroup"
                                aria-label="Visual style"
                                onKeyDown={onRadioKeys}
                                className="grid grid-cols-2 gap-2.5 sm:grid-cols-4"
                              >
                                {STYLES.map(({ k, t, d }) => {
                                  const active = draft.visualStyle === k;
                                  return (
                                    <button
                                      key={k}
                                      type="button"
                                      role="radio"
                                      aria-checked={active}
                                      tabIndex={active ? 0 : -1}
                                      onClick={() => update({ visualStyle: k })}
                                      className={cx(
                                        "rp-focus group relative overflow-hidden rounded-2xl border text-left transition duration-300",
                                        active
                                          ? "border-violet-400/70 shadow-[0_0_0_2px_rgba(139,124,255,0.35)]"
                                          : "border-white/10 hover:border-white/25"
                                      )}
                                    >
                                      <span className="relative block aspect-[4/3] sm:aspect-[4/5]">
                                        <Pic
                                          src={photoSrc}
                                          alt=""
                                          sizes="(min-width: 640px) 150px, 45vw"
                                          className="object-cover object-top transition duration-500 group-hover:scale-[1.05]"
                                          style={{ filter: STYLE_FILTER[k] }}
                                        />
                                        <span className={cx("absolute inset-0 bg-gradient-to-br", STYLE_TINT[k])} />
                                        <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                                      </span>
                                      <span className="absolute inset-x-2.5 bottom-2.5">
                                        <span className="block text-[13px] font-semibold leading-tight">{t}</span>
                                        <span className="block truncate text-[11px] text-white/55">{d}</span>
                                      </span>
                                      <span
                                        aria-hidden
                                        className={cx(
                                          "absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border transition",
                                          active
                                            ? "border-transparent bg-gradient-to-br from-[#6d5dfc] to-[#6aa7ff]"
                                            : "border-white/40 bg-black/30"
                                        )}
                                      >
                                        {active && <Check size={13} strokeWidth={3} />}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </fieldset>
                          </div>
                        )}

                        {/* -------- step 3: strategy -------- */}
                        {step === 2 && (
                          <div className="space-y-7">
                            {/* platforms: switches on phones, cards from sm */}
                            <fieldset>
                              <legend className="rp-label mb-2.5">Where it posts</legend>
                              <div className="grid gap-2 sm:grid-cols-3">
                                {PLATFORMS.map(({ k, label, icon: Icon }) => {
                                  const active = draft.platforms[k];
                                  return (
                                    <button
                                      key={k}
                                      type="button"
                                      role="checkbox"
                                      aria-checked={active}
                                      onClick={() => update({ platforms: { ...draft.platforms, [k]: !active } })}
                                      className={cx(
                                        "rp-focus relative flex items-center gap-3 rounded-2xl border p-3 text-left transition sm:flex-col sm:items-start sm:pr-9",
                                        active
                                          ? "border-violet-400/60 bg-violet-500/[0.12] shadow-[0_0_0_1px_rgba(167,139,250,0.25)]"
                                          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                                      )}
                                    >
                                      <span
                                        className={cx(
                                          "grid h-10 w-10 shrink-0 place-items-center rounded-xl transition",
                                          PLATFORM_TILE[k],
                                          !active && "opacity-60 grayscale-[0.4]"
                                        )}
                                      >
                                        <Icon size={18} />
                                      </span>
                                      <span className="min-w-0 flex-1">
                                        <span className="block text-[14px] font-semibold">{label}</span>
                                        <span className="block truncate text-[11.5px] text-white/50">
                                          {PLATFORM_HINT[k]}
                                        </span>
                                      </span>
                                      <span
                                        aria-hidden
                                        className={cx(
                                          "relative h-6 w-10 shrink-0 rounded-full transition-colors sm:hidden",
                                          active ? "bg-gradient-to-r from-[#6d5dfc] to-[#6aa7ff]" : "bg-white/15"
                                        )}
                                      >
                                        <span
                                          className={cx(
                                            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200",
                                            active ? "left-[18px]" : "left-0.5"
                                          )}
                                        />
                                      </span>
                                      <span
                                        aria-hidden
                                        className={cx(
                                          "absolute right-2.5 top-2.5 hidden h-5 w-5 items-center justify-center rounded-md border transition sm:flex",
                                          active
                                            ? "border-transparent bg-gradient-to-br from-[#6d5dfc] to-[#6aa7ff]"
                                            : "border-white/25"
                                        )}
                                      >
                                        {active && <Check size={12} strokeWidth={3} />}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </fieldset>

                            {/* cadence: each option shows its week */}
                            <fieldset>
                              <legend className="rp-label mb-2.5">Posting cadence</legend>
                              <div
                                role="radiogroup"
                                aria-label="Posting cadence"
                                onKeyDown={onRadioKeys}
                                className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                              >
                                {FREQS.map(({ k, t, d }) => {
                                  const active = draft.frequency === k;
                                  return (
                                    <button
                                      key={k}
                                      type="button"
                                      role="radio"
                                      aria-checked={active}
                                      tabIndex={active ? 0 : -1}
                                      onClick={() => update({ frequency: k })}
                                      className={cx(
                                        "rp-focus relative rounded-2xl border p-3 text-left transition",
                                        active
                                          ? "border-violet-400/60 bg-violet-500/[0.12] shadow-[0_0_0_1px_rgba(167,139,250,0.25)]"
                                          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                                      )}
                                    >
                                      <span className="block pr-6 text-[13px] font-semibold">{t}</span>
                                      <span className="mt-2.5 flex gap-1" aria-hidden>
                                        {FREQ_WEEK[k].map((v, i) => (
                                          <span
                                            key={i}
                                            className={cx(
                                              "h-5 flex-1 rounded-[5px] transition-colors",
                                              v === 1
                                                ? active
                                                  ? "bg-gradient-to-t from-[#6d5dfc] to-[#6aa7ff]"
                                                  : "bg-white/35"
                                                : v === 0.5
                                                  ? "border border-dashed border-white/25"
                                                  : "bg-white/[0.06]"
                                            )}
                                          />
                                        ))}
                                      </span>
                                      <span className="mt-1 flex text-[9px] text-white/30" aria-hidden>
                                        {WEEKDAYS.map((w, i) => (
                                          <span key={i} className="flex-1 text-center">
                                            {w}
                                          </span>
                                        ))}
                                      </span>
                                      <span className="mt-1.5 block text-[11.5px] text-white/50">{d}</span>
                                      <span
                                        aria-hidden
                                        className={cx(
                                          "absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full border transition",
                                          active
                                            ? "border-transparent bg-gradient-to-br from-[#6d5dfc] to-[#6aa7ff]"
                                            : "border-white/20"
                                        )}
                                      >
                                        {active && <Check size={12} strokeWidth={3} />}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </fieldset>

                            {/* formats */}
                            <fieldset>
                              <legend className="rp-label mb-2.5">What it creates</legend>
                              <div className="grid grid-cols-2 gap-2">
                                {(
                                  [
                                    { k: "photos", t: "Photos", d: "Feed posts & carousels" },
                                    { k: "videos", t: "Video", d: "Reels & shorts" },
                                  ] as const
                                ).map(({ k, t, d }) => {
                                  const active = draft.contentTypes[k];
                                  const filter = STYLE_FILTER[draft.visualStyle];
                                  return (
                                    <button
                                      key={k}
                                      type="button"
                                      role="checkbox"
                                      aria-checked={active}
                                      onClick={() =>
                                        update({ contentTypes: { ...draft.contentTypes, [k]: !active } })
                                      }
                                      className={cx(
                                        "rp-focus relative flex flex-col items-start gap-3 rounded-2xl border p-3 pr-9 text-left transition sm:flex-row sm:items-center",
                                        active
                                          ? "border-violet-400/60 bg-violet-500/[0.12] shadow-[0_0_0_1px_rgba(167,139,250,0.25)]"
                                          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                                      )}
                                    >
                                      {/* mini thumbnails of the chosen look */}
                                      {k === "photos" ? (
                                        <span className={cx("relative h-14 w-16 shrink-0 transition", !active && "opacity-50")} aria-hidden>
                                          <span className="absolute left-0.5 top-0.5 h-11 w-11 -rotate-6 overflow-hidden rounded-lg border border-white/15 bg-white/5">
                                            <Pic src={photoSrc} alt="" sizes="44px" className="object-cover object-[50%_70%]" style={{ filter }} />
                                          </span>
                                          <span className="absolute bottom-0 right-0.5 h-11 w-11 rotate-6 overflow-hidden rounded-lg border border-white/25 shadow-lg">
                                            <Pic src={photoSrc} alt="" sizes="44px" className="object-cover object-top" style={{ filter }} />
                                          </span>
                                        </span>
                                      ) : (
                                        <span className={cx("relative grid h-14 w-16 shrink-0 place-items-center transition", !active && "opacity-50")} aria-hidden>
                                          <span className="relative h-14 w-9 overflow-hidden rounded-lg border border-white/25 shadow-lg">
                                            <Pic src={photoSrc} alt="" sizes="36px" className="object-cover object-top" style={{ filter }} />
                                            <span className="absolute inset-0 grid place-items-center bg-black/30">
                                              <Play size={12} fill="currentColor" className="ml-px" />
                                            </span>
                                          </span>
                                        </span>
                                      )}
                                      <span className="min-w-0">
                                        <span className="block text-[14px] font-semibold">{t}</span>
                                        <span className="block text-[11.5px] text-white/50">{d}</span>
                                      </span>
                                      <span
                                        aria-hidden
                                        className={cx(
                                          "absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-md border transition",
                                          active
                                            ? "border-transparent bg-gradient-to-br from-[#6d5dfc] to-[#6aa7ff]"
                                            : "border-white/25"
                                        )}
                                      >
                                        {active && <Check size={12} strokeWidth={3} />}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </fieldset>

                            {/* live plan summary */}
                            <div
                              aria-live="polite"
                              className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-gradient-to-r from-violet-500/[0.12] via-indigo-500/[0.06] to-sky-500/[0.08] p-3.5"
                            >
                              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.06]">
                                <CalendarClock size={18} className="text-sky-200" />
                              </span>
                              <p className="min-w-0 text-[13px] leading-snug text-white/65">
                                <span className="font-semibold text-white">≈ {POSTS_PER_MONTH[draft.frequency]} posts a month</span>
                                {platformNames ? <> on {platformNames}</> : null}
                                {formatNames ? <>, as {formatNames}</> : null}.
                                <span className="block text-[11.5px] text-white/40">
                                  Estimate · auto-published on your schedule, change it any time.
                                </span>
                              </p>
                            </div>
                          </div>
                        )}

                        {/* -------- step 4: launch + sign-in gate -------- */}
                        {step === LAST && (
                          <div className="flex flex-col gap-5">
                            {/* setup complete */}
                            <div className="flex items-center gap-3">
                              <motion.span
                                initial={{ scale: 0.4, opacity: 0, rotate: -20 }}
                                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                transition={{ type: "spring", stiffness: 320, damping: 18, delay: 0.05 }}
                                className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#6d5dfc] to-[#6aa7ff] shadow-[0_10px_30px_rgba(109,93,252,0.45)]"
                              >
                                <span aria-hidden className="absolute -inset-2 -z-10 rounded-3xl bg-violet-500/30 blur-lg" />
                                <PartyPopper size={20} />
                              </motion.span>
                              <div className="min-w-0">
                                <p className="text-[13px] font-semibold text-emerald-300">Setup complete</p>
                                <p className="text-[12.5px] text-white/50">
                                  3 of 3 steps done · nothing is saved until you sign in
                                </p>
                              </div>
                            </div>

                            {/* sign-in card — first, so it sits above the fold on phones */}
                            <div className="relative overflow-hidden rounded-[22px] border border-violet-400/25 bg-gradient-to-b from-violet-500/[0.12] via-violet-500/[0.04] to-transparent p-4 sm:p-5">
                              <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet-500/25 blur-3xl" />
                              <div className="relative">
                                <div className="flex items-center gap-3">
                                  <span className="relative h-11 w-11 shrink-0 rounded-full bg-gradient-to-tr from-[#6d5dfc] via-fuchsia-400 to-[#6aa7ff] p-[2px]">
                                    <span className="relative block h-full w-full overflow-hidden rounded-full border-2 border-[#0b0c1d]">
                                      <Pic
                                        src={photoSrc}
                                        alt=""
                                        sizes="44px"
                                        className="object-cover object-top"
                                        style={{ filter: STYLE_FILTER[draft.visualStyle] }}
                                      />
                                    </span>
                                    <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full border-2 border-[#0e0f22] bg-violet-500">
                                      <Lock size={9} />
                                    </span>
                                  </span>
                                  <div className="min-w-0">
                                    <p className="line-clamp-2 text-[15px] font-semibold leading-snug">
                                      {isAuthed ? `Save ${displayName} to your studio` : `Sign in to save ${displayName}`}
                                    </p>
                                    <p className="truncate text-[12px] text-white/50">@{handleOf(displayName)}</p>
                                  </div>
                                </div>

                                <div className="mt-4 space-y-2.5">
                                  {isAuthed ? (
                                    <button
                                      type="button"
                                      onClick={() => finish("studio")}
                                      disabled={leaving !== null}
                                      className="rp-btn h-12 w-full text-[15px] font-semibold"
                                    >
                                      {leaving ? <span className="rp-spinner" aria-hidden /> : null}
                                      Continue to my studio
                                      <ArrowRight size={17} />
                                    </button>
                                  ) : (
                                    <>
                                      <GoogleButton onClick={() => finish("google")} />
                                      <button
                                        type="button"
                                        onClick={() => finish("signup")}
                                        disabled={leaving !== null}
                                        className="rp-btn h-12 w-full text-[15px] font-semibold"
                                      >
                                        {leaving === "signup" ? <span className="rp-spinner" aria-hidden /> : null}
                                        Create account with email
                                        <ArrowRight size={17} />
                                      </button>
                                      <p className="pt-1 text-center text-[13px] text-white/50">
                                        Already have an account?{" "}
                                        <button
                                          type="button"
                                          onClick={() => finish("login")}
                                          className="rp-focus rounded font-semibold text-white underline decoration-white/25 underline-offset-4 hover:decoration-white"
                                        >
                                          Sign in
                                        </button>
                                      </p>
                                    </>
                                  )}
                                </div>
                                <p className="mt-4 text-balance text-center text-[11.5px] leading-relaxed text-white/40">
                                  <ShieldCheck size={13} className="mr-1 inline-block -translate-y-px text-emerald-300/70" aria-hidden />
                                  18+ only · your likeness, your consent · private by default
                                </p>
                              </div>
                            </div>

                            {/* recap with jump-back edits */}
                            <section aria-labelledby="builder-recap">
                              <h3 id="builder-recap" className="rp-label mb-2.5">
                                Your setup
                              </h3>
                              <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-[20px] border border-white/[0.08] bg-white/[0.025]">
                                {recap.map(({ label, value, detail, icon: Icon, to }) => (
                                  <li key={label} className="flex items-center gap-3 p-3 sm:p-3.5">
                                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.06]">
                                      <Icon size={16} className="text-sky-200" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">{label}</p>
                                      <p className="truncate text-[13.5px] font-medium text-white/90">{value}</p>
                                      <p className="truncate text-[12px] text-white/45">{detail}</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => go(to)}
                                      aria-label={`Edit ${label.toLowerCase()}`}
                                      className="rp-focus inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-3 text-[12px] font-medium text-white/65 transition hover:bg-white/[0.08] hover:text-white"
                                    >
                                      <Pencil size={12} />
                                      <span className="hidden sm:inline">Edit</span>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </section>

                            {/* what happens next */}
                            <section aria-labelledby="builder-next">
                              <h3 id="builder-next" className="rp-label mb-2.5">
                                What happens next
                              </h3>
                              <ol className="grid gap-2 sm:grid-cols-3">
                                {[
                                  {
                                    t: isAuthed ? "Open your studio" : "Save your influencer",
                                    d: isAuthed ? "Your choices load automatically" : "Google or email — takes seconds",
                                  },
                                  { t: "Pick a plan", d: "Credits for generation & auto-posting" },
                                  { t: "Start creating", d: "Generate sets and schedule posts" },
                                ].map(({ t, d }, i) => (
                                  <li
                                    key={t}
                                    className={cx(
                                      "flex items-start gap-2.5 rounded-2xl border p-3 sm:flex-col",
                                      i === 0
                                        ? "border-violet-400/30 bg-violet-500/[0.08]"
                                        : "border-white/[0.07] bg-white/[0.02]"
                                    )}
                                  >
                                    <span
                                      className={cx(
                                        "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                                        i === 0
                                          ? "bg-gradient-to-br from-[#6d5dfc] to-[#6aa7ff]"
                                          : "border border-white/15 text-white/50"
                                      )}
                                    >
                                      {i + 1}
                                    </span>
                                    <span className="min-w-0">
                                      <span className="block text-[13px] font-semibold">{t}</span>
                                      <span className="block text-[11.5px] leading-snug text-white/45">{d}</span>
                                    </span>
                                  </li>
                                ))}
                              </ol>
                            </section>

                            {/* full preview on phones/tablets (desktop shows it in the side panel) */}
                            <div className="lg:hidden">
                              <p className="rp-label mb-2.5">Profile preview</p>
                              <div className="mx-auto max-w-[300px]">
                                <PreviewCard draft={draft} photo={isCustom ? photoSrc : null} fallbackName={fallbackName} feed={isCustom ? own.feedUrls : undefined} />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* footer actions (steps 1–3) */}
                {step < LAST && (
                  <div className="shrink-0 border-t border-white/[0.07] bg-[#08091a]/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:px-6 sm:py-4">
                    {stepError && (
                      <p role="alert" className="mb-2 text-center text-[12px] text-amber-300/90 sm:text-left">
                        {stepError}
                      </p>
                    )}
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => (step === 0 ? onClose() : go(step - 1))}
                        className="rp-ghost h-12 shrink-0 px-4 text-sm font-semibold sm:px-5"
                      >
                        {step === 0 ? (
                          "Cancel"
                        ) : (
                          <>
                            <ArrowLeft size={16} />
                            <span className="hidden sm:inline">Back</span>
                          </>
                        )}
                      </button>
                      <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
                      <span className="hidden items-center gap-1.5 text-[12px] text-white/35 [@media(hover:hover)]:sm:flex">
                        Press
                        <kbd className="rounded-md border border-white/15 bg-white/[0.06] px-1.5 py-0.5 font-sans text-[11px] text-white/60">
                          Enter ↵
                        </kbd>
                      </span>
                      <button
                        type="button"
                        onClick={next}
                        disabled={Boolean(stepError)}
                        className="rp-btn h-12 min-w-0 flex-1 text-[15px] font-semibold sm:flex-none sm:px-8"
                      >
                        {step === LAST - 1 ? "Preview my influencer" : "Continue"}
                        <ArrowRight size={17} />
                      </button>
                      </div>
                    </div>
                  </div>
                )}
                {step === LAST && (
                  <div className="shrink-0 border-t border-white/[0.07] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
                    <button
                      type="button"
                      onClick={() => go(step - 1)}
                      className="rp-focus inline-flex h-10 items-center gap-1.5 rounded-full px-2 text-[13px] text-white/55 transition hover:text-white"
                    >
                      <ArrowLeft size={15} />
                      Edit choices
                    </button>
                  </div>
                )}
              </div>

              {/* ================= live preview (lg+) ================= */}
              <aside
                aria-label="Live preview"
                className="relative hidden border-l border-white/[0.07] bg-gradient-to-b from-violet-600/[0.12] via-transparent to-sky-500/[0.06] p-6 lg:flex lg:flex-col lg:justify-center"
              >
                <div className="rp-grid-bg pointer-events-none absolute inset-0 opacity-[0.05]" />
                <div className="relative">
                  <PreviewCard draft={draft} photo={isCustom ? photoSrc : null} fallbackName={fallbackName} feed={isCustom ? own.feedUrls : undefined} />
                  <p className="mt-4 text-center text-[12px] text-white/40">
                    Your profile updates as you choose. Nothing is saved until you sign in.
                  </p>
                </div>
              </aside>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
