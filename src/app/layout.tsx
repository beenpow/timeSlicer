import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Time Slicer",
  description: "A time management application",
  icons: {
    icon: "/icon.png",
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
