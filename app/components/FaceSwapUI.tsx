"use client";

import { useState } from "react";
import ImageUploader from "./ImageUploader";
import ThemePicker from "./ThemePicker";
import ResultViewer from "./ResultViewer";
import Loader from "./Loader";
import { dataURLtoFile } from "@/app/lib/utils";

export default function FaceSwapUI() {
  const [source, setSource] = useState<any>(null);
  const [target, setTarget] = useState<any>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const startSwap = async () => {
    if (!source || !target) {
      alert("Upload source + select theme");
      return;
    }

    setLoading(true);
    setResult(null);

    const fd = new FormData();

    // SOURCE
    if (source.file) {
      fd.append("source_img", source.file);
    } else if (source.preview.startsWith("data:")) {
      fd.append("source_img", dataURLtoFile(source.preview, "source.jpg"));
    }

    // THEME
    fd.append("theme_name", target.folder); // ← CORRECT

    const res = await fetch("/api/faceswap", {
      method: "POST",
      body: fd,
    });

    const text = await res.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      alert("Backend returned invalid JSON");
      setLoading(false);
      return;
    }

    if (!res.ok) {
      alert(data.error || "Swap failed");
      setLoading(false);
      return;
    }

    if (!data.image) {
      alert("No image returned");
      setLoading(false);
      return;
    }

    const finalUrl = `data:image/png;base64,${data.image}`;

    setResult(finalUrl);
    setLoading(false);
  };

  return (
    <div className="space-y-8">

      <div>
        <h2 className="font-semibold mb-2">Your Photo</h2>
        <ImageUploader image={source} setImage={setSource} />
      </div>

      <div>
        <h2 className="font-semibold mb-2">Select AI Theme</h2>
        <ThemePicker target={target} setTarget={setTarget} />
      </div>

      <button
        onClick={startSwap}
        disabled={loading}
        className="w-full py-3 bg-white text-black rounded-xl font-semibold text-lg disabled:opacity-40"
      >
        {loading ? "Processing..." : "Start Face Swap"}
      </button>

      {loading && <Loader />}

      <ResultViewer result={result} />
    </div>
  );
}
