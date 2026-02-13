"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import useAIGenerate from "@/app/hooks/useAIGenerate";
import useAuth from "@/app/hooks/useAuth";

/* ==================================================
 STORAGE KEYS
================================================== */
const FACE_STORAGE_KEY = "mitux:selectedFace"; // stores selected face preview (thumbnail dataURL)
const HAS_UPLOADED_FACE_KEY = "mitux:hasUploadedFace";
const SAVED_FACES_KEY = "mitux:savedFaces"; // stores [{id, preview}] where preview is THUMBNAIL only
const RESULTS_STORAGE_KEY = "mitux_jobs_results"; // unified results store

/* ==================================================
 STORAGE LIMITS (IMPORTANT FIX)
================================================== */
const MAX_SAVED_FACES = 12; // keep it small to avoid quota
const MAX_PREVIEW_CHARS = 180_000; // ~180KB safety cap per preview string (thumbnail should be far less)

/* ==================================================
 STORAGE HELPERS
================================================== */
const safeJSONParse = (raw, fallback) => {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const saveFaceToStorage = (face) => {
  if (typeof window === "undefined") return;
  try {
    face
      ? localStorage.setItem(FACE_STORAGE_KEY, face)
      : localStorage.removeItem(FACE_STORAGE_KEY);
  } catch (e) {
    console.warn("Failed to persist selected face:", e);
  }
};

const getFaceFromStorage = () => {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(FACE_STORAGE_KEY);
  } catch {
    return null;
  }
};

const markHasUploadedFace = () => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HAS_UPLOADED_FACE_KEY, "1");
  } catch {}
};

const hasUploadedFaceOnce = () => {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(HAS_UPLOADED_FACE_KEY) === "1";
  } catch {
    return false;
  }
};

const loadSavedFaces = () => {
  if (typeof window === "undefined") return [];
  return safeJSONParse(localStorage.getItem(SAVED_FACES_KEY), []);
};

/**
 * ✅ IMPORTANT FIX:
 * - limit count
 * - remove big previews
 * - evict on QuotaExceededError
 */
const saveSavedFaces = (faces) => {
  if (typeof window === "undefined") return;

  const normalized = (Array.isArray(faces) ? faces : [])
    .filter(Boolean)
    .map((f) => ({
      id: f.id,
      preview:
        typeof f.preview === "string" && f.preview.length <= MAX_PREVIEW_CHARS
          ? f.preview
          : null,
    }))
    .filter((f) => f.id && f.preview)
    .slice(0, MAX_SAVED_FACES);

  try {
    localStorage.setItem(SAVED_FACES_KEY, JSON.stringify(normalized));
  } catch (e) {
    // 🔥 QUOTA FIX: evict aggressively and retry once
    console.warn("Quota hit while saving faces. Evicting old faces...", e);
    try {
      const trimmed = normalized.slice(
        0,
        Math.max(4, Math.floor(MAX_SAVED_FACES / 2))
      );
      localStorage.setItem(SAVED_FACES_KEY, JSON.stringify(trimmed));
    } catch (e2) {
      console.warn("Still quota after eviction. Clearing saved faces.", e2);
      try {
        localStorage.removeItem(SAVED_FACES_KEY);
      } catch {}
    }
  }
};

/* ---------- RESULTS STORAGE ---------- */
export function saveResultsToStorage(results) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      RESULTS_STORAGE_KEY,
      JSON.stringify(Array.isArray(results) ? results : [])
    );
  } catch (e) {
    console.warn("Failed to save results:", e);
  }
}

export function getResultsFromStorage() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RESULTS_STORAGE_KEY);
    const parsed = safeJSONParse(raw, []);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn("Failed to load results:", e);
    return [];
  }
}

/* ==================================================
 SAMPLE FACES (ONBOARDING)
================================================== */
const SAMPLE_FACES = [
  "/model/face-1-v2.jpg",
  "/model/face-2-v2.jpg",
  "/model/face-3-v2.jpg",
  "/model/face-4-v2.jpg",
  "/model/face-5-v2.jpg",
  "/model/face-6-v2.jpg",
];

