"use client";

import { HistoryItem } from "@/types/app";
import { ExternalLink, Download } from "lucide-react";

export default function HistoryList({
  history,
  onOpen,
}: {
  history: HistoryItem[];
  onOpen: (url: string) => void;
}) {
  if (!history.length) {
    return (
      <p className="text-sm text-white/50 text-center py-6">No history yet.</p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 max-h-64 overflow-y-auto pr-1">
      {history.map((h: HistoryItem, idx: number) => {
        // ✅ pick a safe url (keeps your existing behavior, but avoids null crashes)
        const url =
          h.resultUrl ||
          h.imageUrl ||
          (Array.isArray(h.images) ? h.images[0] : "") ||
          "";

        const hasUrl = Boolean(url);

        return (
          <div
            key={h.id || `${idx}`} // ✅ don’t use crypto.randomUUID() in render
            className="
              group relative flex items-center gap-4
              bg-white/5 border border-white/10 rounded-xl p-3
              hover:bg-white/10 transition-all
            "
          >
            {/* Thumbnail */}
            <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-white/5 border border-white/10">
              {hasUrl ? (
                <img
                  src={url}
                  alt={h.type ? String(h.type) : "History item"}
                  className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-all"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-white/40">
                  No image
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold capitalize truncate">
                {h.type || "result"}
              </p>
              <p className="text-xs text-white/40">
                {new Date(h.createdAt as any).toLocaleString()}
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 opacity-80 group-hover:opacity-100 transition-all">
              <button
                onClick={() => hasUrl && onOpen(url)}
                disabled={!hasUrl}
                className={[
                  "p-1.5 rounded-lg transition-all",
                  hasUrl
                    ? "bg-white/10 hover:bg-white/20"
                    : "bg-white/5 opacity-40 cursor-not-allowed",
                ].join(" ")}
                type="button"
                aria-label="Open"
              >
                <ExternalLink size={16} />
              </button>

              {hasUrl ? (
                <a
                  href={url}
                  download
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all"
                  aria-label="Download"
                >
                  <Download size={16} />
                </a>
              ) : (
                <span className="p-1.5 rounded-lg bg-white/5 opacity-40 cursor-not-allowed">
                  <Download size={16} />
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
