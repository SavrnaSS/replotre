"use client";

import useAuth from "@/app/hooks/useAuth";

export default function CreditsBar() {
  const { user } = useAuth();

  return (
    <div className="px-5 py-2 rounded-xl bg-[#161618] border border-white/12 flex items-center gap-2 text-sm">
      <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
      <span>Credits:</span>

      <p className="text-sm text-gray-400">
        {user ? user.credits : "Loading..."}
      </p>
    </div>
  );
}
