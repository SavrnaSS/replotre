"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Sparkles,
  Wand2,
  Lock,
  Trash2,
} from "lucide-react";
import { BILLING_PLANS, type BillingKey, type PlanKey } from "@/app/config/billingPlans";
import { getDailyQuotaForPlan } from "@/app/lib/schedule";
import { getInfluencerById } from "@/app/data/influencers";

type OnboardingData = {
  influencerId?: string;
  aiName?: string;
  niche?: string;
  visualStyle?: string;
  frequency?: string;
  platforms?: Record<string, boolean>;
};

type OnboardingProfile = {
  data: OnboardingData;
  plan?: string | null;
  billing?: string | null;
};

type Result = {
  id: string;
  url: string;
};

type PersistedResultsPayload = {
  version: number;
  updatedAt: string;
  items: Result[];
};

type ArchivedResult = Result & {
  deletedAt: string;
};

type PersistedArchivePayload = {
  version: number;
  updatedAt: string;
  items: ArchivedResult[];
};

const RESULTS_STORAGE_VERSION = 1;
const RESULTS_STORAGE_PREFIX = "gerox:generate:results:v1";
const RESULTS_ARCHIVE_PREFIX = "gerox:generate:archive:v1";
const MAX_PERSISTED_RESULTS = 50;
const MAX_ARCHIVED_RESULTS = 100;
const OUTPUT_CARD_WIDTH = "w-full max-w-[304px]";

const aspectOptions = [
  { key: "portrait", label: "4:5", width: 768, height: 960 },
  { key: "square", label: "1:1", width: 896, height: 896 },
  { key: "landscape", label: "16:9", width: 1024, height: 576 },
];

const styleOptions = [
  { key: "studio", label: "Studio" },
  { key: "cinematic", label: "Cinematic" },
  { key: "street", label: "Street" },
  { key: "luxury", label: "Luxury" },
];

const isImageLike = (value: string) => {
  const v = value.trim().toLowerCase();
  return (
    v.startsWith("http://") ||
    v.startsWith("https://") ||
    v.startsWith("data:image/") ||
    v.startsWith("/uploads/") ||
    v.startsWith("/model/")
  );
};

const extractImageUrl = (input: unknown, depth = 0): string => {
  if (depth > 5 || input == null) return "";
  if (typeof input === "string") return isImageLike(input) ? input : "";
  if (Array.isArray(input)) {
    for (const item of input) {
      const found = extractImageUrl(item, depth + 1);
      if (found) return found;
    }
    return "";
  }
  if (typeof input === "object") {
    const obj = input as Record<string, unknown>;
    const keys = ["image", "imageUrl", "result", "url", "img", "output", "images", "data"];
    for (const key of keys) {
      if (typeof obj[key] !== "undefined") {
        const found = extractImageUrl(obj[key], depth + 1);
        if (found) return found;
      }
    }
    for (const value of Object.values(obj)) {
      const found = extractImageUrl(value, depth + 1);
      if (found) return found;
    }
  }
  return "";
};

const normalizeResults = (input: unknown): Result[] => {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const next: Result[] = [];

  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const obj = raw as Record<string, unknown>;
    const id = String(obj.id || "").trim();
    const url = String(obj.url || "").trim();
    if (!id || !url || !isImageLike(url)) continue;

    const dedupeKey = url;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    next.push({ id, url });
    if (next.length >= MAX_PERSISTED_RESULTS) break;
  }

  return next;
};

const getResultsStorageKey = (userId?: string | null, influencerId?: string | null) =>
  `${RESULTS_STORAGE_PREFIX}:${userId || "anon"}:${influencerId || "none"}`;

const getArchiveStorageKey = (userId?: string | null, influencerId?: string | null) =>
  `${RESULTS_ARCHIVE_PREFIX}:${userId || "anon"}:${influencerId || "none"}`;

const normalizeArchivedResults = (input: unknown): ArchivedResult[] => {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const next: ArchivedResult[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const obj = raw as Record<string, unknown>;
    const id = String(obj.id || "").trim();
    const url = String(obj.url || "").trim();
    const deletedAt = String(obj.deletedAt || "").trim() || new Date().toISOString();
    if (!id || !url || !isImageLike(url)) continue;
    const key = url;
    if (seen.has(key)) continue;
    seen.add(key);
    next.push({ id, url, deletedAt });
    if (next.length >= MAX_ARCHIVED_RESULTS) break;
  }
  return next;
};

const mergeResults = (...groups: Result[][]): Result[] => {
  const seen = new Set<string>();
  const merged: Result[] = [];
  for (const group of groups) {
    for (const item of group) {
      if (!item?.id || !item?.url) continue;
      const key = item.url;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
      if (merged.length >= MAX_PERSISTED_RESULTS) return merged;
    }
  }
  return merged;
};

const filenameFromUrl = (url: string, fallback = "gerox-output.jpg") => {
  try {
    const parsed = new URL(url, typeof window !== "undefined" ? window.location.origin : "");
    const tail = parsed.pathname.split("/").pop() || "";
    return tail || fallback;
  } catch {
    return fallback;
  }
};

