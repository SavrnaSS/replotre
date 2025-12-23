"use client";

import { motion } from "framer-motion";

export default function TemplateGallery({ templates, onSelect }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
    >
      {templates.map((t: any) => (
        <motion.div
          key={t.id}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(t)}
          className="bg-white/5 border border-white/10 rounded-xl overflow-hidden cursor-pointer backdrop-blur-xl"
        >
          <img src={t.img} className="w-full h-40 object-cover" />
          <div className="p-2 text-center text-white/80 text-sm">{t.name}</div>
        </motion.div>
      ))}
    </motion.div>
  );
}
