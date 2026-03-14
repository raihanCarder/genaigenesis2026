"use client";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-16 md:px-6">
      <p className="text-sm uppercase tracking-[0.22em] text-black/45">Something broke</p>
      <h1 className="font-display text-4xl font-semibold">We hit an unexpected error.</h1>
      <p className="text-black/65">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="w-fit rounded-full bg-ink px-5 py-3 font-medium text-white transition hover:bg-accentDark"
      >
        Try again
      </button>
    </div>
  );
}

