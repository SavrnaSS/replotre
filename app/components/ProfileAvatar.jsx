"use client";

import Link from "next/link";
import useAuth from "@/app/hooks/useAuth";

export default function ProfileAvatar() {
  const { user } = useAuth();

  return (
    <Link href="/profile">
      <div
        className="
          w-11 h-11 rounded-full bg-[#1a1a1c]
          border border-white/10 
          overflow-hidden cursor-pointer
          shadow-[0_0_12px_rgba(255,255,255,0.08)]
          hover:shadow-[0_0_18px_rgba(255,255,255,0.18)]
          hover:border-white/20 
          transition-all duration-200
          flex items-center justify-center select-none
        "
      >
        {user?.photo ? (
          <img
            src={user.photo}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-sm font-bold text-white/80">
            {(user?.name || user?.email || "U")[0].toUpperCase()}
          </span>
        )}
      </div>
    </Link>
  );
}
