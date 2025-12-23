"use client";

export default function ResultViewer({ result }: any) {
  if (!result) return null;

  const url =
    typeof result === "string"
      ? result
      : result.url || result.resultUrl || result.image || "";

  if (!url) {
    console.error("❌ NO URL FOUND IN RESULT:", result);
    return null;
  }

  return (
    <div className="mt-8 bg-[#111] border border-white/10 rounded-xl p-4">
      <h3 className="text-sm mb-3">Result</h3>

      <img
        src={url}
        className="w-full h-auto rounded-lg"
        alt="Generated"
        onLoad={() => console.log("🟢 Image loaded OK:", url)}
        onError={() => console.error("❌ Image failed:", url)}
      />

      <a
        href={url}
        download="faceswap.png"
        className="mt-4 block text-center bg-white text-black py-2 rounded-lg font-semibold"
      >
        Download Image
      </a>
    </div>
  );
}
