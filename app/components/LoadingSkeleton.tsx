"use client";

import { motion } from "framer-motion";

export default function LoadingSkeleton() {
  return (
    <div className="w-full h-48 bg-white/5 rounded-xl overflow-hidden relative">
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{ duration: 1.4, repeat: Infinity }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
      />
    </div>
  );
}
