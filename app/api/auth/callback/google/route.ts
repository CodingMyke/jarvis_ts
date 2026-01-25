import { NextResponse } from "next/server";

/**
 * Endpoint callback per OAuth di Google Calendar.
 * Riceve il codice di autorizzazione e lo scambia con access token e refresh token.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `/setup/calendar?error=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `/setup/calendar?error=${encodeURIComponent("Codice di autorizzazione mancante")}`
    );
  }

  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/auth/callback/google`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `/setup/calendar?error=${encodeURIComponent("Credenziali OAuth non configurate")}`
    );
  }

  try {
    // Scambia il codice con i token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("[OAuth Callback] Errore:", errorText);
      return NextResponse.redirect(
        `/setup/calendar?error=${encodeURIComponent("Errore durante lo scambio del codice")}`
      );
    }

    const tokens = await tokenResponse.json();

    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        `/setup/calendar?error=${encodeURIComponent("Refresh token non ricevuto. Assicurati di aver selezionato 'consent' nel prompt OAuth.")}`
      );
    }

    // Reindirizza alla pagina di setup con i token
    return NextResponse.redirect(
      `/setup/calendar?success=true&refresh_token=${encodeURIComponent(tokens.refresh_token)}&access_token=${encodeURIComponent(tokens.access_token || "")}`
    );
  } catch (error) {
    console.error("[OAuth Callback] Errore:", error);
    return NextResponse.redirect(
      `/setup/calendar?error=${encodeURIComponent("Errore imprevisto durante l'autenticazione")}`
    );
  }
}
