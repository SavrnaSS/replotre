// app/api/auth/google/callback/route.ts
"use server";

import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { signToken } from "@/app/lib/auth";

function normalizeBaseUrl(raw?: string) {
  const fallback =
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://www.gerox.in";

  const val = (raw || fallback).trim();
  return val.replace(/\/+$/, ""); // remove trailing slashes
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    const baseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_BASE_URL);

    // Build redirect URI safely (never double slashes)
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI?.trim().replace(/\/+$/, "") ||
      new URL("/api/auth/google/callback", baseUrl).toString();

    if (error) {
      console.error("Google OAuth error:", error);
      return NextResponse.redirect(new URL("/login", baseUrl).toString());
    }

    if (!code) {
      return NextResponse.redirect(new URL("/login", baseUrl).toString());
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || tokenData?.error) {
      console.error("Token error:", tokenData);
      return NextResponse.redirect(new URL("/login", baseUrl).toString());
    }

    const userRes = await fetch(
      `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${tokenData.access_token}`,
      { cache: "no-store" }
    );

    const googleUser = await userRes.json();

    if (!userRes.ok || !googleUser?.email) {
      console.error("Google user fetch error:", googleUser);
      return NextResponse.redirect(new URL("/login", baseUrl).toString());
    }

    const email = String(googleUser.email).trim().toLowerCase();

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name: googleUser.name || null,
        image: googleUser.picture || null,
        authProvider: "google",
      },
      create: {
        email,
        name: googleUser.name || null,
        image: googleUser.picture || null,
        credits: 101,
        authProvider: "google",
        passwordHash: null,
      },
    });

    const token = signToken({ userId: user.id });

    const res = NextResponse.redirect(new URL("/workspace", baseUrl).toString());
    res.cookies.set("mitux_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch (error) {
    console.error("Google OAuth Callback Error:", error);
    const baseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_BASE_URL);
    return NextResponse.redirect(new URL("/login", baseUrl).toString());
  }
}
