"use client";

import { motion } from "framer-motion";

export default function CategoryTabs({ categories, active, onChange }: any) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-3">
      {categories.map((c: string) => (
        <motion.div
          key={c}
          whileHover={{ scale: 1.1 }}
          onClick={() => onChange(c)}
          className={`px-4 py-2 rounded-xl whitespace-nowrap cursor-pointer ${
            active === c
              ? "bg-white text-black"
              : "bg-white/5 border border-white/10 text-white/70"
          }`}
        >
          {c}
        </motion.div>
      ))}
    </div>
  );
}
