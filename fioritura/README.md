# Fioritura

Un timer pomodoro rilassante che cresce con te: musica ambient generata dal vivo, un giardino che fiorisce a ogni sessione e una classifica con nome, paese e punteggio. Puoi cambiarne l'atmosfera, i suoni e l'aspetto fin nei dettagli.

Nessuna installazione per usarlo in locale: solo HTML, CSS, JavaScript e (opzionalmente) Python 3. Per la classifica condivisa online bastano Netlify e un repository Git.

## Come si avvia

### 1. Il modo più semplice — solo per te

Fai doppio clic su `index.html` (oppure aprilo con il browser).

Funziona tutto: timer, musica, XP, giardino, statistiche e classifica **locale** salvata nel browser. La classifica locale parte con 12 partecipanti di esempio, così vedi subito com'è fatta.

### 2. Classifica condivisa — per più persone

Su macOS: doppio clic su **`avvia.command`**. Si apre il browser su `http://127.0.0.1:4173`.

Da terminale:

```bash
cd fioritura
python3 server.py --open
```

`--open` apre il browser da solo; senza il flag basta visitare l'indirizzo stampato a schermo.

Per giocare insieme nella stessa rete locale:

```bash
HOST=0.0.0.0 python3 server.py
```

poi gli altri aprono `http://IP-DEL-TUO-MAC:4173`.

In questa modalità i punteggi vengono salvati in `data/sessions.json` e la classifica è condivisa da tutti i dispositivi che aprono quel server. La pagina riconosce da sola il server e passa dalla modalità locale a quella condivisa.

### Variabili d'ambiente

| Variabile | Default | Cosa fa |
| --- | --- | --- |
| `PORT` | `4173` | Porta del server |
| `HOST` | `127.0.0.1` | Interfaccia di ascolto (`0.0.0.0` per la rete locale) |
| `FIORITURA_DEMO` | `0` | Con `1` inserisce partecipanti di esempio al primo avvio del server |
| `FIORITURA_ADMIN_USER` | `admin` | Nome utente del pannello admin |
| `FIORITURA_ADMIN_PASSWORD` | *(vuota)* | Password del pannello admin. Se è vuota, l'admin resta spento |

Esempio con il pannello admin attivo:

```bash
FIORITURA_ADMIN_USER=massimo \
FIORITURA_ADMIN_PASSWORD='una-password-lunga' \
python3 server.py --open
```

Se pubblichi il server sulla rete locale, usa una password robusta e ricorda che l'autenticazione HTTP Basic protegge le credenziali solo su HTTPS. Per la rete di casa va bene; per Internet è meglio Netlify (che serve il sito in HTTPS).

Per vedere la classifica con partecipanti di esempio:

```bash
PORT=8080 FIORITURA_DEMO=1 python3 server.py
```

## Come funziona

### Il timer

- Durata liberamente configurabile: da **1 a 180 minuti**, con i preset 5, 15, 25, 45, 50, 60 e 90 minuti.
- Il tempo si può aggiungere o togliere di un minuto anche a sessione avviata.
- Il timer sopravvive al ricaricamento della pagina: se chiudi il browser e torni, la sessione riprende (o viene accreditata se è scaduta nel frattempo).
- Scorciatoie: **Spazio** avvia o mette in pausa, **R** azzera, **M** attiva o disattiva la musica.

### XP e livelli

Gli XP si guadagnano solo con sessioni di **almeno 5 minuti**:

- **10 XP al minuto** di concentrazione.
- **+25%** per sessioni da 25 minuti in su.
- **+50%** per sessioni da 50 minuti in su.
- **Bonus serie**: +10% per ogni giorno consecutivo, fino a +50%.

Esempi:

| Sessione | XP |
| --- | --- |
| 5 min, primo giorno | 50 XP |
| 25 min, primo giorno | 313 XP |
| 50 min, primo giorno | 750 XP |
| 50 min, sesto giorno di fila | 1.000 XP |

Le sessioni sotto i 5 minuti non danno XP, ma restano nella cronologia: il tempo per te conta comunque.

Ogni sessione completata fa fiorire il giardino e aggiunge un fiore alla tua collezione. Il livello cresce insieme agli XP accumulati.

### La classifica

Mostra **nome, paese e punteggio**, con il podio per i primi tre.

- Filtro **Settimana** / **Sempre**.
- Il tuo nome è evidenziato con l'etichetta «tu».
- Senza server vedi la classifica locale del tuo browser; con il server vedi quella condivisa.
- Se il server non è raggiungibile, le sessioni completate restano in coda e vengono inviate appena torna disponibile.

### Il pannello admin

Con la classifica condivisa attiva (server Python o Netlify), fai **doppio clic sul logo** *Fioritura* in alto — da telefono, due tocchi rapidi — e accedi con le credenziali impostate sul server. Non ci sono password nel sito: se `FIORITURA_ADMIN_PASSWORD` non è impostata, il pannello resta spento.

Dentro trovi quattro sezioni:

