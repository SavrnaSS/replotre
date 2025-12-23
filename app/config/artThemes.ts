// app/config/artThemes.ts

import { loadAllThemes } from "@/app/lib/themeAutoLoader";

/* -----------------------------
   AUTO-GENERATED THEMES
----------------------------- */

export const artThemes = loadAllThemes();

/* -----------------------------
   Prototype Faces (SANITIZED)
----------------------------- */

export const prototypeFaces = [
  {
    id: "proto-1",
    label: "Model A",
    imageUrl: "/model/face-4.jpg",
  },
  {
    id: "proto-2",
    label: "Model B",
    imageUrl: "/model/Screenshot 2025-11-19 at 12.05.46 PM.png",
  },
  {
    id: "proto-3",
    label: "Model C",
    imageUrl: "/model/face-3.jpg",
  },
];
