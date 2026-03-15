import { NextResponse } from "next/server";
import { autocompleteLocations } from "@/lib/location/google-maps";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const input = searchParams.get("input")?.trim() ?? "";
    const sessionToken = searchParams.get("sessionToken")?.trim() ?? undefined;
    if (input.length < 2) {
      return NextResponse.json([]);
    }
    const suggestions = await autocompleteLocations({
      query: input,
      sessionToken
    });
    return NextResponse.json(suggestions);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch suggestions." },
      { status: 500 }
    );
  }
}
