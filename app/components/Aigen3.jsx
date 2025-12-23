"use client";
import { useState, useEffect, useRef } from "react";
import useAIGenerate from "@/app/hooks/useAIGenerate";
import useAuth from "@/app/hooks/useAuth";


/* ==================================================
   STORAGE KEYS
================================================== */
const FACE_STORAGE_KEY = "mitux:selectedFace";
const HAS_UPLOADED_FACE_KEY = "mitux:hasUploadedFace";
const SAVED_FACES_KEY = "mitux:savedFaces";

/* ==================================================
   STORAGE HELPERS
================================================== */
const saveFaceToStorage = (face) => {
  if (typeof window === "undefined") return;
  face
    ? localStorage.setItem(FACE_STORAGE_KEY, face)
    : localStorage.removeItem(FACE_STORAGE_KEY);
};

/* ---------- RESULTS STORAGE ---------- */
const RESULTS_STORAGE_KEY = "mitux_results_v1";

export function saveResultsToStorage(results) {
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
  try {
    const raw = localStorage.getItem(RESULTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn("Failed to load results:", e);
    return [];
  }
}

const getFaceFromStorage = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(FACE_STORAGE_KEY);
};

const markHasUploadedFace = () => {
  if (typeof window === "undefined") return;
  localStorage.setItem(HAS_UPLOADED_FACE_KEY, "1");
};

const hasUploadedFaceOnce = () => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(HAS_UPLOADED_FACE_KEY) === "1";
};

const saveSavedFaces = (faces) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(SAVED_FACES_KEY, JSON.stringify(faces));
};

const loadSavedFaces = () => {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SAVED_FACES_KEY)) || [];
  } catch {
    return [];
  }
};

async function deductCreditOrFail({ setUser, refresh }) {
  const res = await fetch("/api/credits/use", { method: "POST" });
  const data = await res.json();

  if (!res.ok) {
    if (data?.error === "no-credit") {
      alert("You have no credits left!");
    } else {
      alert("Failed to deduct credit.");
    }
    return false;
  }

  // 🔥 THIS IS THE KEY LINE
  await refresh();

  return true;
}


