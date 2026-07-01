import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HORO PRIVÉ — Private Office",
  description: "Secure collector accounts, consultations and portfolio intelligence.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
