import { NextResponse } from "next/server";

function clearSession() {
  const res = NextResponse.json({ success: true });
  res.cookies.set("mitux_session", "", {
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  res.cookies.set("mitux_admin_session", "", {
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  return res;
}

export async function POST() {
  return clearSession();
}

export async function GET() {
  return clearSession();
}
