import "./globals.css";
import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Gerox",
  description: "Gerox",
  icons: {
    icon: [
      { url: "/logo.jpeg", type: "image/png" }, // or "/favicon.svg"
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
