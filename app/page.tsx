// app/page.tsx
import type { Metadata } from "next";
import IntroPageClient from "./IntroPageClient";

export const metadata: Metadata = {
  title: {
    default: "Replotre — AI Influencer Generator",
    template: "%s | Replotre",
  },
  description:
    "Create an AI influencer in minutes. Pick a base model or build a custom persona, choose niche + style, and activate a plan to start generating content.",
  applicationName: "Replotre",
  keywords: [
    "AI influencer generator",
    "AI influencer",
    "virtual influencer",
    "AI model generator",
    "creator AI",
    "AI content creation",
    "AI photos",
    "AI videos",
    "influencer marketing AI",
    "Replotre",
  ],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  openGraph: {
    title: "Replotre — AI Influencer Generator",
    description:
      "Create an AI influencer in minutes. Pick a model, set your persona, and start generating creator-grade content.",
    type: "website",
    siteName: "Replotre",
    url: "/",
    images: [
      {
        url: "/og.png", // put an OG image in /public/og.png
        width: 1200,
        height: 630,
        alt: "Replotre — AI Influencer Generator",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Replotre — AI Influencer Generator",
    description:
      "Create an AI influencer in minutes. Pick a model, set your persona, and start generating content.",
    images: ["/og.png"],
  },

  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },

  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://replotre.com"
  ),
};

export default function Page() {
  return <IntroPageClient />;
}
