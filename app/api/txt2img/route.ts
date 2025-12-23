import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const {
      prompt,
      style = "photorealistic",
      width = 1024,
      height = 1024,
      steps = 30,
      guidance = 7,
      base64 = false,
    } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const apiKey = process.env.SEGMIND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing SEGMIND_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    // ✔ FIXED — use a real Segmind model endpoint
    const response = await fetch("https://api.segmind.com/v1/sdxl1.0-txt2img", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        width,
        height,
        steps,
        guidance_scale: guidance,
        style,
        base64,
      }),
    });

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const data = await response.json();
      return NextResponse.json(data);
    }

    const buffer = await response.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString("base64");

    return NextResponse.json({
      image: `data:image/png;base64,${base64Image}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "AI generation failed" },
      { status: 500 }
    );
  }
}
