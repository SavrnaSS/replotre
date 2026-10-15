"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, CloudUpload, Loader2, RefreshCw, ShieldCheck, Sparkles, Trash2 } from "lucide-react";

import OwnPhotos from "@/app/components/landing/OwnPhotos";
import { clearPhotos, listPhotos, type StoredPhoto } from "@/app/lib/photoStore";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type ServerPhoto = {
  id: string;
  score: number;
  warnings: string[];
  isReference: boolean;
  thumbUrl: string | null;
};
type ServerModel = {
  status: "none" | "draft" | "training" | "ready" | "failed";
  photoCount: number;
  minPhotos: number;
  maxPhotos: number;
  referencePhotoId: string | null;
  error: string | null;
  photos: ServerPhoto[];
};

const REASON: Record<string, string> = {
  unreadable: "couldn’t be read",
  "too-small": "too small",
  "very-blurry": "too blurry",
  duplicate: "duplicate",
  "no-face": "no face",
  "too-large": "over 15 MB",
  unsupported: "unsupported format",
  "limit-reached": "photo limit reached",
};

const SETUP_ERRORS: Record<string, string> = {
  storage_not_configured: "Photo storage isn’t configured on the server yet.",
  custom_model_tables_missing: "The server database needs an update before custom models can be saved.",
};

async function readError(res: Response) {
  const data = (await res.json().catch(() => ({}))) as { error?: string; reason?: string; message?: string };
  return data;
}

