"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignInButton } from "@/components/sign-in-button";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

const publicLinks = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/chat", label: "Chat" }
];

const privateLinks = [
  { href: "/plan", label: "Plan" },
  { href: "/saved", label: "Saved" }
];

export function TopNav() {
  const pathname = usePathname();
  const user = useAppStore((state) => state.user);
  const links = user ? [...publicLinks, ...privateLinks] : publicLinks;

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-[#fbf7f1]/90 backdrop-blur-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent text-lg font-bold text-white shadow-card">
            GN
          </div>
          <div>
            <div className="font-display text-lg font-semibold tracking-tight">Genesis Navigator</div>
            <div className="text-xs text-black/55">Toronto stability support map</div>
          </div>
        </Link>
        <nav className="hidden items-center gap-2 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-full px-4 py-2 text-sm transition",
                pathname === link.href ? "bg-ink text-white" : "bg-black/5 hover:bg-black/10"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <SignInButton />
      </div>
    </header>
  );
}