/* ==================================================
 FILE HASH (IDENTITY SAFE)
================================================== */
async function getFileHash(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ==================================================
 THUMBNAIL COMPRESSOR (CRITICAL QUOTA FIX)
 - Converts any image File to a small thumbnail dataURL
================================================== */
async function fileToThumbnailDataURL(file, maxSize = 256, quality = 0.72) {
  const imgURL = URL.createObjectURL(file);

  try {
    const img = new Image();
    img.src = imgURL;

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const w = img.width;
    const h = img.height;

    const scale = Math.min(maxSize / w, maxSize / h, 1);
    const outW = Math.max(1, Math.round(w * scale));
    const outH = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, outW, outH);

    // JPEG thumbnail is much smaller than PNG usually
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    return dataUrl;
  } finally {
    URL.revokeObjectURL(imgURL);
  }
}

/* ==================================================
 PROMPT PLACEHOLDER (ANIMATED)
================================================== */
const EXAMPLE_PROMPTS = [
  "cinematic portrait soft rim lighting shallow depth",
  "ultra realistic fashion photoshoot studio lighting",
  "dramatic shadows film still sharp focus",
  "natural light portrait creamy bokeh background",
];

function Prompt3DPlaceholder({ visible }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const t = setInterval(
      () => setIndex((i) => (i + 1) % EXAMPLE_PROMPTS.length),
      3200
    );
    return () => clearInterval(t);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none px-5 py-4">
      {EXAMPLE_PROMPTS[index].split(" ").map((word, i) => (
        <span
          key={`${word}-${i}`}
          className="inline-block text-white/40 text-sm mr-1 word-3d"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          {word}
        </span>
      ))}
    </div>
  );
}

/* ==================================================
 UI HELPERS
================================================== */
const CollapseCard = ({ title, value, isOpen, onToggle, children }) => (
  <div className="bg-[#111]/60 border border-white/10 rounded-xl overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex justify-between items-center px-4 py-3"
      type="button"
    >
      <div className="flex gap-2 text-sm text-white/80">
        {title}
        {value && <span className="text-[#a78bfa]">• {value}</span>}
      </div>
      <span className={`transition ${isOpen ? "rotate-180" : ""}`}>⌄</span>
    </button>
    <div
      className={`transition-all duration-500 ${
        isOpen ? "max-h-[1000px] p-4" : "max-h-0 px-4 opacity-0"
      } overflow-hidden`}
    >
      {children}
    </div>
  </div>
);

const OptionChip = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    type="button"
    className={`px-3 py-1.5 rounded-lg text-xs ${
      active
        ? "bg-white/20 border border-white/40"
        : "bg-white/5 border border-white/10 hover:bg-white/10"
    }`}
  >
    {children}
  </button>
);

/* ==================================================
 CREDITS DEDUCTION
================================================== */
async function deductCreditOrFail({ refresh }) {
  const res = await fetch("/api/credits/use", { method: "POST" });
  const data = await res.json();

  if (!res.ok) {
    if (data?.error === "no-credit") alert("You have no credits left!");
    else alert("Failed to deduct credit.");
    return false;
  }

  // 🔥 live update credits
  await refresh();
  return true;
}

