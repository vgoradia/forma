import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/home";
  const safeNext = next.startsWith("/") ? next : "/home";
  const origin = request.nextUrl.origin;

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(`${origin}/profile?auth=unconfigured`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/profile?auth=error`);
  }

  const redirectUrl = `${origin}${safeNext}`;
  let response = NextResponse.redirect(redirectUrl);

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.redirect(redirectUrl);
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("Auth callback exchange failed:", error.message);
    return NextResponse.redirect(`${origin}/profile?auth=error`);
  }

  return response;
}