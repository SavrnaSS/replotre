import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/adminAuth";

function getCookieValue(header: string | null, key: string) {
  if (!header) return "";
  const parts = header.split(";").map((p) => p.trim());
  for (const part of parts) {
    if (part.startsWith(`${key}=`)) {
      return decodeURIComponent(part.slice(key.length + 1));
    }
  }
  return "";
}

export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const cookieHeader = req.headers.get("cookie");
  const adminToken = getCookieValue(cookieHeader, "mitux_admin_session");

  if (!adminToken) {
    return NextResponse.json({ error: "no-admin-session" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("mitux_session", adminToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  res.cookies.set("mitux_admin_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
