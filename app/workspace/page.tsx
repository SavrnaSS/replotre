// app/workspace/page.tsx
"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  Maximize2,
  Download,
  Lock,
  Sparkles,
  X,
  ArrowRight,
  CreditCard,
  ShieldCheck,
} from "lucide-react";
import AuthWall from "@/app/components/AuthWall";
import CreditsBar from "@/app/components/CreditsBar";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import StartGenerationButton from "@/app/components/StartGenerationButton";
import RegenButton from "@/app/components/RegenButton";
import { getArtThemes, prototypeFaces } from "@/app/config/artThemes";
import {
  loadResults,
  saveResult,
  clearResults,
  ResultItem,
  deleteResult,
} from "@/app/lib/db";

/**
 * ✅ Component splitting (faster initial load)
 * - AIGenerateTab is heavy => load only when tab is opened
 * - ZoomViewer only when fullscreen is used
 */
const AIGenerateTab = dynamic(() => import("@/app/components/AIGenerateTab"), {
  ssr: false,
  loading: () => (
    <div className="rounded-3xl border border-white/10 bg-black/25 p-6 text-sm text-white/60">
      Loading generator…
    </div>
  ),
});
const ZoomViewer = dynamic(
  () => import("@/app/components/fullscreen/ZoomViewer"),
  {
    ssr: false,
    loading: () => null,
  }
);

/* ---------------------------------------------------
 WORKSPACE PAGE (your existing logic preserved)
---------------------------------------------------- */
type QueuePhase = "idle" | "queued" | "generating";

function absoluteUrl(path: string) {
  if (!path) return "";
  if (
    path.startsWith("data:") ||
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("file://")
  ) {
    return path;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }
  return path;
}

function shuffleAnyArray<T>(arr: T[]) {
  const a = [...(Array.isArray(arr) ? arr : [])];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function stripDataPrefix(b64: string) {
  if (!b64) return b64;
  return b64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "");
}

function dataURLtoFile(dataurl: string, filename = "file.jpg") {
  const arr = dataurl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], filename, { type: mime });
}

// ✅ NEW: accept either imageUrl OR image(base64)
function pickFinalImageSrcFromBackend(data: any): string | null {
  const url = data?.imageUrl || data?.image_url || data?.url;
  if (url && typeof url === "string") return url;
  const b64 = data?.image;
  if (b64 && typeof b64 === "string") {
    let cleanBase64 = b64.replace(/^"|"$/g, "").replace(/\n/g, "").trim();
    const mime = data?.mime || "image/png";
    return `data:${mime};base64,${cleanBase64}`;
  }
  return null;
}

const MotionCard = memo(function MotionCard({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.35, ease: "easeOut", delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
});

function formatEta(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  if (mm <= 0) return `${ss}s`;
  return `${mm}m ${ss}s`;
}

/** ✅ Robust ext detection for signed URLs like .../file.png?X-Amz-... */
function guessExtFromUrl(url: string) {
  try {
    if (url.startsWith("data:")) {
      if (url.startsWith("data:image/jpeg")) return "jpg";
      if (url.startsWith("data:image/webp")) return "webp";
      if (url.startsWith("data:image/png")) return "png";
      return "png";
    }
    const u = new URL(url);
    const pathname = u.pathname || "";
    const m = pathname.match(/\.([a-zA-Z0-9]+)$/);
    const ext = (m?.[1] || "").toLowerCase();
    if (ext) return ext;
    return "png";
  } catch {
    const clean = url.split("?")[0] || url;
    const m = clean.match(/\.([a-zA-Z0-9]+)$/);
    return (m?.[1] || "png").toLowerCase();
  }
}

const clamp2: React.CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 2 as any,
  WebkitBoxOrient: "vertical" as any,
  overflow: "hidden",
};

