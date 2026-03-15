"use client";

import React from "react";
import { type HTMLMotionProps, motion } from "framer-motion";
import { cn } from "@/lib/utils";

const messagePlacementClasses = {
  bottom: "flex-col",
  right: "flex-row",
  left: "flex-row-reverse",
} as const;

export interface BouncingDotsProps {
  dots?: number;
  message?: string;
  messagePlacement?: "bottom" | "left" | "right";
}

export function BouncingDots({
  dots = 3,
  message,
  messagePlacement = "bottom",
  className,
  ...props
}: HTMLMotionProps<"div"> & BouncingDotsProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2",
        messagePlacementClasses[messagePlacement]
      )}
    >
      <div className={cn("flex items-center justify-center gap-2")}>
        {Array(dots)
          .fill(undefined)
          .map((_, index) => (
            <motion.div
              key={index}
              className={cn("h-3 w-3 rounded-full bg-[color:var(--ink)]", className)}
              animate={{ y: [0, -20, 0] }}
              transition={{
                duration: 0.6,
                repeat: Number.POSITIVE_INFINITY,
                delay: index * 0.2,
                ease: "easeInOut",
              }}
              {...props}
            />
          ))}
      </div>
      {message ? <div>{message}</div> : null}
    </div>
  );
}
