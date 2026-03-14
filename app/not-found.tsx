import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-16 md:px-6">
      <p className="text-sm uppercase tracking-[0.22em] text-black/45">Not found</p>
      <h1 className="font-display text-4xl font-semibold">That service page does not exist.</h1>
      <p className="text-black/65">Return to the dashboard to browse services again.</p>
      <Link
        href="/dashboard"
        className="w-fit rounded-full bg-ink px-5 py-3 font-medium text-white transition hover:bg-accentDark"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
