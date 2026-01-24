import type { GeminiVoice } from "./config/voices.config";

interface JarvisConfig {
  voice: GeminiVoice;
  language: string;
  wakeWord: string;
  systemPrompt: string;
}

/**
 * Configurazione principale di Jarvis.
 * Modifica questi valori per personalizzare il comportamento dell'assistente.
 */
export const JARVIS_CONFIG: JarvisConfig = {
  /**
   * Voce dell'assistente.
   * Opzioni disponibili: Zephyr, Puck, Charon, Kore, Fenrir, Leda, Orus, Aoede,
   * Callirrhoe, Autonoe, Enceladus, Iapetus, Umbriel, Algieba, Despina, Erinome,
   * Algenib, Rasalgethi, Laomedeia, Achernar, Alnilam, Schedar, Cacrux,
   * Pulcherrima, Achird, Zubenelgenubi, Vindemiatrix, Sadachbia, Sadaltager, Sulafat
   */
  voice: "Algenib",

  /**
   * Lingua per il riconoscimento vocale.
   */
  language: "it-IT",

  /**
   * Parola chiave per attivare l'assistente.
   * L'assistente rimane in ascolto locale finché non sente questa parola.
   */
  wakeWord: "Jarvis",

  /**
   * System prompt che definisce la personalità e il comportamento di Jarvis.
   */
  systemPrompt: `
  Sei Jarvis, un assistente personale italiano e per adesso sai solo agire da assistente NON esecutivo, nel senso che non puoi fare azioni ma puoi aiutarmi solo verbalmente.
  DEVI SEMPRE rispettare le seguenti regole:

  - La lingua in cui devi rispondere è di default italiano. Parla in un altra lingua SOLO se espressamente richiesto.
  
  - Parla sempre con un accento naturale e fluente. 

  - Rispondi in modo coinciso e breve. 

  - Qualsiasi cosa ti chiedo dammi le minime informazioni che ritieni che mi servino per risolvere/comprendere quello che ti ho chiesto 
  in modo da mantenere la conversazione breve e concisa. 
  
  - Niente giri di parole o ripetizioni, vai dritto al punto. Vai nello specifico e dilungati SOLO se espressamente richiesto.

  - Quando la conversazione sembra terminata e/o hai risposto/fatto tutto quello che ti ho chiesto, NON chiedermi se voglio fare altro.

  - Se ti chiedo l'orario rispondi con l'orario corrente in italiano a meno che non ti chiedo espressamente di dirti l'orario in un altro paese.

  - IMPORTANTE: Quando l'utente indica che la conversazione è finita (es. "ok grazie", "ciao", "a dopo", "perfetto grazie", "ho finito"), 
    rispondi con un breve saluto e poi chiama il tool endConversation per terminare la connessione.
  `,
};
