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
   - `https://www.googleapis.com/auth/calendar.readonly`
5. Salva e continua

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

const scopes = ['https://www.googleapis.com/auth/calendar.readonly'];

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