- **Panoramica** — partecipanti, sessioni, XP totali e settimanali, negozi attivi, ultime rettifiche. Da qui pubblichi un annuncio in home e **azzeri la classifica** prima di far entrare i clienti veri, scegliendo se svuotare anche gli inventari del negozio e ripristinare prezzi e disponibilità.
- **Partecipanti** — cerchi una persona, aggiungi, togli o imposta i suoi XP totali, assegni o revochi oggetti, elimini il partecipante con tutte le sue sessioni.
- **Oggetti** — cambi prezzo e disponibilità di ogni articolo del negozio per tutti i client. Un oggetto disattivato resta a chi lo possiede ma non si può più comprare. Ogni prezzo personalizzato si può ripristinare.
- **Sessioni** — vedi le ultime 200 sessioni condivise e ne elimini una per una.

L'azzeramento elimina sessioni e rettifiche XP, ma lascia l'annuncio. Le rettifiche XP valgono per la classifica **Sempre**; quella **Settimana** resta basata sulle sessioni reali. La sessione admin vive solo nella scheda del browser e si chiude con «Esci» (o alla chiusura della scheda). Per sicurezza usalo solo su HTTPS.

### La musica

Quattro paesaggi sonori generati in tempo reale con la Web Audio API, senza file audio da scaricare:

1. **Pioggia e pianoforte** — gocce sottili e note rade.
2. **Onde** — risacca lenta e risonanze calde.
3. **Foresta notturna** — fruscii, grilli e aria fresca.
4. **Carillon di vetro** — melodie cristalline e riverbero lungo.

Il volume è regolabile e la musica sfuma dolcemente in pausa e alla fine della sessione, con un piccolo motivo di chiusura.

### La tua musica: Spotify e YouTube

Dentro il riquadro dei paesaggi sonori ci sono anche i pulsanti **Spotify** e **YouTube**. Non servono account, password o permessi: incolli il link di una playlist, di un album o di un brano (dal menu «Condividi» del servizio) e Fioritura lo ricorda **solo su questo dispositivo**.

- Il player ufficiale si apre direttamente nella finestra, con il pulsante **Riproduci qui**.
- Se il servizio blocca il player incorporato, **Apri nel servizio** apre il link originale in una nuova scheda.
- Puoi collegare Spotify e YouTube insieme e passare da uno all'altro quando vuoi; **Scollega** rimuove il link.
- Quando parte la musica esterna, i paesaggi sonori si fermano (e viceversa): non si sovrappongono.
- I link vengono controllati: solo indirizzi Spotify/YouTube validi vengono salvati.

### Il negozio

L'icona a forma di sacchetto accanto alle impostazioni apre il **Negozio**. Qui spendi gli XP guadagnati per personalizzare il profilo:

- **6 cornici** per l'avatar, da 120 a 4.200 XP.
- **5 titoli** da mostrare accanto al nome in classifica, da 80 a 5.000 XP.
- **5 colori** per l'accento del profilo, da 100 a 2.800 XP.

Gli acquisti si equipaggiano da soli e restano tuoi: puoi cambiarli o rimuoverli quando vuoi. Gli XP spesi escono dal **salvadanaio** del negozio, ma **non riducono il punteggio della classifica**: il totale guadagnato resta quello che hai conquistato. Il negozio funziona anche senza profilo; per vedere cornice e titolo in classifica serve un profilo.

Con la classifica condivisa attiva, catalogo e inventari vengono sincronizzati col server: le modifiche di prezzo o disponibilità fatte dall'admin arrivano ai client, e gli oggetti comprati restano legati al profilo anche su un altro dispositivo. Se due dispositivi modificano lo stesso inventario, vince la modifica più recente (`updatedAt`).

### Personalizzare Fioritura

L'icona a ingranaggio in alto a destra apre le impostazioni, divise in quattro sezioni. Accanto c'è l'icona del **Negozio** per spendere gli XP.

**Profilo**

- Nome utente e paese, con ricerca tra 249 paesi.
- Foto profilo: viene ritagliata in un cerchio da 256×256 e compressa in JPEG. Resta **solo su questo dispositivo** e non viene mai inviata alla classifica condivisa.
- L'avatar compare accanto al nome nella barra in alto, nella card del profilo e nelle tue righe della classifica.

**Aspetto**

- Sette atmosfere: **Aurora**, **Alba**, **Oceano**, **Foresta**, **Notte**, **Deserto** e **Lavanda**.
- In alternativa, una tua foto come sfondo: viene ridimensionata a un massimo di 1920 px e salvata nel browser.
- Intensità dell'atmosfera regolabile dal 10% al 100%, particelle di luce attivabili o disattivabili, movimento ridotto per fermare le animazioni.
- Dimensione del testo: piccolo, normale o grande. Cambia l'intera interfaccia senza rompere il layout.

**Timer e suoni**

- Durata predefinita da 1 a 180 minuti, applicabile subito o al prossimo avvio.
- Notifica di sistema a fine sessione, campanella di chiusura, musica avviata insieme al timer e volume generale.

**Dati**

