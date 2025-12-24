"use client";

import { useEffect, useMemo, useState } from "react";

interface ProjectItem {
  id: string;
  type: "face-swap" | "ai-generate" | string;
  resultUrl: string;
  createdAt: number;
}

export default function ProjectsPage() {
  // ✅ Fix: remove missing useAuth() and use the same /api/me pattern you use elsewhere
  const [authChecked, setAuthChecked] = useState(false);
  const [authUser, setAuthUser] = useState<any>(null);

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [filter, setFilter] = useState<"all" | "face-swap" | "ai-generate">(
    "all"
  );
  const [loading, setLoading] = useState(true);

  const goHome = () => (window.location.href = "/");

  // ✅ Auth (soft) - does not block viewing unless you want to
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!mounted) return;
        setAuthUser(data?.user || null);
      } catch {
        if (!mounted) return;
        setAuthUser(null);
      } finally {
        if (!mounted) return;
        setAuthChecked(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  /* Load user project history */
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const res = await fetch("/api/history/list", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!mounted) return;
        setProjects(Array.isArray(data?.history) ? data.history : []);
      } catch {
        if (!mounted) return;
        setProjects([]);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  /* Filter logic */
  const filteredProjects = useMemo(() => {
    return filter === "all" ? projects : projects.filter((p) => p.type === filter);
  }, [projects, filter]);

  const download = (url: string, filename = "mitux-image.jpg") => {
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0F] text-white px-6 py-10 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.04]" />
      <div className="absolute top-0 left-0 w-full h-[260px] bg-gradient-to-b from-indigo-500/15" />

      <main className="relative z-10 max-w-6xl mx-auto">
        {/* Back */}
        <button
          onClick={goHome}
          className="text-sm text-white/60 hover:text-white mb-6 flex items-center gap-2"
          type="button"
        >
          ← Back to Home
        </button>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-semibold">My Projects</h1>
          <p className="text-sm text-white/60 mt-1">
            All your generated images in one place
            {authChecked && authUser?.name ? (
              <span className="text-white/70"> · {authUser.name}</span>
            ) : null}
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6 flex-wrap">
          {[
            { label: "All", value: "all" as const },
            { label: "Face Swap", value: "face-swap" as const },
            { label: "AI Generate", value: "ai-generate" as const },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              type="button"
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
                alt={p.type}
                className="w-full object-cover rounded-xl"
                loading="lazy"
              />

              {/* Image Overlay Actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition">
                <button
                  onClick={() => window.open(p.resultUrl, "_blank")}
                  className="px-4 py-2 text-sm rounded-lg bg-white text-black font-semibold"
                  type="button"
                >
                  Open
                </button>

                <button
                  onClick={() => download(p.resultUrl)}
                  className="px-4 py-2 text-sm rounded-lg bg-white/80 text-black font-semibold"
                  type="button"
                >
                  Download
                </button>
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="text-xs font-semibold capitalize">{p.type}</p>
                <p className="text-[11px] text-white/40">
                  {Number.isFinite(p.createdAt)
                    ? new Date(p.createdAt).toLocaleString()
                    : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
