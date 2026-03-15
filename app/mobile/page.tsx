import { MobileApp } from "@/features/mobile/components/mobile-app";
import { getLocationFromSearchParams } from "@/lib/location";

export default async function MobilePage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const location = getLocationFromSearchParams(resolvedSearchParams);

  return (
    <div className="min-h-[calc(100vh-10rem)] bg-[linear-gradient(180deg,#0d0d0d_0%,#181510_16rem,#f6efe5_16rem,#f6efe5_100%)] py-4">
      <MobileApp initialLocation={location} />
    </div>
  );
}
