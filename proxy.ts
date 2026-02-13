// proxy.ts
import { NextRequest, NextResponse } from "next/server";

function getBackendBase() {
  const raw = process.env.NEXT_PUBLIC_BACKEND_URL || "";
  // remove all trailing slashes to prevent "//route"
  return raw.replace(/\/+$/, "");
}

export async function proxy(req: NextRequest) {
  // protect dashboard routes only
  const pathname = req.nextUrl.pathname;
  if (
    pathname === "/workspace" ||
    pathname === "/workspace/dashboard" ||
    pathname === "/playground" ||
    pathname === "/workspace/generate" ||
    pathname === "/workspace/channels" ||
    pathname === "/workspace/influencer" ||
    pathname === "/workspace/subscription" ||
    pathname === "/generate" ||
    pathname === "/channels" ||
    pathname === "/influencer" ||
    pathname === "/subscription"
  ) {
    const cookie = req.headers.get("cookie") || "";
    if (!cookie) return NextResponse.redirect(new URL("/login", req.url));

    try {
      const url = new URL("/api/subscription/status", req.url);
      const res = await fetch(url, {
        headers: { cookie },
        cache: "no-store",
      });
      if (!res.ok) return NextResponse.next();
      const data = await res.json();
      if (data?.active && pathname === "/workspace") {
        return NextResponse.redirect(new URL("/playground", req.url));
      }
      if (data?.active) {
        if (pathname === "/workspace/generate") {
          return NextResponse.redirect(new URL("/generate", req.url));
        }
        if (pathname === "/workspace/channels") {
          return NextResponse.redirect(new URL("/channels", req.url));
        }
        if (pathname === "/workspace/influencer") {
          return NextResponse.redirect(new URL("/influencer", req.url));
        }
        if (pathname === "/workspace/subscription") {
          return NextResponse.redirect(new URL("/subscription", req.url));
        }
      }
      if (!data?.active && pathname === "/playground") {
        return NextResponse.redirect(new URL("/workspace", req.url));
      }
      if (
        !data?.active &&
        (pathname === "/generate" ||
          pathname === "/channels" ||
          pathname === "/influencer" ||
          pathname === "/subscription")
      ) {
        return NextResponse.redirect(new URL("/workspace", req.url));
      }
      if (pathname === "/workspace/dashboard") {
        return NextResponse.redirect(new URL("/playground", req.url));
      }
    } catch (e) {
      console.error("workspace proxy error:", e);
      return NextResponse.next();
    }
    return NextResponse.next();
  }

  if (!pathname.startsWith("/dashboard")) return NextResponse.next();

  const headerAuth =
    req.headers.get("authorization") ||
    req.headers.get("Authorization") ||
    "";

  const sessionCookie = req.cookies.get("mitux_session")?.value || "";

  const token =
    headerAuth.startsWith("Bearer ")
      ? headerAuth
      : sessionCookie
      ? `Bearer ${sessionCookie}`
      : "";

  if (!token) return NextResponse.redirect(new URL("/login", req.url));

  try {
    const backend = getBackendBase();
    if (!backend) return NextResponse.redirect(new URL("/login", req.url));

    const res = await fetch(`${backend}/api/profile`, {
      headers: { Authorization: token },
      cache: "no-store",
    });

    if (!res.ok) return NextResponse.redirect(new URL("/login", req.url));

    const data = await res.json().catch(() => null);
    if (!data?.user) return NextResponse.redirect(new URL("/login", req.url));

    return NextResponse.next();
  } catch (e) {
    console.error("proxy error:", e);
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/workspace",
    "/workspace/dashboard",
    "/workspace/generate",
    "/workspace/channels",
    "/workspace/influencer",
    "/workspace/subscription",
    "/playground",
    "/generate",
    "/channels",
    "/influencer",
    "/subscription",
  ],
};
