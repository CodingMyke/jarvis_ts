# Setup Supabase

## Variabili d'ambiente

Crea o modifica `.env.local` nella root del progetto:

```env
NEXT_PUBLIC_SUPABASE_URL="https://<tuo-project-id>.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY="<la-tua-publishable-key>"
```

- **NEXT_PUBLIC_SUPABASE_URL**: URL del progetto (Dashboard Supabase → Settings → API)
- **NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY**: chiave pubblica (safe per il client)

## Struttura modulo

- **server.ts**: `createClient(cookieStore)` per Server Components, Route Handlers, Server Actions (usa `@supabase/ssr` e cookie)
- **client.ts**: `createClient()` per Client Components / browser (usa `@supabase/ssr`)
- **middleware.ts** (root progetto): refresha la sessione auth su ogni request
- **types.ts**: interfaccia `DatabaseProvider` per poter cambiare backend
- **supabase.client.ts**: config e client singleton senza cookie (per contesti senza request)
- **supabase.provider.ts**: implementazione che usa Supabase
- **database.service.ts**: facciata con funzioni di dominio (es. `salvaRicordo`); per ora solo `getDatabaseService()` e `isConfigured()`

**Uso consigliato:** in codice server con contesto request usa `createClient` da `./server`; in client usa `createClient` da `./client`. Le funzionalità di dominio vanno implementate nel provider e esposte tramite il service.

## Generazione tipi TypeScript

Per rigenerare i tipi dal progetto Supabase:

```bash
npx supabase login   # una tantum, per fornire l'access token
npm run gen-supabase-types
```

I tipi vengono scritti in `app/lib/supabase/database.types.ts`. Se compare "Access token not provided", esegui prima `npx supabase login`.
