# Guida: Configurazione Google Tasks API

## ⚠️ Importante: OAuth 2.0 obbligatorio

**Google Tasks API** richiede **OAuth 2.0** per accedere alle task e alle liste dell'utente. Non è disponibile un accesso tramite sola API key per i dati personali: per leggere, creare, modificare ed eliminare task e liste devi configurare il flusso OAuth.

---

## Se hai già configurato Google Calendar

**Non servono un nuovo token né un nuovo refresh token.** Puoi usare lo **stesso** client OAuth e lo **stesso** refresh token che usi per Google Calendar. Un unico refresh token può includere i permessi sia per Calendar sia per Tasks.

### Cosa fare

1. **Stesso progetto e stesse credenziali**  
   Usa il client OAuth che hai già (stesso Client ID e Client Secret di Google Calendar). **Non** creare un secondo client "Jarvis Tasks Client".

2. **Aggiungi lo scope Tasks nel OAuth consent screen**  
   - Vai su [Google Cloud Console](https://console.cloud.google.com/) > "APIs & Services" > "OAuth consent screen"
   - Modifica gli scope e aggiungi: `https://www.googleapis.com/auth/tasks`
   - Salva. Ora la tua app chiederà permessi per Calendar e Tasks.

3. **Abilita Google Tasks API**  
   - Vai su "APIs & Services" > "Library"
   - Cerca "Google Tasks API" e clicca "Enable"

4. **Riautorizza una volta per ottenere un refresh token aggiornato**  
   Il refresh token che hai oggi è stato emesso **solo** con lo scope Calendar. Per avere anche Tasks devi fare **una nuova** autorizzazione (stesso flusso di prima, ma con scope Calendar + Tasks):
   - Se usi la pagina integrata: vai su `http://localhost:3000/setup/calendar`, clicca "Autorizza" e assicurati che nella richiesta siano inclusi **entrambi** gli scope: `calendar` e `tasks`
   - Dopo l'autorizzazione otterrai un **nuovo** refresh token (sostituisce il vecchio). Copialo e aggiorna `GOOGLE_CALENDAR_REFRESH_TOKEN` nel `.env.local` con questo nuovo valore
   - Da quel momento **un solo** refresh token vale per Calendar e Tasks. Nessuna variabile `GOOGLE_TASKS_REFRESH_TOKEN` da aggiungere: il provider Tasks userà le stesse variabili di Calendar (`GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, `GOOGLE_CALENDAR_REFRESH_TOKEN`)

5. **Nessuna nuova variabile d'ambiente**  
   Se il progetto è pensato per condividere le credenziali, **non** aggiungere `GOOGLE_TASKS_CLIENT_ID`, `GOOGLE_TASKS_CLIENT_SECRET` o `GOOGLE_TASKS_REFRESH_TOKEN`. Calendar e Tasks useranno le stesse.

**In sintesi**: aggiungi lo scope Tasks, abilita l'API Tasks, riautorizza una volta e aggiorna il refresh token in `GOOGLE_CALENDAR_REFRESH_TOKEN`. Un solo token per entrambi i servizi.

---

## Se parti da zero (senza Google Calendar configurato)

Se non hai ancora configurato nessuna integrazione Google, segui i passi sotto. Potrai usare **un solo** client OAuth e **un solo** refresh token per Calendar e Tasks: basta richiedere entrambi gli scope (`calendar` e `tasks`) già dalla prima autorizzazione.

### Passo 1: Crea un progetto su Google Cloud Console

1. Vai su [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuovo progetto o seleziona uno esistente
3. Abilita **Google Tasks API** (e, se userai anche il calendario, **Google Calendar API**):
   - Vai su "APIs & Services" > "Library"
   - Cerca "Google Tasks API" (e "Google Calendar API") e clicca "Enable"

### Passo 2: Configura OAuth Consent Screen

1. Vai su "APIs & Services" > "OAuth consent screen"
2. Scegli "External" (per uso personale) o "Internal" (se hai Google Workspace)
3. Compila i campi obbligatori:
   - App name: "Jarvis" (o quello che preferisci)
   - User support email: la tua email
   - Developer contact: la tua email
4. Aggiungi gli scope:
   - `https://www.googleapis.com/auth/tasks` (per task e liste)
   - Se userai anche il calendario: `https://www.googleapis.com/auth/calendar`
   - **Nota**: Per operazioni complete (creare, modificare, eliminare) servono gli scope completi, non `tasks.readonly` / `calendar.readonly`
5. Salva e continua attraverso tutte le schermate (potrebbero esserci più passaggi)
6. **IMPORTANTE - Aggiungi utenti di test** (necessario per evitare l'errore "Access blocked"):
   - Nella pagina "OAuth consent screen", vai alla scheda **"Audience"** (o "Publishing status")
   - Scorri fino alla sezione **"Test users"**
   - Clicca "ADD USERS" o "+ ADD USERS"
   - Aggiungi il tuo indirizzo email Google (quello che userai per autorizzare l'app)
   - Clicca "ADD" o "SAVE"
   - **Nota**: Puoi aggiungere fino a 100 utenti di test. Per uso personale, basta aggiungere il tuo account.

**⚠️ Se hai già configurato con `tasks.readonly`**:
Se hai autorizzato l'app solo con `tasks.readonly` e ora vuoi le operazioni CRUD complete, aggiorna lo scope a `tasks` nel consent screen e rigenera il refresh token con una nuova autorizzazione.

### Passo 3: Crea credenziali OAuth 2.0

1. Vai su "APIs & Services" > "Credentials"
2. Clicca "Create Credentials" > "OAuth client ID"
3. Scegli "Web application"
4. Configura:
   - Name: "Jarvis Client" (o "Jarvis Calendar Client" se è lo stesso che userai per Calendar e Tasks)
   - Authorized redirect URIs:
     - Per sviluppo locale: `http://localhost:3000/api/auth/callback/google` (o `.../google-tasks` se userai una route dedicata)
     - Per produzione: aggiungi il tuo dominio (es. `https://tuodominio.com/api/auth/callback/google`)
5. Clicca "Create"
6. **Salva** il Client ID e Client Secret

### Passo 4: Configura le variabili d'ambiente

Aggiungi al tuo `.env.local`. Se usi le stesse credenziali per Calendar e Tasks, userai le variabili Calendar:

```env
GOOGLE_CALENDAR_CLIENT_ID=tuo_client_id
GOOGLE_CALENDAR_CLIENT_SECRET=tuo_client_secret
GOOGLE_CALENDAR_REFRESH_TOKEN=tuo_refresh_token
```

Oppure, se preferisci variabili dedicate ai Tasks:

```env
GOOGLE_TASKS_CLIENT_ID=tuo_client_id
GOOGLE_TASKS_CLIENT_SECRET=tuo_client_secret
GOOGLE_TASKS_REFRESH_TOKEN=tuo_refresh_token
```

**IMPORTANTE**: Assicurati che il redirect URI nelle credenziali OAuth corrisponda esattamente a quello usato dall'app (es. localhost:3000 per sviluppo).

### Passo 5: Ottieni il Refresh Token (Metodo Integrato - Consigliato)

1. Avvia il server di sviluppo: `npm run dev`
2. Vai sulla pagina di setup OAuth del tuo progetto (es. `http://localhost:3000/setup/calendar`)
3. Clicca "Autorizza" (o "Autorizza Google Calendar" a seconda di come è implementata la pagina)
4. Accedi con il tuo account Google e autorizza l'app chiedendo **entrambi** gli scope (Calendar e Tasks) se li hai aggiunti nel Passo 2
5. Verrai reindirizzato alla pagina di setup con il refresh token
6. **Copia** il refresh token e mettilo in `GOOGLE_CALENDAR_REFRESH_TOKEN` (o in `GOOGLE_TASKS_REFRESH_TOKEN` se usi variabili dedicate)
7. Riavvia il server di sviluppo

### Metodi Alternativi (se il metodo integrato non funziona)

#### Metodo A: Script Node.js

Crea un file `get-google-tokens.js` e usa **lo stesso** Client ID / Client Secret / redirect URI che usi per Calendar. Includi **entrambi** gli scope se vuoi un token valido per Calendar e Tasks:

```javascript
const { google } = require('googleapis');
const readline = require('readline');

const oauth2Client = new google.auth.OAuth2(
  'TUO_GOOGLE_CALENDAR_CLIENT_ID',
  'TUO_GOOGLE_CALENDAR_CLIENT_SECRET',
  'http://localhost:3000/api/auth/callback/google'
);

const scopes = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/tasks',
];

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

Esegui con `node get-google-tokens.js`, apri l’URL stampato, autorizza l’app, incolla il codice ricevuto e copia il refresh token in `GOOGLE_CALENDAR_REFRESH_TOKEN` nel `.env.local`. Quel token varrà per Calendar e Tasks.

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
- Verifica che gli scope siano corretti (`https://www.googleapis.com/auth/tasks` per accesso completo)
- Controlla che il redirect URI corrisponda esattamente a quello configurato nelle credenziali

### Errore "Invalid grant"
- Il refresh token potrebbe essere stato revocato
- Rigenera i token seguendo il Passo 5 (o lo script del Metodo A)

### Errore 403 "Tasks API has not been used"
- Abilita Google Tasks API nel progetto (Passo 1)
- Attendi qualche minuto dopo l'abilitazione

### Errore "You can't sign in because this app sent an invalid request"
- Questo errore si verifica spesso con OAuth Playground
- **Soluzione**: Usa il metodo integrato (Passo 5) o lo script Node.js (Metodo A)
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
