// app/api/auth/google/callback/route.ts
"use server";

import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { signToken } from "@/app/lib/auth";

function baseUrl() {
  // ✅ prefer NEXT_PUBLIC_BASE_URL, fallback to Vercel URL, fallback localhost
  const env =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "https://www.gerox.in";
  return env.replace(/\/+$/, "");
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    // ✅ If Google returned an error (user cancelled, etc.)
    if (error) {
      console.error("Google OAuth error:", error);
      return NextResponse.redirect(`${baseUrl()}/login`);
    }

    if (!code) {
      return NextResponse.redirect(`${baseUrl()}/login`);
    }

    // ✅ Must match what you use in /api/auth/google and what you added in Google Console
    const redirect_uri =
      process.env.GOOGLE_REDIRECT_URI ||
      `${baseUrl()}/api/auth/google/callback`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || tokenData?.error) {
      console.error("Token error:", tokenData);
      return NextResponse.redirect(`${baseUrl()}/login`);
    }

    // ✅ Fetch Google profile
    const userRes = await fetch(
      `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${tokenData.access_token}`,
      { cache: "no-store" }
    );

    const googleUser = await userRes.json();

    if (!userRes.ok || !googleUser?.email) {
      console.error("Google user fetch error:", googleUser);
      return NextResponse.redirect(`${baseUrl()}/login`);
    }

    const email = String(googleUser.email).trim().toLowerCase();

    // ✅ Upsert user, preserve existing manual password if any
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name: googleUser.name || null,
        image: googleUser.picture || null,
        authProvider: "google",
        // DO NOT overwrite passwordHash on existing users
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

    const res = NextResponse.redirect(`${baseUrl()}/workspace`);
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
    return NextResponse.redirect(`${baseUrl()}/login`);
  }
}
