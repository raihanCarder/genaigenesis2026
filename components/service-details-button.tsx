"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { cn } from "@/lib/utils";

export function ServiceDetailsButton({
  href,
  className
}: {
  href: string;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function handleClick() {
    if (loading) {
      return;
    }

    setLoading(true);
    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      aria-busy={loading}
      className={cn(
        "btn-primary inline-flex min-w-[6.9rem] items-center justify-center gap-2 overflow-hidden rounded-full px-4 py-2 text-sm font-medium disabled:cursor-wait disabled:opacity-100",
        className
      )}
    >
      {loading ? (
        <>
          <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" />
          <span className="truncate">Loading</span>
        </>
      ) : (
        <span className="truncate">Details</span>
      )}
    </button>
  );
}
