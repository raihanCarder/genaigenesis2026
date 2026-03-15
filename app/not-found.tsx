import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-16 md:px-6">
      <p className="text-theme-faint text-sm uppercase tracking-[0.22em]">Not found</p>
      <h1 className="font-display text-4xl font-semibold">That service page does not exist.</h1>
      <p className="text-theme-soft">Return to the dashboard to browse services again.</p>
      <Link
        href="/dashboard"
        className="btn-primary w-fit rounded-full px-5 py-3 font-medium"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
