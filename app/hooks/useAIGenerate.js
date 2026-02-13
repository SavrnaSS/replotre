"use client";

import { useCallback } from "react";

export default function useAIGenerate({
  buildFinalPrompt,

  // parent notifier
  onResultGenerated,

  setResults,
  setProcessing,
  setProgress,
}) {
  const handleGenerate = useCallback(
    async (options = {}) => {
      const { overridePrompt } = options;

      /* ---------- PROMPT ---------- */
      const finalPrompt = overridePrompt || buildFinalPrompt();
      if (!finalPrompt) {
        alert("Please enter a prompt");
        return;
      }

      setProcessing(true);
      setProgress(0);

      /* ---------- PLACEHOLDER (STABLE ID) ---------- */
      const jobId = crypto.randomUUID();

      const placeholderItem = {
        id: jobId,
        url: null,
        createdAt: Date.now(),
        isLoading: true,
        meta: {
          type: "ai-generate",
          prompt: finalPrompt,
        },
      };

      setResults((prev) => [placeholderItem, ...(Array.isArray(prev) ? prev : [])]);
      onResultGenerated?.(placeholderItem);

      /* ---------- PROGRESS SIM ---------- */
      let p = 0;
      const interval = setInterval(() => {
        p += Math.random() * 6;
        if (p >= 90) p = 90;
        setProgress(Math.floor(p));
      }, 150);

      try {
        const res = await fetch("/api/txt2img", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: finalPrompt }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || data?.error || "Generation failed");

        const imageUrl =
          data?.imageUrl ||
          data?.image ||
          data?.result ||
          (Array.isArray(data?.output) ? data.output[0] : null) ||
          (Array.isArray(data?.images) ? data.images[0] : null) ||
          data?.url;

        if (!imageUrl) throw new Error("No image returned");

        /* ---------- FINAL RESULT (SAME ID) ---------- */
        const finalItem = {
          ...placeholderItem,
          url: imageUrl,
          isLoading: false,
        };

        // replace placeholder locally
        setResults((prev) =>
          (Array.isArray(prev) ? prev : []).map((x) => (x.id === jobId ? finalItem : x))
        );

        // replace placeholder in parent
        onResultGenerated?.(finalItem);

        // persist only FINALS in localStorage (optional safety)
        try {
          const raw = localStorage.getItem("mitux_jobs_results");
          const existing = raw ? JSON.parse(raw) : [];
          const safeExisting = Array.isArray(existing) ? existing : [];
          const next = [finalItem, ...safeExisting.filter((x) => x?.isLoading !== true)];
          localStorage.setItem("mitux_jobs_results", JSON.stringify(next));
        } catch {}

        setProgress(100);
      } catch (err) {
        console.error("🔥 AI GENERATE ERROR:", err);

        setResults((prev) => (Array.isArray(prev) ? prev : []).filter((x) => x.id !== jobId));
        onResultGenerated?.({ ...placeholderItem, __remove: true });

        alert("Generation failed. Please try again.");
      } finally {
        clearInterval(interval);
        setProcessing(false);
      }
    },
    [
      buildFinalPrompt,
      onResultGenerated,
      setResults,
      setProcessing,
      setProgress,
    ]
  );

  return handleGenerate;
}
