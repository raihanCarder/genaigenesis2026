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
  return <ChatClient initialLocation={location} initialSelectedCategory={selectedCategory} />;
}
