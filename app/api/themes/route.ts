// app/api/themes/route.ts
import { NextResponse } from "next/server";
import { loadAllThemes } from "@/app/lib/themeAutoLoader";

export async function GET() {
  const themes = loadAllThemes();
  return NextResponse.json({ themes }, { status: 200 });
}
