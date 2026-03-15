"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  name: string;
  url: string;
  icon: LucideIcon;
}

interface NavBarProps {
  items: NavItem[];
  className?: string;
}

function getActiveItem(items: NavItem[], pathname: string) {
  if (!items.length) {
    return null;
  }

  if (pathname.startsWith("/services/")) {
    return items.find((item) => item.url === "/dashboard") ?? null;
  }

  return (
    items.find((item) => item.url === pathname) ??
    items.find((item) => item.url !== "/" && pathname.startsWith(`${item.url}/`)) ??
    (pathname === "/" ? items.find((item) => item.url === "/") ?? null : null)
  );
}

export function NavBar({ items, className }: NavBarProps) {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState(items[0]?.name ?? "");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const activeItem = getActiveItem(items, pathname);
    setActiveTab(activeItem?.name ?? items[0]?.name ?? "");
  }, [items, pathname]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!items.length) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-0 left-1/2 z-50 w-max -translate-x-1/2 pb-6 md:bottom-auto md:top-0 md:pb-0 md:pt-6",
        className
      )}
    >
      <div className="flex items-center gap-2 rounded-full bg-[#0b0b0b]/88 p-1 shadow-card backdrop-blur-xl">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.name;

          return (
            <Link
              key={item.name}
              href={item.url}
              onClick={() => setActiveTab(item.name)}
              aria-label={item.name}
              title={item.name}
              className={cn(
                "relative flex min-w-[3.25rem] items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-colors md:min-w-0 md:px-6",
                isActive
                  ? "bg-white/[0.08] text-white"
                  : "text-white/72 hover:text-white"
              )}
            >
              {isMobile ? <Icon size={18} strokeWidth={2.5} /> : <span>{item.name}</span>}
              {isActive ? (
                <motion.div
                  layoutId="lamp"
                  className="absolute inset-0 -z-10 rounded-full bg-white/[0.08]"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30
                  }}
                >
                  <div className="absolute -top-2 left-1/2 h-1 w-8 -translate-x-1/2 rounded-t-full bg-white">
                    <div className="absolute -left-2 -top-2 h-6 w-12 rounded-full bg-white/20 blur-md" />
                    <div className="absolute -top-1 h-6 w-8 rounded-full bg-white/20 blur-md" />
                    <div className="absolute left-2 top-0 h-4 w-4 rounded-full bg-white/20 blur-sm" />
                  </div>
                </motion.div>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
