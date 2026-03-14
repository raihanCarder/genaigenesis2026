import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublishableKey, supabaseUrl } from "@/lib/env";

const protectedPagePrefixes = ["/plan", "/saved"];

function isProtectedPage(pathname: string) {
  return protectedPagePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export async function updateSession(request: NextRequest) {
  if (!supabaseUrl || !supabasePublishableKey) {
    return NextResponse.next({ request });
  }

  if (
    request.nextUrl.pathname !== "/auth/callback" &&
    request.nextUrl.searchParams.has("code")
  ) {
    const redirectUrl = request.nextUrl.clone();
    const nextUrl = request.nextUrl.clone();
    nextUrl.searchParams.delete("code");
    redirectUrl.pathname = "/auth/callback";
    redirectUrl.searchParams.set("next", `${nextUrl.pathname}${nextUrl.search}`);
    return NextResponse.redirect(redirectUrl);
  }

  if (!isProtectedPage(request.nextUrl.pathname)) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({
    request
  });

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request
        });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  try {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  } catch {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
