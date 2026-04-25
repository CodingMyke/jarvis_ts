import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseConfig } from "@/app/_server/supabase/supabase.client";

function createProxyClient(request: NextRequest) {
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

const PROTECTED_PATHS = [
  "/assistant",
  "/dashboard",
  "/projects",
  "/academy",
  "/reflections",
  "/learning",
  "/progression",
  "/news",
  "/settings",
  "/setup",
];
const LOGIN_PATH = "/";
const DEFAULT_AUTHENTICATED_PATH = "/dashboard";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { supabase, response } = createProxyClient(request);

  if (!supabase) {
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtectedPath = PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isLoginPath = pathname === LOGIN_PATH;
  const isAuthCallback = pathname.startsWith("/auth/");

  if (isAuthCallback) {
    return response;
  }

  if (isProtectedPath && !user) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    const originalPath = `${pathname}${request.nextUrl.search}`;
    loginUrl.searchParams.set("next", originalPath);
    const redirectRes = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((c) => redirectRes.cookies.set(c.name, c.value, c));
    return redirectRes;
  }

  if (isLoginPath && user) {
    const dashboardUrl = new URL(DEFAULT_AUTHENTICATED_PATH, request.url);
    const redirectRes = NextResponse.redirect(dashboardUrl);
    response.cookies.getAll().forEach((c) => redirectRes.cookies.set(c.name, c.value, c));
    return redirectRes;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