/* ==================================================
   SAMPLE FACES (ONBOARDING)
================================================== */
const SAMPLE_FACES = [
  "/faces/sample1.jpg",
  "/faces/sample2.jpg",
  "/faces/sample3.jpg",
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
   MAIN COMPONENT
================================================== */

export default function AIGenerateTab({
  onResultGenerated,
  registerAIGenerate,
  setProcessing,
  setProgress,
  onResultsChange, // ✅ optional
}) {
  /* ---------- AUTH ---------- */
  const { user, setUser, refresh } = useAuth();

  /* ---------- FACE ---------- */
  const [uploadedFace, setUploadedFace] = useState(null);
  const [uploadedFaceFile, setUploadedFaceFile] = useState(null);
  const uploadedFaceRef = useRef(null);

  const [selectedFace, setSelectedFace] = useState(null);
  const [showSavedFaces, setShowSavedFaces] = useState(false);
  const [faceSessionExpired, setFaceSessionExpired] = useState(false);
  const [deletingFace, setDeletingFace] = useState(null);

  const uploadInputRef = useRef(null);

  /* ---------- SAVED FACES (PERSISTED) ---------- */
  const [savedFaces, setSavedFaces] = useState(() => loadSavedFaces());

  useEffect(() => {
    saveSavedFaces(savedFaces);
    if (savedFaces.length === 0) {
      localStorage.removeItem(HAS_UPLOADED_FACE_KEY);
    }
  }, [savedFaces]);


/* =====================================================
   🔹 RESULTS STATE (OWNED LOCALLY)
   ===================================================== */

   const [results, setResults] = useState(() => {
    try {
      return getFaceFromStorage() || [];
    } catch {
      return [];
    }
  });

  const persistResults = (value) => {
    setResults((prev) => {
      const newValue =
        typeof value === "function" ? value(prev) : value;
  
      // 🔥 FORCE ARRAY
      const safeValue = Array.isArray(newValue) ? newValue : [];
  
      // 🔥 SAVE DIRECTLY (NO HELPERS)
      try {
        localStorage.setItem(
          "mitux_jobs_results",
          JSON.stringify(safeValue)
        );
      } catch (e) {
        console.warn("Failed to save results:", e);
      }
  
      return safeValue;
    });
  };  
  
  useEffect(() => {
    if (!onResultsChange) return;
    onResultsChange(Array.isArray(results) ? results : []);
  }, [results, onResultsChange]);


  /* ---------- RESTORE SELECTED FACE ---------- */
  useEffect(() => {
    const stored = getFaceFromStorage();
    if (stored) setSelectedFace(stored);
  }, []);

  /* ---------- FACE UPLOAD ---------- */
  const handleFaceUpload = async (eOrFile) => {
    const file =
      eOrFile instanceof File
        ? eOrFile
        : eOrFile?.target?.files?.[0];

    if (!file) return;

    if (uploadedFace) URL.revokeObjectURL(uploadedFace);

    const preview = URL.createObjectURL(file);
    const hash = await getFileHash(file);

    markHasUploadedFace();

    setUploadedFace(preview);
    setUploadedFaceFile(file);
    uploadedFaceRef.current = file;

    setSelectedFace(preview);
    saveFaceToStorage(preview);

    setSavedFaces((prev) => {
      const idx = prev.findIndex((f) => f.id === hash);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = { id: hash, preview };
        return copy;
      }
      return [{ id: hash, preview }, ...prev];
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


  /* =====================================================
     🔹 GENERATE + REGEN CORE
     ===================================================== */

/* =====================================================
   🔹 AI GENERATE CORE (UPDATED)
   ===================================================== */

   const _handleGenerate = useAIGenerate({
    selectedFace,
    uploadedFace,
    uploadedFaceFile,
    uploadedFaceRef,
    getFaceFromStorage,
    buildFinalPrompt,
  
    // 🔥 NEW: push generated result to parent
    onResultGenerated,
  
    // 🔥 use wrapped setter for local UI (placeholder → final)
    setResults: persistResults,
  
    setProcessing,
    setProgress,
    setFaceSessionExpired,
  });
  
  
  /* =====================================================
     🔹 GENERATE + REGEN (CREDIT-GUARDED)
     ===================================================== */
  
  const handleGenerate = async (promptOverride) => {
    // 1️⃣ Deduct credit first
    const success = await deductCreditOrFail({ setUser, refresh });
    if (!success) return;
  
    // 2️⃣ Run generator (original behavior preserved)
    if (typeof promptOverride === "string") {
      await _handleGenerate({ overridePrompt: promptOverride });
    } else {
      await _handleGenerate();
    }
  };
  
  /* =====================================================
     🔹 REGISTER AI GENERATE (FOR RE-GEN BUTTONS)
     ===================================================== */
  
  useEffect(() => {
    registerAIGenerate?.(handleGenerate);
  }, [handleGenerate]);


  /* ---------- FACES TO RENDER ---------- */
  const facesToRender =
    !hasUploadedFaceOnce()
      ? SAMPLE_FACES.map((src) => ({ preview: src, isSample: true }))
      : savedFaces.map((f) => ({ ...f, isSample: false }));

  /* ==================================================
     UI
  ================================================== */
  return (
    <div className="mt-6 space-y-6 px-4">
      {/* FACE OPTIONS */}
      <div className="bg-white/5 rounded-2xl border border-white/10 p-4 space-y-4">
        {selectedFace ? (
          <div className="flex justify-between items-center p-3 rounded-xl bg-[#6b4bff]/30 border border-[#a78bfa]/40">
            <div className="flex gap-3">
              <img src={selectedFace} className="w-11 h-11 rounded-full" />
              <div>
                <p className="text-sm">Face selected</p>
                <p className="text-xs text-white/60">Face ready</p>
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

    w-full
    max-w-full
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
            relative group
            transition-transform duration-300
            ${deletingFace === f.id ? "face-shake" : ""}
          `}
        >
          <button
            onClick={async () => {
              const res = await fetch(f.preview);
              const blob = await res.blob();
              handleFaceUpload(
                new File([blob], "face.jpg", {
                  type: blob.type || "image/jpeg",
                })
              );
            }}
            className={`
              relative w-full aspect-square rounded-xl overflow-hidden
              border transform transition-all duration-300
              ${isSelected
                ? "border-[#a78bfa]/80 ring-2 ring-[#a78bfa]/30 scale-100"
                : "border-white/15 hover:border-[#a78bfa]/60 hover:scale-[1.04]"}
            `}
          >
            <img
              src={f.preview}
              className="
                w-full h-full object-cover
                scale-[1]
                transition-transform duration-300
                group-hover:scale-100
              "
            />

            {/* HOVER OVERLAY */}
            <div className="
              absolute inset-0
              bg-gradient-to-t from-black/40 to-transparent
              opacity-0 group-hover:opacity-100
              transition-opacity duration-300
            " />
          </button>

          {!f.isSample && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeletingFace(f.id);
                setTimeout(() => {
                  setSavedFaces((prev) =>
                    prev.filter((x) => x.id !== f.id)
                  );
                  setDeletingFace(null);
                }, 300);
              }}
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
        <CollapseCard title="Position" value={position} isOpen={openPosition} onToggle={() => setOpenPosition(!openPosition)}>
          {["front facing", "left side", "right side", "profile view"].map((p) => (
            <OptionChip key={p} active={position === p} onClick={() => setPosition(p)}>
              {p}
            </OptionChip>
          ))}
        </CollapseCard>

        <CollapseCard title="Camera & Shot" value={camera || shot} isOpen={openCamera} onToggle={() => setOpenCamera(!openCamera)}>
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

        <CollapseCard title="Lighting" value={lighting} isOpen={openLighting} onToggle={() => setOpenLighting(!openLighting)}>
          {["soft studio", "cinematic", "dramatic shadows", "natural light"].map((l) => (
            <OptionChip key={l} active={lighting === l} onClick={() => setLighting(l)}>
              {l}
            </OptionChip>
          ))}
        </CollapseCard>

        <CollapseCard title="Aperture & Shutter" value={`${aperture} ${shutter}`} isOpen={openAperture} onToggle={() => setOpenAperture(!openAperture)}>
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
      >
        Generate
      </button>
    </div>
  );
}
