import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { TopNav } from "@/components/top-nav";

export const metadata: Metadata = {
  title: "Genesis Navigator",
  description: "Toronto support navigator with grounded AI chat and authenticated stability planning."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans">
        <Providers>
          <div className="min-h-screen">
            <TopNav />
            <main className="min-h-screen pb-28 pt-24 md:pb-10 md:pt-28">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
