"use client";

import { useUser } from "@auth0/nextjs-auth0/client";

export default function AuthButtons() {
  const { user, isLoading } = useUser();

  if (isLoading) return <p className="text-neutral-400">Loading...</p>;

  return (
    <div className="flex gap-4">
      {!user ? (
        <a
          href="/api/auth/login"
          className="cursor-pointer px-4 py-2 rounded-xl bg-neutral-900 text-white hover:bg-neutral-700 transition"
        >
          Login
        </a>
      ) : (
        <a
          href="/api/auth/logout"
          className="cursor-pointer px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-500 transition"
        >
          Logout
        </a>
      )}
    </div>
  );
}
