// app/lib/faceswap/startFaceSwap.ts

import { dataURLtoFile } from "./helpers";
import { slugify } from "../slugify";

export async function startFaceSwap({
  source,
  selectedTheme,
  setProcessing,
  setProgress,
  setResults,
  setResultImage,
  saveResult,
}: {
  source: any;
  selectedTheme: any;
  setProcessing: Function;
  setProgress: Function;
  setResults: Function;
  setResultImage: Function;
  saveResult: Function;
}) {
  console.log("🚀 startFaceSwap() CALLED");

  // VALIDATION
  if (!source) {
    alert("Please upload your face photo.");
    return;
  }

  if (!selectedTheme) {
    alert("Please select a theme.");
    return;
  }

  const theme_name = slugify(selectedTheme.folder); // or selectedTheme.folder if you prefer exact folder names

  setProcessing(true);
  setProgress(0);

  // PLACEHOLDER
  const placeholderId = "loading-" + crypto.randomUUID();
  const placeholder = {
    id: placeholderId,
    url: null,
    isLoading: true,
    createdAt: Date.now(),
  };

  setResults((prev: any) => [placeholder, ...prev]);

  // PROGRESS
  let p = 0;
  const interval = setInterval(() => {
    p += Math.random() * 6;
    if (p >= 90) p = 90;
    setProgress(Math.floor(p));
  }, 160);

  // PREPARE SOURCE FILE
  let sourceFile: File | null = null;

  if (source.file) {
    sourceFile = source.file;
  } else if (source.preview?.startsWith("data:")) {
    sourceFile = dataURLtoFile(source.preview, "source.jpg");
  } else {
    alert("Invalid source image.");
    clearInterval(interval);
    setProcessing(false);
    return;
  }

  // BUILD FORM
  const form = new FormData();
  form.append("source_img", sourceFile);
  form.append("theme_name", theme_name);

  // SEND REQUEST TO BACKEND
  try {
    const res = await fetch("/api/faceswap", {
      method: "POST",
      body: form,
    });

    const raw = await res.text();
    let data: any = {};

    try {
      data = JSON.parse(raw);
    } catch {
      console.warn("⚠ Backend returned non-JSON");
    }

    // Handle error
    if (!res.ok) {
      alert("Swap failed: " + (data.error || "Unknown backend error"));
      setResults((prev: any) => prev.filter((x: any) => x.id !== placeholderId));
      clearInterval(interval);
      setProcessing(false);
      return;
    }

    // Extract BASE64 image
    let finalImage: string | null = null;

    if (data.image) {
      finalImage = `data:image/png;base64,${data.image}`;
    } else {
      // fallback formats
      finalImage =
        data.result ||
        data.output ||
        data.img ||
        data.image_url ||
        raw;
    }

    if (!finalImage) {
      alert("Swap failed: no image returned.");
      setResults((prev: any) => prev.filter((x: any) => x.id !== placeholderId));
      clearInterval(interval);
      setProcessing(false);
      return;
    }

    // FINISH
    setProgress(100);
    clearInterval(interval);

    const finalItem = {
      id: crypto.randomUUID(),
      url: finalImage,
      createdAt: Date.now(),
      meta: {
        gender: data.gender,
        hair: data.hair,
        used_folder: data.used_folder,
      },
    };

    // Save into history
    await saveResult(finalItem);

    setJobs(prev =>
      prev.map(job =>
        job.id === jobId
          ? {
              ...job,
              progress: 100,
              resultUrl: finalDataUrl,
            }
          : job
      )
    );    

    setResultImage(finalImage);
  } catch (err) {
    console.error("🔥 ERROR:", err);
    alert("Something went wrong during face swap.");
    setResults((prev: any) => prev.filter((x: any) => x.id !== placeholderId));
  }

  setProcessing(false);
}