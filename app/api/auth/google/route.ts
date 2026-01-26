import { NextResponse } from "next/server";

/**
 * Endpoint per iniziare il flusso OAuth di Google Calendar.
 * Genera l'URL di autorizzazione e reindirizza l'utente.
 */
export async function GET() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/auth/callback/google`;

  if (!clientId) {
    return NextResponse.json(
      { error: "GOOGLE_CALENDAR_CLIENT_ID non configurato nel .env.local" },
      { status: 500 }
    );
  }

  const scopes = ["https://www.googleapis.com/auth/calendar"];
  const scope = scopes.join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope,
    access_type: "offline", // Importante: necessario per ottenere il refresh token
    prompt: "consent", // Forza il consenso per ottenere sempre il refresh token
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return NextResponse.redirect(authUrl);
}
