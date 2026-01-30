import { createClient } from "@/app/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Callback OAuth Supabase Auth (es. Google).
 * Riceve il code da Supabase, lo scambia con la sessione e imposta i cookie.
 * Reindirizza a "next" se presente, altrimenti a /.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const nextUrl = searchParams.get("next") ?? "/";
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? new URL(request.url).origin;

  if (errorParam) {
    const message = errorDescription ?? errorParam;
    return NextResponse.redirect(
      `${baseUrl}/?error=${encodeURIComponent(message)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${baseUrl}/?error=${encodeURIComponent("Codice di autorizzazione mancante")}`
    );
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[Auth Callback] exchangeCodeForSession:", error.message);
    return NextResponse.redirect(
      `${baseUrl}/?error=${encodeURIComponent(error.message)}`
    );
  }

  const redirectUrl = new URL(nextUrl.startsWith("/") ? nextUrl : `/${nextUrl}`, baseUrl).href;
  return NextResponse.redirect(redirectUrl);
}
