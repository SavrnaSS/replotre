"use client";

import { motion } from "framer-motion";

export default function AnimatedButton({ onClick, children, className }: any) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={className}
    >
      {children}
    </motion.button>
  );
}
