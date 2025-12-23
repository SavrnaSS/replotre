"use client";

import { RefreshCw } from "lucide-react";
import useAuth from "@/app/hooks/useAuth";

export default function RegenButton({ item, handleRegen }) {
  const { refresh } = useAuth();

  return (
    <button
      onClick={async () => {
        // 1️⃣ Deduct credit
        const res = await fetch("/api/credits/use", { method: "POST" });
        const data = await res.json();

        if (!res.ok) {
          if (data?.error === "no-credit") {
            alert("You have no credits left!");
            return;
          }

          alert("Failed to deduct credit.");
          return;
        }

        // 🔥 2️⃣ Sync auth (LIVE credit update)
        await refresh();

        // 3️⃣ Continue existing regen logic
        handleRegen(item);
      }}
      className="
        px-4 py-2 text-xs sm:text-sm
        bg-white text-black rounded-xl
        shadow hover:bg-white/90 transition
        flex items-center gap-2
      "
    >
      <RefreshCw size={16} /> Re-Gen
    </button>
  );
}
