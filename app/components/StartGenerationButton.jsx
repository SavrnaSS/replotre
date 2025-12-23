"use client";

import useAuth from "@/app/hooks/useAuth";
import AnimatedButton from "./AnimatedButton"; // adjust path if needed

export default function StartGenerationButton({
  randomizeThemeTargetSafe,
  startFaceSwap,
  isProcessing,
  setProcessing,
}) {
  const { refresh } = useAuth();

  return (
    <AnimatedButton
      onClick={async () => {
        setProcessing(true);

        // 1️⃣ Deduct credit
        const res = await fetch("/api/credits/use", { method: "POST" });
        const data = await res.json();

        if (!res.ok) {
          setProcessing(false);

          if (data?.error === "no-credit") {
            alert("You have no credits left!");
            return;
          }

          alert("Failed to deduct credit.");
          return;
        }

        // 🔥 2️⃣ Sync auth state (LIVE UPDATE)
        await refresh();

        // 3️⃣ Continue with face swap
        await randomizeThemeTargetSafe();
        await startFaceSwap();

        setProcessing(false);
      }}
      className="w-full mt-6 py-3 bg-white text-black rounded-xl text-lg font-bold shadow"
    >
      {isProcessing ? "Processing..." : "Start Image generation"}
    </AnimatedButton>
  );
}
