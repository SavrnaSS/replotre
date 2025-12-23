"use client";

import { useEffect, useState } from "react";

interface ProjectItem {
  id: string;
  type: string;
  resultUrl: string;
  createdAt: number;
}

export default function ProjectsPage() {
  const { user } = useAuth();

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [filter, setFilter] = useState<"all" | "face-swap" | "ai-generate">("all");
  const [loading, setLoading] = useState(true);

  const goHome = () => (window.location.href = "/");

  /* Load user project history */
  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/history/list");
      const data = await res.json();
      setProjects(data.history || []);
      setLoading(false);
    };
    load();
  }, []);

  /* Filter logic */
  const filteredProjects =
    filter === "all"
      ? projects
      : projects.filter((p) => p.type === filter);

  return (
    <div className="min-h-screen bg-[#0D0D0F] text-white px-6 py-10 relative">
      {/* Background */}
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.04]" />
      <div className="absolute top-0 left-0 w-full h-[260px] bg-gradient-to-b from-indigo-500/15" />

      <main className="relative z-10 max-w-6xl mx-auto">

        {/* Back */}
        <button
          onClick={goHome}
          className="text-sm text-white/60 hover:text-white mb-6 flex items-center gap-2"
        >
          ← Back to Home
        </button>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-semibold">My Projects</h1>
          <p className="text-sm text-white/60 mt-1">
            All your generated images in one place
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          {[
            { label: "All", value: "all" },
            { label: "Face Swap", value: "face-swap" },
            { label: "AI Generate", value: "ai-generate" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value as any)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                filter === f.value
                  ? "bg-white text-black border-transparent"
                  : "bg-[#161618] text-white/70 border-white/10 hover:bg-[#1E1E21]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <p className="text-white/40 text-sm mt-6">Loading your projects…</p>
        )}

        {/* Empty */}
        {!loading && filteredProjects.length === 0 && (
          <p className="text-white/40 text-sm mt-6">
            No projects yet. Generate something new!
          </p>
        )}

        {/* Masonry Grid */}
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {filteredProjects.map((p) => (
            <div
              key={p.id}
              className="break-inside-avoid rounded-xl overflow-hidden border border-white/10 bg-[#161618] relative group"
            >
              <img
                src={p.resultUrl}
                className="w-full object-cover rounded-xl"
              />

              {/* Image Overlay Actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition">
                <button
                  onClick={() => window.open(p.resultUrl, "_blank")}
                  className="px-4 py-2 text-sm rounded-lg bg-white text-black font-semibold"
                >
                  Open
                </button>

                <button
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = p.resultUrl;
                    a.download = "mitux-image.jpg";
                    a.click();
                  }}
                  className="px-4 py-2 text-sm rounded-lg bg-white/80 text-black font-semibold"
                >
                  Download
                </button>
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="text-xs font-semibold capitalize">
                  {p.type}
                </p>
                <p className="text-[11px] text-white/40">
                  {new Date(p.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}
