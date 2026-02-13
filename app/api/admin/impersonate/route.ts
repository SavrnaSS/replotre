import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/adminAuth";
import { signToken } from "@/app/lib/auth";

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

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const userId = String(body?.userId || "").trim();
  if (!userId) {
    return NextResponse.json({ error: "missing-userId" }, { status: 400 });
  }

  const cookieHeader = req.headers.get("cookie");
  const currentToken = getCookieValue(cookieHeader, "mitux_session");

  const token = signToken({ userId });
  const res = NextResponse.json({ ok: true });

  if (currentToken) {
    res.cookies.set("mitux_admin_session", currentToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
  }

  res.cookies.set("mitux_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return res;
}
