// proxy.ts
import { NextRequest, NextResponse } from "next/server";

export async function proxy(req: NextRequest) {
  // protect dashboard routes only
  const pathname = req.nextUrl.pathname;
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

  if (!token) return NextResponse.redirect(new URL("/", req.url));

  try {
    const backend = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backend) return NextResponse.redirect(new URL("/", req.url));

    const res = await fetch(`${backend}/api/profile`, {
      headers: { Authorization: token },
      cache: "no-store",
    });

    if (!res.ok) return NextResponse.redirect(new URL("/", req.url));

    const data = await res.json().catch(() => null);
    if (!data?.user) return NextResponse.redirect(new URL("/", req.url));

    return NextResponse.next();
  } catch (e) {
    console.error("proxy error:", e);
    return NextResponse.redirect(new URL("/", req.url));
  }
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
