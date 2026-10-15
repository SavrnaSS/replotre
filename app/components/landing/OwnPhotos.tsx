"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Camera,
  Check,
  ChevronDown,
  ImagePlus,
  Loader2,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

import {
  analyzePhoto,
  ISSUE_LABEL,
  ISSUE_SHORT,
  loadFaceDetector,
  MAX_FILE_BYTES,
  type PhotoReport,
} from "@/app/lib/photoChecks";
import { clearPhotos, deletePhoto, listPhotos, putPhoto } from "@/app/lib/photoStore";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export const MIN_USABLE = 20;
export const MAX_PHOTOS = 40;

type Item = {
  id: string;
  name: string;
  url: string;
  blob: Blob;
  report: PhotoReport | null; // null while checking
};

export type OwnPhotosSummary = {
  total: number;
  usable: number;
  checking: number;
  coverUrl: string | null;
  /** Up to 6 usable photos (best first) for the preview feed. */
  feedUrls: string[];
};

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function Ring({ value, max }: { value: number; max: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, value / max);
  return (
    <span className="relative grid h-14 w-14 shrink-0 place-items-center">
      <svg viewBox="0 0 52 52" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
        <motion.circle
          cx="26"
          cy="26"
          r={r}
          fill="none"
          stroke={pct >= 1 ? "#34d399" : "url(#own-ring)"}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
        <defs>
          <linearGradient id="own-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6d5dfc" />
            <stop offset="100%" stopColor="#6aa7ff" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-[13px] font-semibold tabular-nums">{value}</span>
    </span>
  );
}

