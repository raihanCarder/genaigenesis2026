import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getSafeRedirectPath(value: string | null) {
  if (!value || !value.startsWith("/")) {
    return "/";
  }
  return value;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = getSafeRedirectPath(requestUrl.searchParams.get("next"));
  const redirectUrl = new URL(nextPath, requestUrl.origin);

  if (!code) {
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const errorUrl = new URL("/", requestUrl.origin);
      errorUrl.searchParams.set("authError", "callback");
      return NextResponse.redirect(errorUrl);
    }
  } catch {
    const errorUrl = new URL("/", requestUrl.origin);
    errorUrl.searchParams.set("authError", "callback");
    return NextResponse.redirect(errorUrl);
  }

  return NextResponse.redirect(redirectUrl);
}
