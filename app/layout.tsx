import "./globals.css";
import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Gerox",
  description: "Gerox",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" }, // or "/favicon.svg"
    ],
    apple: [
      { url: "/apple-touch-icon.png", type: "image/png" }, // optional
    ],
  },
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
