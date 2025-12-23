"use client";

import { useCallback } from "react";

function dataURLtoFile(dataUrl, filename = "face.jpg") {
  const [meta, b64] = dataUrl.split(",");
  const mime = meta.match(/data:(.*?);/)?.[1] || "image/jpeg";
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new File([u8], filename, { type: mime });
}

export default function useAIGenerate({
  selectedFace,
  uploadedFace,
  uploadedFaceFile,
  uploadedFaceRef,
  getFaceFromStorage,
  buildFinalPrompt,

  // parent notifier
  onResultGenerated,

  setResults,
  setProcessing,
  setProgress,
  setFaceSessionExpired,
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

      /* ---------- FACE ---------- */
      const finalFace = selectedFace ?? getFaceFromStorage();
      if (!finalFace) {
        alert("Please select a face");
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
          face: finalFace,
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
        const formData = new FormData();
        formData.append("prompt", finalPrompt);

        // ✅ FIX: support blob:, data:, http(s), and /path
        if (typeof finalFace === "string" && finalFace.startsWith("blob:")) {
          const file = uploadedFaceRef.current || uploadedFaceFile;
          if (!file) {
            setFaceSessionExpired(true);
            setResults((prev) => (Array.isArray(prev) ? prev : []).filter((x) => x.id !== jobId));
            onResultGenerated?.({ ...placeholderItem, __remove: true });
            return;
          }
          formData.append("face", file);
        } else if (typeof finalFace === "string" && finalFace.startsWith("data:")) {
          // 🔥 after refresh, selectedFace is a thumbnail dataURL
          const file = dataURLtoFile(finalFace, "face.jpg");
          formData.append("face", file);
        } else {
          const faceUrl =
            typeof finalFace === "string" && finalFace.startsWith("http")
              ? finalFace
              : `${window.location.origin}${finalFace}`;
          formData.append("faceUrl", faceUrl);
        }

        const res = await fetch("http://localhost:8000/generate", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

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
      selectedFace,
      uploadedFace,
      uploadedFaceFile,
      uploadedFaceRef,
      getFaceFromStorage,
      buildFinalPrompt,
      onResultGenerated,
      setResults,
      setProcessing,
      setProgress,
      setFaceSessionExpired,
    ]
  );

  return handleGenerate;
}