export default function CustomModelSync({ onReady }: { onReady?: () => void }) {
  const [server, setServer] = useState<ServerModel | null>(null);
  const [local, setLocal] = useState<StoredPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [consent, setConsent] = useState(false);
  const [phase, setPhase] = useState<"idle" | "uploading" | "training">("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [rejected, setRejected] = useState<{ name: string; reason: string }[]>([]);
  const [fatal, setFatal] = useState("");
  const [addMore, setAddMore] = useState(false);
  const running = useRef(false);

  const refresh = useCallback(async () => {
    const [res, photos] = await Promise.all([
      fetch("/api/custom-model", { cache: "no-store" }).catch(() => null),
      listPhotos(),
    ]);
    if (res?.ok) {
      const data = (await res.json()) as { model: ServerModel };
      setServer(data.model);
      setFatal("");
    } else if (res) {
      const err = await readError(res);
      setFatal(SETUP_ERRORS[err.error ?? ""] ?? "Couldn’t load your custom model. Please try again.");
    }
    setLocal(photos.filter((p) => p.report && p.report.verdict !== "bad"));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Stable callback: the uploader reports on every change; re-read what's on the device.
  const onLocalChange = useCallback(() => {
    listPhotos().then((p) => setLocal(p.filter((x) => x.report && x.report.verdict !== "bad")));
  }, []);

  const minPhotos = server?.minPhotos ?? 20;
  const uploaded = server?.photoCount ?? 0;
  const ready = server?.status === "ready";
  const reference = server?.photos.find((p) => p.isReference);

  const build = async () => {
    if (running.current) return;
    running.current = true;
    setFatal("");
    setRejected([]);
    try {
      // 1) upload on-device photos (3 at a time); duplicates mean "already on the server"
      if (local.length) {
        setPhase("uploading");
        setProgress({ done: 0, total: local.length });
        const queue = [...local];
        const failures: { name: string; reason: string }[] = [];
        const worker = async () => {
          while (queue.length) {
            const photo = queue.shift()!;
            const form = new FormData();
            form.append("file", photo.blob, photo.name.replace(/\.[^.]+$/, "") + ".jpg");
            form.append("consent", String(consent));
            if (photo.report?.faces != null) form.append("faces", String(photo.report.faces));
            const res = await fetch("/api/custom-model/photos", { method: "POST", body: form }).catch(() => null);
            if (!res) failures.push({ name: photo.name, reason: "network error" });
            else if (!res.ok) {
              const err = await readError(res);
              if (err.reason === "duplicate") {
                // already uploaded earlier — fine
              } else if (err.error && SETUP_ERRORS[err.error]) {
                queue.length = 0;
                throw new Error(SETUP_ERRORS[err.error]);
              } else if (err.error === "consent_required") {
                queue.length = 0;
                throw new Error("Please confirm the photos are of you before uploading.");
              } else {
                failures.push({ name: photo.name, reason: REASON[err.reason ?? ""] ?? err.error ?? "rejected" });
              }
            }
            setProgress((p) => ({ ...p, done: p.done + 1 }));
          }
        };
        await Promise.all([worker(), worker(), worker()]);
        setRejected(failures);
      }

      // 2) build the reference set
      const statusRes = await fetch("/api/custom-model", { cache: "no-store" });
      const status = statusRes.ok ? ((await statusRes.json()) as { model: ServerModel }).model : null;
      setServer(status);
      if (!status || status.photoCount < minPhotos) {
        setAddMore(true);
        return;
      }
      setPhase("training");
      const res = await fetch("/api/custom-model/train", { method: "POST" });
      if (!res.ok) {
        const err = await readError(res);
        throw new Error(
          err.error === "no_face_reference"
            ? "None of the photos had a clear single face. Add a few clear selfies and try again."
            : SETUP_ERRORS[err.error ?? ""] ?? "Building the model failed. Please try again."
        );
      }
      const data = (await res.json()) as { model: ServerModel };
      setServer(data.model);
      await clearPhotos(); // the server copy is the source of truth now
      setLocal([]);
      setAddMore(false);
      onReady?.();
    } catch (err) {
      setFatal(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setPhase("idle");
      running.current = false;
    }
  };

  const removeServerPhoto = async (id: string) => {
    await fetch(`/api/custom-model/photos?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    refresh();
  };

  const deleteAll = async () => {
    await fetch("/api/custom-model", { method: "DELETE" });
    await clearPhotos();
    refresh();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60">
        <Loader2 size={16} className="animate-spin" /> Loading your custom model…
      </div>
    );
  }

  const pending = local.length;
  const totalAfterUpload = uploaded + pending;
  const busy = phase !== "idle";
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <section
      aria-labelledby="custom-model-title"
      className="rounded-[28px] border border-violet-400/20 bg-gradient-to-b from-violet-500/[0.08] to-transparent p-4 sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05]">
          {ready && reference?.thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={reference.thumbUrl} alt="Locked reference photo" className="h-full w-full object-cover" />
          ) : (
            <Sparkles size={22} className="text-violet-200" />
          )}
          {ready && (
            <span className="absolute bottom-1 right-1 grid h-5 w-5 place-items-center rounded-full bg-emerald-400 text-black">
              <Check size={12} strokeWidth={3} />
            </span>
          )}
        </span>
        <div className="min-w-0 flex-1" aria-live="polite">
          <h3 id="custom-model-title" className="text-[17px] font-semibold">
            {ready ? "Your custom model is ready" : "Build your custom model"}
          </h3>
          <p className="mt-1 text-[13px] leading-relaxed text-white/55">
            {ready
              ? `Built from ${uploaded} of your photos. Your clearest photo is locked as the identity reference for every generation.`
              : `Upload at least ${minPhotos} photos of yourself. We re-check each one on our servers, strip location data, and lock your clearest photo as the identity reference.`}
          </p>

          {/* counts */}
          {!ready && (
            <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-white/70">
                {uploaded} uploaded
              </span>
              {pending > 0 && (
                <span className="rounded-full border border-violet-400/25 bg-violet-500/10 px-2.5 py-1 text-violet-100">
                  {pending} ready on this device
                </span>
              )}
              <span
                className={cx(
                  "rounded-full border px-2.5 py-1",
                  totalAfterUpload >= minPhotos
                    ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                    : "border-amber-400/25 bg-amber-400/10 text-amber-100"
                )}
              >
                {totalAfterUpload >= minPhotos ? "Enough to build" : `${minPhotos - totalAfterUpload} more needed`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* progress */}
      <AnimatePresence>
        {busy && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3.5">
              <div className="flex items-center justify-between text-[12.5px]">
                <span className="flex items-center gap-2 text-white/80">
                  <Loader2 size={14} className="animate-spin" />
                  {phase === "uploading"
                    ? `Uploading ${progress.done} of ${progress.total}…`
                    : "Building your model…"}
                </span>
                {phase === "uploading" && <span className="tabular-nums text-white/50">{pct}%</span>}
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#6d5dfc] to-[#6aa7ff]"
                  initial={false}
                  animate={{ width: phase === "training" ? "100%" : `${pct}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {fatal && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-3.5 py-3 text-[13px] text-rose-100">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          {fatal}
        </p>
      )}

      {rejected.length > 0 && (
        <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] px-3.5 py-3 text-[12.5px] text-amber-100">
          <p className="font-medium">
            {rejected.length === 1 ? "1 photo wasn’t accepted:" : `${rejected.length} photos weren’t accepted:`}
          </p>
          <ul className="mt-1 space-y-0.5 text-amber-100/75">
            {rejected.slice(0, 6).map((r, i) => (
              <li key={i} className="truncate">
                {r.name} — {r.reason}
              </li>
            ))}
            {rejected.length > 6 && <li>…and {rejected.length - 6} more</li>}
          </ul>
        </div>
      )}

      {/* actions */}
      {!ready && (
        <div className="mt-5 space-y-3">
          {pending > 0 && (
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 text-[13px] leading-relaxed text-white/70">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-violet-500"
              />
              <span>
                I’m 18+ and these are photos of me, or of someone who has given me written permission to create an
                AI model of them.
              </span>
            </label>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            {pending > 0 || uploaded >= minPhotos ? (
              <button
                type="button"
                onClick={build}
                disabled={busy || (pending > 0 && !consent)}
                className="rp-btn h-12 flex-1 px-6 text-[14px] font-semibold"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <CloudUpload size={16} />}
                {pending > 0 ? `Upload ${pending} photo${pending > 1 ? "s" : ""} & build model` : "Build my model"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setAddMore((v) => !v)}
              disabled={busy}
              className="rp-ghost h-12 px-5 text-[14px] font-semibold"
            >
              {addMore ? "Hide uploader" : pending || uploaded ? "Add more photos" : "Add photos"}
            </button>
          </div>
        </div>
      )}

      {ready && (
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAddMore((v) => !v)}
            className="rp-ghost h-10 px-4 text-[13px] font-semibold"
          >
            <RefreshCw size={14} /> Add photos & rebuild
          </button>
          <button
            type="button"
            onClick={deleteAll}
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-rose-400/25 px-4 text-[13px] text-rose-200 transition hover:bg-rose-500/10"
          >
            <Trash2 size={14} /> Delete model & photos
          </button>
        </div>
      )}

      {/* uploaded photos (server) */}
      {server && server.photos.length > 0 && (
        <details className="group mt-5">
          <summary className="cursor-pointer list-none text-[12.5px] text-white/55 hover:text-white/80">
            <span className="underline decoration-white/20 underline-offset-4">
              Manage {server.photos.length} uploaded photo{server.photos.length > 1 ? "s" : ""}
            </span>
          </summary>
          <ul className="mt-3 grid grid-cols-5 gap-1.5 sm:grid-cols-8">
            {server.photos.map((p) => (
              <li key={p.id} className="group/photo relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-white/5">
                {p.thumbUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.thumbUrl} alt="" className="h-full w-full object-cover" />
                )}
                {p.isReference && (
                  <span className="absolute inset-x-0 bottom-0 bg-emerald-500/90 py-0.5 text-center text-[9px] font-semibold text-black">
                    Reference
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeServerPhoto(p.id)}
                  disabled={busy}
                  aria-label="Delete photo"
                  className="absolute right-0.5 top-0.5 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white/90 transition [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/photo:opacity-100"
                >
                  <Trash2 size={11} />
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      {addMore && (
        <div className="mt-5 border-t border-white/10 pt-5">
          <OwnPhotos onChange={onLocalChange} />
        </div>
      )}

      <p className="mt-5 flex items-start gap-2 text-[11.5px] leading-relaxed text-white/40">
        <ShieldCheck size={13} className="mt-0.5 shrink-0 text-emerald-300/70" />
        Stored privately and only used to generate your content. Delete your model and photos at any time.
      </p>
    </section>
  );
}