export default function OwnPhotos({
  onChange,
}: {
  onChange: (summary: OwnPhotosSummary) => void;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [restored, setRestored] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState("");
  const [faceCheck, setFaceCheck] = useState<"loading" | "ready" | "off">("loading");
  const [filter, setFilter] = useState<"all" | "attention">("all");
  const [tipsOpen, setTipsOpen] = useState(false);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const selfieRef = useRef<HTMLInputElement | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const itemsRef = useRef<Item[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Warm up the face detector and restore photos saved earlier in this browser.
  useEffect(() => {
    let alive = true;
    loadFaceDetector().then((api) => alive && setFaceCheck(api ? "ready" : "off"));
    listPhotos().then((stored) => {
      if (!alive) return;
      setItems(
        stored.map((p) => ({
          id: p.id,
          name: p.name,
          blob: p.blob,
          url: URL.createObjectURL(p.blob),
          report: p.report,
        }))
      );
      setRestored(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Revoke object URLs on unmount.
  useEffect(() => () => itemsRef.current.forEach((i) => URL.revokeObjectURL(i.url)), []);

  // Report a live summary to the builder.
  const summary = useMemo<OwnPhotosSummary>(() => {
    const usableItems = items.filter((i) => i.report && i.report.verdict !== "bad");
    const cover =
      items.find((i) => i.report?.verdict === "good") ?? usableItems[0] ?? null;
    return {
      total: items.length,
      usable: usableItems.length,
      checking: items.filter((i) => !i.report).length,
      coverUrl: cover?.url ?? null,
      feedUrls: [
        ...usableItems.filter((i) => i.report?.verdict === "good"),
        ...usableItems.filter((i) => i.report?.verdict !== "good"),
      ]
        .slice(0, 6)
        .map((i) => i.url),
    };
  }, [items]);
  useEffect(() => onChange(summary), [summary, onChange]);

  const flash = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice((m) => (m === msg ? "" : m)), 4000);
  };

  const addFiles = useCallback((list: FileList | File[]) => {
    const files = Array.from(list).filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    if (!files.length) return;

    const room = MAX_PHOTOS - itemsRef.current.length;
    const oversized = files.filter((f) => f.size > MAX_FILE_BYTES);
    const accepted = files.filter((f) => f.size <= MAX_FILE_BYTES).slice(0, Math.max(0, room));
    const skipped = files.length - oversized.length - accepted.length;

    const parts: string[] = [];
    if (oversized.length) parts.push(`${oversized.length} over 15 MB skipped`);
    if (skipped > 0) parts.push(`limit is ${MAX_PHOTOS} photos — ${skipped} skipped`);
    if (parts.length) flash(parts.join(" · "));
    if (!accepted.length) return;

    const fresh: Item[] = accepted.map((f) => ({
      id: newId(),
      name: f.name,
      blob: f,
      url: URL.createObjectURL(f),
      report: null,
    }));
    itemsRef.current = [...itemsRef.current, ...fresh];
    setItems((prev) => [...prev, ...fresh]);

    // Check one at a time so the page stays responsive; results stream in.
    for (const item of fresh) {
      queue.current = queue.current.then(async () => {
        if (!itemsRef.current.some((i) => i.id === item.id)) return; // removed meanwhile
        const hashes = itemsRef.current
          .filter((i) => i.id !== item.id && i.report && !i.report.issues.includes("unsupported"))
          .map((i) => i.report!.hash);
        const report = await analyzePhoto(item.blob, hashes);
        if (!itemsRef.current.some((i) => i.id === item.id)) return;
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, report } : i)));
        await putPhoto({ id: item.id, name: item.name, blob: item.blob, report, createdAt: Date.now() });
      });
    }
  }, []);

  // Paste images straight from the clipboard (desktop).
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
      if (files.length) {
        e.preventDefault();
        addFiles(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles]);

  const remove = (id: string) => {
    itemsRef.current = itemsRef.current.filter((i) => i.id !== id);
    setItems((prev) => {
      const gone = prev.find((i) => i.id === id);
      if (gone) URL.revokeObjectURL(gone.url);
      return prev.filter((i) => i.id !== id);
    });
    deletePhoto(id);
  };
  const removeUnusable = () => {
    items.filter((i) => i.report?.verdict === "bad").forEach((i) => remove(i.id));
  };
  const clearAll = () => {
    items.forEach((i) => URL.revokeObjectURL(i.url));
    itemsRef.current = [];
    setItems([]);
    clearPhotos();
  };

  const attention = items.filter((i) => i.report && i.report.verdict !== "good");
  const badCount = items.filter((i) => i.report?.verdict === "bad").length;
  const shown = filter === "attention" ? attention : items;
  const ready = summary.usable >= MIN_USABLE;
  const isTouch = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;

  return (
    <div className="space-y-4">
      {/* live status */}
      <div className="flex items-center gap-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5" aria-live="polite">
        <Ring value={summary.usable} max={MIN_USABLE} />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold">
            {ready ? (
              <span className="text-emerald-300">Training set ready</span>
            ) : (
              <>
                {summary.usable} of {MIN_USABLE} usable photos
              </>
            )}
          </p>
          <p className="text-[12px] text-white/50">
            {summary.checking > 0
              ? `Checking ${summary.checking} photo${summary.checking > 1 ? "s" : ""}…`
              : ready
                ? `${summary.usable} usable · up to ${MAX_PHOTOS} for best results`
                : `Add ${MIN_USABLE - summary.usable} more — aim for 20–40 photos of just you`}
          </p>
        </div>
        <span
          className={cx(
            "hidden shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10.5px] sm:inline-flex",
            faceCheck === "ready"
              ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
              : faceCheck === "loading"
                ? "border-white/10 text-white/50"
                : "border-amber-400/25 bg-amber-400/10 text-amber-200"
          )}
        >
          {faceCheck === "loading" ? <Loader2 size={11} className="animate-spin" /> : <ShieldCheck size={11} />}
          {faceCheck === "ready" ? "Face check on" : faceCheck === "loading" ? "Loading face check" : "Face check off"}
        </span>
      </div>

      {/* drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cx(
          "relative rounded-[22px] border-2 border-dashed p-4 text-center transition-colors sm:p-6",
          dragging ? "border-violet-400/70 bg-violet-500/[0.1]" : "border-white/12 bg-white/[0.02]"
        )}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={selfieRef}
          type="file"
          accept="image/*"
          capture="user"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <span className="mx-auto hidden h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/25 to-sky-500/15 sm:grid">
          <ImagePlus size={20} className="text-sky-200" />
        </span>
        <p className="mt-0 text-[14px] font-semibold sm:mt-3">
          {dragging ? "Drop to add" : isTouch ? "Add photos of yourself" : "Drag photos here, paste, or browse"}
        </p>
        <p className="mt-0.5 text-[12px] text-white/45">
          JPG, PNG or WebP · up to 15 MB each · {items.length}/{MAX_PHOTOS} added
        </p>
        <div className="mt-3.5 flex flex-col justify-center gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={items.length >= MAX_PHOTOS}
            className="rp-btn h-11 px-5 text-[14px] font-semibold"
          >
            <ImagePlus size={16} />
            {isTouch ? "Choose from library" : "Browse photos"}
          </button>
          {isTouch && (
            <button
              type="button"
              onClick={() => selfieRef.current?.click()}
              disabled={items.length >= MAX_PHOTOS}
              className="rp-ghost h-11 px-5 text-[14px] font-semibold"
            >
              <Camera size={16} />
              Take a selfie
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {notice && (
          <motion.p
            role="status"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-[12px] text-amber-100"
          >
            {notice}
          </motion.p>
        )}
      </AnimatePresence>

      {faceCheck === "off" && (
        <p className="flex items-start gap-2 text-[12px] text-amber-200/80">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          Face detection couldn’t load in this browser — size, sharpness, lighting and duplicate checks still run.
        </p>
      )}

      {/* grid */}
      {items.length > 0 && (
        <div>
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1 rounded-full border border-white/[0.07] bg-black/30 p-1" role="group" aria-label="Filter photos">
              {(
                [
                  ["all", `All ${items.length}`],
                  ["attention", `Needs attention ${attention.length}`],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={filter === k}
                  onClick={() => setFilter(k)}
                  className={cx(
                    "rp-focus h-8 rounded-full px-3 text-[12px] font-medium transition",
                    filter === k ? "bg-white/[0.1] text-white" : "text-white/50 hover:text-white/80"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              {badCount > 0 && (
                <button
                  type="button"
                  onClick={removeUnusable}
                  className="rp-focus h-8 rounded-full border border-rose-400/25 px-3 text-[12px] text-rose-200 transition hover:bg-rose-500/10"
                >
                  Remove {badCount} unusable
                </button>
              )}
              <button
                type="button"
                onClick={clearAll}
                className="rp-focus inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-[12px] text-white/45 transition hover:text-white"
              >
                <Trash2 size={12} /> Clear
              </button>
            </div>
          </div>

          <ul className="grid grid-cols-4 gap-1.5 sm:grid-cols-5 sm:gap-2">
            <AnimatePresence initial={false}>
              {shown.map((item) => {
                const r = item.report;
                const issueText = r?.issues.map((i) => ISSUE_LABEL[i]).join(", ");
                return (
                  <motion.li
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.2 }}
                    className={cx(
                      "group relative aspect-square overflow-hidden rounded-xl border",
                      !r
                        ? "border-white/10"
                        : r.verdict === "good"
                          ? "border-emerald-400/30"
                          : r.verdict === "warn"
                            ? "border-amber-400/40"
                            : "border-rose-400/50"
                    )}
                    title={r ? (issueText || "Looks good") : "Checking…"}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.url}
                      alt={`${item.name}: ${!r ? "checking" : r.verdict === "good" ? "looks good" : issueText}`}
                      className={cx("h-full w-full object-cover transition", r?.verdict === "bad" && "opacity-40 grayscale")}
                    />
                    {!r && (
                      <span className="absolute inset-0 grid place-items-center bg-black/45">
                        <Loader2 size={18} className="animate-spin text-white/80" />
                      </span>
                    )}
                    {r && (
                      <span
                        aria-hidden
                        className={cx(
                          "absolute left-1 top-1 grid h-5 w-5 place-items-center rounded-full",
                          r.verdict === "good" ? "bg-emerald-400 text-black" : r.verdict === "warn" ? "bg-amber-300 text-black" : "bg-rose-500 text-white"
                        )}
                      >
                        {r.verdict === "good" ? <Check size={11} strokeWidth={3} /> : r.verdict === "warn" ? "!" : <X size={11} strokeWidth={3} />}
                      </span>
                    )}
                    {r && r.issues[0] && (
                      <span className="absolute inset-x-1 bottom-1 truncate rounded-md bg-black/70 px-1 py-0.5 text-center text-[9.5px] font-medium text-white/90">
                        {ISSUE_SHORT[r.issues[0]]}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      aria-label={`Remove ${item.name}`}
                      className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white/90 backdrop-blur transition [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <X size={12} />
                    </button>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
          {filter === "attention" && attention.length === 0 && (
            <p className="py-4 text-center text-[12.5px] text-emerald-300/80">Every photo passed the checks.</p>
          )}
        </div>
      )}

      {/* tips */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02]">
        <button
          type="button"
          onClick={() => setTipsOpen((v) => !v)}
          aria-expanded={tipsOpen}
          className="rp-focus flex w-full items-center justify-between gap-2 rounded-2xl px-3.5 py-3 text-left text-[13px] font-medium text-white/75"
        >
          What makes a great training set
          <ChevronDown size={16} className={cx("shrink-0 transition", tipsOpen && "rotate-180")} />
        </button>
        <AnimatePresence initial={false}>
          {tipsOpen && (
            <motion.ul
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden px-3.5 text-[12.5px] leading-relaxed text-white/55"
            >
              {[
                "Only you in the photo — crop out friends and pets",
                "Mix close-ups, half-body and full-body shots",
                "Different outfits, places, lighting and expressions",
                "Face clearly visible: no sunglasses, masks or heavy filters",
                "Sharp, well-lit photos beat lots of similar ones",
              ].map((t) => (
                <li key={t} className="flex gap-2 pb-2 last:pb-3.5">
                  <Check size={13} className="mt-1 shrink-0 text-emerald-300/80" />
                  {t}
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      <p className="flex items-start gap-2 text-[11.5px] leading-relaxed text-white/40">
        <ShieldCheck size={13} className="mt-0.5 shrink-0 text-emerald-300/70" />
        {restored && items.length
          ? "Restored from this device. "
          : ""}
        Checked privately in your browser and kept on this device for 24 hours — nothing is uploaded yet. Only use
        photos of yourself, or of someone who has given you permission.
      </p>
    </div>
  );
}
