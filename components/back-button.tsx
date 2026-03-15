"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton({ fallbackHref }: { fallbackHref: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
          return;
        }
        router.push(fallbackHref);
      }}
      className="btn-secondary inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
    >
      <ArrowLeft className="h-4 w-4" strokeWidth={2.2} />
      Back
    </button>
  );
}
