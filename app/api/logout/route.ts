import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true });

  // delete cookie
  res.cookies.set("mitux_session", "", {
    expires: new Date(0), // delete cookie
    httpOnly: true,
    secure: true,
    sameSite: "strict",
  });

  return res;
}
