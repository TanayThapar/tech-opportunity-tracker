import type { Metadata } from "next";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";

export const metadata: Metadata = {
  title: "Tech Opportunity Tracker | Terminal Radar",
  description: "Track hackathons, Core A*/A/B conferences, workshops, and tech internships.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#070b0e] text-zinc-200">
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}
