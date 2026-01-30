import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseConfig } from "@/app/lib/supabase/supabase.client";

function createMiddlewareClient(request: NextRequest) {
  const config = getSupabaseConfig();
  const response = NextResponse.next({
    request: { headers: request.headers },
  });
  if (!config) {
    return { supabase: null, response };
  }

  let supabaseResponse = response;
  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  return { supabase, response: supabaseResponse };
}

export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request);
  if (supabase) {
    await supabase.auth.getUser();
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
