import { ChatClient } from "@/components/chat-client";
import { getCategoryFromSearchParams, getLocationFromSearchParams } from "@/lib/location";

export default async function ChatPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const location = getLocationFromSearchParams(resolvedSearchParams);
  const selectedCategory = getCategoryFromSearchParams(resolvedSearchParams);
  return (
    <div className="pt-2 md:h-[calc(100vh-10rem)] md:overflow-hidden md:pt-4">
      <ChatClient initialLocation={location} initialSelectedCategory={selectedCategory} />
    </div>
  );
}