- **Scarica backup**: esporta profilo, progressi, impostazioni e classifica locale in un file JSON.
- **Azzera i progressi**: XP, serie, sessioni, timer, oggetti comprati e XP del salvadanaio ripartono da zero e le tue sessioni spariscono dalla classifica locale. I punteggi già inviati alla classifica condivisa restano sul server.
- **Elimina tutto**: rimuove profilo, foto, progressi, acquisti, link musicali e preferenze da questo dispositivo.

Le azioni distruttive chiedono una seconda conferma entro pochi secondi, così un clic distratto non cancella nulla.

## Pubblicare su Netlify (classifica condivisa per tutti)

Il progetto è già pronto per Netlify: `netlify.toml` copia il sito in `dist/` e collega la rotta `/api/leaderboard` a una Netlify Function che salva le sessioni in **Netlify Blobs**. Non serve un database esterno e i punteggi restano anche dopo un nuovo deploy.

> **Importante:** il trascinamento della cartella su Netlify Drop pubblica solo i file statici. Senza function la classifica tornerebbe locale, browser per browser. Per la classifica condivisa usa GitHub o la Netlify CLI.

**Con GitHub (consigliato)**

1. Metti la cartella `fioritura` in un repository GitHub, GitLab o Bitbucket.
2. Su Netlify: **Add new site → Import an existing project**, scegli il repository.
3. Netlify legge `netlify.toml`: build `rm -rf dist && mkdir -p dist && cp index.html dist/ && cp -R assets dist/`, cartella pubblicata `dist`, function in `netlify/functions`.
4. In **Site configuration → Environment variables** aggiungi `FIORITURA_ADMIN_USER` e `FIORITURA_ADMIN_PASSWORD` (password lunga e casuale). Senza password l'admin resta spento, ma classifica e negozio funzionano comunque. Blobs viene creato da solo al primo utilizzo.
5. Dopo il deploy apri il sito: la classifica si aggancia da sola alla modalità condivisa. Ogni visitatore vede gli stessi nomi, paesi e punteggi; fai doppio clic sul logo per entrare nell'admin.

**Con la CLI**

```bash
npm install -g netlify-cli
netlify login
cd fioritura
netlify init
netlify deploy --prod
```

La CLI installa `@netlify/blobs` da `package.json` e pubblica anche la function. Per provare tutto in locale, se hai Node: `netlify dev`.

Sulla classifica Netlify non ci sono partecipanti di esempio: parte vuota e si riempie con le sessioni reali. In locale, con doppio clic su `index.html` o con `server.py`, funziona come prima.


## Struttura del progetto

```
fioritura/
├── index.html               struttura della pagina
├── assets/
│   ├── css/styles.css       stile, animazioni, responsive
│   ├── js/app.js            timer, XP, profilo, negozio, musica, interazioni
│   ├── js/audio.js          motore musicale procedurale
│   ├── js/leaderboard.js    classifica locale/condivisa e coda sessioni
│   ├── js/countries.js      249 paesi in italiano con bandiera
│   └── favicon.svg
├── server.py                server statico + API classifica condivisa (locale)
├── avvia.command            launcher macOS (doppio clic)
├── netlify.toml             build, redirect /api/*, header
├── netlify/
│   ├── functions/
│   │   ├── leaderboard.mjs  API classifica condivisa
│   │   ├── shop.mjs         API catalogo e inventari
│   │   └── admin.mjs        API admin (Basic auth)
│   └── lib/state.mjs        stato condiviso, validazione, azioni admin
├── package.json             dipendenza @netlify/blobs
└── data/sessions.json       creato dal server locale al primo avvio
```

## Note tecniche

- Nessun build step per l'uso locale: si apre e funziona. La build serve solo a Netlify, che copia i file in `dist/`.
- I dati locali stanno in `localStorage` con il prefisso `fioritura.`: `settings`, `stats`, `profile`, `pending`, `timer`, `background`, `shop`, `music` e `announcement` (ultimo annuncio chiuso), più `sessions` e `seeded` per la classifica locale. Il token admin, quando serve, resta solo in `sessionStorage` e sparisce chiudendo la scheda.
- La foto profilo, lo sfondo personale e i link musicali possono essere rimossi in qualsiasi momento dalle impostazioni; se lo spazio del browser si esaurisce, Fioritura lo dice e non perde i dati già salvati.
- Il server locale valida ogni sessione (nome, paese, durata, XP), limita le richieste e salva in modo atomico su JSON. Le function Netlify applicano le stesse regole e scrivono su Blobs con confronto di versione (ETag), così sessioni simultanee non si sovrascrivono. Sessioni, rettifiche XP, catalogo, inventari e annuncio vivono nello stesso documento con schema versione 2.
- Le modifiche admin passano da `/api/admin` con autenticazione Basic e limite dei tentativi falliti; il negozio pubblico usa `/api/shop` per leggere catalogo e inventario e per inviare le proprie modifiche. Il server Python e le function Netlify espongono lo stesso contratto.
- Rispetta la preferenza di sistema «riduci movimento» e non usa animazioni invasive.
- L'interfaccia è completamente in italiano ed è pensata per funzionare bene da telefono a desktop.
