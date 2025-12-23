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
  if (!history.length)
    return (
      <p className="text-sm text-white/50 text-center py-6">
        No history yet.
      </p>
    );

  return (
    <div className="grid grid-cols-1 gap-4 max-h-64 overflow-y-auto pr-1">
      {history.map((h: HistoryItem) => (
        <div
          key={crypto.randomUUID()}
          className="
            group relative flex items-center gap-4
            bg-white/5 border border-white/10 rounded-xl p-3
            hover:bg-white/10 transition-all
          "
        >
          {/* Thumbnail */}
          <div className="relative w-14 h-14 rounded-lg overflow-hidden">
            <img
              src={h.resultUrl}
              className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-all"
            />
          </div>

          {/* Info */}
          <div className="flex-1">
            <p className="text-sm font-semibold capitalize">{h.type}</p>
            <p className="text-xs text-white/40">
              {new Date(h.createdAt).toLocaleString()}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 opacity-80 group-hover:opacity-100 transition-all">
            <button
              onClick={() => onOpen(h.resultUrl)}
              className="
                p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all
              "
            >
              <ExternalLink size={16} />
            </button>

            <a
              href={h.resultUrl}
              download
              className="
                p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all
              "
            >
              <Download size={16} />
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
