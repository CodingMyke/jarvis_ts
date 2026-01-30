# Setup Supabase

## Variabili d'ambiente

Crea o modifica `.env.local` nella root del progetto:

```env
NEXT_PUBLIC_SUPABASE_URL="https://<tuo-project-id>.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY="<la-tua-publishable-key>"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

- **NEXT_PUBLIC_SUPABASE_URL**: URL del progetto (Dashboard Supabase → Settings → API)
- **NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY**: chiave pubblica (safe per il client)
- **NEXT_PUBLIC_BASE_URL**: base URL dell’app (per redirect dopo login; in prod usa il dominio reale)

## Struttura modulo

- **server.ts**: `createClient(cookieStore)` per Server Components, Route Handlers, Server Actions (usa `@supabase/ssr` e cookie)
- **client.ts**: `createClient()` per Client Components / browser (usa `@supabase/ssr`)
- **middleware.ts** (root progetto): refresha la sessione auth su ogni request
- **types.ts**: interfaccia `DatabaseProvider` per poter cambiare backend
- **supabase.client.ts**: config e client singleton senza cookie (per contesti senza request)
- **supabase.provider.ts**: implementazione che usa Supabase
- **database.service.ts**: facciata con funzioni di dominio (es. `salvaRicordo`); per ora solo `getDatabaseService()` e `isConfigured()`

**Uso consigliato:** in codice server con contesto request usa `createClient` da `./server`; in client usa `createClient` da `./client`. Le funzionalità di dominio vanno implementate nel provider e esposte tramite il service.

## Login con Google (Supabase Auth)

L’auth dell’app (chi è loggato) usa Supabase Auth, separato dall’OAuth Google Calendar/Tasks.

1. **Supabase Dashboard**  
   Authentication → Providers → Google: abilita e inserisci Client ID e Client Secret da Google Cloud Console.

2. **Google Cloud Console**  
   Crea credenziali OAuth 2.0 (tipo “Web application”). Autorized redirect URIs:
   - Supabase: `https://<project-ref>.supabase.co/auth/v1/callback`
   - App (opzionale, per test): `http://localhost:3000/auth/callback`

3. **Supabase → Authentication → URL Configuration**  
   Aggiungi in “Redirect URLs”:  
   `http://localhost:3000/auth/callback` e in produzione `https://<tuo-dominio>/auth/callback`.

4. **Flusso**  
   - L’utente clicca “Accedi con Google” → `signInWithGoogle()` (modulo `auth/`) → redirect a Google → callback su `/auth/callback` → `exchangeCodeForSession` → redirect a `/` (o a `next` se passato).

Modulo auth: `app/lib/supabase/auth/` (service), callback: `app/auth/callback/route.ts`.  
Le route `/api/auth/google` e `/api/auth/callback/google` restano per **Google Calendar/Tasks** (setup calendario), non per il login utente.

## Generazione tipi TypeScript

Per rigenerare i tipi dal progetto Supabase:

```bash
npx supabase login   # una tantum, per fornire l'access token
npm run gen-supabase-types
```

I tipi vengono scritti in `app/lib/supabase/database.types.ts`. Se compare "Access token not provided", esegui prima `npx supabase login`.
