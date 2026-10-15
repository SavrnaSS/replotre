import "./globals.css";
import type { Metadata, Viewport } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Replotre",
  description:
    "Train a realistic AI influencer that looks and acts like you — but never sleeps.",
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#050612",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
