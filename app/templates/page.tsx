"use client";

import { useState } from "react";
import TemplateGallery from "../components/TemplateGallery";
import CategoryTabs from "../components/CategoryTabs";
import { motion } from "framer-motion";

const allTemplates = {
  Portrait: [
    { id: 1, name: "Studio Portrait", img: "/templates/portrait.jpg" },
    { id: 2, name: "Beauty Glow", img: "/templates/glow.jpg" },
  ],
  Anime: [
    { id: 3, name: "Anime Girl", img: "/templates/anime1.jpg" },
    { id: 4, name: "Anime Boy", img: "/templates/anime2.jpg" },
  ],
  Cyberpunk: [
    { id: 5, name: "Neon Street", img: "/templates/neon.jpg" },
  ],
  Fantasy: [
    { id: 6, name: "Elf Queen", img: "/templates/fantasy.jpg" },
  ],
};

// 🟢 FIX: Strong type categories
type TemplateCategory = keyof typeof allTemplates;
const categories = Object.keys(allTemplates) as TemplateCategory[];

export default function TemplatesPage() {
  const [active, setActive] = useState<TemplateCategory>(categories[0]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="p-6 max-w-6xl mx-auto text-white"
    >
      <h1 className="text-3xl font-bold mb-6">AI Templates</h1>

      <CategoryTabs
        categories={categories}
        active={active}
        onChange={setActive}
      />

      <div className="mt-6">
        <TemplateGallery
          templates={allTemplates[active]}
          onSelect={(t: any) => alert(`Selected template: ${t.name}`)}
        />
      </div>
    </motion.div>
  );
}
