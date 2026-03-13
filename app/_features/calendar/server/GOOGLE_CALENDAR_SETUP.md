# Guida: Configurazione Google Calendar API

## ⚠️ Importante: API Key vs OAuth

**API Key**: Funziona **SOLO** per calendari pubblici. Non puoi leggere il tuo calendario personale con solo un'API key.

**OAuth 2.0**: **NECESSARIO** per leggere calendari privati. Richiede autenticazione dell'utente.

## Opzione 1: OAuth 2.0 (Consigliato per calendari privati)

### Passo 1: Crea un progetto su Google Cloud Console

1. Vai su [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuovo progetto o seleziona uno esistente
3. Abilita **Google Calendar API**:
   - Vai su "APIs & Services" > "Library"
   - Cerca "Google Calendar API"
   - Clicca "Enable"

### Passo 2: Configura OAuth Consent Screen

1. Vai su "APIs & Services" > "OAuth consent screen"
2. Scegli "External" (per uso personale) o "Internal" (se hai Google Workspace)
3. Compila i campi obbligatori:
   - App name: "Jarvis Calendar" (o quello che preferisci)
   - User support email: la tua email
   - Developer contact: la tua email
4. Aggiungi gli scope:
   - `https://www.googleapis.com/auth/calendar` (per tutte le operazioni CRUD: creare, leggere, modificare ed eliminare eventi)
   - **Nota**: Se vuoi solo leggere eventi, puoi usare `https://www.googleapis.com/auth/calendar.readonly`, ma per operazioni complete (creare, modificare, eliminare) serve lo scope completo `calendar`
5. Salva e continua attraverso tutte le schermate (potrebbero esserci più passaggi)
6. **IMPORTANTE - Aggiungi utenti di test** (necessario per evitare l'errore "Access blocked"):
   - Nella pagina "OAuth consent screen", vai alla scheda **"Audience"** (o "Publishing status")
   - Scorri fino alla sezione **"Test users"**
   - Clicca "ADD USERS" o "+ ADD USERS"
   - Aggiungi il tuo indirizzo email Google (quello che userai per autorizzare l'app)
   - Clicca "ADD" o "SAVE"
   - **Nota**: Puoi aggiungere fino a 100 utenti di test. Per uso personale, basta aggiungere il tuo account.

**⚠️ IMPORTANTE - Se hai già configurato con `calendar.readonly`**: 
Se hai già autorizzato l'app con lo scope `calendar.readonly` e ora vuoi usare tutte le operazioni CRUD, devi:
1. Aggiornare lo scope nel "OAuth consent screen" da `calendar.readonly` a `calendar` (vedi passo 4 sopra)
2. **Rigenerare il refresh token** seguendo il Passo 5, perché i token esistenti hanno solo i permessi readonly
3. Il nuovo refresh token avrà i permessi completi per creare, modificare ed eliminare eventi

### Passo 3: Crea credenziali OAuth 2.0

1. Vai su "APIs & Services" > "Credentials"
2. Clicca "Create Credentials" > "OAuth client ID"
3. Scegli "Web application"
4. Configura:
   - Name: "Jarvis Calendar Client"
   - Authorized redirect URIs: 
     - Per sviluppo locale: `http://localhost:3000/api/auth/callback/google`
     - Per produzione: aggiungi il tuo dominio (es. `https://tuodominio.com/api/auth/callback/google`)
5. Clicca "Create"
6. **Salva** il Client ID e Client Secret

### Passo 4: Configura le variabili d'ambiente

Aggiungi al tuo `.env.local`:

```env
GOOGLE_CALENDAR_CLIENT_ID=tuo_client_id
GOOGLE_CALENDAR_CLIENT_SECRET=tuo_client_secret
GOOGLE_CALENDAR_ID=primary
```

**IMPORTANTE**: Assicurati che il redirect URI nelle credenziali OAuth corrisponda esattamente a quello che usi (localhost:3000 per sviluppo).

### Passo 5: Ottieni il Refresh Token (Metodo Integrato - Consigliato)

1. Avvia il server di sviluppo: `npm run dev`
2. Vai su `http://localhost:3000/setup/calendar`
3. Clicca "Autorizza Google Calendar"
4. Accedi con il tuo account Google e autorizza l'applicazione
5. Verrai reindirizzato alla pagina di setup con il refresh token
6. **Copia** il refresh token mostrato
7. Aggiungi questa riga al tuo `.env.local`:
   ```env
   GOOGLE_CALENDAR_REFRESH_TOKEN=tuo_refresh_token
   ```
8. Riavvia il server di sviluppo

### Metodi Alternativi (se il metodo integrato non funziona)

#### Metodo A: Script Node.js

Crea un file `get-google-tokens.js`:

```javascript
const { google } = require('googleapis');
const readline = require('readline');

const oauth2Client = new google.auth.OAuth2(
  'TUO_CLIENT_ID',
  'TUO_CLIENT_SECRET',
  'http://localhost:3000/api/auth/callback/google'
);

const scopes = ['https://www.googleapis.com/auth/calendar'];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
});

console.log('Vai a questo URL per autorizzare:', authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Incolla il codice qui: ', (code) => {
  oauth2Client.getToken(code, (err, token) => {
    if (err) return console.error('Errore:', err);
    console.log('Refresh Token:', token.refresh_token);
    console.log('Access Token:', token.access_token);
    rl.close();
  });
});
```

## Opzione 2: API Key (Solo per calendari pubblici)

Se vuoi solo leggere calendari pubblici:

1. Vai su Google Cloud Console > "APIs & Services" > "Credentials"
2. Clicca "Create Credentials" > "API key"
3. Copia l'API key
4. (Opzionale) Restringi l'API key solo a Calendar API per sicurezza

Aggiungi al `.env.local`:

```env
GOOGLE_CALENDAR_API_KEY=tuo_api_key
GOOGLE_CALENDAR_ID=public_calendar_id@group.calendar.google.com
```

## Note importanti

- **Refresh Token**: Non scade mai (a meno che non lo revochi). Usalo per ottenere nuovi access token.
- **Access Token**: Scade dopo ~1 ora. Il sistema dovrebbe rinnovarlo automaticamente usando il refresh token.
- **Sicurezza**: Non committare mai `.env.local` nel repository!

## Utenti di Test - Limitazioni e Informazioni

### Cosa sono gli utenti di test?
Gli utenti di test sono account Google autorizzati a usare la tua app OAuth mentre è in modalità "Testing" (non pubblicata). Sono necessari per evitare l'errore "Access blocked" quando l'app non è ancora verificata da Google.

### Limitazioni
- **Massimo 100 utenti di test** per app
- Funzionano solo se l'app è in modalità "Testing" (non pubblicata)
- **Non scadono automaticamente** - rimangono validi finché non li rimuovi manualmente
- Solo gli utenti di test possono usare l'app finché non viene pubblicata

### Per uso personale
✅ **Nessuna limitazione pratica**: Puoi usare l'app senza problemi  
✅ **Non scade**: L'account resta valido finché non lo rimuovi manualmente  
✅ **Nessun limite di chiamate API**: Stessi limiti di quota delle app verificate  

### Cosa devi sapere
- Se vuoi condividere l'app con altri utenti, devi pubblicarla e passare la verifica di Google
- Per uso personale, gli utenti di test sono perfetti e non ci sono limitazioni pratiche
- Se pubblichi l'app, tutti potranno usarla senza essere test user (ma richiede verifica Google)

**In sintesi**: Per uso personale, gli utenti di test sono la soluzione ideale - nessuna limitazione pratica, non scadono e funzionano esattamente come account normali.

## Troubleshooting

### Errore "Access denied"
- Verifica che gli scope siano corretti
- Controlla che il redirect URI corrisponda esattamente

### Errore "Invalid grant"
- Il refresh token potrebbe essere stato revocato
- Rigenera i token seguendo il Passo 5

### Errore 403 "Calendar API has not been used"
- Abilita Google Calendar API nel progetto
- Attendi qualche minuto dopo l'abilitazione

### Errore "You can't sign in because this app sent an invalid request"
- Questo errore si verifica spesso con OAuth Playground
- **Soluzione**: Usa il metodo integrato (Passo 5) invece di OAuth Playground
- Verifica che il redirect URI nelle credenziali OAuth corrisponda esattamente a quello configurato

### Errore "Access blocked: jarvis has not completed the Google verification process"
- Questo errore si verifica quando provi ad autorizzare l'app con un account che non è nella lista degli utenti di test
- **Soluzione**: 
  1. Vai su Google Cloud Console > "APIs & Services" > "OAuth consent screen"
  2. Vai alla scheda **"Audience"** (o "Publishing status")
  3. Scorri fino alla sezione **"Test users"**
  4. Clicca "ADD USERS"
  5. Aggiungi il tuo indirizzo email Google (quello che stai usando per autorizzare)
  6. Clicca "ADD" e salva
  7. Riprova l'autorizzazione
- **Nota**: Questo è necessario solo per app in modalità "Testing". Per uso personale, aggiungi semplicemente il tuo account come test user.

### Errore "The following email addresses are either not associated with a Google Account or the account is not eligible for designation as a test user"
- Questo errore si verifica quando l'email che stai cercando di aggiungere non è un account Google valido o non è idoneo
- **Possibili cause e soluzioni**:
  1. **L'email non è un account Google**: 
     - Assicurati di usare un account Google personale (es. `tuaemail@gmail.com` o `tuaemail@googlemail.com`)
     - Se stai usando un account Google Workspace aziendale, potrebbe non funzionare con app "External"
  2. **Account Google non completamente configurato**:
     - Accedi all'account Google e completa la configurazione iniziale
     - Verifica che l'account sia attivo e funzionante
  3. **Account Google Workspace**:
     - Se hai scelto "External" nel Passo 2, prova a cambiare in "Internal" se hai Google Workspace
     - Oppure usa un account Google personale (gmail.com) invece di quello aziendale
  4. **Email scritta in modo errato**:
     - Verifica di aver scritto correttamente l'indirizzo email
     - Prova a copiare e incollare l'email direttamente
- **Soluzione rapida**: Se hai un account Google personale (gmail.com), usa quello. Se stai usando un account aziendale, potresti dover cambiare la configurazione del consent screen da "External" a "Internal" (se hai Google Workspace).
