"use client";

function absoluteUrl(path: string) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${window.location.origin}${path}`;
}

export default function ThemePicker({
  target,
  setTarget,
  artThemes,
  selectedThemeId,
  setSelectedThemeId,
}: any) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
      {artThemes.map((t) => {
        const firstImg = absoluteUrl(t.imageUrls[0]);

        return (
          <div
            key={t.id}
            onClick={() => {
              setSelectedThemeId(t.id);

              const randomImg =
                t.imageUrls[Math.floor(Math.random() * t.imageUrls.length)];

              setTarget({
                file: null,
                preview: absoluteUrl(randomImg), // FIXED
                themeId: t.id,
              });
            }}
            className={`
              cursor-pointer rounded-xl overflow-hidden border
              ${selectedThemeId === t.id ? "border-white/60" : "border-white/10"}
            `}
          >
            <img
              src={firstImg}
              className="w-full h-32 object-cover"
              alt={t.label}
            />
            <p className="text-xs text-center py-2 bg-black/40">{t.label}</p>
          </div>
        );
      })}
    </div>
  );
}