export default function GeneratePage() {
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<{
    plan?: string | null;
    billing?: string | null;
    status?: string | null;
  } | null>(null);
  const [scheduleItems, setScheduleItems] = useState<
    Array<{
      id: string;
      time: string;
      label: string;
      title: string;
      src: string;
      scheduleDate: string;
      dateKey: string;
    }>
  >([]);
  const [scheduleExhausted, setScheduleExhausted] = useState(false);
  const [scheduleReason, setScheduleReason] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState(styleOptions[0].key);
  const [aspect, setAspect] = useState(aspectOptions[0].key);
  const [batchSize, setBatchSize] = useState(3);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [syncingHistory, setSyncingHistory] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [deletingResultId, setDeletingResultId] = useState<string>("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedGenerated, setSelectedGenerated] = useState<Record<string, boolean>>({});
  const [pendingUndo, setPendingUndo] = useState<{ token: number; items: Result[] } | null>(null);
  const undoTimerRef = useRef<number | null>(null);
  const [generationPhase, setGenerationPhase] = useState(0);
  const [archivedResults, setArchivedResults] = useState<ArchivedResult[]>([]);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [downloadingUrl, setDownloadingUrl] = useState<string>("");
  const [scheduleOverrides, setScheduleOverrides] = useState<Record<string, string>>({});
  const [hiddenScheduled, setHiddenScheduled] = useState<Record<string, boolean>>({});
  const [hydratedResultsKey, setHydratedResultsKey] = useState<string>("");
  const [hydratedArchiveKey, setHydratedArchiveKey] = useState<string>("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [profileRes, meRes, subRes] = await Promise.all([
          fetch("/api/onboarding/status", { cache: "no-store" }),
          fetch("/api/me", { cache: "no-store" }),
          fetch("/api/subscription/status", { cache: "no-store" }),
        ]);
        const profileData = await profileRes.json();
        const meData = await meRes.json();
        const subData = await subRes.json();
        if (active) {
          setProfile(profileData?.profile ?? null);
          setUserId(meData?.user?.id ?? null);
          setCredits(meData?.user?.credits ?? null);
          setSubscriptionInfo({
            plan: subData?.plan ?? null,
            billing: subData?.billing ?? null,
            status: subData?.status ?? null,
          });
        }
      } catch {
        if (active) {
          setProfile(null);
          setUserId(null);
          setCredits(null);
          setSubscriptionInfo(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    const d = profile?.data || {};
    const influencerId = d.influencerId || "";
    return {
      aiName: d.aiName || "Your AI",
      niche: d.niche || "—",
      style: d.visualStyle || "—",
      frequency: d.frequency || "—",
      platforms: Object.entries(d.platforms || {})
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(", "),
      influencerId,
      plan: (subscriptionInfo?.plan || profile?.plan || "").toLowerCase(),
      billing: (subscriptionInfo?.billing || profile?.billing || "").toLowerCase(),
      influencer: getInfluencerById(influencerId),
    };
  }, [profile, subscriptionInfo]);

  const resultsStorageKey = useMemo(
    () => getResultsStorageKey(userId, summary.influencerId),
    [userId, summary.influencerId]
  );
  const archiveStorageKey = useMemo(
    () => getArchiveStorageKey(userId, summary.influencerId),
    [userId, summary.influencerId]
  );

  useEffect(() => {
    if (!resultsStorageKey || hydratedResultsKey === resultsStorageKey) return;
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(resultsStorageKey);
      if (!raw) {
        setResults([]);
        setHydratedResultsKey(resultsStorageKey);
        return;
      }

      const parsed = JSON.parse(raw) as Partial<PersistedResultsPayload> | Result[];
      const items = Array.isArray(parsed)
        ? normalizeResults(parsed)
        : normalizeResults(parsed?.items);

      setResults(items);
    } catch {
      setResults([]);
    } finally {
      setHydratedResultsKey(resultsStorageKey);
    }
  }, [resultsStorageKey, hydratedResultsKey]);

  useEffect(() => {
    if (!archiveStorageKey || hydratedArchiveKey === archiveStorageKey) return;
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(archiveStorageKey);
      if (!raw) {
        setArchivedResults([]);
        setHydratedArchiveKey(archiveStorageKey);
        return;
      }
      const parsed = JSON.parse(raw) as Partial<PersistedArchivePayload> | ArchivedResult[];
      const items = Array.isArray(parsed)
        ? normalizeArchivedResults(parsed)
        : normalizeArchivedResults(parsed?.items);
      setArchivedResults(items);
    } catch {
      setArchivedResults([]);
    } finally {
      setHydratedArchiveKey(archiveStorageKey);
    }
  }, [archiveStorageKey, hydratedArchiveKey]);

  const syncFromServerHistory = async (opts?: { silent?: boolean }) => {
    if (!userId) return;
    if (!opts?.silent) {
      setSyncingHistory(true);
      setSyncMessage("");
    }
    try {
      const res = await fetch("/api/history/list", { cache: "no-store" });
      if (!res.ok) {
        if (!opts?.silent) setSyncMessage("Sync failed.");
        return;
      }
      const data = await res.json().catch(() => ({}));
      const items = Array.isArray(data?.history)
        ? data.history
            .map((h: { id?: string; resultUrl?: string }) => ({
              id: String(h?.id || "").trim(),
              url: String(h?.resultUrl || "").trim(),
            }))
            .filter((item: Result) => item.id && item.url && isImageLike(item.url))
        : [];

      setResults((prev) => mergeResults(prev, items).slice(0, 12));
      if (!opts?.silent) {
        setSyncMessage(items.length ? "Synced from server history." : "No server history found.");
      }
    } catch {
      if (!opts?.silent) setSyncMessage("Sync failed.");
    } finally {
      if (!opts?.silent) {
        setSyncingHistory(false);
        window.setTimeout(() => setSyncMessage(""), 2500);
      }
    }
  };

  useEffect(() => {
    void syncFromServerHistory({ silent: true });
    // intentionally tied to user context and storage scope only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, resultsStorageKey]);

  useEffect(() => {
    if (!resultsStorageKey) return;
    if (hydratedResultsKey !== resultsStorageKey) return;
    if (typeof window === "undefined") return;

    try {
      const payload: PersistedResultsPayload = {
        version: RESULTS_STORAGE_VERSION,
        updatedAt: new Date().toISOString(),
        items: normalizeResults(results),
      };
      window.localStorage.setItem(resultsStorageKey, JSON.stringify(payload));
    } catch {
      // ignore storage quota/serialization failures
    }
  }, [results, resultsStorageKey, hydratedResultsKey]);

  useEffect(() => {
    if (!archiveStorageKey) return;
    if (hydratedArchiveKey !== archiveStorageKey) return;
    if (typeof window === "undefined") return;

    try {
      const payload: PersistedArchivePayload = {
        version: RESULTS_STORAGE_VERSION,
        updatedAt: new Date().toISOString(),
        items: normalizeArchivedResults(archivedResults),
      };
      window.localStorage.setItem(archiveStorageKey, JSON.stringify(payload));
    } catch {
      // ignore storage quota/serialization failures
    }
  }, [archivedResults, archiveStorageKey, hydratedArchiveKey]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!summary.influencerId) {
        setScheduleItems([]);
        setScheduleExhausted(false);
        return;
      }
      try {
        const res = await fetch(
          `/api/influencers/schedule-queue?influencerId=${summary.influencerId}&days=1`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (active) {
          const nextItems = Array.isArray(data?.items) ? data.items : [];
          setScheduleItems(nextItems);
          const exhausted = Boolean(data?.exhausted) && nextItems.length === 0;
          setScheduleExhausted(exhausted);
          setScheduleReason(exhausted ? String(data?.reason || "") : "");
        }
      } catch {
        if (active) {
          setScheduleItems([]);
          setScheduleExhausted(false);
          setScheduleReason("");
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [summary.influencerId]);

  useEffect(() => {
    setScheduleOverrides({});
    setHiddenScheduled({});
  }, [summary.influencerId]);

  const aspectConfig = aspectOptions.find((a) => a.key === aspect) || aspectOptions[0];

  useEffect(() => {
    if (prompt) return;
    const selectedStyle = styleOptions.find((s) => s.key === style)?.label || style;
    const base = `${summary.aiName} ${summary.niche} creator photoshoot, ${selectedStyle} look, ${summary.style} wardrobe, soft studio lighting, clean background, natural skin texture, sharp focus, no text or watermark.`;
    setPrompt(base);
  }, [summary, style, prompt]);

  const maxBatch = useMemo(() => {
    if (summary.plan === "elite") return 4;
    if (summary.plan === "pro") return 3;
    return 2;
  }, [summary.plan]);

  const planMonthlyCap = useMemo(() => {
    const billing = summary.billing === "yearly" ? "yearly" : "monthly";
    const plan = (summary.plan || "basic") as PlanKey;
    const entry = BILLING_PLANS[billing as BillingKey]?.[plan];
    return entry?.credits ?? null;
  }, [summary.billing, summary.plan]);

  const planCapabilities = useMemo(() => {
    const plan = summary.plan || "basic";
    const billing = summary.billing === "yearly" ? "yearly" : "monthly";
    const entry = BILLING_PLANS[billing as BillingKey]?.[(plan as PlanKey) || "basic"];
    const isPro = plan === "pro";
    const isElite = plan === "elite";
    return {
      credits: entry?.credits ?? 0,
      modelTokens: isElite ? 6 : isPro ? 2 : 1,
      scheduledPosts: isElite ? 180 : isPro ? 60 : 15,
      nsfwScheduled: plan !== "basic",
      videoEnabled: plan !== "basic",
    };
  }, [summary.billing, summary.plan]);

  const schedulePreview = useMemo(() => {
    const limit = getDailyQuotaForPlan(summary.plan, 0);
    return scheduleItems.slice(0, limit);
  }, [scheduleItems, summary.plan]);

  const outputItems = useMemo(() => {
    const generated = results.map((item) => ({
      id: item.id,
      url: item.url,
      kind: "generated" as const,
    }));
    const scheduled = schedulePreview
      .filter((item) => !hiddenScheduled[item.id])
      .map((item) => ({
      id: `scheduled-${item.id}`,
      url: scheduleOverrides[item.id] ?? item.src,
      kind: "scheduled" as const,
      time: item.time,
      label: item.label,
      title: item.title,
      scheduleId: item.id,
    }));
    return [...generated, ...scheduled];
  }, [hiddenScheduled, results, scheduleOverrides, schedulePreview]);

  const generatedOutputItems = useMemo(
    () => outputItems.filter((item) => item.kind === "generated"),
    [outputItems]
  );

  const selectedCount = useMemo(
    () =>
      generatedOutputItems.reduce(
        (count, item) => count + (selectedGenerated[item.id] ? 1 : 0),
        0
      ),
    [generatedOutputItems, selectedGenerated]
  );

  const removeScheduledAsset = (scheduleId: string) => {
    setHiddenScheduled((prev) => ({ ...prev, [scheduleId]: true }));
  };

  const commitDeleteBatch = async (items: Result[]) => {
    if (!items.length) return;
    const deleted = await Promise.allSettled(
      items.map((item) =>
        fetch("/api/history/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resultUrl: item.url }),
        })
      )
    );
    const failed = deleted.filter((entry) => entry.status === "rejected").length;
    if (failed > 0) {
      setSyncMessage(`Deleted locally. ${failed} server delete request(s) failed.`);
      window.setTimeout(() => setSyncMessage(""), 2500);
    }
  };

  const clearUndoTimer = () => {
    if (undoTimerRef.current) {
      window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  };

  const queueDeleteResults = async (items: Result[]) => {
    const normalized = normalizeResults(items);
    if (!normalized.length) return;

    if (pendingUndo?.items?.length) {
      await commitDeleteBatch(pendingUndo.items);
      setPendingUndo(null);
      clearUndoTimer();
    }

    setResults((prev) => prev.filter((r) => !normalized.some((n) => n.id === r.id)));
    setSelectedGenerated((prev) => {
      const next = { ...prev };
      normalized.forEach((item) => {
        delete next[item.id];
      });
      return next;
    });
    const archived = normalized.map((item) => ({ ...item, deletedAt: new Date().toISOString() }));
    setArchivedResults((prev) => {
      const next = normalizeArchivedResults([...archived, ...prev]);
      return next.slice(0, MAX_ARCHIVED_RESULTS);
    });

    const token = Date.now();
    setPendingUndo({ token, items: normalized });
    clearUndoTimer();
    undoTimerRef.current = window.setTimeout(() => {
      void commitDeleteBatch(normalized);
      setPendingUndo((current) => (current?.token === token ? null : current));
      clearUndoTimer();
    }, 5000);
  };

  const undoDelete = () => {
    if (!pendingUndo?.items?.length) return;
    const restore = pendingUndo.items;
    clearUndoTimer();
    setPendingUndo(null);
    setResults((prev) => mergeResults(restore, prev).slice(0, 12));
    setArchivedResults((prev) => prev.filter((entry) => !restore.some((r) => r.id === entry.id)));
    setSyncMessage("Deletion undone.");
    window.setTimeout(() => setSyncMessage(""), 2200);
  };

  const restoreArchivedItems = async (items: ArchivedResult[]) => {
    if (!items.length) return;
    const restore = items.map((item) => ({ id: item.id, url: item.url }));
    setResults((prev) => mergeResults(restore, prev).slice(0, 12));
    setArchivedResults((prev) =>
      prev.filter((entry) => !items.some((item) => item.id === entry.id))
    );

    await Promise.allSettled(
      restore.map((item) =>
        fetch("/api/history/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "txt2img",
            prompt,
            resultUrl: item.url,
          }),
        })
      )
    );
    setSyncMessage(
      `Restored ${restore.length} item${restore.length > 1 ? "s" : ""} from archive.`
    );
    window.setTimeout(() => setSyncMessage(""), 2500);
  };

  const restoreArchivedOne = async (item: ArchivedResult) => {
    await restoreArchivedItems([item]);
  };

  const restoreAllArchived = async () => {
    await restoreArchivedItems(archivedResults);
  };

  const purgeArchivedOne = (id: string) => {
    setArchivedResults((prev) => prev.filter((item) => item.id !== id));
  };

  const purgeArchivedAll = () => {
    setArchivedResults([]);
  };

  const downloadOutput = async (url: string) => {
    if (!url || downloadingUrl === url) return;
    setDownloadingUrl(url);
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("download-failed");
      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filenameFromUrl(url);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(objectUrl);
    } catch {
      // Fallback to opening in a new tab if direct download fails.
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setDownloadingUrl("");
    }
  };

  const removeGeneratedAsset = async (item: Result) => {
    const previous = results;
    setDeletingResultId(item.id);
    try {
      await queueDeleteResults([item]);
    } catch {
      setResults(previous);
      setError("Failed to delete output. Please retry.");
    } finally {
      setDeletingResultId("");
    }
  };

  const clearLocalGeneratedResults = () => {
    setResults([]);
    setArchivedResults([]);
    clearUndoTimer();
    setPendingUndo(null);
    setSelectionMode(false);
    clearGeneratedSelection();
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(resultsStorageKey);
      window.localStorage.removeItem(archiveStorageKey);
      setSyncMessage("Local cache cleared.");
      window.setTimeout(() => setSyncMessage(""), 2500);
    } catch {
      // ignore
    }
  };

  const toggleSelectGenerated = (id: string) => {
    setSelectedGenerated((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectAllGenerated = () => {
    const all: Record<string, boolean> = {};
    generatedOutputItems.forEach((item) => {
      all[item.id] = true;
    });
    setSelectedGenerated(all);
  };

  const clearGeneratedSelection = () => {
    setSelectedGenerated({});
  };

  const bulkDeleteSelected = async () => {
    if (!selectedCount) return;
    const selectedItems = generatedOutputItems
      .filter((item) => selectedGenerated[item.id])
      .map((item) => ({ id: item.id, url: item.url }));
    await queueDeleteResults(selectedItems);
    setSelectionMode(false);
    clearGeneratedSelection();
  };

  useEffect(() => {
    if (!selectionMode) {
      clearGeneratedSelection();
    }
  }, [selectionMode]);

  useEffect(() => {
    if (!generating) return;
    setGenerationPhase(0);
    const interval = window.setInterval(() => {
      setGenerationPhase((prev) => (prev + 1) % 4);
    }, 1200);
    return () => window.clearInterval(interval);
  }, [generating]);

  useEffect(
    () => () => {
      clearUndoTimer();
    },
    []
  );

  const remainingThisMonth =
    credits === null || planMonthlyCap === null
      ? credits
      : Math.max(0, Math.min(credits, planMonthlyCap));

  useEffect(() => {
    if (batchSize > maxBatch) setBatchSize(maxBatch);
  }, [batchSize, maxBatch]);

  const generateBatch = async () => {
    if (generating) return;
    setError("");
    if (!prompt.trim()) {
      setError("Add a prompt before generating.");
      return;
    }
    if (remainingThisMonth !== null && remainingThisMonth < batchSize) {
      setError("Monthly generation cap reached for this plan.");
      return;
    }

    setGenerating(true);
    const newResults: Result[] = [];
    for (let i = 0; i < batchSize; i += 1) {
      try {
        const creditRes = await fetch("/api/credits/use", { method: "POST" });
        if (!creditRes.ok) {
          setError("Credits exhausted. Top up to continue.");
          break;
        }
        const creditData = await creditRes.json();
        setCredits(creditData?.credits ?? credits);

        const res = await fetch("/api/txt2img", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            style: styleOptions.find((s) => s.key === style)?.label || style,
            width: aspectConfig.width,
            height: aspectConfig.height,
            steps: 28,
            guidance: 7.5,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(String(data?.message || data?.error || "Generation failed. Try again."));
          break;
        }
        const imageUrl = extractImageUrl(data);
        if (imageUrl) {
          newResults.push({ id: `${Date.now()}-${i}`, url: imageUrl });
        } else {
          setError("Generation succeeded but no image was returned.");
          break;
        }
      } catch {
        setError("Generation failed. Try again.");
        break;
      }
    }

    if (newResults.length) {
      setResults((prev) => [...newResults, ...prev].slice(0, 12));
      void Promise.allSettled(
        newResults.map((item) =>
          fetch("/api/history/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "txt2img",
              prompt,
              resultUrl: item.url,
            }),
          })
        )
      );
    }
    setGenerating(false);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07070B] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute -bottom-56 right-[-120px] h-[520px] w-[520px] rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.04]" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-black/40" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/playground"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 transition hover:bg-white/10"
          >
            <ArrowLeft size={14} /> Back to playground
          </Link>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="min-w-0 rounded-[28px] border border-white/10 bg-white/[0.06] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-6">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-500/20">
                <Wand2 size={18} className="text-indigo-200" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                  Creator production
                </p>
                <h1 className="text-2xl font-semibold">
                  {summary.niche === "fitness"
                    ? "Create a creator model photoshoot set"
                    : "Create a studio photoshoot set"}
                </h1>
                <p className="mt-1 text-sm text-white/55">
                  Craft studio‑grade images for your creator model.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="mt-6 text-sm text-white/60">Loading setup…</div>
            ) : null}

            <div className="mt-6 space-y-4">
              <div className="rounded-[22px] border border-white/10 bg-black/25 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                  Creative direction
                </p>
                <textarea
                  rows={4}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/85 outline-none focus:border-indigo-300/50"
                />
                <p className="mt-2 text-[11px] text-white/45">
                  Focus on lighting, wardrobe, and scene cues.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-white/50">Visual style</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {styleOptions.map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setStyle(s.key)}
                        className={`rounded-xl border px-2 py-2 text-[11px] leading-tight transition sm:px-3 sm:text-xs ${
                          style === s.key
                            ? "border-indigo-300/50 bg-indigo-500/15 text-white"
                            : "border-white/10 bg-black/30 text-white/70 hover:bg-black/40"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-white/50">Frame ratio</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {aspectOptions.map((a) => (
                      <button
                        key={a.key}
                        type="button"
                        onClick={() => setAspect(a.key)}
                        className={`rounded-xl border px-2 py-2 text-[11px] leading-tight transition sm:px-3 sm:text-xs ${
                          aspect === a.key
                            ? "border-indigo-300/50 bg-indigo-500/15 text-white"
                            : "border-white/10 bg-black/30 text-white/70 hover:bg-black/40"
                        }`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-white/50">Batch size</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[1, 2, 3, 4]
                      .filter((count) => count <= maxBatch)
                      .map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setBatchSize(count)}
                          className={`rounded-full border px-3 py-2 text-[11px] leading-tight transition sm:text-xs ${
                            batchSize === count
                              ? "border-indigo-300/50 bg-indigo-500/15 text-white"
                              : "border-white/10 bg-black/30 text-white/70 hover:bg-black/40"
                          }`}
                        >
                          {count}
                        </button>
                      ))}
                  </div>
                  <p className="mt-2 text-[11px] text-white/45">
                    Studio limit: up to {maxBatch} images per batch.
                  </p>
                </div>
              </div>

              {error && (
                <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                  {error}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-indigo-300/25 bg-indigo-500/10 p-4">
                <div>
                  <p className="text-sm text-white/80">
                    Credits available:{" "}
                    <span className="font-semibold">{credits ?? "—"}</span>
                  </p>
                  <p className="mt-1 text-xs text-white/50">
                    Each image uses 1 credit. Batch size: {batchSize}. Batch limit: {maxBatch}.
                  </p>
                  {planMonthlyCap !== null && (
                    <p className="mt-1 text-[11px] text-white/45">
                      Monthly allowance: {planMonthlyCap} images • Remaining: {remainingThisMonth ?? "—"}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={generating}
                  onClick={generateBatch}
                  className="inline-flex items-center gap-2 rounded-full border border-indigo-300/30 bg-indigo-500/20 px-4 py-2 text-sm text-white/90 transition hover:bg-indigo-500/30 disabled:opacity-50"
                >
                  {generating ? "Producing..." : "Create set"}
                </button>
              </div>

              {summary.influencer && (
                <div className="rounded-[18px] border border-indigo-300/20 bg-indigo-500/10 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 overflow-hidden rounded-xl border border-white/10 bg-black/40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={summary.influencer.src}
                          alt={summary.influencer.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">
                          Creator model
                        </p>
                        <p className="text-sm font-semibold">{summary.influencer.name}</p>
                      </div>
                    </div>
                    <Link
                      href="/influencer"
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-white/80 transition hover:bg-white/10"
                    >
                      View
                    </Link>
                  </div>
                </div>
              )}


              {!loading && (
                <div className="rounded-[22px] border border-white/10 bg-black/25 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                  Studio brief
                </p>
                <p className="mt-1 text-sm text-white/70">
                  {summary.niche} • {summary.style} • {summary.frequency} •{" "}
                  {summary.platforms || "—"}
                </p>
              </div>
                    <button
                      type="button"
                      onClick={() => (window.location.href = "/workspace")}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 transition hover:bg-white/10"
                    >
                      Edit setup
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 space-y-5">
            <div className="rounded-[26px] border border-white/10 bg-white/[0.06] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-6">
              <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                Plan access
              </p>
              <div className="mt-4 space-y-3 text-xs text-white/70">
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                  <span>Monthly credits</span>
                  <span className="font-semibold text-white/85">{planCapabilities.credits}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                  <span>Model tokens</span>
                  <span className="font-semibold text-white/85">{planCapabilities.modelTokens}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                  <span>Scheduled posts</span>
                  <span className="font-semibold text-white/85">{planCapabilities.scheduledPosts}</span>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!planCapabilities.videoEnabled) {
                      window.location.href = "/subscription";
                    }
                  }}
                  className={`rounded-2xl border px-4 py-3 text-left text-xs transition ${
                    planCapabilities.videoEnabled
                      ? "border-white/10 bg-black/30 text-white/80 hover:bg-black/40"
                      : "border-white/5 bg-black/20 text-white/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>Video batches</span>
                    {!planCapabilities.videoEnabled && <Lock size={14} />}
                  </div>
                  <p className="mt-2 text-[11px] text-white/55">
                    Generate short-form video from studio sets.
                  </p>
                  {!planCapabilities.videoEnabled && (
                    <span className="mt-2 inline-flex items-center gap-2 rounded-full border border-indigo-300/25 bg-indigo-500/10 px-2.5 py-1 text-[10px] text-indigo-200">
                      Upgrade to Pro
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!planCapabilities.nsfwScheduled) {
                      window.location.href = "/subscription";
                    }
                  }}
                  className={`rounded-2xl border px-4 py-3 text-left text-xs transition ${
                    planCapabilities.nsfwScheduled
                      ? "border-white/10 bg-black/30 text-white/80 hover:bg-black/40"
                      : "border-white/5 bg-black/20 text-white/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>NSFW scheduled posts</span>
                    {!planCapabilities.nsfwScheduled && <Lock size={14} />}
                  </div>
                  <p className="mt-2 text-[11px] text-white/55">
                    Schedule gated content to private feeds.
                  </p>
                  {!planCapabilities.nsfwScheduled && (
                    <span className="mt-2 inline-flex items-center gap-2 rounded-full border border-indigo-300/25 bg-indigo-500/10 px-2.5 py-1 text-[10px] text-indigo-200">
                      Upgrade to Pro
                    </span>
                  )}
                </button>
              </div>
              {!planCapabilities.videoEnabled && (
                <button
                  type="button"
                  onClick={() => (window.location.href = "/subscription")}
                  className="mt-4 w-full rounded-full border border-indigo-300/30 bg-indigo-500/15 px-4 py-2 text-xs text-indigo-100 transition hover:bg-indigo-500/25"
                >
                  Upgrade plan
                </button>
              )}
            </div>

            <div className="rounded-[26px] border border-white/10 bg-white/[0.06] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-6">
              <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                Scheduled queue
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-white/60">
                <span>{planCapabilities.scheduledPosts} posts / 30 days</span>
                <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-0.5 text-[10px] text-white/60">
                  Next 24h
                </span>
              </div>
              {scheduleExhausted && (
                <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-100">
                  {scheduleReason === "admin-disabled"
                    ? "Scheduling is paused by admin. We’ll notify you when it resumes."
                    : "Scheduling is currently unavailable. We’ll get back to you ASAP."}
                </div>
              )}
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {schedulePreview.map((item) => (
                  <div key={item.id} className="rounded-xl border border-white/10 bg-black/40 p-3">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.src}
                        alt="Scheduled preview"
                        className="h-10 w-10 rounded-xl object-cover"
                      />
                      <div>
                        <p className="text-xs font-semibold text-white/90">{item.time}</p>
                        <p className="text-[10px] text-white/50">{item.label}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] text-white/65">{item.title}</p>
                    <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] text-white/60">
                      Scheduled
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                    Output gallery
                  </p>
                  <h2 className="mt-2 text-lg font-semibold">Generated previews</h2>
                  <p className="mt-1 text-xs text-white/50">
                    Polished studio outputs tailored to your channels.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                  <Sparkles size={14} /> Studio‑ready
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void syncFromServerHistory()}
                  disabled={syncingHistory}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] text-white/80 transition hover:bg-white/10 disabled:opacity-50"
                >
                  {syncingHistory ? "Syncing..." : "Sync"}
                </button>
                <button
                  type="button"
                  onClick={clearLocalGeneratedResults}
                  className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] text-white/70 transition hover:bg-black/40"
                >
                  Clear local
                </button>
                <button
                  type="button"
                  onClick={() => setArchiveOpen((prev) => !prev)}
                  className={`rounded-full border px-3 py-1 text-[11px] transition ${
                    archiveOpen
                      ? "border-amber-300/40 bg-amber-500/15 text-amber-100"
                      : "border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
                  }`}
                >
                  {archiveOpen ? "Hide archive" : `Archive (${archivedResults.length})`}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectionMode((prev) => !prev)}
                  className={`rounded-full border px-3 py-1 text-[11px] transition ${
                    selectionMode
                      ? "border-indigo-300/40 bg-indigo-500/20 text-indigo-100"
                      : "border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
                  }`}
                >
                  {selectionMode ? "Cancel selection" : "Select"}
                </button>
                {selectionMode && (
                  <>
                    <button
                      type="button"
                      onClick={selectAllGenerated}
                      className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] text-white/80 transition hover:bg-white/10"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() => void bulkDeleteSelected()}
                      disabled={!selectedCount}
                      className="rounded-full border border-rose-300/35 bg-rose-500/15 px-3 py-1 text-[11px] text-rose-100 transition hover:bg-rose-500/25 disabled:opacity-50"
                    >
                      Delete selected ({selectedCount})
                    </button>
                  </>
                )}
                {!!syncMessage && <span className="text-[11px] text-white/60">{syncMessage}</span>}
              </div>
              {pendingUndo?.items?.length ? (
                <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
                  <span>
                    {pendingUndo.items.length} item{pendingUndo.items.length > 1 ? "s" : ""} removed.
                    Undo?
                  </span>
                  <button
                    type="button"
                    onClick={undoDelete}
                    className="rounded-full border border-amber-200/40 bg-amber-500/20 px-3 py-1 text-[11px] font-semibold text-amber-100"
                  >
                    Undo
                  </button>
                </div>
              ) : null}
              {archiveOpen ? (
                <div className="mt-3 rounded-2xl border border-amber-300/25 bg-amber-500/10 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-amber-100/70">
                      Recently deleted
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void restoreAllArchived()}
                        disabled={!archivedResults.length}
                        className="rounded-full border border-emerald-300/40 bg-emerald-500/15 px-3 py-1 text-[11px] text-emerald-100 disabled:opacity-50"
                      >
                        Restore all
                      </button>
                      <button
                        type="button"
                        onClick={purgeArchivedAll}
                        disabled={!archivedResults.length}
                        className="rounded-full border border-rose-300/40 bg-rose-500/15 px-3 py-1 text-[11px] text-rose-100 disabled:opacity-50"
                      >
                        Purge
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 max-h-48 space-y-2 overflow-y-auto pr-1">
                    {archivedResults.map((item) => (
                      <div
                        key={`archived-${item.id}`}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[11px] text-white/80">{item.url}</p>
                          <p className="text-[10px] text-white/45">
                            Deleted {new Date(item.deletedAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="ml-3 flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void restoreArchivedOne(item)}
                            className="rounded-full border border-emerald-300/40 bg-emerald-500/15 px-2.5 py-1 text-[10px] text-emerald-100"
                          >
                            Restore
                          </button>
                          <button
                            type="button"
                            onClick={() => purgeArchivedOne(item.id)}
                            className="rounded-full border border-rose-300/40 bg-rose-500/15 px-2.5 py-1 text-[10px] text-rose-100"
                          >
                            Purge
                          </button>
                        </div>
                      </div>
                    ))}
                    {!archivedResults.length && (
                      <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-white/55">
                        No archived outputs yet.
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
              {generating ? (
                <div className="mt-4 rounded-2xl border border-indigo-300/25 bg-indigo-500/10 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-100/80">
                      Generation Pipeline
                    </span>
                    <span className="text-[11px] text-indigo-100/75">
                      {[
                        "Preparing",
                        "Rendering",
                        "Consistency pass",
                        "Finalizing",
                      ][generationPhase]}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/35">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-300/90 via-indigo-400/90 to-cyan-300/90 transition-all duration-700"
                      style={{ width: `${25 + generationPhase * 20}%` }}
                    />
                  </div>
                </div>
              ) : null}

            {generating && (
              <div className="mt-6 flex flex-col items-center gap-4">
                {Array.from({ length: Math.max(1, batchSize) }).map((_, idx) => (
                  <div
                    key={`loading-${idx}`}
                    className={`${OUTPUT_CARD_WIDTH} overflow-hidden rounded-2xl border border-indigo-300/30 bg-black/30 shadow-[0_18px_50px_rgba(0,0,0,0.35)]`}
                  >
                    <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-b from-indigo-500/10 to-black/30">
                      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-indigo-400/10 via-white/5 to-transparent" />
                      <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/35 backdrop-blur-sm">
                        <div className="absolute inset-2 animate-spin rounded-full border-2 border-indigo-200/20 border-t-indigo-200/90" />
                      </div>
                      <div className="absolute inset-x-4 bottom-4 space-y-2">
                        <div className="h-2 w-3/4 animate-pulse rounded bg-white/15" />
                        <div className="h-2 w-1/2 animate-pulse rounded bg-white/10" />
                      </div>
                    </div>
                    <div className="border-t border-white/10 px-4 py-3 text-[11px] text-white/70">
                      {[
                        "Preparing face lock + prompt...",
                        "Rendering high-fidelity frame...",
                        "Applying consistency checks...",
                        "Finishing and staging output...",
                      ][generationPhase]}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!generating && outputItems.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-6 text-sm text-white/60">
                Your studio outputs will appear here.
              </div>
            ) : outputItems.length > 0 ? (
              <div className="mt-6 flex flex-col items-center gap-4">
                {outputItems.map((item) => (
                  <div
                    key={item.id}
                    className={`group ${OUTPUT_CARD_WIDTH} overflow-hidden rounded-2xl border bg-black/30 shadow-[0_18px_50px_rgba(0,0,0,0.35)] transition hover:border-white/20 ${
                      item.kind === "scheduled"
                        ? "border-indigo-400/30 ring-1 ring-indigo-500/20"
                        : "border-white/10"
                    }`}
                  >
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.url}
                        alt="Generated"
                        className="w-full aspect-[4/5] object-cover"
                      />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] ${
                            item.kind === "scheduled"
                              ? "border-indigo-300/40 bg-indigo-500/20 text-indigo-100"
                              : "border-white/15 bg-black/60 text-white/85"
                          }`}
                        >
                          {item.kind === "scheduled" ? "Scheduled post" : "Studio output"}
                        </span>
                        {item.kind === "scheduled" && item.time && (
                          <span className="rounded-full border border-white/15 bg-black/60 px-2.5 py-1 text-[10px] text-white/80">
                            {item.time}
                          </span>
                        )}
                      </div>
                      {item.kind === "generated" && selectionMode && (
                        <button
                          type="button"
                          onClick={() => toggleSelectGenerated(item.id)}
                          className={`absolute right-3 top-10 rounded-full border px-2.5 py-1 text-[10px] ${
                            selectedGenerated[item.id]
                              ? "border-indigo-300/45 bg-indigo-500/25 text-white"
                              : "border-white/20 bg-black/60 text-white/80"
                          }`}
                        >
                          {selectedGenerated[item.id] ? "Selected" : "Select"}
                        </button>
                      )}
                    </div>
                    <div
                      className={`px-4 py-3 text-xs text-white/70 ${
                        item.kind === "scheduled" ? "border-t border-white/10" : ""
                      } min-h-[54px]`}
                    >
                      {item.kind === "scheduled" ? (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="text-[11px] text-white/55">Queued for publish</span>
                          <div className="flex flex-wrap items-center gap-2">
                            <a
                              href={item.url}
                              onClick={(e) => {
                                e.preventDefault();
                                void downloadOutput(item.url);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/30 bg-emerald-500/15 px-3.5 py-1.5 text-[11px] font-semibold text-emerald-100 transition hover:bg-emerald-500/25"
                            >
                              <Download size={13} />
                              {downloadingUrl === item.url ? "Downloading..." : "Download"}
                            </a>
                            <button
                              type="button"
                              onClick={() => removeScheduledAsset(item.scheduleId)}
                              className="inline-flex items-center gap-1.5 rounded-full border border-rose-300/30 bg-rose-500/15 px-3.5 py-1.5 text-[11px] font-semibold text-rose-100 transition hover:bg-rose-500/25"
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-white/55">Studio output</span>
                          <div className="flex items-center gap-2">
                            <a
                              href={item.url}
                              onClick={(e) => {
                                e.preventDefault();
                                void downloadOutput(item.url);
                              }}
                              className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] text-white/80 transition hover:border-white/30 hover:bg-white/10"
                            >
                              <Download size={12} />
                              {downloadingUrl === item.url ? "Downloading..." : "Download"}
                            </a>
                            <button
                              type="button"
                              onClick={() =>
                                void removeGeneratedAsset({ id: item.id, url: item.url })
                              }
                              disabled={deletingResultId === item.id}
                              className="inline-flex items-center gap-1 rounded-full border border-rose-300/30 bg-rose-500/10 px-3 py-1 text-[11px] text-rose-100 transition hover:bg-rose-500/20 disabled:opacity-50"
                            >
                              <Trash2 size={12} />
                              {deletingResultId === item.id ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
