"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Heart,
  House,
  LayoutDashboard,
  Map,
  MessageSquareText,
} from "lucide-react";
import { SignInButton } from "@/components/sign-in-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NavBar } from "@/components/ui/tubelight-navbar";
import { buildLocationSearchParams } from "@/lib/location";
import { useAppStore } from "@/store/app-store";

export function TopNav() {
  const user = useAppStore((state) => state.user);
  const location = useAppStore((state) => state.location);

  function withLocation(url: string) {
    if (!location || url === "/") {
      return url;
    }
    return `${url}?${buildLocationSearchParams(location)}`;
  }

  const publicItems = [
    { name: "Home", url: "/", icon: House },
    {
      name: "Dashboard",
      url: withLocation("/dashboard"),
      icon: LayoutDashboard,
    },
    { name: "Chat", url: withLocation("/chat"), icon: MessageSquareText },
  ];

  const privateItems = [
    { name: "Plan", url: withLocation("/plan"), icon: Map },
    { name: "Saved", url: withLocation("/saved"), icon: Heart },
  ];

  const items = user ? [...publicItems, ...privateItems] : publicItems;

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-start justify-between gap-4 px-4 pt-4 md:px-6 md:pt-5">
          <Link
            href="/"
            className="topbar-pill flex items-center gap-3 rounded-full px-3 py-2 shadow-card transition"
          >
            <div className="relative h-10 w-10 overflow-hidden rounded-2xl md:h-11 md:w-11">
              <Image
                src="/beacon1.png"
                alt="Beacon logo"
                fill
                sizes="44px"
                className="logo-tone object-contain"
                priority
              />
            </div>
            <div className="hidden lg:block">
              <div className="font-display text-base font-semibold tracking-tight">
                beacon
              </div>
              <div className="text-theme-faint text-xs">
                Find help. Build stability.
              </div>
            </div>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <SignInButton compact />
            <ThemeToggle />
          </div>
        </div>
      </div>
      <NavBar items={items} />
    </>
  );
}
