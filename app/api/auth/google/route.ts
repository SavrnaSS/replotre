// app/api/auth/google/route.ts
"use server";

import { NextResponse } from "next/server";

function normalizeBaseUrl(raw?: string) {
  const fallback =
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://www.gerox.in";

  const val = (raw || fallback).trim();
  // remove trailing slashes
  return val.replace(/\/+$/, "");
}

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const baseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_BASE_URL);

  if (!clientId) {
    return NextResponse.json({ error: "Missing GOOGLE_CLIENT_ID" }, { status: 500 });
  }

  // build redirect safely (no double slashes)
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim().replace(/\/+$/, "") ||
    new URL("/api/auth/google/callback", baseUrl).toString();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ].join(" "),
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
