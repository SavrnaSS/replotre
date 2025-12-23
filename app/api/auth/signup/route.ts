// app/api/auth/signup/route.ts
"use server";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import { signToken } from "@/app/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");

    // ✅ all required
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });

    // If user exists (maybe created by Google), allow setting password ONCE
    if (existing) {
      if (!existing.passwordHash) {
        const passwordHash = await bcrypt.hash(password, 10);

        const updated = await prisma.user.update({
          where: { email },
          data: {
            name,
            passwordHash,
            authProvider: existing.authProvider || "password",
          },
        });

        const token = signToken({ userId: updated.id });
        const res = NextResponse.json({
          ok: true,
          user: { id: updated.id, email: updated.email },
        });

        res.cookies.set("mitux_session", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 30,
        });

        return res;
      }

      return NextResponse.json(
        { error: "Account already exists. Please login." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        authProvider: "password",
        credits: 101,
      },
    });

    const token = signToken({ userId: user.id });

    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email },
    });

    res.cookies.set("mitux_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch (err) {
    console.error("SIGNUP ERROR:", err);
    return NextResponse.json({ error: "Signup failed." }, { status: 500 });
  }
}
