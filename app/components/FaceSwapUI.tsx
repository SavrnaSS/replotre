// ./app/components/FaceSwapUI.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import ThemePicker from "@/app/components/ThemePicker";
import DropzoneUploader from "@/app/components/DropzoneUploader";
import { startFaceSwap } from "@/app/lib/faceswap/startFaceSwap";
import { getArtThemes } from "@/app/config/artThemes";

type Theme = {
  id: number;
  label: string;
  folder?: string;
  tag?: string;
  imageUrls: string[];
};

export type TargetState = {
  file: File | null;
  preview: string | null;
  themeId: number | null;
};

export default function FaceSwapUI() {
  const [target, setTarget] = useState<TargetState>({
    file: null,
    preview: null,
    themeId: null,
  });

  const [selectedThemeId, setSelectedThemeId] = useState<number | null>(null);

  // ✅ FIX: artThemes is not exported anymore — use getArtThemes()
  const themes = useMemo<Theme[]>(() => {
    try {
      const t = typeof getArtThemes === "function" ? (getArtThemes() as any) : [];
      return Array.isArray(t) ? (t as Theme[]) : [];
    } catch {
      return [];
    }
  }, []);

  const selectedTheme = useMemo(() => {
    if (!selectedThemeId) return null;
    return themes.find((t) => t.id === selectedThemeId) ?? null;
  }, [selectedThemeId, themes]);

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<any[]>([]);
  const [resultImage, setResultImage] = useState<string | null>(null);

  // keep your existing save logic (placeholder)
  async function saveResult(item: any) {
    // keep your existing working logic here (API call / local state etc.)
    return item;
  }

  // (optional) clean up blob preview URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (target?.preview && target.preview.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(target.preview);
        } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full">
      <div>
        <h2 className="font-semibold mb-2">Upload Face Photo</h2>

        <DropzoneUploader
          onDrop={(files: File[]) => {
            const f = files?.[0];
            if (!f) return;

            // revoke previous blob (if any)
            if (target?.preview && target.preview.startsWith("blob:")) {
              try {
                URL.revokeObjectURL(target.preview);
              } catch {}
            }

            const preview = URL.createObjectURL(f);
            setTarget((prev) => ({
              ...prev,
              file: f,
              preview,
            }));
          }}
          // ✅ FIX: null -> undefined (TS wants string | undefined)
          preview={target.preview ?? undefined}
        />
      </div>

      <div className="mt-6">
        <h2 className="font-semibold mb-2">Select AI Theme</h2>

        <ThemePicker
          target={target}
          setTarget={setTarget}
          artThemes={themes}
          selectedThemeId={selectedThemeId}
          setSelectedThemeId={setSelectedThemeId}
        />
      </div>

      <button
        className="mt-6 w-full py-3 rounded-xl bg-white text-black font-semibold disabled:opacity-50"
        disabled={processing}
        onClick={() =>
          startFaceSwap({
            source: target, // keeping your existing logic
            selectedTheme,
            setProcessing,
            setProgress,
            setResults,
            setResultImage,
            saveResult,
          })
        }
      >
        {processing ? `Processing… ${progress}%` : "Start Face Swap"}
      </button>

      {resultImage && (
        <div className="mt-6">
          <img src={resultImage} alt="Result" className="w-full rounded-2xl" />
        </div>
      )}
    </div>
  );
}
