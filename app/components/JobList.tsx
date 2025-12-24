"use client";

import { JobItem } from "@/types/app";
import { ExternalLink, Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function JobList({
  jobs,
  onOpen,
}: {
  jobs: JobItem[];
  onOpen: (url: string) => void;
}) {
  if (!jobs.length)
    return <p className="text-sm text-white/50 text-center py-6">No jobs running.</p>;

  return (
    <div className="space-y-4">
      {jobs.map((job) => {
        const isDone = job.progress === 100 && !!job.resultUrl;
        const isError = !!job.error;

        return (
          <div
            key={job.id}
            className="p-4 bg-white/5 border border-white/10 rounded-xl flex gap-4 items-center"
          >
            {/* Thumbnail */}
            <div className="w-16 h-16 bg-white/5 rounded-lg overflow-hidden flex items-center justify-center">
              {job.resultUrl ? (
                <img src={job.resultUrl} className="w-full h-full object-cover" alt="Result" />
              ) : (
                <span className="text-xs text-white/40">AI</span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <p className="font-semibold">{job.type || "Face Swap"}</p>

              <div className="flex items-center gap-2 mt-1 text-xs">
                {!isDone && !isError && (
                  <span className="text-blue-400 flex items-center gap-1">
                    <Loader2 size={14} className="animate-spin" /> Processing…
                  </span>
                )}

                {isDone && (
                  <span className="text-green-400 flex items-center gap-1">
                    <CheckCircle2 size={14} /> Completed
                  </span>
                )}

                {isError && (
                  <span className="text-red-400 flex items-center gap-1">
                    <XCircle size={14} /> Error
                  </span>
                )}
              </div>

              <div className="w-full bg-white/10 h-2 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    isError ? "bg-red-500" : isDone ? "bg-green-400" : "bg-purple-400"
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, job.progress ?? 0))}%` }}
                />
              </div>
            </div>

            <button
              disabled={!job.resultUrl}
              onClick={() => job.resultUrl && onOpen(job.resultUrl)}
              className="p-2 bg-white rounded-xl text-black disabled:opacity-40 disabled:cursor-not-allowed"
              type="button"
              aria-label="Open result"
            >
              <ExternalLink size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