export default function WorkspacePage() {
  const router = useRouter();
  const [tab, setTab] = useState<"face-swap" | "ai-generate">("face-swap");
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // SOURCE (uploaded face)
  const [source, setSource] = useState<any>(null);
  // TARGET (theme preview)
  const [target, setTarget] = useState<any>(null);

  const aiGenerateRef = useRef<any>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<number | null>(null);
  const [copiedThemeId, setCopiedThemeId] = useState<number | null>(null);
  const [heroThemes, setHeroThemes] = useState<any[]>([]);
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [prompt, setPrompt] = useState(
    "A cinematic neon portrait with dramatic lighting"
  );
  const [isProcessing, setProcessing] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [isPaywallOpen, setPaywallOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [results, setResults] = useState<ResultItem[]>([]);
  const [visibleCount, setVisibleCount] = useState(12);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const [lastThemeImageIndex, setLastThemeImageIndex] = useState<
    Record<number, number>
  >({});
  const [shuffleMap, setShuffleMap] = useState<Record<number, number[]>>({});
  const [generatedImage, setGeneratedImage] = useState<any>(null);

  // ✅ THEMES: FIXED (no artThemes export). We load themes via getArtThemes().
  const [themes, setThemes] = useState<any[]>([]);
  const [themesLoading, setThemesLoading] = useState(true);

  /* =========================================================
   ✅ AUTH SOFT-LOCK (UNCHANGED)
   ========================================================= */
  const AUTH_ME_ENDPOINT = "/api/me";
  const [authChecked, setAuthChecked] = useState(false);
  const [authUser, setAuthUser] = useState<any>(null);
  const isAuthed = !!authUser;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(AUTH_ME_ENDPOINT, { cache: "no-store" });
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
    };
  }, []);

  const isLocked = authChecked && !authUser;

  const goLogin = () => {
    window.location.href = "/login";
  };

  const requireAuth = (fn: () => void) => {
    if (isLocked) {
      goLogin();
      return;
    }
    fn();
  };

  /* =========================================================
   ✅ LOAD THEMES (FIXED)
   ========================================================= */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const out: any = await (getArtThemes as any)();
        const next = Array.isArray(out)
          ? out
          : Array.isArray(out?.themes)
          ? out.themes
          : [];
        if (!mounted) return;
        setThemes(next);
      } catch {
        if (!mounted) return;
        setThemes([]);
      } finally {
        if (!mounted) return;
        setThemesLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  /* =========================================================
   ✅ RESTORE RESULTS AFTER REFRESH (UNCHANGED)
   ========================================================= */
  useEffect(() => {
    (async () => {
      const dbResults = await loadResults();
      let localResults: any[] = [];
      try {
        const raw = localStorage.getItem("mitux_jobs_results");
        const parsed = raw ? JSON.parse(raw) : [];
        localResults = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.warn("Failed to restore local results:", e);
      }
      const map = new Map<string, any>();
      for (const item of localResults) {
        if (item?.id) map.set(item.id, item);
      }
      for (const item of dbResults as any[]) {
        if (item?.id && !map.has(item.id)) map.set(item.id, item);
      }
      setResults(Array.from(map.values()));
    })();
  }, []);

  useEffect(() => {
    if (!loadMoreRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + 12);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, []);

  async function toBase64(file: File): Promise<string> {
    return await new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * ✅ FIXED DOWNLOAD:
   * - For cross-origin signed URLs (Cloudflare R2), browser won't allow forced download.
   * - So we download via SAME-ORIGIN proxy: /api/download?url=...
   * - That route sets Content-Disposition: attachment.
   */
  async function downloadResult(item: any) {
    if (isLocked) return goLogin();
    const url = item?.url;
    if (!url) return;

    const ext = guessExtFromUrl(url);
    const filename =
      item?.meta?.type === "ai-generate"
        ? `ai-${item.id}.${ext}`
        : `theme-${item.id}.${ext}`;

    try {
      if (url.startsWith("data:")) {
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        return;
      }

      const proxyUrl = `/api/download?url=${encodeURIComponent(
        url
      )}&filename=${encodeURIComponent(filename)}`;

      const res = await fetch(proxyUrl, { cache: "no-store" });
      if (!res.ok) throw new Error("proxy fetch failed");

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
    } catch (e) {
      console.warn("Download failed. Opening image instead.", e);
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  /* ---------------------------------------------------
   ✅ RESTORE SELECTED THEME FROM LOCAL STORAGE (UNCHANGED behavior)
   ---------------------------------------------------- */
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem("mitux_selected_theme");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.id) setSelectedThemeId(parsed.id);
        if (parsed?.imageUrl) {
          setTarget({
            file: null,
            preview: absoluteUrl(parsed.imageUrl),
            themeId: parsed.id,
          });
        }
      }
    } catch (e) {
      console.error("Theme restore (target) error:", e);
    }
  }, []);

  useEffect(() => {
    if (themesLoading) return;
    if (!Array.isArray(themes)) return;
    try {
      const saved =
        typeof window !== "undefined"
          ? window.localStorage.getItem("mitux_selected_theme")
          : null;

      if (saved) {
        const parsed = JSON.parse(saved);
        const selected = themes.find((t: any) => t?.id === parsed?.id) || null;
        const others = themes
          .filter((t: any) => t?.id !== parsed?.id)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);
        const next = [selected, ...others].filter(Boolean);
        setHeroThemes(next.length ? next : themes.slice(0, 4));
        return;
      }

      const shuffled = shuffleAnyArray(themes);
      setHeroThemes(shuffled.slice(0, 4));
    } catch (e) {
      console.error("Theme restore (heroThemes) error:", e);
      setHeroThemes(Array.isArray(themes) ? themes.slice(0, 4) : []);
    }
  }, [themesLoading, themes]);

  /* ---------------------------------------------------
   SELECT THEME (UNCHANGED behavior)
   ---------------------------------------------------- */
  const handleThemeSelect = (themeId: number) => {
    if (isLocked) return goLogin();
    const theme = (Array.isArray(themes) ? themes : []).find(
      (t: any) => t?.id === themeId
    );
    if (!theme) return;

    const raw =
      theme.imageUrls?.[
        Math.floor(Math.random() * (theme.imageUrls?.length || 1))
      ];
    const abs = encodeURI(raw || "");

    setTarget({ file: null, preview: abs, themeId });
    setSelectedThemeId(themeId);
    setCopiedThemeId(themeId);

    window.localStorage.setItem(
      "mitux_selected_theme",
      JSON.stringify({ id: themeId, imageUrl: abs })
    );

    const label = theme.label || "Mitux AI Theme";
    navigator.clipboard?.writeText(label).catch(() => {});
    setTimeout(() => {
      setCopiedThemeId((v) => (v === themeId ? null : v));
    }, 1500);
  };

  /* ---------------------------------------------------
   FACE SWAP (UNCHANGED logic)
   ---------------------------------------------------- */
  const urlToBase64 = async (url: string) => {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  function randomizeThemeTargetSafe() {
    if (isLocked) {
      goLogin();
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      if (!selectedThemeId) return resolve();
      const theme = (Array.isArray(themes) ? themes : []).find(
        (t: any) => t?.id === selectedThemeId
      );
      if (!theme) return resolve();
      const randomImg =
        theme.imageUrls?.[
          Math.floor(Math.random() * (theme.imageUrls?.length || 1))
        ];
      const encoded = encodeURI(randomImg || "");
      setTarget({
        file: null,
        preview: encoded,
        themeId: selectedThemeId,
      });
      window.localStorage.setItem(
        "mitux_selected_theme",
        JSON.stringify({ id: selectedThemeId, imageUrl: encoded })
      );
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  }

  async function startFaceSwap() {
    if (isLocked) return goLogin();
    console.log("🚀 startFaceSwap CALLED");
    let interval: any = null;

    try {
      if (!source) return alert("Upload your face photo.");
      if (!selectedThemeId) return alert("Select a theme.");

      const theme = (Array.isArray(themes) ? themes : []).find(
        (t: any) => t?.id === selectedThemeId
      );
      if (!theme) return alert("Invalid theme selected.");
      const theme_name = theme.folder;

      setProcessing(true);
      setProgress(0);

      const placeholderId = crypto.randomUUID();
      setResults((prev) => [
        { id: placeholderId, url: null, isLoading: true } as any,
        ...(Array.isArray(prev) ? prev : []),
      ]);

      let p = 0;
      interval = setInterval(() => {
        p += Math.random() * 6;
        if (p >= 90) p = 90;
        setProgress(Math.floor(p));
      }, 150);

      let sourceFile: File | null = null;
      try {
        if (source.file) {
          sourceFile = source.file;
        } else if (source.preview?.startsWith("data:")) {
          sourceFile = dataURLtoFile(source.preview, "source.jpg");
        } else if (source.preview?.startsWith("http")) {
          const blob = await fetch(source.preview).then((r) => r.blob());
          sourceFile = new File([blob], "source.jpg", { type: blob.type });
        }
      } catch (e) {
        console.error("❌ Failed converting preview to file", e);
      }

      if (!sourceFile) {
        if (interval) clearInterval(interval);
        setProcessing(false);
        return alert("Invalid source image.");
      }

      const form = new FormData();
      form.append("source_img", sourceFile);
      form.append("theme_name", theme_name);

      const res = await fetch("/api/faceswap", {
        method: "POST",
        body: form,
      });

      const raw = await res.text();
      console.log("📦 RAW backend response:", raw);

      let data: any;
      try {
        data = JSON.parse(raw);
      } catch (e) {
        console.error("❌ Backend JSON parse failed", raw);
        throw new Error("Invalid JSON from backend");
      }

      if (!res.ok) {
        console.error("Faceswap failed:", data);
        throw new Error(data?.error || data?.detail || "Backend error");
      }

      const finalSrc = pickFinalImageSrcFromBackend(data);
      if (!finalSrc) {
        console.error("Faceswap response missing image:", data);
        throw new Error("Backend returned no image");
      }

      const finalItem: any = {
        id: crypto.randomUUID(),
        url: finalSrc,
        createdAt: Date.now(),
        meta: {
          type: "Theme-gen",
          gender: data?.gender,
          hair: data?.hair,
          target_used: data?.used_target ?? data?.target_used,
          theme: data?.theme ?? data?.resolved_theme ?? theme_name,
          size: data?.result_size,
          similarity: data?.similarity,
          mime: data?.mime,
        },
      };

      await saveResult(finalItem);

      setResults((prev) =>
        (Array.isArray(prev) ? prev : []).map((x: any) =>
          x.id === placeholderId ? finalItem : x
        )
      );

      setResultImage(finalSrc);
      setProgress(100);

      if (interval) clearInterval(interval);
      setProcessing(false);
    } catch (err: any) {
      console.error("🔥 FACE SWAP ERROR:", err);
      alert(err?.message || "Unknown error");
      if (interval) clearInterval(interval);
      setResults((prev) =>
        (Array.isArray(prev) ? prev : []).filter(
          (x: any) => x?.isLoading !== true
        )
      );
      setProcessing(false);
    }
  }

  function handleRegen(item: any) {
    if (isLocked) return goLogin();
    if (!item?.meta) return;

    if (item.meta.type === "Theme-gen") {
      startFaceSwap();
      return;
    }

    if (item.meta.type === "ai-generate") {
      if (!item.meta.prompt) {
        alert("No prompt found for this image.");
        return;
      }
      if (!aiGenerateRef?.current) {
        alert("AI generator not ready yet.");
        return;
      }

      const regenPrompt = `
${item.meta.prompt},
same person,
new pose,
different camera angle,
ultra realistic,
high detail,
sharp focus
`
        .replace(/\s+/g, " ")
        .trim();

      aiGenerateRef.current({
        overridePrompt: regenPrompt,
      });
    }
  }

  /* ---------------------------------------------------
   ✅ ADVANCED PAYWALL (unchanged logic)
   ---------------------------------------------------- */
  const packs = useMemo(
    () => [
      { c: 3, p: 199, name: "Starter", desc: "Try it out", badge: "" },
      {
        c: 10,
        p: 499,
        name: "Most popular",
        desc: "Best value",
        badge: "Most popular",
      },
      {
        c: 30,
        p: 999,
        name: "Pro",
        desc: "For power users",
        badge: "Best value",
      },
    ],
    []
  );

  const [selectedPackCredits, setSelectedPackCredits] = useState<number>(() => {
    if (typeof window === "undefined") return 10;
    try {
      const raw = localStorage.getItem("mitux_selected_pack");
      if (!raw) return 10;
      const parsed = JSON.parse(raw);
      return Number(parsed?.credits) || 10;
    } catch {
      return 10;
    }
  });

  useEffect(() => {
    if (!isPaywallOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isPaywallOpen]);

  const persistSelectedPack = (credits: number) => {
    const pack = packs.find((x) => x.c === credits) || packs[0];
    try {
      localStorage.setItem(
        "mitux_selected_pack",
        JSON.stringify({
          credits: pack.c,
          price: pack.p,
          at: Date.now(),
        })
      );
    } catch {}
  };

  const selectPack = (credits: number) => {
    setSelectedPackCredits(credits);
    persistSelectedPack(credits);
  };

  const continueToBilling = () => {
    if (isLocked) return goLogin();
    persistSelectedPack(selectedPackCredits);
    setPaywallOpen(false);
    router.push(
      `/billing?pack=${encodeURIComponent(String(selectedPackCredits))}`
    );
  };

  // ✅ helper: keep localStorage sync for results (stable)
  const persistResultsToLocal = useCallback((arr: any[]) => {
    try {
      const finals = (Array.isArray(arr) ? arr : []).filter(
        (x) => x?.isLoading !== true
      );
      localStorage.setItem("mitux_jobs_results", JSON.stringify(finals));
    } catch (e) {
      console.warn("Failed to persist results:", e);
    }
  }, []);

  // ✅ prevent infinite loop + merge AI results into unified list
  const areResultsSame = (a: any[], b: any[]) => {
    if (a === b) return true;
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      const x = a[i];
      const y = b[i];
      if ((x?.id ?? "") !== (y?.id ?? "")) return false;
      if ((x?.url ?? "") !== (y?.url ?? "")) return false;
      if ((x?.isLoading ?? false) !== (y?.isLoading ?? false)) return false;
    }
    return true;
  };

  const handleResultsChange = useCallback(
    (updaterOrNext: any) => {
      setResults((prevAll) => {
        const safePrev = Array.isArray(prevAll) ? prevAll : [];
        if (typeof updaterOrNext === "function") {
          const maybeNext = updaterOrNext(safePrev);
          const safeNext = Array.isArray(maybeNext) ? maybeNext : safePrev;
          if (areResultsSame(safePrev, safeNext)) return safePrev;
          persistResultsToLocal(safeNext);
          return safeNext;
        }

        const incoming = Array.isArray(updaterOrNext) ? updaterOrNext : [];
        const incomingIds = new Set(
          incoming.map((x: any) => x?.id).filter(Boolean)
        );

        const kept = safePrev.filter((x: any) => {
          if (x?.isLoading === true) return true;
          const t = x?.meta?.type;
          if (t === "ai-generate") return incomingIds.has(x?.id);
          return true;
        });

        const map = new Map<string, any>();
        for (const item of kept) if (item?.id) map.set(item.id, item);
        for (const item of incoming) if (item?.id) map.set(item.id, item);

        const merged = Array.from(map.values()).sort(
          (a: any, b: any) => (b?.createdAt ?? 0) - (a?.createdAt ?? 0)
        );

        if (areResultsSame(safePrev, merged)) return safePrev;
        persistResultsToLocal(merged);
        return merged;
      });
    },
    [persistResultsToLocal]
  );

  const handleResultGenerated = useCallback(
    (item: any) => {
      setResults((prev) => {
        const safePrev = Array.isArray(prev) ? prev : [];
        if (item?.__remove === true) {
          const next = safePrev.filter((x: any) => x.id !== item.id);
          persistResultsToLocal(next);
          return next;
        }
        const idx = safePrev.findIndex((x: any) => x.id === item.id);
        let nextArr: any[];
        if (idx !== -1) {
          const copy = [...safePrev];
          copy[idx] = item;
          nextArr = copy;
        } else {
          nextArr = [item, ...safePrev];
        }
        persistResultsToLocal(nextArr);
        return nextArr;
      });
    },
    [persistResultsToLocal]
  );

  const registerAIGenerate = useCallback((fn: any) => {
    aiGenerateRef.current = fn;
  }, []);

  /* ---------------------------------------------------
   ✅ NEW: Jobs-only processing UI + “Queue 3→2→1”
   - NO whole-page overlay
   - Only shows inside Jobs card
   ---------------------------------------------------- */
  const [queuePhase, setQueuePhase] = useState<QueuePhase>("idle");
  const [queuePos, setQueuePos] = useState<number>(3);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!isProcessing) {
      setQueuePhase("idle");
      setQueuePos(3);
      setStartedAt(null);
      return;
    }
    if (!startedAt) setStartedAt(Date.now());
    setQueuePhase("queued");
    setQueuePos(3);
  }, [isProcessing, startedAt]);

  useEffect(() => {
    if (!isProcessing) return;
    if (progress >= 10) setQueuePhase("generating");
    if (progress >= 100) setQueuePhase("idle");
  }, [isProcessing, progress]);

  useEffect(() => {
    if (!isProcessing) return;
    if (queuePhase !== "queued") return;
    const t = setInterval(() => {
      setQueuePos((p) => (p > 1 ? p - 1 : 1));
    }, 2200);
    return () => clearInterval(t);
  }, [isProcessing, queuePhase]);

  const etaSeconds = useMemo(() => {
    if (!isProcessing || !startedAt) return 0;
    const elapsed = (Date.now() - startedAt) / 1000;
    const base = Math.max(8, 30 - Math.floor(progress / 4));
    const sticky = progress >= 85 && progress < 100 ? 18 : 0;
    return Math.max(3, Math.floor(base + sticky - elapsed / 2));
  }, [isProcessing, startedAt, progress]);

  /* ---------------------------------------------------
   UI (Responsive fixes added; logic same)
   ---------------------------------------------------- */
  return (
    <AuthWall mode="soft">
      <div className="relative min-h-screen bg-[#07070B] text-white pb-20 overflow-hidden">
        {/* Ambient */}
        <div className="absolute inset-0">
          <div className="absolute -top-48 left-1/2 h-[560px] w-[980px] -translate-x-1/2 rounded-full bg-purple-600/20 blur-[140px]" />
          <div className="absolute bottom-[-240px] right-[-140px] h-[560px] w-[560px] rounded-full bg-indigo-500/18 blur-[140px]" />
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.04]" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-black/50" />
        </div>

        {/* ✅ Single container for navbar + workspace */}
        <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-6">
          {/* Top bar */}
          <header className="relative z-10">
            <MotionCard
              className="rounded-3xl border border-white/10 bg-white/[0.05] backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.35)]"
              delay={0.02}
            >
              <div className="flex flex-col gap-4 p-4 sm:p-5">
                {/* Row 1 */}
                <div className="flex items-center justify-between gap-3">
                  {/* Brand */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 shrink-0 rounded-2xl overflow-hidden bg-white/10 border border-white/10 flex items-center justify-center">
                      <img
                        src="/logo.jpeg"
                        alt="Gerox"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-base font-semibold">Gerox</p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-white/70">
                          Workspace
                        </span>
                      </div>
                      <p className="text-[12px] text-white/55 truncate">
                        Trending Ai Themes · Private photoshoot
                      </p>
                    </div>
                  </div>

                  {/* Desktop actions */}
                  <div className="hidden md:flex items-center gap-3">
                    {isAuthed ? (
                      <>
                        <div className="hidden lg:block">
                          <CreditsBar />
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.98 }}
                          whileHover={{ scale: 1.01 }}
                          onClick={() => setPaywallOpen(true)}
                          className="px-4 py-2 rounded-2xl bg-white text-black font-semibold shadow hover:bg-gray-200 transition"
                        >
                          Buy Credits
                        </motion.button>
                        <ProfileAvatar />
                      </>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        whileHover={{ scale: 1.01 }}
                        onClick={goLogin}
                        className="px-4 py-2 rounded-2xl bg-white/10 border border-white/15 text-white font-semibold hover:bg-white/15 transition"
                      >
                        Login
                      </motion.button>
                    )}
                  </div>

                  {/* Mobile top-right */}
                  <div className="md:hidden shrink-0">
                    {isAuthed ? (
                      <ProfileAvatar />
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={goLogin}
                        className="px-4 py-2 rounded-2xl bg-white/10 border border-white/15 text-white font-semibold hover:bg-white/15 transition"
                      >
                        Login
                      </motion.button>
                    )}
                  </div>
                </div>

                {/* Row 2: Mobile actions */}
                <div className="md:hidden w-full">
                  {isAuthed ? (
                    <div className="grid grid-cols-1 gap-3">
                      <div className="w-full">
                        <CreditsBar />
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setPaywallOpen(true)}
                        className="w-full py-3 rounded-2xl bg-white text-black font-semibold shadow hover:bg-gray-200 transition"
                      >
                        Buy Credits
                      </motion.button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3" />
                  )}
                </div>
              </div>
              <div className="h-px bg-white/10" />
            </MotionCard>
          </header>

          {/* content */}
          <div className="mt-6 sm:mt-8">
            <div className="grid grid-cols-12 gap-6">
              {/* Sidebar */}
              <aside className="col-span-12 md:col-span-4 space-y-6">
                <MotionCard
                  className="rounded-[28px] border border-white/10 bg-white/[0.05] backdrop-blur-xl p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)]"
                  delay={0.06}
                >
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/45 mb-4">
                    Workspace
                  </p>

                  <div className="flex gap-3 mb-6">
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setTab("face-swap")}
                      className={`flex-1 py-2.5 text-sm rounded-2xl font-semibold transition border ${
                        tab === "face-swap"
                          ? "bg-white text-black border-transparent shadow"
                          : "bg-black/20 text-white/80 border-white/10 hover:bg-white/5"
                      }`}
                    >
                      Trending Art
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setTab("ai-generate")}
                      className={`flex-1 py-2.5 text-sm rounded-2xl font-semibold transition border ${
                        tab === "ai-generate"
                          ? "bg-white text-black border-transparent shadow"
                          : "bg-black/20 text-white/80 border-white/10 hover:bg-white/5"
                      }`}
                    >
                      Private Photoshoot
                    </motion.button>
                  </div>

                  {isLocked && (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-5">
                      <div className="flex items-center gap-2 text-white/85">
                        <Lock size={16} />
                        <p className="text-sm font-semibold">Login required</p>
                      </div>
                      <p className="text-[12px] text-white/55 mt-1 leading-snug">
                        Browse freely — but to generate, download, regen, or save
                        history, please login.
                      </p>
                      <button
                        onClick={goLogin}
                        className="mt-3 w-full py-2.5 rounded-2xl bg-white text-black font-semibold text-sm hover:bg-gray-200 transition"
                      >
                        Login to unlock
                      </button>
                    </div>
                  )}
                </MotionCard>
              </aside>

              {/* Main panel */}
              <section className="col-span-12 md:col-span-8 space-y-6">
                {/* Generator card */}
                <MotionCard
                  className="relative rounded-[28px] border border-white/10 bg-white/[0.05] backdrop-blur-xl p-5 sm:p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)]"
                  delay={0.09}
                >
                  {isLocked && (
                    <div className="absolute inset-0 z-20 rounded-[28px] bg-black/55 backdrop-blur-[2px] flex items-center justify-center p-6">
                      <div className="max-w-md w-full rounded-[24px] border border-white/10 bg-black/40 p-6 shadow-2xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                            <Lock size={18} />
                          </div>
                          <div>
                            <p className="text-base font-semibold">
                              Login to use Gerox
                            </p>
                            <p className="text-[12px] text-white/60">
                              Themes are visible, generation is locked.
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex gap-3">
                          <button
                            onClick={goLogin}
                            className="flex-1 py-2.5 rounded-2xl bg-white text-black font-semibold hover:bg-gray-200 transition"
                          >
                            Login
                          </button>
                          <Link
                            href="/themes"
                            className="flex-1 py-2.5 rounded-2xl bg-white/5 border border-white/15 text-white/90 font-semibold hover:bg-white/10 transition text-center"
                          >
                            Browse themes
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ✅ Responsive header block (prevents overflow on mobile) */}
                  <div className="flex flex-col sm:flex-row sm:items-center items-start justify-between gap-3 sm:gap-4 mb-4">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                        STEP 1
                      </p>
                      <h2 className="mt-1 text-xl sm:text-2xl font-semibold leading-tight break-words">
                        {tab === "face-swap"
                          ? "Realistic Portrait Generator"
                          : "Ultra Realistic Photoshoot"}
                      </h2>
                      <p className="mt-1 text-[12px] text-white/55 leading-snug break-words">
                        {tab === "face-swap"
                          ? "Pick a trending AI art theme, then drop your face into it with one click."
                          : "High-quality AI image generation is available here (your existing logic stays)."}
                      </p>
                    </div>

                    <div className="hidden md:flex items-center gap-2 text-[11px] px-3 py-1 rounded-full bg-black/25 border border-white/10 text-white/60 whitespace-nowrap">
                      <Sparkles size={14} />
                      Live preview
                    </div>
                  </div>

                  {/* Face swap tab */}
                  {tab === "face-swap" && (
                    <div className="mt-4 space-y-6">
                      {/* ✅ Responsive row: stacks on mobile */}
                      <div className="flex flex-col sm:flex-row sm:items-center items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-base sm:text-lg font-semibold leading-tight break-words">
                            Trending AI art themes
                          </p>
                          <p className="text-[12px] text-white/55 leading-snug break-words">
                            Tap a theme or browse the full library.
                          </p>
                        </div>

                        <Link
                          href="/themes"
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/15 text-[12px] text-white/85 hover:bg-white/10 transition whitespace-nowrap"
                        >
                          Browse more AI art <span aria-hidden>→</span>
                        </Link>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {heroThemes.map((theme) => {
                          if (!theme) return null;
                          const isActive = selectedThemeId === theme.id;
                          const isCopied = copiedThemeId === theme.id;
                          return (
                            <motion.button
                              key={theme.id}
                              type="button"
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleThemeSelect(theme.id)}
                              className={[
                                "relative overflow-hidden rounded-3xl cursor-pointer bg-black/25 border transition-all duration-300 group text-left",
                                isActive
                                  ? "border-purple-400/60 ring-2 ring-purple-500/40"
                                  : "border-white/10 hover:border-white/20",
                              ].join(" ")}
                            >
                              <img
                                src={encodeURI(theme.imageUrls?.[0] || "")}
                                alt={theme.label}
                                className="w-full h-[210px] sm:h-[240px] object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                              {isActive && (
                                <div className="absolute top-3 left-3 z-20 w-8 h-8 rounded-full bg-purple-500/90 flex items-center justify-center text-white shadow-lg">
                                  ✓
                                </div>
                              )}

                              {isActive && isCopied && (
                                <div className="absolute top-3 right-3 z-20 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/90 text-black font-semibold animate-pulse">
                                  Selected
                                </div>
                              )}

                              {/* ✅ Clamp text to avoid overflow on mobile */}
                              <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 z-10">
                                <h3
                                  className="text-sm font-semibold text-white leading-snug"
                                  style={clamp2}
                                >
                                  {theme.label}
                                </h3>
                                <p
                                  className="text-xs text-white/60 mt-0.5 leading-snug"
                                  style={clamp2}
                                >
                                  {theme.tag || "Creative imagination"}
                                </p>
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>

                      {/* Step 2 */}
                      <div className="rounded-[28px] border border-white/10 bg-white/[0.05] backdrop-blur-xl p-5 sm:p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-white/45 mb-2">
                          Step 2
                        </p>
                        <p className="text-lg sm:text-xl font-semibold leading-tight">
                          Your photo
                        </p>
                        <p className="text-[12px] text-white/55 mt-1 leading-snug">
                          Upload a face photo or pick a prototype.
                        </p>

                        {/* ✅ Wrap-friendly for small screens */}
                        <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-4">
                          <label
                            className="relative w-20 h-20 rounded-full border border-white/18 bg-black/25 flex items-center justify-center overflow-hidden cursor-pointer group shrink-0"
                            onClick={(e) => {
                              if (isLocked) {
                                e.preventDefault();
                                goLogin();
                              }
                            }}
                          >
                            {source?.preview ? (
                              <>
                                <img
                                  src={source.preview}
                                  alt="Your photo"
                                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-medium text-white/90 transition-opacity">
                                  Change
                                </div>
                              </>
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-1 text-[10px] text-white/55">
                                <span className="text-xl leading-none">＋</span>
                                <span>Upload</span>
                              </div>
                            )}

                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={isLocked}
                              onChange={async (e) => {
                                if (isLocked) return goLogin();
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                  const dataUrl = await toBase64(file);
                                  setSource({
                                    file,
                                    preview: dataUrl,
                                    type: "base64",
                                  });
                                } catch (err) {
                                  console.error("File -> base64 error:", err);
                                  alert(
                                    "Failed to read file. Try another photo."
                                  );
                                } finally {
                                  if (fileInputRef.current)
                                    fileInputRef.current.value = "";
                                }
                              }}
                            />
                          </label>

                          <div className="flex items-center gap-3 flex-wrap">
                            {prototypeFaces.map((p: any) => (
                              <motion.button
                                key={p.id}
                                type="button"
                                whileTap={{ scale: 0.98 }}
                                onClick={async () => {
                                  if (isLocked) return goLogin();
                                  try {
                                    const imgBase64 = await urlToBase64(
                                      absoluteUrl(p.imageUrl)
                                    );
                                    setSource({
                                      file: null,
                                      preview: imgBase64,
                                      type: "base64",
                                    });
                                  } catch (err) {
                                    console.error(
                                      "URL -> base64 failed:",
                                      err
                                    );
                                    alert(
                                      "Failed to load prototype face. Try again."
                                    );
                                  }
                                }}
                                className="group relative w-20 h-20 rounded-full overflow-hidden border border-white/15 bg-black/25 hover:border-white/40 hover:scale-105 transition"
                              >
                                <img
                                  src={p.imageUrl}
                                  alt={p.label}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[9px] text-white/85 px-2 text-center">
                                  {p.label}
                                </div>
                              </motion.button>
                            ))}
                          </div>
                        </div>

                        <div className="mt-4 text-[11px] text-white/55 leading-snug break-words">
                          <span className="text-white/80 font-semibold">
                            Best results:
                          </span>{" "}
                          good lighting · face centered · minimal blur · no heavy
                          filters
                          {source && target && (
                            <div className="mt-2 text-emerald-300 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Ready — press Start Image Generation
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Main action */}
                      {isLocked ? (
                        <button
                          onClick={goLogin}
                          className="w-full mt-2 py-4 rounded-2xl font-semibold bg-white/10 border border-white/15 text-white/80 hover:bg-white/15 transition flex items-center justify-center gap-2"
                        >
                          <Lock size={16} /> Login to Start Image Generation
                        </button>
                      ) : (
                        <StartGenerationButton
                          randomizeThemeTargetSafe={randomizeThemeTargetSafe}
                          startFaceSwap={startFaceSwap}
                          isProcessing={isProcessing}
                          setProcessing={setProcessing}
                        />
                      )}
                    </div>
                  )}

                  {/* AI generate tab */}
                  {tab === "ai-generate" && (
                    <div className="mt-4">
                      {isLocked ? (
                        <div className="mt-2 rounded-2xl border border-white/10 bg-black/25 p-6">
                          <div className="flex items-center gap-2">
                            <Lock size={16} />
                            <p className="text-sm font-semibold">
                              Private Photoshoot is locked
                            </p>
                          </div>
                          <p className="text-[12px] text-white/60 mt-1">
                            Login to generate, save results, regen, download, and
                            keep history.
                          </p>
                          <button
                            onClick={goLogin}
                            className="mt-4 w-full py-3 rounded-2xl bg-white text-black font-semibold hover:bg-gray-200 transition"
                          >
                            Login to unlock
                          </button>
                        </div>
                      ) : (
                        <AIGenerateTab
                          onResultGenerated={handleResultGenerated}
                          registerAIGenerate={registerAIGenerate}
                          setProcessing={setProcessing}
                          setProgress={setProgress}
                          onResultsChange={handleResultsChange}
                        />
                      )}
                    </div>
                  )}
                </MotionCard>

                {/* Jobs */}
                <MotionCard
                  className="rounded-[28px] border border-white/10 bg-white/[0.05] backdrop-blur-xl p-5 sm:p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)]"
                  delay={0.12}
                >
                  <div className="flex items-center justify-between mb-4 gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                        Library
                      </p>
                      <h3 className="text-lg sm:text-xl font-semibold mt-1">
                        Jobs
                      </h3>
                      <p className="text-[12px] text-white/55 mt-1">
                        Playground history
                      </p>
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={async () => {
                        if (isLocked) return goLogin();
                        await clearResults();
                        setResults([]);
                        try {
                          localStorage.removeItem("mitux_jobs_results");
                        } catch {}
                      }}
                      className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-2xl bg-red-600 text-white hover:bg-red-500 transition shadow whitespace-nowrap"
                    >
                      Clear History
                    </motion.button>
                  </div>

                  {/* ✅ Jobs-only processing UI (no whole page) */}
                  <AnimatePresence>
                    {isProcessing && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, filter: "blur(6px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="mb-5 rounded-3xl border border-white/10 bg-black/25 p-4 sm:p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-[11px] uppercase tracking-[0.22em] text-white/55">
                              Processing
                            </p>
                            <p className="text-base sm:text-lg font-semibold mt-1 break-words">
                              {queuePhase === "queued"
                                ? `Queued • position ${queuePos}`
                                : "Generating… please keep this tab open"}
                            </p>
                            <p className="text-xs text-white/55 mt-1 break-words">
                              You can continue browsing — results will appear in
                              Jobs.
                              {etaSeconds > 0 ? (
                                <>
                                  {" "}
                                  <span className="text-white/75 font-semibold">
                                    ETA ~ {formatEta(etaSeconds)}
                                  </span>
                                </>
                              ) : null}
                            </p>
                          </div>
                          <div className="text-white/70 text-sm font-semibold shrink-0">
                            {Math.min(99, Math.max(0, progress))}%
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${progress}%` }}
                              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-200 shadow-[0_0_10px_rgba(168,85,247,0.55)]"
                            />
                          </div>
                          <div className="mt-2 flex items-center justify-between text-[11px] text-white/55 gap-3">
                            <span>
                              {queuePhase === "queued"
                                ? "Waiting for a worker…"
                                : "Running model…"}
                            </span>
                            <span className="text-white/45 whitespace-nowrap">
                              Don’t refresh
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {results.length > 0 && (
                    <div className="mt-4 grid gap-6 grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
                      {results
                        .slice(0, visibleCount)
                        .map((item: any, index: number) =>
                          item.isLoading ? (
                            <div
                              key={`${item.id || "loading"}-${index}`}
                              className="animate-pulse bg-black/25 rounded-3xl border border-white/10 p-5 shadow-xl"
                            >
                              <div className="w-full flex justify-center mb-4">
                                <div className="w-full max-w-[340px] aspect-[4/5] rounded-2xl border border-white/10 bg-white/5" />
                              </div>
                              <div className="flex items-center justify-center gap-3 mt-auto">
                                <div className="h-9 w-24 rounded-2xl bg-white/5 border border-white/10" />
                                <div className="h-9 w-24 rounded-2xl bg-white/5 border border-white/10" />
                                <div className="h-9 w-10 rounded-2xl bg-white/5 border border-white/10" />
                              </div>
                            </div>
                          ) : (
                            <motion.div
                              key={`${item.id}-${index}`}
                              id={`card-${item.id}`}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.25, ease: "easeOut" }}
                              className="bg-black/25 border border-white/10 rounded-3xl p-5 shadow-xl flex flex-col transition-all duration-300"
                            >
                              <div className="w-full flex justify-center mb-5">
                                <div className="w-full max-w-[340px] aspect-[4/5] rounded-2xl overflow-hidden border border-white/10 shadow-md">
                                  <img
                                    loading="lazy"
                                    src={item.url}
                                    alt="Result"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              </div>

                              <div className="flex justify-center gap-3 pt-4 border-t border-white/10 flex-wrap">
                                <RegenButton
                                  item={item}
                                  handleRegen={(x: any) => {
                                    if (isLocked) return goLogin();
                                    handleRegen(x);
                                  }}
                                />

                                <motion.button
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => {
                                    setFullscreenImage(item.url);
                                    setFullscreen(true);
                                  }}
                                  className="px-4 py-2 text-xs sm:text-sm bg-white/5 text-white rounded-2xl border border-white/10 shadow hover:bg-white/10 transition flex items-center gap-2"
                                >
                                  <Maximize2 size={16} /> Full
                                </motion.button>

                                <motion.button
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => downloadResult(item)}
                                  className="p-2.5 rounded-2xl bg-emerald-500 text-black shadow hover:bg-emerald-400 transition"
                                  aria-label="Download"
                                >
                                  <Download size={16} />
                                </motion.button>

                                <motion.button
                                  whileTap={{ scale: 0.98 }}
                                  onClick={async () => {
                                    if (isLocked) return goLogin();
                                    const el = document.getElementById(
                                      `card-${item.id}`
                                    );
                                    if (el) el.classList.add("opacity-50");
                                    setTimeout(async () => {
                                      await deleteResult(item.id);
                                      setResults((prev) =>
                                        (Array.isArray(prev) ? prev : []).filter(
                                          (r: any) => r.id !== item.id
                                        )
                                      );
                                    }, 200);
                                  }}
                                  className="p-2.5 rounded-2xl bg-red-500/80 text-white shadow hover:bg-red-500 transition"
                                  aria-label="Delete"
                                >
                                  <Trash2 size={16} />
                                </motion.button>
                              </div>
                            </motion.div>
                          )
                        )}
                    </div>
                  )}

                  <div ref={loadMoreRef} className="w-full h-10" />
                </MotionCard>

                {/* Fullscreen viewer */}
                {fullscreen && fullscreenImage && (
                  <ZoomViewer
                    image={fullscreenImage}
                    onClose={() => {
                      setFullscreen(false);
                      setFullscreenImage(null);
                    }}
                  />
                )}
              </section>
            </div>
          </div>
        </main>

        {/* ✅ ADVANCED PAYWALL MODAL (unchanged, kept) */}
        {isPaywallOpen && (
          <div
            className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
              onClick={() => setPaywallOpen(false)}
            />
            <div
              className={[
                "relative w-full sm:max-w-3xl",
                "sm:rounded-[28px] rounded-t-[28px]",
                "border border-white/10 bg-[#0B0B10]/90 backdrop-blur-xl",
                "shadow-[0_40px_140px_rgba(0,0,0,0.65)]",
                "max-h-[88vh] sm:max-h-[85vh]",
                "overflow-y-auto overscroll-contain",
                "touch-pan-y",
              ].join(" ")}
            >
              <div className="sticky top-0 z-10 bg-[#0B0B10]/85 backdrop-blur-xl border-b border-white/10">
                <div className="p-4 sm:p-6 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-white/55">
                      <ShieldCheck size={14} />
                      Secure checkout
                    </div>
                    <h3 className="mt-1 text-xl sm:text-2xl font-semibold">
                      Buy credits
                    </h3>
                    <p className="text-[12px] sm:text-sm text-white/60 mt-1">
                      Credits are used for image generation and re-generation.
                    </p>
                  </div>
                  <button
                    onClick={() => setPaywallOpen(false)}
                    className="shrink-0 p-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {packs.map((pk) => {
                    const active = selectedPackCredits === pk.c;
                    return (
                      <button
                        key={pk.c}
                        type="button"
                        onClick={() => selectPack(pk.c)}
                        className={[
                          "text-left rounded-[26px] border p-5 transition",
                          "bg-black/25 hover:bg-black/30",
                          active
                            ? "border-purple-400/60 ring-2 ring-purple-500/40"
                            : "border-white/10 hover:border-white/20",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[12px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-white/70">
                                {pk.name}
                              </span>
                              {active && (
                                <span className="text-[12px] px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/25 text-emerald-200">
                                  Selected
                                </span>
                              )}
                            </div>
                            <div className="mt-4">
                              <p className="text-5xl font-semibold leading-none">
                                {pk.c}
                              </p>
                              <p className="text-lg text-white/70 mt-2">
                                Credits
                              </p>
                            </div>
                            <div className="mt-5">
                              <p className="text-2xl font-semibold">₹{pk.p}</p>
                              <p className="text-[12px] text-white/50 mt-1">
                                {pk.desc}
                              </p>
                            </div>
                          </div>
                          <div className="shrink-0 h-12 w-12 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-center">
                            <CreditCard size={18} className="text-white/70" />
                          </div>
                        </div>
                        <div className="mt-5">
                          <div
                            className={[
                              "w-full py-3 rounded-2xl font-semibold text-center transition border",
                              active
                                ? "bg-white text-black border-transparent"
                                : "bg-white/5 text-white/85 border-white/10 hover:bg-white/10",
                            ].join(" ")}
                          >
                            {active ? "Selected" : "Select pack"}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4 text-[12px] text-white/60">
                  <span className="text-white/80 font-semibold">Tip:</span> For
                  the smoothest flow, continue to the Billing page where your
                  balance & history update instantly.
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaywallOpen(false)}
                    className="py-3 rounded-2xl bg-white/5 border border-white/10 text-white/85 hover:bg-white/10 transition"
                  >
                    Not now
                  </button>
                  <button
                    onClick={continueToBilling}
                    className="py-3 rounded-2xl bg-white text-black font-semibold hover:bg-gray-200 transition flex items-center justify-center gap-2"
                  >
                    Continue to Billing <ArrowRight size={18} />
                  </button>
                </div>

                <div className="h-6" />
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthWall>
  );
}
