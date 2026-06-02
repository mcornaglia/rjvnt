import type { Metadata } from "next";
import "./globals.css";
import "./fonts.css";

export const metadata: Metadata = {
  title: "RJVNT - Ethical Hacking",
  description: "Independent offensive security researcher — portfolio & rooted machines.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/asciinema-player.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
