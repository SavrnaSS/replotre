import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { verifyToken } from "@/app/lib/auth";
import { cookies, headers } from "next/headers";

export async function GET() {
  try {
    // ✅ Next 16: cookies() / headers() are async
    const cookieStore = await cookies();
    const headerStore = await headers();

    const sessionToken = cookieStore.get("mitux_session")?.value || "";

    // optional: also support Authorization Bearer
    const auth = headerStore.get("authorization") || headerStore.get("Authorization") || "";
    const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";

    const token = bearer || sessionToken;
    if (!token) return NextResponse.json({ user: null }, { status: 401 });

    const payload = verifyToken(token) as { userId: string } | null;
    if (!payload?.userId) return NextResponse.json({ user: null }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return NextResponse.json({ user: null }, { status: 404 });

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          credits: user.credits,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/me error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
