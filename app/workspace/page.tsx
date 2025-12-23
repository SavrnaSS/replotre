"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
import ZoomViewer from "@/app/components/fullscreen/ZoomViewer";
import AIGenerateTab from "@/app/components/AIGenerateTab";

import { artThemes, prototypeFaces } from "@/app/config/artThemes";

import {
  loadResults,
  saveResult,
  clearResults,
  ResultItem,
  deleteResult,
} from "@/app/lib/db";

/* ---------------------------------------------------
 WORKSPACE PAGE (your existing logic preserved)
---------------------------------------------------- */

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

  function shuffleArray(arr: number[]) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

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

  async function downloadResult(item: any) {
    if (isLocked) return goLogin();

    const url = item?.url;
    if (!url) return;

    const ext = url.startsWith("data:image/jpeg")
      ? "jpg"
      : url.startsWith("data:image/webp")
      ? "webp"
      : "png";

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

      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.warn("Download blocked (likely CORS). Opening image instead.", e);
      window.open(url, "_blank");
    }
  }

  /* ---------------------------------------------------
   RESTORE SELECTED THEME FROM LOCAL STORAGE (UNCHANGED)
   ---------------------------------------------------- */
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const saved = window.localStorage.getItem("mitux_selected_theme");

      if (saved) {
        const parsed = JSON.parse(saved);

        setTarget({
          file: null,
          preview: absoluteUrl(parsed.imageUrl),
          themeId: parsed.id,
        });

        setSelectedThemeId(parsed.id);

        const selectedTheme = artThemes.find((t) => t.id === parsed.id);
        const others = artThemes
          .filter((t) => t.id !== parsed.id)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);

        setHeroThemes([selectedTheme, ...others]);
      } else {
        const shuffled = [...artThemes].sort(() => Math.random() - 0.5);
        setHeroThemes(shuffled.slice(0, 4));
      }
    } catch (e) {
      console.error("Theme restore error:", e);
    }
  }, []);

  /* ---------------------------------------------------
   SELECT THEME (UNCHANGED)
   ---------------------------------------------------- */
  const handleThemeSelect = (themeId: number) => {
    if (isLocked) return goLogin();

    const theme = artThemes.find((t) => t.id === themeId);
    if (!theme) return;

    const raw =
      theme.imageUrls[Math.floor(Math.random() * theme.imageUrls.length)];
    const abs = encodeURI(raw);

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
   FACE SWAP (UNCHANGED)
   ---------------------------------------------------- */

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

  function stripDataPrefix(b64: string) {
    if (!b64) return b64;
    return b64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "");
  }

  function normalizeFrontendImageInput(input: any) {
    if (!input?.preview) return null;

    const preview = input.preview;

    if (preview.startsWith("data:"))
      return { type: "raw-base64", value: stripDataPrefix(preview) };

    if (preview.startsWith("/mnt/") || preview.startsWith("/tmp/"))
      return { type: "local-path", value: preview };

    if (preview.startsWith("http://") || preview.startsWith("https://"))
      return { type: "url", value: preview };

    if (preview.startsWith("/"))
      return { type: "url", value: absoluteUrl(preview) };

    return { type: "url", value: preview };
  }

  function dataURLtoFile(dataurl: string, filename = "file.jpg") {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }

  async function startFaceSwap() {
    if (isLocked) return goLogin();

    console.log("🚀 startFaceSwap CALLED");
    try {
      if (!source) return alert("Upload your face photo.");
      if (!selectedThemeId) return alert("Select a theme.");

      const theme = artThemes.find((t) => t.id === selectedThemeId);
      if (!theme) return alert("Invalid theme selected.");
      const theme_name = theme.folder;

      setProcessing(true);
      setProgress(0);

      const placeholderId = crypto.randomUUID();
      setResults((prev) => [
        { id: placeholderId, url: null, isLoading: true } as any,
        ...prev,
      ]);

      let p = 0;
      const interval = setInterval(() => {
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
        clearInterval(interval);
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

      if (!res.ok) throw new Error(data.error || "Backend error");
      if (!data.image) throw new Error("Backend returned no image");

      let cleanBase64 = data.image;
      cleanBase64 = cleanBase64.replace(/^"|"$/g, "").replace(/\n/g, "").trim();

      const mime = data.mime || "image/png";
      const finalDataUrl = `data:${mime};base64,${cleanBase64}`;

      const finalItem: any = {
        id: crypto.randomUUID(),
        url: finalDataUrl,
        createdAt: Date.now(),
        meta: {
          type: "Theme-gen",
          gender: data.gender,
          hair: data.hair,
          target_used: data.used_target,
          theme: data.resolved_theme,
          size: data.result_size,
        },
      };

      await saveResult(finalItem);

      setResults((prev) =>
        prev.map((x: any) => (x.id === placeholderId ? finalItem : x))
      );

      setResultImage(finalDataUrl);
      setProgress(100);
      clearInterval(interval);
      setProcessing(false);
    } catch (err: any) {
      console.error("🔥 FACE SWAP ERROR:", err);
      alert(err.message || "Unknown error");
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

      const theme = artThemes.find((t) => t.id === selectedThemeId);
      if (!theme) return resolve();

      const randomImg =
        theme.imageUrls[Math.floor(Math.random() * theme.imageUrls.length)];

      const encoded = encodeURI(randomImg);

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

  /* ---------------------------------------------------
   ✅ ADVANCED PAYWALL (new; does not break existing logic)
   - Scrollable on mobile (no “can’t swipe” issue)
   - Stores selected pack in localStorage so Billing can show it pre-selected
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
      { c: 30, p: 999, name: "Pro", desc: "For power users", badge: "Best value" },
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

    // lock body scroll behind modal (modal remains scrollable)
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
    // add query param too (optional but helpful)
    router.push(`/billing?pack=${encodeURIComponent(String(selectedPackCredits))}`);
  };

  /* ---------------------------------------------------
   UI (UPGRADED LOOK, LOGIC SAME)
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

        {/* ✅ Single container for navbar + workspace (same width) */}
        <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-6">
          {/* Top bar */}
          {/* ✅ removed nested max-w/mx-auto so navbar width matches workspace */}
          <header className="relative z-10">
            <div className="rounded-3xl border border-white/10 bg-white/[0.05] backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
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
                        <button
                          onClick={() => setPaywallOpen(true)}
                          className="px-4 py-2 rounded-2xl bg-white text-black font-semibold shadow hover:bg-gray-200 transition"
                        >
                          Buy Credits
                        </button>
                        <ProfileAvatar />
                      </>
                    ) : (
                      <>
                        <button
                          onClick={goLogin}
                          className="px-4 py-2 rounded-2xl bg-white/10 border border-white/15 text-white font-semibold hover:bg-white/15 transition"
                        >
                          Login
                        </button>
                      </>
                    )}
                  </div>

                  {/* Mobile top-right */}
                  <div className="md:hidden shrink-0">
                    {isAuthed ? (
                      <ProfileAvatar />
                    ) : (
                      <button
                        onClick={goLogin}
                        className="px-4 py-2 rounded-2xl bg-white/10 border border-white/15 text-white font-semibold hover:bg-white/15 transition"
                      >
                        Login
                      </button>
                    )}
                  </div>
                </div>

                {/* Row 2: Mobile actions (no overflow) */}
                <div className="md:hidden w-full">
                  {isAuthed ? (
                    <div className="grid grid-cols-1 gap-3">
                      <div className="w-full">
                        <CreditsBar />
                      </div>
                      <button
                        onClick={() => setPaywallOpen(true)}
                        className="w-full py-3 rounded-2xl bg-white text-black font-semibold shadow hover:bg-gray-200 transition"
                      >
                        Buy Credits
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3"></div>
                  )}
                </div>
              </div>
              <div className="h-px bg-white/10" />
            </div>
          </header>

          {/* ✅ added margin between navbar and workspace hero section */}
          <div className="mt-8">
            {/* Main grid */}
            <div className="grid grid-cols-12 gap-6">
              {/* Sidebar */}
              <aside className="col-span-12 md:col-span-4 space-y-6">
                <div className="rounded-[28px] border border-white/10 bg-white/[0.05] backdrop-blur-xl p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/45 mb-4">
                    Workspace
                  </p>

                  <div className="flex gap-3 mb-6">
                    <button
                      onClick={() => setTab("face-swap")}
                      className={`flex-1 py-2.5 text-sm rounded-2xl font-semibold transition border ${
                        tab === "face-swap"
                          ? "bg-white text-black border-transparent shadow"
                          : "bg-black/20 text-white/80 border-white/10 hover:bg-white/5"
                      }`}
                    >
                      Trending Art
                    </button>

                    <button
                      onClick={() => setTab("ai-generate")}
                      className={`flex-1 py-2.5 text-sm rounded-2xl font-semibold transition border ${
                        tab === "ai-generate"
                          ? "bg-white text-black border-transparent shadow"
                          : "bg-black/20 text-white/80 border-white/10 hover:bg-white/5"
                      }`}
                    >
                      Private Photoshoot
                    </button>
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
                </div>
              </aside>

              {/* Main panel */}
              <section className="col-span-12 md:col-span-8 space-y-6">
                {/* Generator Card */}
                <div className="relative rounded-[28px] border border-white/10 bg-white/[0.05] backdrop-blur-xl p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
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

                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                        STEP 1
                      </p>
                      <h2 className="text-2xl font-semibold mt-1">
                        {tab === "face-swap"
                          ? "Realistic Portrait Generator"
                          : "Ultra Realistic Photoshoot"}
                      </h2>
                      <p className="text-[12px] text-white/55 mt-1">
                        {tab === "face-swap"
                          ? "Pick a trending AI art theme, then drop your face into it with one click."
                          : "High-quality AI image generation is available here (your existing logic stays)."}
                      </p>
                    </div>

                    <div className="hidden md:flex items-center gap-2 text-[11px] px-3 py-1 rounded-full bg-black/25 border border-white/10 text-white/60">
                      <Sparkles size={14} />
                      Live preview
                    </div>
                  </div>

                  {/* Face swap tab */}
                  {tab === "face-swap" && (
                    <div className="mt-4 space-y-6">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold">
                            Trending AI art themes
                          </p>
                          <p className="text-[12px] text-white/55">
                            Tap a theme or browse the full library.
                          </p>
                        </div>

                        <Link
                          href="/themes"
                          className="px-4 py-2 rounded-full bg-white/5 border border-white/15 text-[12px] text-white/85 hover:bg-white/10 transition"
                        >
                          Browse more AI art →
                        </Link>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {heroThemes.map((theme, index) => {
                          if (!theme) return null;

                          const isActive = selectedThemeId === theme.id;
                          const isCopied = copiedThemeId === theme.id;

                          return (
                            <button
                              key={theme.id}
                              type="button"
                              onClick={() => handleThemeSelect(theme.id)}
                              className={[
                                "relative overflow-hidden rounded-3xl cursor-pointer bg-black/25 border transition-all duration-300 group text-left",
                                isActive
                                  ? "border-purple-400/60 ring-2 ring-purple-500/40"
                                  : "border-white/10 hover:border-white/20",
                              ].join(" ")}
                            >
                              <img
                                src={encodeURI(theme.imageUrls[0])}
                                alt={theme.label}
                                className="w-full h-[240px] object-cover transition-transform duration-500 group-hover:scale-105"
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

                              <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                                <h3 className="text-sm font-semibold text-white leading-tight">
                                  {theme.label}
                                </h3>
                                <p className="text-xs text-white/60 mt-0.5">
                                  {theme.tag || "Creative imagination"}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Step 2 */}
                      <div className="rounded-[28px] border border-white/10 bg-white/[0.05] backdrop-blur-xl p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-white/45 mb-2">
                          Step 2
                        </p>
                        <p className="text-xl font-semibold">Your photo</p>
                        <p className="text-[12px] text-white/55 mt-1">
                          Upload a face photo or pick a prototype.
                        </p>

                        <div className="mt-5 flex items-center gap-4">
                          <label
                            className="relative w-20 h-20 rounded-full border border-white/18 bg-black/25 flex items-center justify-center overflow-hidden cursor-pointer group"
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
                                  alert("Failed to read file. Try another photo.");
                                } finally {
                                  if (fileInputRef.current)
                                    fileInputRef.current.value = "";
                                }
                              }}
                            />
                          </label>

                          <div className="flex items-center gap-3">
                            {prototypeFaces.map((p) => (
                              <button
                                key={p.id}
                                type="button"
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
                                    console.error("URL -> base64 failed:", err);
                                    alert("Failed to load prototype face. Try again.");
                                  }
                                }}
                                className="group relative w-20 h-20 rounded-full overflow-hidden border border-white/15 bg-black/25 hover:border-white/40 hover:scale-105 transition"
                              >
                                <img
                                  src={p.imageUrl}
                                  alt={p.label}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[9px] text-white/85">
                                  {p.label}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="mt-4 text-[11px] text-white/55 leading-snug">
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
                          onResultGenerated={(item: any) => {
                            setResults((prev) => {
                              const safePrev = Array.isArray(prev) ? prev : [];

                              if (item?.__remove === true) {
                                return safePrev.filter((x) => x.id !== item.id);
                              }

                              const idx = safePrev.findIndex((x) => x.id === item.id);
                              let nextArr: any[];

                              if (idx !== -1) {
                                const copy = [...safePrev];
                                copy[idx] = item;
                                nextArr = copy;
                              } else {
                                nextArr = [item, ...safePrev];
                              }

                              try {
                                const finals = nextArr.filter(
                                  (x) => x?.isLoading !== true
                                );
                                localStorage.setItem(
                                  "mitux_jobs_results",
                                  JSON.stringify(finals)
                                );
                              } catch (e) {
                                console.warn("Failed to persist results:", e);
                              }

                              return nextArr;
                            });
                          }}
                          registerAIGenerate={(fn: any) => {
                            aiGenerateRef.current = fn;
                          }}
                          setProcessing={setProcessing}
                          setProgress={setProgress}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Jobs */}
                <div className="rounded-[28px] border border-white/10 bg-white/[0.05] backdrop-blur-xl p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                        Library
                      </p>
                      <h3 className="text-xl font-semibold mt-1">Jobs</h3>
                      <p className="text-[12px] text-white/55 mt-1">
                        Playground history 
                      </p>
                    </div>

                    <button
                      onClick={async () => {
                        if (isLocked) return goLogin();

                        await clearResults();
                        setResults([]);
                        try {
                          localStorage.removeItem("mitux_jobs_results");
                        } catch {}
                      }}
                      className="px-4 py-2 text-sm font-semibold rounded-2xl bg-red-600 text-white hover:bg-red-500 transition shadow"
                    >
                      Clear History
                    </button>
                  </div>

                  {isProcessing && (
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-white/60 mb-1">
                        <span>Processing…</span>
                        <span>{progress}%</span>
                      </div>

                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${progress}%` }}
                          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-200 shadow-[0_0_10px_rgba(168,85,247,0.6)]"
                        />
                      </div>
                    </div>
                  )}

                  {results.length > 0 && (
                    <div className="mt-8 grid gap-6 grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
                      {results.slice(0, visibleCount).map((item: any) =>
                        item.isLoading ? (
                          <div
                            key={item.id}
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
                          <div
                            key={item.id}
                            id={`card-${item.id}`}
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

                            <div className="flex justify-center gap-3 pt-4 border-t border-white/10">
                              <RegenButton
                                item={item}
                                handleRegen={(x: any) => {
                                  if (isLocked) return goLogin();
                                  handleRegen(x);
                                }}
                              />

                              <button
                                onClick={() => {
                                  setFullscreenImage(item.url);
                                  setFullscreen(true);
                                }}
                                className="px-4 py-2 text-xs sm:text-sm bg-white/5 text-white rounded-2xl border border-white/10 shadow hover:bg-white/10 transition flex items-center gap-2"
                              >
                                <Maximize2 size={16} /> Full
                              </button>

                              <button
                                onClick={() => downloadResult(item)}
                                className="p-2.5 rounded-2xl bg-emerald-500 text-black shadow hover:bg-emerald-400 transition"
                              >
                                <Download size={16} />
                              </button>

                              <button
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
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  <div ref={loadMoreRef} className="w-full h-10" />
                </div>

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

        {/* ✅ ADVANCED PAYWALL MODAL (scrollable on mobile) */}
        {isPaywallOpen && (
          <div
            className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center"
            role="dialog"
            aria-modal="true"
          >
            {/* backdrop */}
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
              onClick={() => setPaywallOpen(false)}
            />

            {/* sheet */}
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
              {/* header */}
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

              {/* content */}
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
                  <span className="text-white/80 font-semibold">Tip:</span> For the
                  smoothest flow, continue to the Billing page where your balance &
                  history update instantly.
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
