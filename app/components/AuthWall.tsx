"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import useAuth from "../hooks/useAuth";

/**
 * mode:
 *  - "hard" (default): redirect guests to /login (good for /dashboard pages)
 *  - "soft": allow guests to stay (good for hero page), you can show locks in UI
 */
export default function AuthWall({
  children,
  mode = "hard",
}: {
  children: any;
  mode?: "hard" | "soft";
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (mode !== "hard") return;
    if (!loading && !user) {
      // avoid loops if you're already on /login
      if (pathname !== "/login") router.push("/login");
    }
  }, [mode, loading, user, router, pathname]);

  // Hard wall: block render until auth known + user exists
  if (mode === "hard") {
    if (loading) return null;
    if (!user) return null;
    return children;
  }

  // Soft wall: always render (guest allowed)
  return children;
}
