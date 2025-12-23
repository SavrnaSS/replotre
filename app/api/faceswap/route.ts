// app/api/faceswap/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!BACKEND) {
    return new Response(JSON.stringify({ error: "Missing NEXT_PUBLIC_BACKEND_URL env" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch (err) {
    return new Response(JSON.stringify({ error: "Request not multipart/form-data" }), { status: 400 });
  }

  const source = form.get("source_img");
  const theme = form.get("theme_name");

  if (!source) return new Response(JSON.stringify({ error: "Missing source_img" }), { status: 400 });
  if (!theme || typeof theme !== "string") return new Response(JSON.stringify({ error: "Missing theme_name" }), { status: 400 });

  const forward = new FormData();
  forward.append("source_img", source as any);
  forward.append("theme_name", theme);

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND}/faceswap`, {
      method: "POST",
      body: forward,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: "Backend unreachable: " + err.message }), { status: 502 });
  }

  const contentType = backendRes.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const json = await backendRes.json();
    return NextResponse.json(json, { status: backendRes.status });
  }

  // fallback - if backend responded with JSON-like text
  const raw = await backendRes.text();
  try {
    const parsed = JSON.parse(raw);
    return NextResponse.json(parsed, { status: backendRes.status });
  } catch {
    return new Response(JSON.stringify({ error: "Backend returned unknown format" }), { status: 502 });
  }
}