/* ==================================================
 MAIN COMPONENT
================================================== */
export default function AIGenerateTab({
  onResultGenerated,
  registerAIGenerate,
  setProcessing,
  setProgress,
  onResultsChange, // optional parent sync
}) {
  const { refresh } = useAuth();

  /* ---------- FACE ---------- */
  const [uploadedFace, setUploadedFace] = useState(null);
  const [uploadedFaceFile, setUploadedFaceFile] = useState(null);
  const uploadedFaceRef = useRef(null);

  const [selectedFace, setSelectedFace] = useState(null);
  const [showSavedFaces, setShowSavedFaces] = useState(false);
  const [faceSessionExpired, setFaceSessionExpired] = useState(false);
  const [deletingFace, setDeletingFace] = useState(null);

  const uploadInputRef = useRef(null);

  /* ---------- SAVED FACES ---------- */
  const [savedFaces, setSavedFaces] = useState(() => loadSavedFaces());

  useEffect(() => {
    saveSavedFaces(savedFaces);

    if (savedFaces.length === 0) {
      try {
        localStorage.removeItem(HAS_UPLOADED_FACE_KEY);
      } catch {}
    }
  }, [savedFaces]);

  /* ---------- RESULTS (LOCAL) ---------- */
  const [results, setResults] = useState(() => getResultsFromStorage());

  // ✅ Restore results after refresh
  useEffect(() => {
    const stored = getResultsFromStorage();
    if (Array.isArray(stored)) setResults(stored);
  }, []);

  // ✅ persist results whenever updated
  const persistResults = useCallback((updater) => {
    setResults((prev) => {
      const prevArr = Array.isArray(prev) ? prev : [];
      const nextVal = typeof updater === "function" ? updater(prevArr) : updater;
      const safeNext = Array.isArray(nextVal) ? nextVal : [];
      saveResultsToStorage(safeNext);
      return safeNext;
    });
  }, []);

  // ✅ notify parent safely (NOT during render)
  useEffect(() => {
    onResultsChange?.(Array.isArray(results) ? results : []);
  }, [results, onResultsChange]);

  /* ---------- RESTORE SELECTED FACE AFTER REFRESH ---------- */
  useEffect(() => {
    const stored = getFaceFromStorage();
    if (stored) setSelectedFace(stored);
  }, []);

  /* ---------- FACE UPLOAD (FIXED: store THUMBNAIL, not blob) ---------- */
  const handleFaceUpload = async (eOrFile) => {
    const file =
      eOrFile instanceof File ? eOrFile : eOrFile?.target?.files?.[0];
    if (!file) return;

    markHasUploadedFace();

    // keep real file for current session generation
    uploadedFaceRef.current = file;
    setUploadedFaceFile(file);

    // thumbnail for UI + persistence
    const thumb = await fileToThumbnailDataURL(file);

    setUploadedFace(thumb);
    setSelectedFace(thumb);
    saveFaceToStorage(thumb);

    const hash = await getFileHash(file);

    setSavedFaces((prev) => {
      const prevArr = Array.isArray(prev) ? prev : [];
      const next = [
        { id: hash, preview: thumb },
        ...prevArr.filter((x) => x?.id !== hash),
      ];
      return next.slice(0, MAX_SAVED_FACES);
    });

    setShowSavedFaces(false);
    setFaceSessionExpired(false);
  };

  /* ---------- PROMPT ---------- */
  const [prompt, setPrompt] = useState("");

  /* ---------- ADVANCED STATES ---------- */
  const [position, setPosition] = useState("");
  const [camera, setCamera] = useState("");
  const [shot, setShot] = useState("");
  const [lighting, setLighting] = useState("");
  const [aperture, setAperture] = useState("");
  const [shutter, setShutter] = useState("");

  const [openPosition, setOpenPosition] = useState(false);
  const [openCamera, setOpenCamera] = useState(false);
  const [openLighting, setOpenLighting] = useState(false);
  const [openAperture, setOpenAperture] = useState(false);

  /* ---------- PROMPT BUILDER ---------- */
  const buildFinalPrompt = () =>
    [
      prompt,
      position && `pose ${position}`,
      camera && `camera angle ${camera}`,
      shot && `shot ${shot}`,
      lighting && `lighting ${lighting}`,
      aperture && `aperture ${aperture}`,
      shutter && `shutter ${shutter}`,
      "photorealistic",
      "same person identity",
    ]
      .filter(Boolean)
      .join(", ");

  /* ---------- AI GENERATE CORE ---------- */
  const _handleGenerate = useAIGenerate({
    selectedFace,
    uploadedFace,
    uploadedFaceFile,
    uploadedFaceRef,
    getFaceFromStorage,
    buildFinalPrompt,
    onResultGenerated,
    setResults: persistResults, // ✅ critical: persists + keeps shimmer working
    setProcessing,
    setProgress,
    setFaceSessionExpired,
  });

  /* ---------- GENERATE (CREDIT GUARDED) ---------- */
  const handleGenerate = async (promptOverride) => {
    const success = await deductCreditOrFail({ refresh });
    if (!success) return;

    if (typeof promptOverride === "string") {
      await _handleGenerate({ overridePrompt: promptOverride });
    } else {
      await _handleGenerate();
    }
  };

  /* ---------- REGISTER (RE-GEN SUPPORT) ---------- */
  useEffect(() => {
    registerAIGenerate?.(handleGenerate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerAIGenerate, selectedFace, prompt, position, camera, shot, lighting, aperture, shutter]);

  /* ---------- FACES TO RENDER ---------- */
  const facesToRender = !hasUploadedFaceOnce()
    ? SAMPLE_FACES.map((src) => ({ preview: src, isSample: true }))
    : savedFaces.map((f) => ({ ...f, isSample: false }));

  /* ==================================================
   UI
   ================================================== */
  return (
    // ✅ Mobile: 95% width, no side padding. Desktop: full width + px-4
    <div className="mt-6 space-y-6 mx-auto w-[95%] sm:w-full px-0 sm:px-4">
      {/* FACE OPTIONS */}
      {/* ✅ Mobile: remove background + border; Desktop stays same */}
      <div className="rounded-2xl border p-4 space-y-4 bg-transparent border-transparent sm:bg-white/5 sm:border-white/10">
        {selectedFace ? (
          <div className="flex justify-between items-center p-3 rounded-xl bg-[#6b4bff]/30 border border-[#a78bfa]/40">
            <div className="flex gap-3">
              <img
                src={selectedFace}
                className="w-11 h-11 rounded-full"
                alt="Selected face"
              />
              <div>
                <p className="text-sm">Face selected</p>
                <p className="text-xs text-white/60">
                  {faceSessionExpired
                    ? "Session expired — re-upload for best quality"
                    : "Face ready"}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                uploadedFaceRef.current = null;
                setUploadedFace(null);
                setUploadedFaceFile(null);
                setSelectedFace(null);
                saveFaceToStorage(null);
              }}
              className="px-3 py-1.5 text-xs bg-white/10 rounded-lg"
              type="button"
            >
              Change
            </button>
          </div>
        ) : (
          <>
            <label className="block cursor-pointer rounded-2xl p-8 text-center bg-gradient-to-br from-[#6b4bff]/40 to-[#a66bff]/30 border border-[#a78bfa]/40">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-black/30 flex items-center justify-center text-3xl">
                +
              </div>
              <p className="text-lg font-semibold">Upload Face</p>
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleFaceUpload}
              />
            </label>

            <button
              onClick={() => setShowSavedFaces(true)}
              className="w-full rounded-2xl p-5 bg-white/5 border border-white/15"
              type="button"
            >
              Choose Saved Face
            </button>
          </>
        )}

        {showSavedFaces && (
          <div
            className="
              grid grid-cols-3 gap-3
              animate-[fadeUp_0.35s_ease-out]
              w-full max-w-full
              sm:max-w-[90%]
              md:max-w-[80%]
              lg:max-w-[60%]
            "
          >
            {facesToRender.map((f, i) => {
              const isSelected = selectedFace === f.preview;

              return (
                <div
                  key={f.id || i}
                  className={`
                    relative group transition-transform duration-300
                    ${deletingFace === f.id ? "face-shake" : ""}
                  `}
                >
                  <button
                    onClick={async () => {
                      setSelectedFace(f.preview);
                      saveFaceToStorage(f.preview);
                      setShowSavedFaces(false);
                      setFaceSessionExpired(false);
                    }}
                    type="button"
                    className={`
                      relative w-full aspect-square rounded-xl overflow-hidden
                      border transform transition-all duration-300
                      ${
                        isSelected
                          ? "border-[#a78bfa]/80 ring-2 ring-[#a78bfa]/30 scale-100"
                          : "border-white/15 hover:border-[#a78bfa]/60 hover:scale-[1.04]"
                      }
                    `}
                  >
                    <img
                      src={f.preview}
                      className="w-full h-full object-cover"
                      alt="Face"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </button>

                  {!f.isSample && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingFace(f.id);

                        setTimeout(() => {
                          setSavedFaces((prev) =>
                            (Array.isArray(prev) ? prev : []).filter(
                              (x) => x.id !== f.id
                            )
                          );
                          setDeletingFace(null);
                        }, 300);
                      }}
                      type="button"
                      className="
                        absolute top-2 right-2 w-8 h-8
                        rounded-full bg-black/40 backdrop-blur-md
                        border border-white/20
                        flex items-center justify-center
                        opacity-0 group-hover:opacity-100
                        transition-all duration-200
                        hover:border-[#a78bfa]/60 hover:bg-[#6b4bff]/20
                        hover:scale-105 active:scale-95
                      "
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        className="w-4 h-4"
                      >
                        <path
                          d="M3 6h18M8 6V5A2 2 0 0 1 10 3h4a2 2 0 0 1 2 2v1M6.5 6l1 12.5A2 2 0 0 0 9.5 20h5a2 2 0 0 0 2-1.5L17.5 6M10 11v5M14 11v5"
                          stroke="rgba(255,255,255,0.9)"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PROMPT */}
      <div className="relative">
        <Prompt3DPlaceholder visible={!prompt} />
        <textarea
          rows={4}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full p-5 rounded-2xl bg-white/5 border border-white/15 text-white"
        />
      </div>

      {/* ADVANCED SETTINGS */}
      <div className="space-y-4">
        <CollapseCard
          title="Position"
          value={position}
          isOpen={openPosition}
          onToggle={() => setOpenPosition(!openPosition)}
        >
          {["front facing", "left side", "right side", "profile view"].map(
            (p) => (
              <OptionChip
                key={p}
                active={position === p}
                onClick={() => setPosition(p)}
              >
                {p}
              </OptionChip>
            )
          )}
        </CollapseCard>

        <CollapseCard
          title="Camera & Shot"
          value={camera || shot}
          isOpen={openCamera}
          onToggle={() => setOpenCamera(!openCamera)}
        >
          {["eye level", "high angle", "low angle"].map((c) => (
            <OptionChip key={c} active={camera === c} onClick={() => setCamera(c)}>
              {c}
            </OptionChip>
          ))}
          {["close-up", "medium shot", "full body"].map((s) => (
            <OptionChip key={s} active={shot === s} onClick={() => setShot(s)}>
              {s}
            </OptionChip>
          ))}
        </CollapseCard>

        <CollapseCard
          title="Lighting"
          value={lighting}
          isOpen={openLighting}
          onToggle={() => setOpenLighting(!openLighting)}
        >
          {["soft studio", "cinematic", "dramatic shadows", "natural light"].map(
            (l) => (
              <OptionChip
                key={l}
                active={lighting === l}
                onClick={() => setLighting(l)}
              >
                {l}
              </OptionChip>
            )
          )}
        </CollapseCard>

        <CollapseCard
          title="Aperture & Shutter"
          value={`${aperture} ${shutter}`.trim()}
          isOpen={openAperture}
          onToggle={() => setOpenAperture(!openAperture)}
        >
          {["f/1.4", "f/1.8", "f/2.8", "f/4"].map((a) => (
            <OptionChip key={a} active={aperture === a} onClick={() => setAperture(a)}>
              {a}
            </OptionChip>
          ))}
          {["1/60", "1/125", "1/250"].map((s) => (
            <OptionChip key={s} active={shutter === s} onClick={() => setShutter(s)}>
              {s}
            </OptionChip>
          ))}
        </CollapseCard>
      </div>

      {/* GENERATE */}
      <button
        onClick={handleGenerate}
        className="w-full py-4 rounded-2xl font-semibold bg-gradient-to-r from-[#6b4bff] to-[#a66bff]"
        type="button"
      >
        Generate
      </button>
    </div>
  );
}
