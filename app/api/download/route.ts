// app/api/download/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs"; // ensure Node runtime (streaming supported)

function safeFilename(name: string) {
  const cleaned = (name || "")
    .replace(/[\/\\]/g, "_")
    .replace(/[\u0000-\u001f\u007f]+/g, "")
    .trim();
  return cleaned || "download";
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");
    const filenameParam = searchParams.get("filename");

    if (!url) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    // Basic safety check (prevents SSRF to local network)
    let target: URL;
    try {
      target = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid url" }, { status: 400 });
    }
    if (!["http:", "https:"].includes(target.protocol)) {
      return NextResponse.json({ error: "Invalid protocol" }, { status: 400 });
    }

    // Optional allowlist (recommended). Uncomment + edit if you want strict domains.
    // const allowedHosts = new Set([
    //   "1f2ce13651645ef768d73ac1a0ddb5a4.r2.cloudflarestorage.com",
    // ]);
    // if (!allowedHosts.has(target.host)) {
    //   return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
    // }

    const upstream = await fetch(target.toString(), {
      // no-store so signed urls don't get cached weirdly
      cache: "no-store",
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: "Failed to fetch file" },
        { status: 502 }
      );
    }

    const contentType =
      upstream.headers.get("content-type") || "application/octet-stream";

    const filename = safeFilename(filenameParam || "image.png");

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    headers.set("Cache-Control", "no-store, max-age=0");
    headers.set("X-Content-Type-Options", "nosniff");

    // Stream the upstream body directly
    return new Response(upstream.body, {
      status: 200,
      headers,
    });
  } catch (err) {
    return NextResponse.json({ error: "Download proxy error" }, { status: 500 });
  }
}
