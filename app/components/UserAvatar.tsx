"use client";

import { useState, useRef, useEffect } from "react";

export default function UserAvatar({
  name,
  onLogout,
}: {
  name?: string | null;
  onLogout: () => void;
}) {
  const letter = name?.[0]?.toUpperCase() || "U";

  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar button */}
      <button
        onClick={() => setOpen(!open)}
        className="
          w-11 h-11 rounded-full flex items-center justify-center
          text-lg font-semibold
          bg-[#1A1A1C] 
          border border-white/20 
          text-white
          hover:bg-[#222226]
          transition-all duration-150
          shadow-sm shadow-black/10
        "
      >
        {letter}
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div
          className="
            absolute right-0 mt-3 w-52
            bg-[#111113] text-white rounded-xl border border-white/10
            shadow-xl shadow-black/30 backdrop-blur-xl
            animate-fadeSlide
            z-50
          "
        >
          {/* Header */}
          <div className="p-4 border-b border-white/10">
            <p className="font-semibold text-sm">{name}</p>
            <p className="text-xs text-white/50">Logged in</p>
          </div>

          {/* Menu */}
          <div className="py-2">
            <button
              className="
                w-full text-left px-4 py-2 text-sm hover:bg-white/5
              "
              onClick={() => alert("Profile page coming soon")}
            >
              Profile
            </button>

            <button
              className="
                w-full text-left px-4 py-2 text-sm hover:bg-white/5
              "
              onClick={() => alert("Billing page coming soon")}
            >
              Billing / Credits
            </button>

            <hr className="border-white/10 my-2" />

            <button
              onClick={onLogout}
              className="
                w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10
              "
            >
              Logout
            </button>
          </div>
        </div>
      )}

      {/* Animation styles */}
      <style jsx>{`
        @keyframes fadeSlide {
          0% {
            opacity: 0;
            transform: translateY(-6px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeSlide {
          animation: fadeSlide 0.17s ease-out;
        }
      `}</style>
    </div>
  );
}
