// app/page.tsx
import type { Metadata } from "next";
import IntroPageClient from "./IntroPageClient";

export const metadata: Metadata = {
  title: "Gerox — Private AI Photoshoot & Face Swap",
  description:
    "Generate studio‑grade AI portraits in seconds. Choose a theme, upload a centered face photo, and create a private photoshoot with saved history and instant downloads.",
  keywords: ["AI photoshoot", "AI portrait", "face swap", "private photos", "AI art themes", "Gerox"],
  openGraph: {
    title: "Gerox — Private AI Photoshoot & Face Swap",
    description: "Create premium AI portraits in seconds. Private photoshoot flow with saved history and downloads.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function Page() {
  return <IntroPageClient />;
}
