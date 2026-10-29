/* =========================================================
   Fioritura — logica dell'app
   ========================================================= */
(function () {
  "use strict";

  /* ---------- utilità ---------- */

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const numberFormatter = new Intl.NumberFormat("it-IT");
  const decimalFormatter = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 });
  const formatNumber = (value) => numberFormatter.format(Math.round(Number(value) || 0));

  function formatMinutes(value) {
    const rounded = Math.round((Number(value) || 0) * 10) / 10;
    return `${decimalFormatter.format(rounded)} ${rounded === 1 ? "minuto" : "minuti"}`;
  }

  function readJSON(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch (error) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      /* localStorage non disponibile o pieno */
      return false;
    }
  }

  function removeKey(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      /* noop */
    }
  }

  const KEYS = {
    settings: "fioritura.settings.v1",
    stats: "fioritura.stats.v1",
    profile: "fioritura.profile.v1",
    pending: "fioritura.pending.v1",
    timer: "fioritura.timer.v1",
    background: "fioritura.background.v1",
    shop: "fioritura.shop.v1",
    music: "fioritura.music.v1",
    announcement: "fioritura.announcement.v1",
    call: "fioritura.call.v1"
  };

  const XP_PER_LEVEL = 500;
  const LEVEL_TITLES = [
    "Seme",
    "Germoglio",
    "Foglia",
    "Bocciolo",
    "Fiore",
    "Rondine",
    "Brezza",
    "Alba",
    "Bosco",
    "Aurora"
  ];

  const TREE_MAX_STAGE = 9;
  const TREE_STAGES = [
    { name: "Seme", hint: "Tutto comincia da un piccolo seme nella terra." },
    { name: "Germoglio", hint: "Una prima foglia cerca la luce." },
    { name: "Ramoscello", hint: "Il fusto si alza e si divide." },
    { name: "Alberello", hint: "Le radici iniziano a tenere." },
    { name: "Albero giovane", hint: "La chioma si apre al cielo." },
    { name: "Albero fiorito", hint: "I primi fiori colorano i rami." },
    { name: "Albero rigoglioso", hint: "La vita si fa spazio tra le foglie." },
    { name: "Grande quercia", hint: "Un rifugio per chi passa." },
    { name: "Albero antico", hint: "La sua ombra racconta anni di cura." },
    { name: "Albero della Vita", hint: "Il tuo albero più grande. Continua a prendertene cura." }
  ];

  const MOTIVATIONAL_PHRASES = [
    "Respira: sei esattamente dove devi essere.",
    "Anche il seme più piccolo sogna il cielo.",
    "Non devi correre. Devi solo restare.",
    "Ogni respiro è un nuovo inizio.",
    "La calma non è lontana: è qui, tra due respiri.",
    "Cresci piano, ma cresci sempre.",
    "Le radici profonde reggono i rami più alti.",
    "Oggi basta un passo, anche piccolo.",
    "Il tempo che ti dedichi non è mai tempo perso.",
    "Fiorisci al tuo ritmo.",
    "La luce entra anche dalle foglie più stanche.",
    "Sei più forte di ciò che ti ha piegato.",
    "Lascia andare ciò che non puoi controllare.",
    "Ogni giorno è una pagina nuova.",
    "Il silenzio sa dire cose importanti.",
    "Nutri ciò che vuoi vedere crescere.",
    "Non confrontare la tua primavera con l'inverno di un altro.",
    "Un albero non cresce tirandolo.",
    "Meriti lo stesso spazio che dai agli altri.",
    "Rallenta: il mondo può aspettare.",
    "Le cose belle maturano lentamente.",
    "Anche le giornate grigie preparano il verde.",
    "Sii gentile con la persona che stai diventando.",
    "Il tuo ritmo è quello giusto per te.",
    "Non tutte le ferite si vedono, ma tutte possono guarire.",
    "Trova la bellezza nei dettagli piccoli.",
    "Ogni fine contiene un seme.",
    "La perseveranza è un tipo di magia.",
    "Respira dentro il momento presente.",
    "Non devi essere perfetto per essere prezioso.",
    "Le foglie cadono, ma l'albero resta.",
    "Datti il tempo di rifiorire.",
    "Il coraggio è anche restare fermi.",
    "Le tue radici conoscono la strada.",
    "Scegli la lentezza quando il cuore la chiede.",
    "Ciò che semini oggi ti farà ombra domani.",
    "Non c'è crescita senza un po' di disordine.",
    "Accogli anche i giorni in cui non sbocci.",
    "La tua presenza è già un dono.",
    "Ogni ramo ha il suo percorso verso la luce.",
    "Fidati del processo, non solo del risultato.",
    "Anche il vento forte rende le radici più salde.",
    "Fai spazio a ciò che ti fa respirare.",
    "Un passo lento è comunque avanti.",
    "La pace inizia da una respirazione alla volta.",
    "Non portare il peso di domani.",
    "Le piccole gioie sono radici segrete.",
    "Onora il tempo che ti serve.",
    "Sei una storia in continua scrittura.",
    "Non smettere di cercare la tua luce.",
    "Il tuo valore non dipende dalla tua velocità.",
    "Le stagioni sanno aspettare.",
    "Lascia che le cose crescano senza forzarle.",
    "Abbi cura di te come di un giardino raro.",
    "Ogni respiro profondo allarga lo spazio dentro.",
    "Le ombre parlano di una luce vicina.",
    "Non devi spiegare la tua crescita a nessuno.",
    "Riposa: anche la terra riposa d'inverno.",
    "La delicatezza è una forma di forza.",
    "Ci sono giorni in cui germogliare è abbastanza.",
    "Fai della tua calma una casa.",
    "Il cammino ti sta cambiando, anche quando non lo vedi.",
    "Sii curioso di ciò che puoi diventare.",
    "Ogni albero è stato, un giorno, una promessa.",
    "Il tuo profumo è nelle cose che ami.",
    "Non perdere la tenerezza lungo la strada.",
    "Anche le radici più lente trovano l'acqua.",
    "Il sole torna sempre dopo la notte.",
    "Concediti una pausa senza colpa.",
    "Stai crescendo anche nei giorni invisibili.",
    "La bellezza cerca chi sa guardare.",
    "Ogni foglia nuova è una piccola vittoria.",
    "Non c'è fretta di arrivare: il viaggio è tuo.",
    "Respira e lascia che la giornata si apra.",
    "Le cose semplici tengono su il mondo.",
    "La tua storia merita di essere raccontata.",
    "Il coraggio germoglia dove c'è cura.",
    "Accetta il cambiamento come una nuova stagione.",
    "Ogni passo sulla terra è una preghiera di presenza.",
    "Non sei mai troppo tardi per ricominciare.",
    "Le tue mani possono piantare domani.",
    "La gratitudine è acqua per l'anima.",
    "Anche il buio nutre le radici.",
    "Sii il rifugio che cerchi.",
    "Il tuo silenzio può essere pieno di stelle.",
    "Ogni giorno scegli una cosa che ti fa bene.",
    "La costanza è un albero che cresce in silenzio.",
    "Non misurare la tua crescita con il metro altrui.",
    "La tua vulnerabilità è una porta aperta.",
    "Fiorisci dove sei piantato, poi allarga le radici.",
    "Il respiro è la casa che porti sempre con te.",
    "Lascia andare il vecchio per fare spazio al nuovo.",
    "Anche i rami spezzati possono rifiorire.",
    "La quiete è una forza che non fa rumore.",
    "Ogni piccolo seme contiene una foresta.",
    "Scegli di essere presente, non perfetto.",
    "Il tuo tempo è sacro: proteggilo con dolcezza.",
    "La luce che cerchi può partire da te.",
    "Cresci verso ciò che ti fa sentire vivo.",
    "E poi, domani, un altro respiro."
  ];

  const DEFAULT_SETTINGS = {
    duration: 25 * 60,
    volume: 0.55,
    track: "rain",
    musicAutostart: true,
    notify: false,
    period: "week",
    theme: "aurora",
    atmosphere: 100,
    particles: true,
    reduceMotion: false,
    scale: "normal",
    chime: true,
    settingsPanel: "aspetto"
  };

  const THEMES = ["aurora", "alba", "oceano", "foresta", "notte", "deserto", "lavanda"];
  const THEME_COLORS = {
    aurora: "#090c18",
    alba: "#150b13",
    oceano: "#04121c",
    foresta: "#05120d",
    notte: "#05060f",
    deserto: "#170f0b",
    lavanda: "#0d0a18"
  };
  const SCALES = ["compact", "normal", "large"];

  const SHOP_ITEMS = [
    {
      id: "frame-sprout",
      type: "frame",
      name: "Germoglio",
      price: 120,
      rarity: "Comune",
      desc: "Un filo di verde attorno alla foto."
    },
    {
      id: "frame-glow",
      type: "frame",
      name: "Violetto",
      price: 320,
      rarity: "Comune",
      desc: "Una luce morbida di lavanda."
    },
    {
      id: "frame-mint",
      type: "frame",
      name: "Menta",
      price: 650,
      rarity: "Raro",
      desc: "Fresca come un respiro profondo."
    },
    {
      id: "frame-gold",
      type: "frame",
      name: "Oro caldo",
      price: 1200,
      rarity: "Raro",
      desc: "Un tramonto sul bordo del profilo."
    },
    {
      id: "frame-aurora",
      type: "frame",
      name: "Aurora",
      price: 2400,
      rarity: "Prezioso",
      desc: "Verde, rosa e viola che si rincorrono."
    },
    {
      id: "frame-moon",
      type: "frame",
      name: "Luna",
      price: 4200,
      rarity: "Leggendario",
      desc: "Un alone d'argento per le sere lente."
    },
    {
      id: "badge-dreamer",
      type: "badge",
      name: "Sognatore",
      price: 80,
      rarity: "Comune",
      desc: "Per chi guarda il timer e sogna."
    },
    {
      id: "badge-breather",
      type: "badge",
      name: "Respiratore",
      price: 220,
      rarity: "Comune",
      desc: "Un titolo che profuma di calma."
    },
    {
      id: "badge-keeper",
      type: "badge",
      name: "Custode",
      price: 800,
      rarity: "Raro",
      desc: "Custode del tempo che ti sei preso."
    },
    {
      id: "badge-blossom",
      type: "badge",
      name: "Fioritura",
      price: 1800,
      rarity: "Prezioso",
      desc: "Sboccia accanto al tuo nome."
    },
    {
      id: "badge-legend",
      type: "badge",
      name: "Leggenda",
      price: 5000,
      rarity: "Leggendario",
      desc: "Per chi ha già regalato molte ore a sé."
    },
    {
      id: "accent-rose",
      type: "accent",
      name: "Rosa cipria",
      price: 100,
      rarity: "Comune",
      desc: "Un tocco caldo su avatar e profilo.",
      color: "#ff9fb6",
      glow: "rgba(255, 159, 182, 0.3)"
    },
    {
      id: "accent-mint",
      type: "accent",
      name: "Menta",
      price: 280,
      rarity: "Comune",
      desc: "Verde fresco, come l'aria di mattina.",
      color: "#a9e8d1",
      glow: "rgba(169, 232, 209, 0.3)"
    },
    {
      id: "accent-gold",
      type: "accent",
      name: "Miele",
      price: 700,
      rarity: "Raro",
      desc: "Un oro morbido, mai aggressivo.",
      color: "#ffd3ad",
      glow: "rgba(255, 211, 173, 0.32)"
    },
    {
      id: "accent-violet",
      type: "accent",
      name: "Glicine",
      price: 1500,
      rarity: "Prezioso",
      desc: "Viola chiaro, con un alone gentile.",
      color: "#c3aaff",
      glow: "rgba(195, 170, 255, 0.32)"
    },
    {
      id: "accent-ocean",
      type: "accent",
      name: "Oceano",
      price: 2800,
      rarity: "Leggendario",
      desc: "Azzurro profondo, come guardare il mare.",
      color: "#8fd3ff",
      glow: "rgba(143, 211, 255, 0.32)"
    }
  ];

  const DEFAULT_SHOP = {
    spentXp: 0,
    owned: [],
    equipped: { frame: null, badge: null, accent: null },
    updatedAt: 0
  };

  const SHOP_FILTERS = { all: "Tutti", frame: "Cornici", badge: "Titoli", accent: "Colori" };

  const BASE_TITLE = "Fioritura — Albero della Vita";
  const DEFAULT_PROFILE_HINT = "Il nome è visibile nella classifica. Puoi cambiarlo quando vuoi.";
  const MAX_DURATION = 180 * 60;
  const MIN_DURATION = 60;

  /* ---------- stato ---------- */

  let settings = { ...DEFAULT_SETTINGS };
  let stats = { totalXp: 0, sessions: 0, minutes: 0, history: [], plantings: [] };
  let profile = null;
  let pendingSessions = [];

  const state = {
    duration: settings.duration,
    remaining: settings.duration,
    running: false,
    endAt: 0,
    raf: 0,
    guard: 0,
    finishing: false,
    expired: false,
    period: "week",
    lastShown: null,
    lastTitle: "",
    doneToken: 0
  };

  const dom = {};
  let activeModal = null;
  let previousFocus = null;
  let toastTimer = 0;
  let countryFilter = "";
  let draftAvatar = "";
  let customBackground = "";
  let settingsPanel = DEFAULT_SETTINGS.settingsPanel;
  let topbarResizeTimer = 0;
  let shop = { spentXp: 0, owned: [], equipped: { frame: null, badge: null, accent: null }, updatedAt: 0 };
  let shopFilter = "all";
  let shopCatalog = {};
  let announcement = { text: "", updatedAt: 0 };
  let shopSyncing = false;
  let music = { spotify: null, youtube: null };
  let musicSource = "spotify";
  let externalPlaying = false;
  let quoteTimer = 0;
  let quoteQueue = [];
  let currentPhrase = "";
  let callIdentity = null;
  let callPollTimer = 0;
  const call = {
    view: "setup",
    incoming: null,
    outgoing: null,
    active: null,
    busy: false,
    polling: false,
    lastIncomingId: ""
  };

  const ADMIN_TOKEN_KEY = "fioritura.admin.v1";
  let adminToken = "";
  let adminData = null;
  let adminTab = "overview";
  let adminSearch = "";
  let adminBusy = false;
  let adminStatusText = "";
  let lastBrandTap = 0;

  /* ---------- XP e serie ---------- */

  function dayKey(date) {
    const value = date instanceof Date ? date : new Date(date);
    return `${value.getFullYear()}-${value.getMonth() + 1}-${value.getDate()}`;
  }

  function computeStreak(history) {
    const days = new Set(history.map((item) => dayKey(item.ts)));
    const cursor = new Date();
    cursor.setHours(12, 0, 0, 0);
    if (!days.has(dayKey(cursor))) {
      cursor.setDate(cursor.getDate() - 1);
    }
    let count = 0;
    while (days.has(dayKey(cursor)) && count < 3650) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }

  function prospectiveStreak() {
    const current = computeStreak(stats.history);
    const hasToday = stats.history.some((item) => dayKey(item.ts) === dayKey(new Date()));
    return hasToday ? current : current + 1;
  }

  function computeXp(minutes, streakDays) {
    if (!(minutes >= 5)) {
      return {
        eligible: false,
        total: 0,
        baseXp: 0,
        longBonus: 0,
        streakBonus: 0,
        longMult: 0,
        streakMult: 0
      };
    }
    const raw = minutes * 10;
    const longMult = minutes >= 50 ? 0.5 : minutes >= 25 ? 0.25 : 0;
    const streakMult = Math.min(Math.max(streakDays - 1, 0), 5) * 0.1;
    const baseXp = Math.round(raw);
    const longBonus = Math.round(raw * longMult);
    const streakBonus = Math.round(raw * streakMult);
    return {
      eligible: true,
      total: baseXp + longBonus + streakBonus,
      baseXp,
      longBonus,
      streakBonus,
      longMult,
      streakMult
    };
  }

  function levelInfo(totalXp) {
    const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
    const title = LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];
    const progress = totalXp % XP_PER_LEVEL;
    return {
      level,
      title,
      progress,
      remaining: XP_PER_LEVEL - progress,
      nextTitle: level < LEVEL_TITLES.length ? LEVEL_TITLES[level] : null
    };
  }

  /* ---------- Albero della Vita ---------- */

  function seededRandom(seed) {
    let value = Math.abs(Math.floor(seed)) % 2147483647;
    if (value <= 0) value += 2147483646;
    return () => {
      value = (value * 16807) % 2147483647;
      return (value - 1) / 2147483646;
    };
  }

  function treeGrowth() {
    const xpStage = clamp(Math.floor(stats.totalXp / XP_PER_LEVEL), 0, TREE_MAX_STAGE);
    const planted = stats.plantings.length;
    const seedStage = clamp(planted, 0, TREE_MAX_STAGE);
    const stage = Math.max(xpStage, seedStage);
    return {
      stage,
      xpStage,
      planted,
      seedStage,
      info: TREE_STAGES[stage],
      next: stage < TREE_MAX_STAGE ? TREE_STAGES[stage + 1] : null
    };
  }

  function plantedToday() {
    const today = dayKey(new Date());
    return stats.plantings.some((ts) => dayKey(new Date(ts)) === today);
  }

  function buildTreeSvg(stage, seed, uid) {
    const s = clamp(Math.round(stage), 0, TREE_MAX_STAGE);
    const rand = seededRandom((Number(seed) || 1) + s * 7919);
    const leafGradient = `leafGrad-${uid}`;
    const trunkGradient = `trunkGrad-${uid}`;
    const haloGradient = `haloGrad-${uid}`;
    const leaves = ["#7fc7a1", "#96d8b3", "#b3e9c9", "#6fb590", "#a9e8d1"];
    const blossoms = ["#ffd3ad", "#ff9fb6", "#f7c6ff", "#ffe4b8"];
    const parts = [];

    parts.push(
      `<defs>
        <linearGradient id="${trunkGradient}" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#5d4030"/>
          <stop offset="55%" stop-color="#8a6242"/>
          <stop offset="100%" stop-color="#4a3124"/>
        </linearGradient>
        <radialGradient id="${leafGradient}" cx="38%" cy="30%" r="78%">
          <stop offset="0%" stop-color="#d6fbe5"/>
          <stop offset="48%" stop-color="#96d8b3"/>
          <stop offset="100%" stop-color="#4a886a"/>
        </radialGradient>
        <radialGradient id="${haloGradient}" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffd3ad" stop-opacity=".28"/>
          <stop offset="60%" stop-color="#c3aaff" stop-opacity=".08"/>
          <stop offset="100%" stop-color="#c3aaff" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <ellipse class="tree-ground" cx="120" cy="203" rx="${54 + s * 4}" ry="${8 + s * 0.9}" fill="rgba(5, 12, 10, .5)"/>`
    );

    if (s === 0) {
      parts.push(
        `<g class="tree-sway">
          <ellipse cx="120" cy="197" rx="15" ry="4.5" fill="rgba(169, 232, 209, .18)"/>
          <path d="M120 196c0-7 2.2-11.4 6.4-14.6" fill="none" stroke="#8bd0aa" stroke-width="2.1" stroke-linecap="round"/>
          <ellipse cx="128" cy="179" rx="6.6" ry="3.5" fill="url(#${leafGradient})" transform="rotate(-34 128 179)"/>
          <ellipse cx="120" cy="190" rx="5.2" ry="7.4" fill="#8a6242" transform="rotate(16 120 190)"/>
          <circle cx="120" cy="201" r="2.4" fill="#ffd3ad" opacity=".8"/>
        </g>`
      );
    } else {
      const trunkHeight = 30 + s * 13;
      const topY = 196 - trunkHeight;
      const trunkWidth = 4.2 + s * 0.95;
      const canopyY = topY - 2;
      const spread = 12 + s * 5.2;
      const branches = [];
      const tips = [];

      branches.push(
        `<path d="M120 198 C ${117 + rand() * 6} ${198 - trunkHeight * 0.46}, ${121 + rand() * 6} ${198 - trunkHeight * 0.8}, 120 ${topY}" fill="none" stroke="url(#${trunkGradient})" stroke-width="${trunkWidth}" stroke-linecap="round"/>`
      );

      const branchCount = 2 + s;
      for (let index = 0; index < branchCount; index += 1) {
        const t = (index + 1) / (branchCount + 1);
        const y = 196 - trunkHeight * (0.3 + t * 0.64);
        const side = index % 2 === 0 ? -1 : 1;
        const length = (17 + s * 5.4) * (0.55 + rand() * 0.55) * (1 - t * 0.22);
        const endX = 120 + side * length;
        const endY = y - length * (0.34 + rand() * 0.34);
        const width = Math.max(1.1, trunkWidth * 0.42 * (1 - t * 0.5));
        branches.push(
          `<path d="M120 ${y.toFixed(1)} Q ${(120 + side * length * 0.35).toFixed(1)} ${(y - length * 0.16).toFixed(1)}, ${endX.toFixed(1)} ${endY.toFixed(1)}" fill="none" stroke="#7a573f" stroke-width="${width.toFixed(1)}" stroke-linecap="round" opacity=".94"/>`
        );
        tips.push({ x: endX, y: endY });
      }

      const canopy = [];
      const clusterCount = 4 + s * 2;
      for (let index = 0; index < clusterCount; index += 1) {
        const angle = rand() * Math.PI * 2;
        const distance = Math.sqrt(rand()) * spread;
        const cx = 120 + Math.cos(angle) * distance;
        const cy = canopyY + Math.sin(angle) * distance * 0.72;
        const radius = (7.4 + s * 1.2) * (0.64 + rand() * 0.58);
        canopy.push(
          `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${radius.toFixed(1)}" fill="url(#${leafGradient})" opacity="${(0.7 + rand() * 0.3).toFixed(2)}"/>`
        );
      }

      if (s >= 2) {
        tips.forEach((tip) => {
          const radius = (5.6 + s * 0.9) * (0.7 + rand() * 0.5);
          canopy.push(
            `<circle cx="${(tip.x + (rand() - 0.5) * 5).toFixed(1)}" cy="${(tip.y - 2).toFixed(1)}" r="${radius.toFixed(1)}" fill="${leaves[Math.floor(rand() * leaves.length)]}" opacity=".82"/>`
          );
        });
      }

      if (s >= 4) {
        for (let index = 0; index < s * 2; index += 1) {
          const angle = rand() * Math.PI * 2;
          const distance = Math.sqrt(rand()) * spread * 1.02;
          const cx = 120 + Math.cos(angle) * distance;
          const cy = canopyY + Math.sin(angle) * distance * 0.74;
          canopy.push(
            `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(1.6 + rand() * 2.4).toFixed(1)}" fill="#e6ffef" opacity=".44"/>`
          );
        }
      }

      if (s >= 5) {
        const blossomCount = (s - 4) * 4;
        for (let index = 0; index < blossomCount; index += 1) {
          const angle = rand() * Math.PI * 2;
          const distance = Math.sqrt(rand()) * spread * 0.96;
          const cx = 120 + Math.cos(angle) * distance;
          const cy = canopyY + Math.sin(angle) * distance * 0.72;
          canopy.push(
            `<circle class="tree-blossom" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(1.9 + rand() * 1.8).toFixed(1)}" fill="${blossoms[Math.floor(rand() * blossoms.length)]}"/>`
          );
        }
      }

      if (s >= 7) {
        parts.push(
          `<circle class="tree-halo" cx="120" cy="${(canopyY - 4).toFixed(1)}" r="${(spread + 30).toFixed(1)}" fill="url(#${haloGradient})"/>`
        );
      }

      const fireflies = [];
      if (s >= 6) {
        for (let index = 0; index < 5; index += 1) {
          fireflies.push(
            `<circle class="tree-firefly" cx="${(80 + rand() * 80).toFixed(1)}" cy="${(90 + rand() * 90).toFixed(1)}" r="${(1.1 + rand() * 1.3).toFixed(1)}" style="animation-delay:${(rand() * 2.4).toFixed(2)}s"/>`
          );
        }
      }

      parts.push(
        `<g class="tree-sway">
          ${branches.join("")}
          <g class="tree-canopy">${canopy.join("")}</g>
          ${fireflies.join("")}
        </g>`
      );
    }

    return `<svg viewBox="0 0 240 220" role="presentation" aria-hidden="true" focusable="false">${parts.join("")}</svg>`;
  }

  function renderTree() {
    const growth = treeGrowth();
    const seed = stats.plantings.length * 31 + Math.round(stats.totalXp / 50) + 7;

    if (dom.gardenTree) dom.gardenTree.innerHTML = buildTreeSvg(growth.stage, seed, "g");
    if (dom.dialTree) dom.dialTree.innerHTML = buildTreeSvg(growth.stage, seed, "d");

    if (dom.treeStage) {
      dom.treeStage.dataset.stage = String(growth.stage);
      dom.treeStage.setAttribute(
        "aria-label",
        `Il tuo Albero della Vita: ${growth.info.name}. ${growth.info.hint}`
      );
    }
    if (dom.treeStageName) dom.treeStageName.textContent = growth.info.name;
    if (dom.statSeeds) dom.statSeeds.textContent = formatNumber(growth.planted);

    const planted = plantedToday();
    if (dom.plantSeed) {
      dom.plantSeed.disabled = planted;
      dom.plantSeed.textContent = planted ? "Seme di oggi piantato" : "Pianta il seme di oggi";
      dom.plantSeed.setAttribute(
        "aria-label",
        planted
          ? "Hai già piantato il seme di oggi. Torna domani."
          : "Pianta il seme di oggi per far crescere l'albero"
      );
    }

    if (dom.plantTitle) {
      dom.plantTitle.textContent =
        growth.stage >= TREE_MAX_STAGE ? "L'Albero della Vita è al massimo" : "Pianta un seme";
    }
    if (dom.plantHint) {
      if (growth.stage >= TREE_MAX_STAGE) {
        dom.plantHint.textContent = planted
          ? `${formatNumber(growth.planted)} semi in tutto. Ogni nuovo seme è un gesto di cura.`
          : "L'albero è al massimo: puoi comunque piantare il seme di oggi.";
      } else if (planted) {
        dom.plantHint.textContent = `${formatNumber(growth.planted)} semi in tutto. Torna domani per crescere ancora.`;
      } else if (growth.planted === 0) {
        dom.plantHint.textContent = "Un seme al giorno. Anche senza sessioni, l'albero cresce.";
      } else {
        dom.plantHint.textContent = `${formatNumber(growth.planted)} semi in tutto. Il prossimo seme è pronto.`;
      }
    }
  }

  function plantSeed() {
    if (plantedToday()) {
      showToast("Il seme di oggi è già piantato. Torna domani.");
      return;
    }
    const before = treeGrowth().stage;
    stats.plantings.push(Date.now());
    saveStats();
    const after = treeGrowth().stage;
    renderStats();
    if (after > before && dom.treeStage) {
      dom.treeStage.classList.remove("is-growing");
      void dom.treeStage.offsetWidth;
      dom.treeStage.classList.add("is-growing");
      window.setTimeout(() => {
        if (dom.treeStage) dom.treeStage.classList.remove("is-growing");
      }, 1800);
    }
    const message =
      after > before
        ? `Seme piantato. Il tuo albero è diventato ${TREE_STAGES[after].name}.`
        : "Seme piantato. Il tuo albero ti ringrazia.";
    showToast(message);
    announce(message);
  }

  /* ---------- frasi del giorno ---------- */

  function shufflePhrases() {
    const list = MOTIVATIONAL_PHRASES.slice();
    for (let index = list.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [list[index], list[swap]] = [list[swap], list[index]];
    }
    return list;
  }

  function nextPhrase() {
    if (!dom.topbarQuote || !MOTIVATIONAL_PHRASES.length) return;
    if (!quoteQueue.length) quoteQueue = shufflePhrases();
    let phrase = quoteQueue.pop();
    if (phrase === currentPhrase && quoteQueue.length) {
      quoteQueue.unshift(phrase);
      phrase = quoteQueue.pop();
    }
    currentPhrase = phrase;
    dom.topbarQuote.classList.remove("is-changing");
    dom.topbarQuote.textContent = phrase;
    void dom.topbarQuote.offsetWidth;
    dom.topbarQuote.classList.add("is-changing");
  }

  function startQuoteRotation() {
    if (!dom.topbarQuote) return;
    nextPhrase();
    if (quoteTimer) window.clearInterval(quoteTimer);
    quoteTimer = window.setInterval(() => {
      if (!document.hidden) nextPhrase();
    }, 12000);
  }

  /* ---------- formattazione ---------- */

  function formatClock(totalSeconds) {
    const seconds = Math.max(0, Math.round(totalSeconds));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const rest = seconds % 60;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
    }
    return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  }

  function formatWhen(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const time = date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
    if (dayKey(date) === dayKey(now)) return `Oggi, ${time}`;
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (dayKey(date) === dayKey(yesterday)) return `Ieri, ${time}`;
    return `${date.toLocaleDateString("it-IT", { day: "numeric", month: "short" })}, ${time}`;
  }

  function countryInfo(code) {
    const countries = window.FiorituraCountries;
    if (countries && countries.byCode[code]) return countries.byCode[code];
    return { code: code || "--", name: code || "Sconosciuto", flag: "🌍" };
  }

  function initialFor(name) {
    return Array.from(String(name).trim())[0]?.toLocaleUpperCase("it") || "·";
  }

  function avatarHue(name) {
    let hash = 0;
    for (const char of String(name)) {
      hash = (hash * 31 + char.codePointAt(0)) % 360;
    }
    return hash;
  }

  function paintAvatar(element, name, avatarUrl, cosmetics) {
    if (!element) return;
    SHOP_ITEMS.filter((item) => item.type === "frame").forEach((item) => {
      element.classList.remove(`avatar--${item.id}`);
    });
    if (cosmetics && cosmetics.frame) {
      element.classList.add(`avatar--${cosmetics.frame.id}`);
    }
    element.innerHTML = "";
    if (avatarUrl) {
      const image = document.createElement("img");
      image.src = avatarUrl;
      image.alt = "";
      element.appendChild(image);
      element.style.background = "rgba(255, 255, 255, 0.06)";
      return;
    }
    const hue = avatarHue(name);
    element.textContent = initialFor(name);
    element.style.background = `linear-gradient(140deg, hsl(${hue} 68% 66% / 0.42), hsl(${(hue + 70) % 360} 62% 55% / 0.26))`;
  }

  function announce(text) {
    if (!dom.timerAnnouncer) return;
    dom.timerAnnouncer.textContent = "";
    window.setTimeout(() => {
      dom.timerAnnouncer.textContent = text;
    }, 30);
  }

  function showToast(message, duration = 3200) {
    if (!dom.toast) return;
    window.clearTimeout(toastTimer);
    dom.toast.textContent = message;
    dom.toast.hidden = false;
    requestAnimationFrame(() => dom.toast.classList.add("is-visible"));
    toastTimer = window.setTimeout(() => {
      dom.toast.classList.remove("is-visible");
      window.setTimeout(() => {
        dom.toast.hidden = true;
      }, 280);
    }, duration);
  }

  /* ---------- caricamento ---------- */

  function loadSettings() {
    const stored = readJSON(KEYS.settings, {});
    settings = { ...DEFAULT_SETTINGS, ...(stored && typeof stored === "object" ? stored : {}) };

    settings.duration = clamp(Number(settings.duration) || DEFAULT_SETTINGS.duration, MIN_DURATION, MAX_DURATION);
    settings.volume = clamp(Number(settings.volume), 0, 1);
    if (!Number.isFinite(settings.volume)) settings.volume = DEFAULT_SETTINGS.volume;
    if (!["rain", "waves", "forest", "musicbox"].includes(settings.track)) {
      settings.track = DEFAULT_SETTINGS.track;
    }
    settings.musicAutostart = Boolean(settings.musicAutostart);
    settings.notify = Boolean(settings.notify);
    settings.chime = settings.chime !== false;
    settings.period = settings.period === "all" ? "all" : "week";

    if (!THEMES.includes(settings.theme)) settings.theme = DEFAULT_SETTINGS.theme;
    if (!SCALES.includes(settings.scale)) settings.scale = DEFAULT_SETTINGS.scale;
    settings.atmosphere = clamp(Number(settings.atmosphere) || DEFAULT_SETTINGS.atmosphere, 10, 100);
    settings.particles = settings.particles !== false;
    settings.reduceMotion = Boolean(settings.reduceMotion);
    settings.settingsPanel = ["profilo", "aspetto", "timer", "dati"].includes(settings.settingsPanel)
      ? settings.settingsPanel
      : DEFAULT_SETTINGS.settingsPanel;

    settingsPanel = settings.settingsPanel;
  }

  function saveSettings() {
    writeJSON(KEYS.settings, settings);
  }

  function loadBackground() {
    const stored = readJSON(KEYS.background, "");
    customBackground =
      typeof stored === "string" && stored.startsWith("data:image/") ? stored : "";
  }

  function saveBackground() {
    return writeJSON(KEYS.background, customBackground);
  }

  /* ---------- negozio ---------- */

  function effectiveItem(item, catalog = shopCatalog) {
    if (!item) return null;
    const override = catalog && catalog[item.id];
    const price = override && Number.isFinite(Number(override.price))
      ? Math.max(0, Math.round(Number(override.price)))
      : item.price;
    return {
      ...item,
      price,
      active: !override || override.active !== false
    };
  }

  function shopItem(id) {
    const base = SHOP_ITEMS.find((item) => item.id === id);
    return base ? effectiveItem(base) : null;
  }

  function touchShop() {
    shop.updatedAt = Math.max(Date.now(), (Number(shop.updatedAt) || 0) + 1);
  }

  function loadShop() {
    const stored = readJSON(KEYS.shop, null);
    const next = {
      spentXp: 0,
      owned: [],
      equipped: { frame: null, badge: null, accent: null },
      updatedAt: 0
    };

    if (stored && typeof stored === "object") {
      next.spentXp = Math.max(0, Math.round(Number(stored.spentXp) || 0));
      next.updatedAt = Math.max(0, Math.round(Number(stored.updatedAt) || 0));
      if (Array.isArray(stored.owned)) {
        next.owned = Array.from(new Set(stored.owned.filter((id) => shopItem(id))));
      }
      const equipped = stored.equipped && typeof stored.equipped === "object" ? stored.equipped : {};
      ["frame", "badge", "accent"].forEach((type) => {
        const item = shopItem(equipped[type]);
        if (item && item.type === type && next.owned.includes(item.id)) {
          next.equipped[type] = item.id;
        }
      });
    }

    shop = next;
  }

  function saveShop() {
    return writeJSON(KEYS.shop, shop);
  }

  function applyCatalog(value) {
    const next = {};
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.keys(value).forEach((id) => {
        if (!/^(frame|badge|accent)-[a-z0-9-]{1,32}$/.test(id)) return;
        const entry = value[id];
        if (!entry || typeof entry !== "object") return;
        const price = Math.round(Number(entry.price));
        if (!Number.isFinite(price) || price < 0 || price > 100000) return;
        if (typeof entry.active !== "boolean") return;
        next[id] = { price, active: entry.active };
      });
    }
    shopCatalog = next;
    renderShop();
  }

  function adoptShopFromServer(player) {
    if (!player || typeof player !== "object") return false;
    const updatedAt = Math.max(0, Math.round(Number(player.updatedAt) || 0));
    if (updatedAt < shop.updatedAt) return false;

    const next = {
      spentXp: Math.max(0, Math.round(Number(player.spentXp) || 0)),
      owned: [],
      equipped: { frame: null, badge: null, accent: null },
      updatedAt
    };
    if (Array.isArray(player.owned)) {
      next.owned = Array.from(new Set(player.owned.filter((id) => shopItem(id))));
    }
    const equipped = player.equipped && typeof player.equipped === "object" ? player.equipped : {};
    ["frame", "badge", "accent"].forEach((type) => {
      const item = shopItem(equipped[type]);
      if (item && item.type === type && next.owned.includes(item.id)) {
        next.equipped[type] = item.id;
      }
    });

    shop = next;
    saveShop();
    refreshCosmetics();
    renderShop();
    return true;
  }

  function shopPayload() {
    return {
      spentXp: shop.spentXp,
      owned: shop.owned,
      equipped: shop.equipped,
      updatedAt: shop.updatedAt
    };
  }

  function resetLocalShop(resetAt) {
    const stamp = Math.max(0, Math.round(Number(resetAt) || 0));
    shop = {
      spentXp: 0,
      owned: [],
      equipped: { frame: null, badge: null, accent: null },
      updatedAt: stamp
    };
    saveShop();
    refreshCosmetics();
    renderShop();
    showToast("Il negozio condiviso è stato azzerato dall'admin. Gli oggetti locali sono stati rimossi.");
  }

  async function pushShopState(options = {}) {
    if (window.FiorituraLeaderboard.getMode() !== "server" || !profile) return false;
    try {
      const response = await fetch("api/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          username: profile.username,
          country: profile.country,
          shop: shopPayload()
        })
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const data = await response.json();
      if (!data || data.mode !== "server") throw new Error("Risposta non valida");
      if (data.catalog) applyCatalog(data.catalog);
      if (data.announcement) applyAnnouncement(data.announcement);

      const resetAt = Math.max(0, Math.round(Number(data.resetAt) || 0));
      const remoteUpdated = data.player
        ? Math.max(0, Math.round(Number(data.player.updatedAt) || 0))
        : -1;
      if (resetAt > shop.updatedAt && (!data.player || remoteUpdated < resetAt)) {
        resetLocalShop(resetAt);
        return true;
      }
      if (data.player && remoteUpdated > shop.updatedAt) {
        adoptShopFromServer(data.player);
      }
      return true;
    } catch (error) {
      if (!options.silent) {
        showToast("Non riesco a sincronizzare il negozio. Riprovo alla prossima apertura.");
      }
      return false;
    }
  }

  async function syncShopState(options = {}) {
    if (window.FiorituraLeaderboard.getMode() !== "server" || shopSyncing) return;
    shopSyncing = true;
    try {
      const query = profile
        ? `?username=${encodeURIComponent(profile.username)}&country=${encodeURIComponent(profile.country)}`
        : "";
      const response = await fetch(`api/shop${query}`, {
        cache: "no-store",
        headers: { Accept: "application/json" }
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const data = await response.json();
      if (!data || data.mode !== "server") throw new Error("Risposta non valida");

      if (data.catalog) applyCatalog(data.catalog);
      if (data.announcement) applyAnnouncement(data.announcement);

      const remote = data.player;
      const remoteUpdated = remote
        ? Math.max(0, Math.round(Number(remote.updatedAt) || 0))
        : -1;
      const resetAt = Math.max(0, Math.round(Number(data.resetAt) || 0));
      let resetApplied = false;

      if (resetAt > shop.updatedAt && (!remote || remoteUpdated < resetAt)) {
        resetLocalShop(resetAt);
        resetApplied = true;
      }

      if (remote && remoteUpdated >= shop.updatedAt) {
        adoptShopFromServer(remote);
      } else if (
        !resetApplied &&
        shop.updatedAt > remoteUpdated &&
        (shop.updatedAt > 0 || shop.owned.length > 0 || shop.spentXp > 0)
      ) {
        await pushShopState({ silent: true });
      }
    } catch (error) {
      if (!options.silent) {
        showToast("Non riesco a leggere il negozio condiviso.");
      }
    } finally {
      shopSyncing = false;
    }
  }

  function applyAnnouncement(value) {
    if (!value || typeof value !== "object") return;
    const text = String(value.text || "").trim().slice(0, 240);
    const updatedAt = Math.max(0, Math.round(Number(value.updatedAt) || 0));
    announcement = { text, updatedAt };

    if (!dom.announcement || !dom.announcementText) return;
    const dismissed = Math.max(0, Math.round(Number(readJSON(KEYS.announcement, 0)) || 0));
    const visible = Boolean(text) && updatedAt > dismissed;
    dom.announcementText.textContent = text;
    dom.announcement.hidden = !visible;
  }

  function dismissAnnouncement() {
    writeJSON(KEYS.announcement, announcement.updatedAt || Date.now());
    if (dom.announcement) dom.announcement.hidden = true;
    showToast("Annuncio chiuso. Resterà nascosto finché non cambia.");
  }

  function availableXp() {
    return Math.max(0, stats.totalXp - shop.spentXp);
  }

  function equippedItem(type) {
    const item = shopItem(shop.equipped[type]);
    if (!item || item.type !== type || !shop.owned.includes(item.id)) return null;
    return item;
  }

  function ownCosmetics() {
    return {
      frame: equippedItem("frame"),
      badge: equippedItem("badge"),
      accent: equippedItem("accent")
    };
  }

  function applyAccent() {
    const accent = equippedItem("accent");
    const root = document.documentElement;
    root.style.setProperty("--profile-accent", accent ? accent.color : "rgba(255, 255, 255, 0.18)");
    root.style.setProperty(
      "--profile-accent-glow",
      accent ? accent.glow : "rgba(255, 211, 173, 0.18)"
    );
  }

  function badgeClass(item) {
    const rarity = item.rarity.toLocaleLowerCase("it");
    return `lb-badge lb-badge--${rarity}`;
  }

  /* ---------- musica collegata ---------- */

  function loadMusic() {
    const stored = readJSON(KEYS.music, null);
    const next = { spotify: null, youtube: null };

    if (stored && typeof stored === "object") {
      ["spotify", "youtube"].forEach((source) => {
        const entry = stored[source];
        if (
          entry &&
          typeof entry.url === "string" &&
          typeof entry.embed === "string" &&
          entry.embed.startsWith("https://")
        ) {
          next[source] = {
            url: entry.url,
            embed: entry.embed,
            name:
              typeof entry.name === "string" && entry.name.trim()
                ? entry.name.trim().slice(0, 32)
                : source === "spotify"
                  ? "Playlist Spotify"
                  : "Playlist YouTube"
          };
        }
      });
    }

    music = next;
  }

  function saveMusic() {
    return writeJSON(KEYS.music, music);
  }

  function applyAppearance() {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.dataset.scale = settings.scale;
    root.classList.toggle("reduce-motion", settings.reduceMotion);
    document.body.classList.toggle("no-particles", !settings.particles);
    root.style.setProperty("--atmo", String(settings.atmosphere / 100));

    if (dom.backdropPhoto) {
      if (customBackground) {
        dom.backdropPhoto.style.backgroundImage = `url("${customBackground}")`;
        root.classList.add("has-photo");
      } else {
        dom.backdropPhoto.style.backgroundImage = "";
        root.classList.remove("has-photo");
      }
    }

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", THEME_COLORS[settings.theme] || THEME_COLORS.aurora);

    syncThemeGrid();
    syncAppearanceControls();
  }

  function loadStats() {
    const stored = readJSON(KEYS.stats, null);
    stats = { totalXp: 0, sessions: 0, minutes: 0, history: [], plantings: [] };
    if (!stored || typeof stored !== "object") return;

    stats.totalXp = Math.max(0, Math.round(Number(stored.totalXp) || 0));
    stats.sessions = Math.max(0, Math.round(Number(stored.sessions) || 0));
    stats.minutes = Math.max(0, Number(stored.minutes) || 0);
    if (Array.isArray(stored.plantings)) {
      stats.plantings = stored.plantings
        .map((item) => (item && typeof item === "object" ? Number(item.ts) : Number(item)))
        .filter((ts) => Number.isFinite(ts) && ts > 0)
        .slice(-2000);
    }
    if (Array.isArray(stored.history)) {
      stats.history = stored.history
        .filter(
          (item) =>
            item &&
            Number.isFinite(Number(item.ts)) &&
            Number.isFinite(Number(item.minutes)) &&
            Number.isFinite(Number(item.xp))
        )
        .slice(-400)
        .map((item) => ({
          ts: Number(item.ts),
          minutes: Number(item.minutes),
          xp: Number(item.xp)
        }));
    }
  }

  function saveStats() {
    writeJSON(KEYS.stats, stats);
  }

  function loadProfile() {
    const stored = readJSON(KEYS.profile, null);
    if (
      stored &&
      typeof stored.username === "string" &&
      stored.username.trim().length >= 2 &&
      typeof stored.country === "string" &&
      /^[A-Z]{2}$/.test(stored.country)
    ) {
      profile = {
        username: stored.username.trim().slice(0, 20),
        country: stored.country,
        avatar:
          typeof stored.avatar === "string" && stored.avatar.startsWith("data:image/")
            ? stored.avatar
            : ""
      };
    }
  }

  function saveProfile() {
    if (!profile) return false;
    return writeJSON(KEYS.profile, profile);
  }

  function loadPending() {
    const stored = readJSON(KEYS.pending, []);
    pendingSessions = Array.isArray(stored)
      ? stored.filter(
          (item) =>
            item &&
            Number.isFinite(Number(item.ts)) &&
            Number.isFinite(Number(item.minutes)) &&
            Number.isFinite(Number(item.xp))
        )
      : [];
  }

  function savePending() {
    writeJSON(KEYS.pending, pendingSessions);
  }

  /* ---------- timer ---------- */

  function restoreTimer() {
    state.duration = settings.duration;
    state.remaining = settings.duration;

    const saved = readJSON(KEYS.timer, null);
    if (!saved || typeof saved !== "object") return;

    const duration = Number(saved.duration);
    if (!Number.isFinite(duration) || duration < MIN_DURATION || duration > MAX_DURATION) {
      removeKey(KEYS.timer);
      return;
    }

    state.duration = duration;
    state.remaining = duration;

    if (saved.running && Number(saved.endAt) > 0) {
      const ms = Number(saved.endAt) - Date.now();
      if (ms > 0) {
        state.running = true;
        state.endAt = Number(saved.endAt);
        state.remaining = ms / 1000;
      } else {
        state.remaining = 0;
        state.expired = true;
        removeKey(KEYS.timer);
      }
    } else {
      const remaining = Number(saved.remaining);
      if (Number.isFinite(remaining)) {
        state.remaining = clamp(remaining, 0, duration);
      }
    }
  }

  function saveTimer() {
    writeJSON(KEYS.timer, {
      duration: state.duration,
      remaining: state.remaining,
      running: state.running,
      endAt: state.running ? state.endAt : 0,
      savedAt: Date.now()
    });
  }

  function startLoops() {
    stopLoops();

    const frame = () => {
      if (!state.running) return;
      const ms = state.endAt - Date.now();
      state.remaining = Math.max(0, ms / 1000);
      paintTimer();
      if (ms <= 0) {
        finishSession();
        return;
      }
      state.raf = requestAnimationFrame(frame);
    };

    state.raf = requestAnimationFrame(frame);
    state.guard = window.setInterval(() => {
      if (!state.running) return;
      if (Date.now() >= state.endAt) {
        finishSession();
        return;
      }
      if (document.hidden) paintTimer();
    }, 900);
  }

  function stopLoops() {
    if (state.raf) cancelAnimationFrame(state.raf);
    if (state.guard) window.clearInterval(state.guard);
    state.raf = 0;
    state.guard = 0;
  }

  function paintTimer() {
    const total = state.duration || 1;
    const fraction = clamp(state.remaining / total, 0, 1);
    const isDone = !state.running && state.remaining <= 0.05;
    const isPaused = !state.running && !isDone && state.remaining < state.duration - 0.5;

    if (dom.ringProgress) {
      dom.ringProgress.style.strokeDashoffset = (100 - fraction * 100).toFixed(3);
    }

    if (dom.ringDot) {
      const angle = ((-90 + fraction * 360) * Math.PI) / 180;
      dom.ringDot.setAttribute("cx", (170 + 150 * Math.cos(angle)).toFixed(2));
      dom.ringDot.setAttribute("cy", (170 + 150 * Math.sin(angle)).toFixed(2));
    }

    const shown = Math.ceil(Math.max(0, state.remaining) - 0.04);
    if (dom.timeDisplay && shown !== state.lastShown) {
      state.lastShown = shown;
      dom.timeDisplay.textContent = formatClock(shown);
      if (state.running) {
        document.title = `${formatClock(shown)} · ${isPaused ? "pausa" : "focus"} — Fioritura`;
      }
    }

    if (dom.statusPill) {
      dom.statusPill.classList.remove("is-running", "is-paused", "is-done");
      if (state.running) dom.statusPill.classList.add("is-running");
      else if (isDone) dom.statusPill.classList.add("is-done");
      else if (isPaused) dom.statusPill.classList.add("is-paused");
    }

    if (dom.statusText) {
      dom.statusText.textContent = state.running
        ? "In corso"
        : isDone
        ? "Completata"
        : isPaused
        ? "In pausa"
        : "Pronto";
    }

    if (dom.startBtn) dom.startBtn.classList.toggle("is-running", state.running);

    if (dom.startLabel) {
      dom.startLabel.textContent = state.running
        ? "Pausa"
        : isDone
        ? "Ricomincia"
        : isPaused
        ? "Riprendi"
        : "Inizia";
    }

    if (dom.dialLabel) {
      dom.dialLabel.textContent = isDone
        ? "sessione conclusa"
        : state.running
        ? "tempo rimanente"
        : isPaused
        ? "in pausa"
        : "tempo rimanente";
    }

    if (dom.sessionLabel) {
      dom.sessionLabel.textContent = isDone
        ? "Sessione completata"
        : `Sessione ${stats.sessions + 1}`;
    }

    if (dom.xpPreview) {
      const minutes = state.duration / 60;
      const result = computeXp(minutes, prospectiveStreak());
      if (result.total > 0) {
        dom.xpPreview.textContent = isDone ? "XP accreditati" : `≈ +${formatNumber(result.total)} XP`;
        dom.xpPreview.classList.remove("is-zero");
        dom.xpPreview.title = `Base ${formatNumber(result.baseXp)} XP${
          result.longBonus ? " · bonus sessione lunga +" + formatNumber(result.longBonus) : ""
        }${result.streakBonus ? " · bonus serie +" + formatNumber(result.streakBonus) : ""}`;
      } else {
        dom.xpPreview.textContent = "sotto i 5 min · nessun XP";
        dom.xpPreview.classList.add("is-zero");
        dom.xpPreview.removeAttribute("title");
      }
    }
  }

  async function toggleTimer() {
    if (state.running) {
      pauseTimer();
      return;
    }

    if (state.remaining <= 0.05) {
      state.remaining = state.duration;
    }

    state.running = true;
    state.endAt = Date.now() + state.remaining * 1000;
    state.finishing = false;
    state.lastShown = null;
    saveTimer();
    startLoops();
    paintTimer();
    announce(`Timer avviato. ${formatMinutes(state.duration / 60)} di presenza.`);

    try {
      await FiorituraAudio.ensure();
      if (settings.musicAutostart && !externalPlaying && settings.track && !FiorituraAudio.isPlaying) {
        await FiorituraAudio.play(settings.track);
      }
    } catch (error) {
      console.warn("Audio non avviato:", error);
    }
  }

  function pauseTimer() {
    const ms = state.endAt - Date.now();
    state.remaining = Math.max(0, ms / 1000);
    if (state.remaining <= 0.05) {
      finishSession();
      return;
    }
    state.running = false;
    stopLoops();
    saveTimer();
    paintTimer();
    document.title = BASE_TITLE;
    announce("Timer in pausa.");
  }

  function resetTimer(options = {}) {
    stopLoops();
    state.running = false;
    state.finishing = false;
    state.remaining = state.duration;
    state.lastShown = null;
    removeKey(KEYS.timer);
    document.title = BASE_TITLE;
    paintTimer();
    if (!options.silent) announce("Timer azzerato.");
  }

  function setDuration(seconds, options = {}) {
    const value = clamp(Math.round(seconds), MIN_DURATION, MAX_DURATION);
    stopLoops();
    state.running = false;
    state.finishing = false;
    state.duration = value;
    state.remaining = value;
    state.lastShown = null;
    settings.duration = value;
    saveSettings();
    removeKey(KEYS.timer);
    document.title = BASE_TITLE;
    paintTimer();
    syncCustomInputs();
    markPreset();
    if (dom.settingsDuration && document.activeElement !== dom.settingsDuration) {
      dom.settingsDuration.value = String(Math.max(1, Math.round(value / 60)));
    }
    if (!options.silent) {
      announce(`Timer impostato su ${formatMinutes(value / 60)}.`);
    }
  }

  function addFiveMinutes() {
    if (state.remaining <= 0.05 && !state.running) {
      setDuration(5 * 60);
      resetAfterDone();
      showToast("Pronta una sessione di 5 minuti.");
      return;
    }

    if (state.duration >= MAX_DURATION) {
      showToast("Il massimo è di 180 minuti.");
      return;
    }

    state.duration = Math.min(MAX_DURATION, state.duration + 300);
    state.remaining = Math.min(state.duration, state.remaining + 300);
    if (state.running) state.endAt += 300 * 1000;
    settings.duration = state.duration;
    saveSettings();
    if (state.running) saveTimer();
    paintTimer();
    syncCustomInputs();
    markPreset();
    if (dom.settingsDuration && document.activeElement !== dom.settingsDuration) {
      dom.settingsDuration.value = String(Math.max(1, Math.round(state.duration / 60)));
    }
    showToast("Cinque minuti in più. Respira.");
  }

  function syncCustomInputs() {
    if (!dom.customMinutes || !dom.customSeconds) return;
    if (document.activeElement === dom.customMinutes || document.activeElement === dom.customSeconds) {
      return;
    }
    dom.customMinutes.value = String(Math.floor(state.duration / 60));
    dom.customSeconds.value = String(state.duration % 60);
  }

  function markPreset() {
    if (!dom.presets) return;
    $$(".preset", dom.presets).forEach((button) => {
      const minutes = Number(button.dataset.minutes);
      button.classList.toggle("is-active", minutes * 60 === state.duration);
    });
  }

  function resetAfterDone() {
    if (!state.running && state.remaining <= 0.05) {
      state.remaining = state.duration;
      state.finishing = false;
      state.lastShown = null;
      removeKey(KEYS.timer);
      document.title = BASE_TITLE;
      paintTimer();
    }
  }

  function finishSession() {
    if (state.finishing) return;
    state.finishing = true;

    state.running = false;
    state.remaining = 0;
    stopLoops();
    removeKey(KEYS.timer);
    document.title = "Sessione completata — Fioritura";
    paintTimer();

    const outcome = awardSession(state.duration, Date.now());
    if (settings.chime) {
      try {
        FiorituraAudio.chime();
      } catch (error) {
        /* l'audio potrebbe non essere disponibile */
      }
    }
    notifyCompletion(outcome);
    announce(
      outcome.result.total > 0
        ? `Sessione completata. Hai guadagnato ${outcome.result.total} XP.`
        : "Sessione completata. Nessun XP per le sessioni sotto i cinque minuti."
    );

    state.finishing = false;
  }

  function awardSession(seconds, timestamp) {
    const minutes = Math.max(0, Math.round((seconds / 60) * 100) / 100);
    const streakDays = prospectiveStreak();
    const result = computeXp(minutes, streakDays);

    stats.totalXp += result.total;
    stats.sessions += 1;
    stats.minutes = Math.round((stats.minutes + minutes) * 100) / 100;
    stats.history.push({ ts: timestamp, minutes, xp: result.total });
    if (stats.history.length > 400) stats.history.splice(0, stats.history.length - 400);
    saveStats();

    let addPromise = null;
    if (result.total > 0) {
      if (profile) {
        addPromise = window.FiorituraLeaderboard.addSession({
          username: profile.username,
          country: profile.country,
          xp: result.total,
          minutes,
          ts: timestamp
        });
      } else {
        pendingSessions.push({ ts: timestamp, minutes, xp: result.total });
        savePending();
      }
    }

    renderStats();
    renderLeaderboard();
    showDone({ minutes, result, streakDays, addPromise });
    return { minutes, result, addPromise };
  }

  function notifyCompletion(outcome) {
    if (!settings.notify) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    if (!document.hidden) return;
    try {
      const body =
        outcome.result.total > 0
          ? `+${formatNumber(outcome.result.total)} XP · ${formatMinutes(outcome.minutes)} di presenza.`
          : "Respira. Il tempo è tuo.";
      new Notification("Sessione completata · Fioritura", {
        body,
        icon: "assets/favicon.svg",
        tag: "fioritura-timer"
      });
    } catch (error) {
      /* noop */
    }
  }

  /* ---------- completamento ---------- */

  function showDone({ minutes, result, streakDays, addPromise }) {
    if (!dom.doneModal) return;
    state.doneToken += 1;
    const token = state.doneToken;

    dom.doneXp.textContent = `+${formatNumber(result.total)}`;
    dom.doneSub.textContent = `${formatMinutes(minutes)} di presenza.`;

    dom.doneBreakdown.innerHTML = "";
    if (result.eligible) {
      dom.doneBreakdown.appendChild(
        breakdownRow(
          `Minuti di presenza · ${formatMinutes(minutes)}`,
          `+${formatNumber(result.baseXp)} XP`
        )
      );
      if (result.longBonus > 0) {
        const percent = Math.round(result.longMult * 100);
        dom.doneBreakdown.appendChild(
          breakdownRow(`Bonus sessione lunga · +${percent}%`, `+${formatNumber(result.longBonus)} XP`)
        );
      }
      if (result.streakBonus > 0) {
        dom.doneBreakdown.appendChild(
          breakdownRow(
            `Bonus serie · ${streakDays} giorni di fila`,
            `+${formatNumber(result.streakBonus)} XP`
          )
        );
      }
      const totalRow = breakdownRow("Totale", `+${formatNumber(result.total)} XP`);
      totalRow.classList.add("is-total");
      dom.doneBreakdown.appendChild(totalRow);
    } else {
      dom.doneBreakdown.appendChild(breakdownRow("Sessione sotto i 5 minuti", "0 XP"));
      dom.doneBreakdown.appendChild(breakdownRow("Il tempo per te conta comunque", "respira"));
    }

    dom.doneProfile.hidden = Boolean(profile) || result.total <= 0;

    if (profile && result.total > 0) {
      if (addPromise) {
        dom.doneFoot.textContent =
          window.FiorituraLeaderboard.getMode() === "server"
            ? "Salvo il punteggio in classifica…"
            : "Il tuo punteggio è in classifica.";
        dom.doneFoot.classList.remove("is-warning");
        addPromise
          .then((response) => {
            if (state.doneToken !== token) return;
            if (response && response.ok) {
              dom.doneFoot.textContent =
                response.mode === "server"
                  ? "Punteggio salvato nella classifica condivisa."
                  : "Il tuo punteggio è in classifica.";
              dom.doneFoot.classList.remove("is-warning");
            } else {
              dom.doneFoot.textContent =
                "Classifica non raggiungibile: sincronizzerò il punteggio appena possibile.";
              dom.doneFoot.classList.add("is-warning");
            }
            renderLeaderboard();
          })
          .catch(() => {
            if (state.doneToken !== token) return;
            dom.doneFoot.textContent =
              "Classifica non raggiungibile: sincronizzerò il punteggio appena possibile.";
            dom.doneFoot.classList.add("is-warning");
          });
      } else {
        dom.doneFoot.textContent = "Il tuo punteggio è in classifica.";
        dom.doneFoot.classList.remove("is-warning");
      }
    } else if (!profile && result.total > 0) {
      dom.doneFoot.textContent = "Crea il tuo profilo per salvare questi XP in classifica.";
      dom.doneFoot.classList.remove("is-warning");
    } else if (result.total === 0) {
      dom.doneFoot.textContent = "Le sessioni sotto i 5 minuti non danno XP. Ma il tempo per te conta.";
      dom.doneFoot.classList.remove("is-warning");
    } else {
      dom.doneFoot.textContent = "Il tuo punteggio è in classifica.";
      dom.doneFoot.classList.remove("is-warning");
    }

    spawnPetals();
    openModal("doneModal", "#doneBreak");
  }

  function breakdownRow(label, value) {
    const item = document.createElement("li");
    const text = document.createElement("span");
    text.textContent = label;
    const strong = document.createElement("strong");
    strong.textContent = value;
    item.appendChild(text);
    item.appendChild(strong);
    return item;
  }

  function spawnPetals() {
    if (!dom.petals) return;
    dom.petals.innerHTML = "";
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colors = ["#ffd3ad", "#ff9fb6", "#c3aaff", "#a9e8d1"];
    for (let index = 0; index < 18; index += 1) {
      const petal = document.createElement("span");
      petal.className = "petal";
      petal.style.setProperty("--x", `${Math.random() * 100}%`);
      petal.style.setProperty("--s", `${5 + Math.random() * 7}px`);
      petal.style.setProperty("--c", colors[index % colors.length]);
      petal.style.setProperty("--d", `${2.8 + Math.random() * 2.4}s`);
      petal.style.setProperty("--delay", `${Math.random() * 0.9}s`);
      petal.style.setProperty("--drift", `${-40 + Math.random() * 80}px`);
      dom.petals.appendChild(petal);
    }
  }

  /* ---------- statistiche ---------- */

  function renderStats() {
    const info = levelInfo(stats.totalXp);
    const streak = computeStreak(stats.history);

    if (dom.heroLevel) dom.heroLevel.textContent = `${info.level} · ${info.title}`;
    if (dom.heroXp) dom.heroXp.textContent = formatNumber(stats.totalXp);
    if (dom.heroStreak) {
      dom.heroStreak.textContent = `${streak} ${streak === 1 ? "giorno" : "giorni"}`;
    }

    if (dom.levelTitle) dom.levelTitle.textContent = `Livello ${info.level} · ${info.title}`;
    if (dom.levelBadge) dom.levelBadge.textContent = `Lv ${info.level}`;
    if (dom.levelBar) dom.levelBar.style.width = `${(info.progress / XP_PER_LEVEL) * 100}%`;
    if (dom.levelProgress) {
      dom.levelProgress.setAttribute("aria-valuenow", String(info.progress));
      dom.levelProgress.setAttribute("aria-valuetext", `${info.progress} XP su ${XP_PER_LEVEL}`);
    }
    if (dom.levelHint) {
      if (info.remaining === XP_PER_LEVEL) {
        dom.levelHint.textContent = `${XP_PER_LEVEL} XP per il livello ${info.level + 1}${
          info.nextTitle ? " · " + info.nextTitle : ""
        }.`;
      } else {
        dom.levelHint.textContent = `Ti mancano ${formatNumber(info.remaining)} XP per il livello ${
          info.level + 1
        }${info.nextTitle ? " · " + info.nextTitle : ""}.`;
      }
    }

    if (dom.statXp) dom.statXp.textContent = formatNumber(stats.totalXp);
    if (dom.statMinutes) dom.statMinutes.textContent = formatNumber(stats.minutes);
    if (dom.statSessions) dom.statSessions.textContent = formatNumber(stats.sessions);

    renderTree();

    if (dom.recentList) {
      dom.recentList.innerHTML = "";
      const recent = stats.history.slice(-3).reverse();
      if (!recent.length) {
        const empty = document.createElement("li");
        empty.className = "recent__empty";
        empty.textContent = "Il tuo albero è pronto. La prima sessione lo farà germogliare.";
        dom.recentList.appendChild(empty);
      } else {
        recent.forEach((item) => {
          const row = document.createElement("li");
          row.className = "recent__item";
          const when = document.createElement("span");
          when.className = "recent__when";
          when.textContent = `${formatWhen(item.ts)} · ${formatMinutes(item.minutes)}`;
          const xp = document.createElement("span");
          xp.className = "recent__xp";
          xp.textContent = `+${formatNumber(item.xp)} XP`;
          row.appendChild(when);
          row.appendChild(xp);
          dom.recentList.appendChild(row);
        });
      }
    }

    if (dom.shopModal && !dom.shopModal.hidden) renderShop();
    paintTimer();
  }

  /* ---------- profilo ---------- */

  function renderProfileUI() {
    if (!dom.profileButton) return;
    const compact = window.matchMedia("(max-width: 560px)").matches;
    const cosmetics = ownCosmetics();
    if (profile) {
      const country = countryInfo(profile.country);
      const shortName =
        profile.username.length > 14 ? `${profile.username.slice(0, 13)}…` : profile.username;
      if (dom.profileLabel) dom.profileLabel.textContent = `${country.flag} ${shortName}`;
      dom.profileButton.title = `Profilo di ${profile.username} · ${country.name}${
        cosmetics.badge ? ` · ${cosmetics.badge.name}` : ""
      }`;
      dom.profileButton.setAttribute("aria-label", `Apri le impostazioni del profilo di ${profile.username}`);
      if (dom.topAvatar) {
        dom.topAvatar.hidden = false;
        paintAvatar(dom.topAvatar, profile.username, profile.avatar, cosmetics);
      }
    } else {
      if (dom.profileLabel) dom.profileLabel.textContent = compact ? "Profilo" : "Entra in classifica";
      dom.profileButton.title = "Crea il tuo profilo per la classifica";
      dom.profileButton.setAttribute("aria-label", "Entra in classifica");
      if (dom.topAvatar) {
        dom.topAvatar.hidden = true;
        dom.topAvatar.innerHTML = "";
      }
    }

    if (dom.saveScoreButton) {
      dom.saveScoreButton.textContent = profile ? "Modifica profilo" : "Crea il tuo profilo";
    }

    renderSettingsProfile();
  }

  function renderSettingsProfile() {
    if (!dom.settingsProfileName) return;
    const cosmetics = ownCosmetics();
    dom.settingsProfileName.textContent = profile ? profile.username : "Il tuo profilo";
    paintAvatar(
      dom.avatarPreview,
      profile ? profile.username : "Fioritura",
      draftAvatar,
      cosmetics
    );

    if (dom.settingsProfileBadge) {
      dom.settingsProfileBadge.hidden = !cosmetics.badge;
      dom.settingsProfileBadge.textContent = cosmetics.badge ? cosmetics.badge.name : "";
      dom.settingsProfileBadge.className = cosmetics.badge ? badgeClass(cosmetics.badge) : "lb-badge";
    }

    if (profile) {
      const country = countryInfo(profile.country);
      const info = levelInfo(stats.totalXp);
      const available =
        shop.spentXp > 0 ? ` · ${formatNumber(availableXp())} XP disponibili` : "";
      dom.settingsProfileMeta.textContent = `${country.flag} ${country.name} · Livello ${info.level} · ${info.title} · ${formatNumber(stats.totalXp)} XP${available}`;
    } else {
      dom.settingsProfileMeta.textContent =
        "Scegli un nome e un paese per entrare in classifica.";
    }
    if (dom.avatarRemove) dom.avatarRemove.disabled = !draftAvatar;
  }

  function syncThemeGrid() {
    if (!dom.themeGrid) return;
    $$(".swatch", dom.themeGrid).forEach((button) => {
      button.setAttribute("aria-checked", String(button.dataset.theme === settings.theme));
    });
  }

  function syncAppearanceControls() {
    if (dom.particleToggle) dom.particleToggle.checked = settings.particles;
    if (dom.motionToggle) dom.motionToggle.checked = settings.reduceMotion;

    if (dom.atmosphere) {
      if (document.activeElement !== dom.atmosphere) {
        dom.atmosphere.value = String(settings.atmosphere);
      }
      dom.atmosphere.style.setProperty("--fill", `${settings.atmosphere}%`);
      if (dom.atmosphereValue) dom.atmosphereValue.textContent = `${settings.atmosphere}%`;
    }

    $$("#scaleChoice button").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.scale === settings.scale));
    });

    if (dom.customBgRemove) dom.customBgRemove.disabled = !customBackground;
    if (dom.customBgHint) {
      dom.customBgHint.hidden = !customBackground;
      dom.customBgHint.textContent = customBackground
        ? "Sfondo personale attivo. Resta salvato su questo dispositivo."
        : "";
    }
    if (dom.avatarRemove) dom.avatarRemove.disabled = !draftAvatar;
  }

  function syncVolumeUI() {
    const percent = Math.round(settings.volume * 100);
    if (dom.volume) {
      dom.volume.value = String(percent);
      dom.volume.style.setProperty("--fill", `${percent}%`);
    }
    if (dom.volumeValue) dom.volumeValue.textContent = `${percent}%`;
    if (dom.settingsVolume) {
      if (document.activeElement !== dom.settingsVolume) {
        dom.settingsVolume.value = String(percent);
      }
      dom.settingsVolume.style.setProperty("--fill", `${percent}%`);
    }
    if (dom.settingsVolumeValue) dom.settingsVolumeValue.textContent = `${percent}%`;
  }

  function syncTimerControls() {
    if (dom.settingsDuration && document.activeElement !== dom.settingsDuration) {
      dom.settingsDuration.value = String(Math.max(1, Math.round(state.duration / 60)));
    }
    if (dom.settingsMusic) dom.settingsMusic.checked = settings.musicAutostart;
    if (dom.settingsNotify) dom.settingsNotify.checked = settings.notify;
    if (dom.settingsChime) dom.settingsChime.checked = settings.chime;
    syncVolumeUI();
  }

  function setVolume(value, options = {}) {
    settings.volume = clamp(Number(value) || 0, 0, 1);
    if (options.save !== false) saveSettings();
    try {
      window.FiorituraAudio.setVolume(settings.volume);
    } catch (error) {
      /* noop */
    }
    syncVolumeUI();
  }

  function setMusicAutostart(enabled) {
    settings.musicAutostart = Boolean(enabled);
    saveSettings();
    if (dom.prefMusic) dom.prefMusic.checked = settings.musicAutostart;
    if (dom.settingsMusic) dom.settingsMusic.checked = settings.musicAutostart;
  }

  async function setNotifyEnabled(enabled) {
    const boxes = [dom.prefNotify, dom.settingsNotify].filter(Boolean);

    if (!enabled) {
      settings.notify = false;
      saveSettings();
      boxes.forEach((box) => {
        box.checked = false;
      });
      return;
    }

    if (!("Notification" in window)) {
      settings.notify = false;
      saveSettings();
      boxes.forEach((box) => {
        box.checked = false;
      });
      showToast("Questo browser non supporta le notifiche.");
      return;
    }

    if (Notification.permission === "denied") {
      settings.notify = false;
      saveSettings();
      boxes.forEach((box) => {
        box.checked = false;
      });
      showToast("Le notifiche sono bloccate nelle impostazioni del browser.");
      return;
    }

    let permission = Notification.permission;
    if (permission !== "granted") {
      permission = await Notification.requestPermission();
    }

    settings.notify = permission === "granted";
    saveSettings();
    boxes.forEach((box) => {
      box.checked = settings.notify;
    });
    showToast(
      settings.notify
        ? "Ti avviserò quando la sessione finisce."
        : "Nessun problema: il timer funziona comunque."
    );
  }

  function updatePendingNote() {
    if (!dom.profilePending) return;
    const total = pendingSessions.reduce((sum, item) => sum + (Number(item.xp) || 0), 0);
    if (total > 0 && !profile) {
      dom.profilePending.hidden = false;
      dom.profilePending.textContent = `Hai ${formatNumber(total)} XP in attesa: salvali creando il tuo profilo.`;
    } else if (total > 0 && profile) {
      dom.profilePending.hidden = false;
      dom.profilePending.textContent = `${formatNumber(total)} XP ancora da sincronizzare.`;
    } else {
      dom.profilePending.hidden = true;
      dom.profilePending.textContent = "";
    }
  }

  function populateProfileForm() {
    if (!dom.nameInput) return;
    dom.nameInput.value = profile ? profile.username : "";
    dom.nameInput.classList.remove("is-invalid");
    dom.profileHint.textContent = DEFAULT_PROFILE_HINT;
    dom.profileHint.style.color = "";
    setCountry(profile ? profile.country : dom.countryCode.value || "IT");
    updatePendingNote();
    closeCountryPopover();
    renderSettingsProfile();
  }

  /* ---------- impostazioni ---------- */

  function openSettings(panel) {
    if (!dom.settingsModal) return;
    const wasClosed = dom.settingsModal.hidden;
    if (wasClosed) draftAvatar = profile ? profile.avatar || "" : "";

    if (panel) settingsPanel = panel;
    if (!["profilo", "aspetto", "timer", "dati"].includes(settingsPanel)) {
      settingsPanel = "aspetto";
    }
    settings.settingsPanel = settingsPanel;
    saveSettings();

    syncTimerControls();
    syncAppearanceControls();
    switchSettingsPanel(settingsPanel);
    openModal(
      "settingsModal",
      settingsPanel === "profilo" ? "#nameInput" : '.settings__tab[aria-selected="true"]'
    );
  }

  function switchSettingsPanel(panel) {
    if (!dom.settingsModal) return;
    settingsPanel = panel;
    $$(".settings__tab", dom.settingsModal).forEach((tab) => {
      const active = tab.dataset.panel === panel;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    $$(".settings__panel", dom.settingsModal).forEach((section) => {
      section.hidden = section.dataset.panel !== panel;
    });

    if (panel === "profilo") populateProfileForm();
    if (panel === "aspetto") syncAppearanceControls();
    if (panel === "timer") syncTimerControls();
  }

  function setTheme(theme) {
    if (!THEMES.includes(theme)) return;
    settings.theme = theme;
    saveSettings();
    applyAppearance();
    showToast(`Sfondo: ${theme === "aurora" ? "Aurora" : theme.charAt(0).toUpperCase() + theme.slice(1)}.`);
  }

  function setScale(scale) {
    if (!SCALES.includes(scale)) return;
    settings.scale = scale;
    saveSettings();
    applyAppearance();
  }

  function setAtmosphere(value) {
    settings.atmosphere = clamp(Math.round(Number(value) || 0), 10, 100);
    saveSettings();
    applyAppearance();
  }

  function setParticles(enabled) {
    settings.particles = Boolean(enabled);
    saveSettings();
    applyAppearance();
  }

  function setReduceMotion(enabled) {
    settings.reduceMotion = Boolean(enabled);
    saveSettings();
    applyAppearance();
  }

  /* ---------- caricamento immagini ---------- */

  function loadImageFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Immagine non leggibile"));
      };
      image.src = url;
    });
  }

  function avatarDataUrl(image) {
    const size = Math.min(image.width, image.height);
    const sourceX = (image.width - size) / 2;
    const sourceY = (image.height - size) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    context.fillStyle = "#12121e";
    context.fillRect(0, 0, 256, 256);
    context.drawImage(image, sourceX, sourceY, size, size, 0, 0, 256, 256);
    return canvas.toDataURL("image/jpeg", 0.86);
  }

  function backgroundDataUrl(image) {
    const max = 1920;
    const ratio = Math.min(1, max / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * ratio));
    const height = Math.max(1, Math.round(image.height * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.78);
  }

  async function handleAvatarFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Scegli un file immagine.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showToast("La foto è troppo pesante: scegline una sotto gli 8 MB.");
      return;
    }
    try {
      const image = await loadImageFile(file);
      const dataUrl = avatarDataUrl(image);
      if (dataUrl.length > 400000) {
        showToast("Non riesco a rendere la foto abbastanza leggera.");
        return;
      }
      draftAvatar = dataUrl;
      renderSettingsProfile();
      showToast(profile ? "Foto pronta. Salva per aggiornarla." : "Foto pronta. Scegli un nome e salva.");
    } catch (error) {
      showToast("Non riesco a leggere questa immagine.");
    }
  }

  async function handleBackgroundFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Scegli un file immagine.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      showToast("L'immagine è troppo pesante: scegline una sotto i 15 MB.");
      return;
    }
    try {
      const image = await loadImageFile(file);
      const dataUrl = backgroundDataUrl(image);
      if (dataUrl.length > 2600000) {
        showToast("Non c'è abbastanza spazio per questa immagine. Provane una più leggera.");
        return;
      }
      const previous = customBackground;
      customBackground = dataUrl;
      if (!saveBackground()) {
        customBackground = previous;
        saveBackground();
        showToast("Spazio esaurito: prova con un'immagine più leggera.");
        return;
      }
      applyAppearance();
      showToast("Sfondo personale applicato.");
    } catch (error) {
      showToast("Non riesco a leggere questa immagine.");
    }
  }

  function removeAvatar() {
    draftAvatar = "";
    if (profile && profile.avatar) {
      profile.avatar = "";
      saveProfile();
    }
    renderSettingsProfile();
    renderProfileUI();
    renderLeaderboard();
    showToast("Foto rimossa.");
  }

  function removeBackground() {
    customBackground = "";
    saveBackground();
    applyAppearance();
    showToast("Sfondo personale rimosso.");
  }

  /* ---------- negozio ---------- */

  function refreshCosmetics() {
    applyAccent();
    renderProfileUI();
    renderLeaderboard();
  }

  function openShop() {
    renderShop();
    syncShopState({ silent: true });
    openModal("shopModal", "#shopFilters button");
  }

  function setShopFilter(filter) {
    shopFilter = SHOP_FILTERS[filter] ? filter : "all";
    $$("#shopFilters button").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.filter === shopFilter));
    });
    renderShopGrid();
  }

  function renderShop() {
    if (!dom.shopBalance) return;
    dom.shopBalance.textContent = `${formatNumber(availableXp())} XP`;
    dom.shopTotal.textContent = `${formatNumber(stats.totalXp)} XP`;
    dom.shopOwned.textContent = `${shop.owned.length} / ${SHOP_ITEMS.length}`;
    if (dom.shopFoot) {
      dom.shopFoot.textContent = profile
        ? "Gli XP spesi non escono dalla classifica: il tuo punteggio resta quello guadagnato."
        : "Gli oggetti si possono comprare anche senza profilo. Crea un profilo per mostrarli in classifica.";
    }
    $$("#shopFilters button").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.filter === shopFilter));
    });
    renderShopGrid();
  }

  function buildShopCard(item) {
    const owned = shop.owned.includes(item.id);
    const equipped = shop.equipped[item.type] === item.id;
    const active = item.active !== false;
    const card = document.createElement("article");
    card.className = `shop-item shop-item--${item.rarity.toLocaleLowerCase("it")}${
      active ? "" : " is-inactive"
    }`;

    const rarity = document.createElement("span");
    rarity.className = "shop-item__rarity";
    rarity.textContent = item.rarity;
    card.appendChild(rarity);

    const preview = document.createElement("div");
    preview.className = "shop-item__preview";
    if (item.type === "frame") {
      const avatar = document.createElement("span");
      avatar.className = `avatar avatar--shop avatar--${item.id}`;
      avatar.textContent = initialFor(profile ? profile.username : "Fioritura");
      preview.appendChild(avatar);
    } else if (item.type === "badge") {
      const badge = document.createElement("span");
      badge.className = badgeClass(item);
      badge.textContent = item.name;
      preview.appendChild(badge);
    } else {
      const dot = document.createElement("span");
      dot.className = "shop-item__accent";
      dot.style.background = item.color;
      dot.style.boxShadow = `0 0 0 6px ${item.glow}, 0 0 30px ${item.glow}`;
      preview.appendChild(dot);
    }
    card.appendChild(preview);

    const name = document.createElement("h3");
    name.textContent = item.name;
    card.appendChild(name);

    const desc = document.createElement("p");
    desc.textContent = item.desc;
    card.appendChild(desc);

    const foot = document.createElement("div");
    foot.className = "shop-item__foot";

    const price = document.createElement("span");
    price.className = "shop-item__price";
    if (owned) {
      price.textContent = "Nel guardaroba";
      if (!active) {
        const tag = document.createElement("span");
        tag.className = "shop-item__tag";
        tag.textContent = "Ritirato";
        price.appendChild(tag);
      }
    } else if (!active) {
      price.textContent = "Non in vendita";
    } else {
      price.textContent = `${formatNumber(item.price)} XP`;
    }
    foot.appendChild(price);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn--sm";

    if (owned) {
      button.className += equipped ? " btn--ghost" : " btn--soft";
      button.textContent = equipped ? "Rimuovi" : "Equipaggia";
      button.addEventListener("click", () => equipShopItem(item.id));
    } else if (!active) {
      button.className += " btn--ghost";
      button.textContent = "Ritirato";
      button.disabled = true;
    } else {
      const canBuy = availableXp() >= item.price;
      button.className += canBuy ? " btn--soft" : " btn--ghost";
      button.textContent = canBuy ? "Acquista" : `Ti servono ${formatNumber(item.price - availableXp())} XP`;
      button.disabled = !canBuy;
      button.addEventListener("click", () => buyShopItem(item.id));
    }

    foot.appendChild(button);
    card.appendChild(foot);
    return card;
  }

  function renderShopGrid() {
    if (!dom.shopGrid) return;
    dom.shopGrid.innerHTML = "";
    const items = SHOP_ITEMS.map((item) => effectiveItem(item))
      .filter((item) => shopFilter === "all" || item.type === shopFilter)
      .filter((item) => item.active !== false || shop.owned.includes(item.id));
    items.forEach((item) => dom.shopGrid.appendChild(buildShopCard(item)));
  }

  function buyShopItem(id) {
    const item = shopItem(id);
    if (!item || shop.owned.includes(id)) return;
    if (item.active === false) {
      showToast(`${item.name} non è più disponibile nel negozio.`);
      return;
    }
    if (availableXp() < item.price) {
      showToast(`Ti mancano ${formatNumber(item.price - availableXp())} XP per ${item.name}.`);
      return;
    }
    const previousUpdatedAt = shop.updatedAt;
    shop.spentXp += item.price;
    shop.owned.push(id);
    shop.equipped[item.type] = id;
    touchShop();
    if (!saveShop()) {
      shop.spentXp -= item.price;
      shop.owned = shop.owned.filter((ownedId) => ownedId !== id);
      shop.equipped[item.type] = null;
      shop.updatedAt = previousUpdatedAt;
      showToast("Non riesco a salvare l'acquisto su questo dispositivo.");
      return;
    }
    refreshCosmetics();
    renderShop();
    pushShopState({ silent: true });
    showToast(`${item.name} è tuo. Equipaggiato sul profilo.`);
  }

  function equipShopItem(id) {
    const item = shopItem(id);
    if (!item || !shop.owned.includes(id)) return;
    const removing = shop.equipped[item.type] === id;
    shop.equipped[item.type] = removing ? null : id;
    touchShop();
    saveShop();
    refreshCosmetics();
    renderShop();
    pushShopState({ silent: true });
    showToast(removing ? `${item.name} rimosso.` : `${item.name} equipaggiato.`);
  }

  /* ---------- musica collegata ---------- */

  function parseMusicLink(raw, source) {
    const value = String(raw || "").trim();
    if (!value) throw new Error("Incolla il link della playlist.");

    let url;
    try {
      url = new URL(value);
    } catch (error) {
      throw new Error("Questo non sembra un link valido.");
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("Servono un link https:// di Spotify o YouTube.");
    }

    const host = url.hostname.replace(/^www\./i, "").toLocaleLowerCase("it");

    if (source === "spotify") {
      if (host !== "open.spotify.com") {
        throw new Error("Usa un link di open.spotify.com.");
      }
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] && /^intl-/i.test(parts[0])) parts.shift();
      const kind = parts[0];
      const id = parts[1];
      if (
        !["playlist", "album", "track", "artist", "episode", "show"].includes(kind) ||
        !/^[A-Za-z0-9]+$/.test(id || "")
      ) {
        throw new Error("Il link Spotify non contiene una playlist, un album o un brano.");
      }
      return {
        url: `https://open.spotify.com/${kind}/${id}`,
        embed: `https://open.spotify.com/embed/${kind}/${id}`,
        kind
      };
    }

    if (source === "youtube") {
      if (!["youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"].includes(host)) {
        throw new Error("Usa un link di youtube.com o youtu.be.");
      }

      let video = "";
      let list = "";
      if (host === "youtu.be") {
        video = url.pathname.split("/").filter(Boolean)[0] || "";
        list = url.searchParams.get("list") || "";
      } else if (url.pathname === "/watch") {
        video = url.searchParams.get("v") || "";
        list = url.searchParams.get("list") || "";
      } else if (url.pathname === "/playlist") {
        list = url.searchParams.get("list") || "";
      } else if (url.pathname.startsWith("/embed/")) {
        video = url.pathname.split("/").filter(Boolean)[1] || "";
        list = url.searchParams.get("list") || "";
      }

      if (video && !/^[A-Za-z0-9_-]{6,}$/.test(video)) video = "";
      if (list && !/^[A-Za-z0-9_-]+$/.test(list)) list = "";
      if (!video && !list) {
        throw new Error("Il link YouTube non contiene un video o una playlist.");
      }

      if (list && !video) {
        return {
          url: `https://www.youtube.com/playlist?list=${list}`,
          embed: `https://www.youtube.com/embed/videoseries?list=${list}`,
          kind: "playlist"
        };
      }
      if (list) {
        return {
          url: `https://www.youtube.com/watch?v=${video}&list=${list}`,
          embed: `https://www.youtube.com/embed/${video}?list=${list}`,
          kind: "playlist"
        };
      }
      return {
        url: `https://www.youtube.com/watch?v=${video}`,
        embed: `https://www.youtube.com/embed/${video}`,
        kind: "video"
      };
    }

    throw new Error("Servizio non supportato.");
  }

  function openMusicModal(source) {
    musicSource = source === "youtube" ? "youtube" : "spotify";
    stopEmbeddedMusic();
    const entry = music[musicSource];
    if (dom.musicUrl) {
      dom.musicUrl.value = entry ? entry.url : "";
      dom.musicUrl.classList.remove("is-invalid");
    }
    if (dom.musicName) dom.musicName.value = entry ? entry.name : "";
    if (dom.musicHint) {
      dom.musicHint.textContent = "";
      dom.musicHint.style.color = "";
    }
    syncMusicUI();
    openModal("musicModal", "#musicUrl");
  }

  function switchMusicSource(source) {
    musicSource = source === "youtube" ? "youtube" : "spotify";
    stopEmbeddedMusic();
    const entry = music[musicSource];
    if (dom.musicUrl) {
      dom.musicUrl.value = entry ? entry.url : "";
      dom.musicUrl.classList.remove("is-invalid");
    }
    if (dom.musicName) dom.musicName.value = entry ? entry.name : "";
    if (dom.musicHint) {
      dom.musicHint.textContent = "";
      dom.musicHint.style.color = "";
    }
    syncMusicUI();
  }

  function syncMusicUI() {
    ["spotify", "youtube"].forEach((source) => {
      const entry = music[source];
      const button = source === "spotify" ? dom.sourceSpotify : dom.sourceYoutube;
      const stateEl = source === "spotify" ? dom.sourceSpotifyState : dom.sourceYoutubeState;
      if (button) button.classList.toggle("is-linked", Boolean(entry));
      if (stateEl) {
        stateEl.textContent = entry
          ? externalPlaying && musicSource === source
            ? "In ascolto"
            : entry.name
          : "Non collegato";
      }
    });

    $$("#musicTabs button").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.source === musicSource));
    });

    const spotify = musicSource === "spotify";
    if (dom.musicUrl) {
      dom.musicUrl.placeholder = spotify
        ? "https://open.spotify.com/playlist/…"
        : "https://www.youtube.com/playlist?list=…";
    }
    if (dom.musicSubmit) {
      const entry = music[musicSource];
      dom.musicSubmit.textContent = entry
        ? `Aggiorna ${spotify ? "Spotify" : "YouTube"}`
        : `Collega ${spotify ? "Spotify" : "YouTube"}`;
    }

    const entry = music[musicSource];
    if (dom.musicCurrent) {
      dom.musicCurrent.hidden = !entry;
      if (entry) {
        if (dom.musicCurrentChip) {
          dom.musicCurrentChip.className = `source-chip source-chip--${musicSource}`;
          dom.musicCurrentChip.textContent = spotify ? "Spotify" : "YouTube";
        }
        if (dom.musicCurrentName) dom.musicCurrentName.textContent = entry.name;
        if (dom.musicCurrentUrl) dom.musicCurrentUrl.textContent = entry.url;
      }
    }

    if (!entry) stopEmbeddedMusic();
  }

  function handleMusicSubmit(event) {
    event.preventDefault();
    const raw = dom.musicUrl ? dom.musicUrl.value : "";
    let parsed;
    try {
      parsed = parseMusicLink(raw, musicSource);
    } catch (error) {
      if (dom.musicHint) {
        dom.musicHint.textContent = error.message;
        dom.musicHint.style.color = "#ffbcc8";
      }
      if (dom.musicUrl) dom.musicUrl.classList.add("is-invalid");
      return;
    }

    const fallbackName = musicSource === "spotify" ? "Playlist Spotify" : "Playlist YouTube";
    const name = (dom.musicName && dom.musicName.value.trim().slice(0, 32)) || fallbackName;
    music[musicSource] = { url: parsed.url, embed: parsed.embed, name };

    if (!saveMusic()) {
      showToast("Non riesco a salvare il link su questo dispositivo.");
      return;
    }

    if (dom.musicUrl) dom.musicUrl.classList.remove("is-invalid");
    if (dom.musicHint) {
      dom.musicHint.textContent = `Collegato: ${name}.`;
      dom.musicHint.style.color = "";
    }
    if (dom.musicName) dom.musicName.value = name;
    syncMusicUI();
    showToast(`${musicSource === "spotify" ? "Spotify" : "YouTube"} collegato.`);
  }

  function playEmbeddedMusic() {
    const entry = music[musicSource];
    if (!entry || !dom.musicFrame) return;
    stopEmbeddedMusic();
    try {
      window.FiorituraAudio.stop();
    } catch (error) {
      /* noop */
    }
    dom.musicFrame.src = entry.embed;
    if (dom.musicEmbed) dom.musicEmbed.hidden = false;
    externalPlaying = true;
    syncMusicUI();
    syncSoundUI();
    showToast(`Player ${musicSource === "spotify" ? "Spotify" : "YouTube"} aperto.`);
  }

  function stopEmbeddedMusic() {
    if (!dom.musicFrame) return;
    const hadPlayer = externalPlaying;
    dom.musicFrame.src = "about:blank";
    if (dom.musicEmbed) dom.musicEmbed.hidden = true;
    externalPlaying = false;
    if (hadPlayer) syncMusicUI();
  }

  function unlinkMusic() {
    const entry = music[musicSource];
    if (!entry) return;
    music[musicSource] = null;
    saveMusic();
    stopEmbeddedMusic();
    if (dom.musicUrl) dom.musicUrl.value = "";
    if (dom.musicName) dom.musicName.value = "";
    if (dom.musicHint) dom.musicHint.textContent = "";
    syncMusicUI();
    showToast(`${musicSource === "spotify" ? "Spotify" : "YouTube"} scollegato.`);
  }

  function openLinkedMusic() {
    const entry = music[musicSource];
    if (!entry) return;
    window.open(entry.url, "_blank", "noopener,noreferrer");
  }

  /* ---------- videochiamate ---------- */

  const CALL_NAME_RE = /^[\p{L}\p{N}_ .'\-]{2,20}$/u;

  function normalizeCallName(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
  }

  function validCallIdentity(value) {
    return (
      value &&
      typeof value === "object" &&
      CALL_NAME_RE.test(normalizeCallName(value.username)) &&
      /^[A-Z]{2}$/.test(String(value.country || "").toUpperCase())
    );
  }

  function loadCallIdentity() {
    const stored = readJSON(KEYS.call, null);
    if (validCallIdentity(stored)) {
      callIdentity = {
        username: normalizeCallName(stored.username),
        country: String(stored.country).toUpperCase()
      };
    } else {
      callIdentity = null;
    }
  }

  function saveCallIdentity() {
    if (!validCallIdentity(callIdentity)) return false;
    return writeJSON(KEYS.call, callIdentity);
  }

  function callSelf() {
    if (profile) return { username: profile.username, country: profile.country };
    if (validCallIdentity(callIdentity)) return { ...callIdentity };
    return null;
  }

  function callKey(identity) {
    if (!identity) return "";
    return `${String(identity.username || "").toLocaleLowerCase("it")}|${String(
      identity.country || ""
    ).toUpperCase()}`;
  }

  function fillCallCountries() {
    if (!dom.callSelfCountry || dom.callSelfCountry.dataset.filled === "1") return;
    const fallback = [
      { code: "IT", name: "Italia", flag: "🇮🇹" },
      { code: "FR", name: "Francia", flag: "🇫🇷" },
      { code: "ES", name: "Spagna", flag: "🇪🇸" },
      { code: "DE", name: "Germania", flag: "🇩🇪" },
      { code: "GB", name: "Regno Unito", flag: "🇬🇧" },
      { code: "US", name: "Stati Uniti", flag: "🇺🇸" }
    ];
    const list =
      window.FiorituraCountries && Array.isArray(window.FiorituraCountries.list)
        ? window.FiorituraCountries.list
        : fallback;
    dom.callSelfCountry.innerHTML = list
      .map((item) => `<option value="${item.code}">${item.flag} ${item.name}</option>`)
      .join("");
    dom.callSelfCountry.dataset.filled = "1";
  }

  function syncCallIdentityUI() {
    fillCallCountries();
    const self = callSelf();
    const fallback = callIdentity || { username: "", country: "IT" };
    if (dom.callSelfName) {
      dom.callSelfName.value = self ? self.username : fallback.username;
      dom.callSelfName.readOnly = Boolean(profile);
      dom.callSelfName.setAttribute(
        "aria-readonly",
        profile ? "true" : "false"
      );
    }
    if (dom.callSelfCountry) {
      dom.callSelfCountry.value = self ? self.country : fallback.country || "IT";
      dom.callSelfCountry.disabled = Boolean(profile);
    }
    if (dom.callSelfHint) {
      dom.callSelfHint.textContent = profile
        ? `Stai chiamando come ${profile.username}. Il nome arriva dal tuo profilo.`
        : "Scrivi il nome che vedrà chi riceve la chiamata. Resta salvato su questo dispositivo.";
    }
  }

  function renderCallTargets() {
    if (!dom.callTarget) return;
    const self = callSelf();
    const selfKey = callKey(self);
    const entries = window.FiorituraLeaderboard
      ? window.FiorituraLeaderboard.getEntries("all")
      : [];
    const options = (Array.isArray(entries) ? entries : []).filter(
      (entry) => entry && callKey(entry) !== selfKey
    );

    dom.callTarget.innerHTML = "";
    if (!options.length) {
      const option = document.createElement("option");
      option.value = "";
      option.disabled = true;
      option.selected = true;
      option.textContent = "Nessun altro utente in classifica";
      dom.callTarget.appendChild(option);
    } else {
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.disabled = true;
      placeholder.selected = true;
      placeholder.textContent = "Scegli una persona…";
      dom.callTarget.appendChild(placeholder);

      options.slice(0, 50).forEach((entry) => {
        const country = countryInfo(entry.country);
        const option = document.createElement("option");
        option.value = `${entry.username}|${entry.country}`;
        option.textContent = `${country.flag} ${entry.username} · ${formatNumber(entry.xp)} XP`;
        dom.callTarget.appendChild(option);
      });
    }

    const serverReady = window.FiorituraLeaderboard.getMode() === "server";
    if (dom.callStart) {
      dom.callStart.disabled = !serverReady || !options.length;
    }
  }

  function setCallView(view) {
    call.view = view;
    const sections = {
      setup: dom.callSetup,
      waiting: dom.callWaiting,
      incoming: dom.callIncoming,
      active: dom.callActive,
      ended: dom.callEnded
    };
    Object.keys(sections).forEach((key) => {
      const section = sections[key];
      if (section) section.hidden = key !== view;
    });

    if (dom.callTitle) {
      dom.callTitle.textContent =
        view === "waiting"
          ? "Chiamata in partenza"
          : view === "incoming"
            ? "Chiamata in arrivo"
            : view === "active"
              ? "Videochiamata"
              : view === "ended"
                ? "Chiamata conclusa"
                : "Chiama un altro utente";
    }
    if (dom.callSub) {
      dom.callSub.textContent =
        view === "waiting"
          ? "La richiesta è partita. Attendi che l'altra persona risponda."
          : view === "incoming"
            ? "Qualcuno ti sta cercando. Accetta per aprire la videochiamata."
            : view === "active"
              ? "La stanza è aperta. Buona conversazione."
              : view === "ended"
                ? "La chiamata è conclusa. Puoi iniziarne un'altra quando vuoi."
                : "Scrivi il tuo nome, scegli chi chiamare. Chi riceve deve accettare.";
    }

    if (view === "setup") {
      syncCallIdentityUI();
      renderCallTargets();
    }

    if (view === "waiting") {
      const target = call.outgoing && call.outgoing.to;
      if (dom.callWaitingName) {
        dom.callWaitingName.textContent = target
          ? `${countryInfo(target.country).flag} ${target.username}`
          : "la persona scelta";
      }
      if (dom.callWaitingHint) {
        dom.callWaitingHint.textContent =
          "In attesa che accetti. La richiesta scade tra pochi secondi.";
      }
    }

    if (view === "incoming" && call.incoming) {
      const from = call.incoming.from || {};
      const label = `${countryInfo(from.country).flag} ${from.username || "Qualcuno"}`;
      if (dom.callIncomingName) dom.callIncomingName.textContent = `${label} ti sta chiamando`;
      if (dom.callIncomingAvatar) dom.callIncomingAvatar.textContent = initialFor(from.username || "?");
    }

    if (view === "active" && call.active) {
      const peer = call.active.peer || {};
      if (dom.callPeer) {
        dom.callPeer.textContent = peer.username
          ? `In chiamata con ${countryInfo(peer.country).flag} ${peer.username}`
          : "In chiamata";
      }
    }
  }

  function showCallError(message) {
    if (!dom.callError) return;
    dom.callError.hidden = false;
    dom.callError.textContent = message;
  }

  function clearCallError() {
    if (!dom.callError) return;
    dom.callError.hidden = true;
    dom.callError.textContent = "";
  }

  function setCallBusy(value) {
    call.busy = Boolean(value);
    [dom.callStart, dom.callAccept, dom.callDecline, dom.callCancel, dom.callEnd].forEach(
      (button) => {
        if (button) button.disabled = call.busy;
      }
    );
  }

  function jitsiUrl(room, displayName) {
    const safeRoom = String(room || "")
      .replace(/[^a-z0-9-]/gi, "")
      .toLowerCase() || `fioritura-${Date.now().toString(36)}`;
    const name = encodeURIComponent(displayName || "Ospite");
    return (
      `https://meet.jit.si/${safeRoom}` +
      `#config.prejoinPageEnabled=false&config.requireDisplayName=false` +
      `&config.startWithAudioMuted=false&config.startWithVideoMuted=false` +
      `&userInfo.displayName=${name}`
    );
  }

  async function postCallAction(payload) {
    const response = await fetch("api/calls", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload)
    });
    let data = null;
    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }
    if (!response.ok) {
      throw new Error(
        data && data.error ? data.error : "Non riesco a completare la chiamata. Riprova."
      );
    }
    return data;
  }

  async function refreshCalls(options = {}) {
    const self = callSelf();
    if (!self || window.FiorituraLeaderboard.getMode() !== "server") return null;
    if (call.polling) return null;
    call.polling = true;
    try {
      const query =
        `?username=${encodeURIComponent(self.username)}` +
        `&country=${encodeURIComponent(self.country)}`;
      const response = await fetch(`api/calls${query}`, {
        cache: "no-store",
        headers: { Accept: "application/json" }
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const data = await response.json();
      applyCallPayload(data);
      return data;
    } catch (error) {
      if (!options.silent) {
        showCallError("Non riesco a controllare le chiamate. Riprova tra poco.");
      }
      return null;
    } finally {
      call.polling = false;
    }
  }

  function applyCallPayload(data) {
    if (!data || data.mode !== "server") return;

    const active = data.active || null;
    const outgoing = data.outgoing || null;
    const incoming =
      Array.isArray(data.incoming) && data.incoming.length ? data.incoming[0] : null;

    if (active) {
      call.outgoing = null;
      clearIncoming();
      if (!call.active || call.active.id !== active.id) {
        joinCall(active);
      } else {
        call.active = active;
      }
      return;
    }

    if (call.active) {
      leaveCall({
        remote: true,
        title: "Chiamata terminata",
        message: "L'altra persona ha chiuso la chiamata."
      });
    }

    if (incoming) {
      call.outgoing = null;
      if (!call.incoming || call.incoming.id !== incoming.id) {
        call.incoming = incoming;
        showIncoming(incoming);
      }
      if (activeModal === dom.callModal && call.view === "setup") {
        setCallView("incoming");
      }
      return;
    }

    if (call.incoming) clearIncoming();
    if (call.view === "incoming") setCallView("setup");

    if (outgoing) {
      const same = call.outgoing && call.outgoing.id === outgoing.id;
      call.outgoing = outgoing;
      if (!same) {
        setCallView("waiting");
        if (activeModal === dom.callModal) renderCallTargets();
      }
      return;
    }

    if (call.view === "waiting") {
      call.outgoing = null;
      setCallView("ended");
      if (dom.callEndedTitle) dom.callEndedTitle.textContent = "Nessuna risposta";
      if (dom.callEndedText) {
        dom.callEndedText.textContent =
          "La richiesta è scaduta o è stata rifiutata. Quando vuoi, prova di nuovo.";
      }
    }
  }

  function showIncoming(invite) {
    const from = (invite && invite.from) || {};
    const label = `${countryInfo(from.country).flag} ${from.username || "Qualcuno"}`;
    call.incoming = invite;
    call.lastIncomingId = invite ? invite.id : "";
    if (dom.callToastName) dom.callToastName.textContent = label;
    if (dom.callToastText) dom.callToastText.textContent = "ti sta chiamando. Accetta per rispondere.";
    if (dom.callToast) dom.callToast.hidden = false;
    if (dom.callBadge) dom.callBadge.hidden = false;
    if (activeModal === dom.callModal && call.view !== "active" && call.view !== "waiting") {
      setCallView("incoming");
    }
    announce(`${label} ti sta chiamando. Apri le videochiamate per accettare.`);
  }

  function clearIncoming() {
    call.incoming = null;
    if (dom.callToast) dom.callToast.hidden = true;
    if (dom.callBadge) dom.callBadge.hidden = true;
  }

  function joinCall(active) {
    if (!active || !active.id) return;
    call.active = active;
    call.outgoing = null;
    clearIncoming();
    const self = callSelf();
    const url = jitsiUrl(active.room, self ? self.username : "Ospite");
    if (dom.callFrame) {
      if (dom.callFrame.dataset.room !== active.room) {
        dom.callFrame.dataset.room = active.room;
        dom.callFrame.src = url;
      }
    }
    setCallView("active");
    if (activeModal !== dom.callModal) openModal("callModal");
    showToast("Videochiamata avviata.");
  }

  function leaveCall(options = {}) {
    call.active = null;
    if (dom.callFrame) {
      dom.callFrame.src = "about:blank";
      delete dom.callFrame.dataset.room;
    }
    if (options.remote) {
      setCallView("ended");
      if (dom.callEndedTitle) {
        dom.callEndedTitle.textContent = options.title || "Chiamata terminata";
      }
      if (dom.callEndedText) {
        dom.callEndedText.textContent =
          options.message || "La chiamata è conclusa. Puoi iniziarne un'altra quando vuoi.";
      }
    } else {
      setCallView("setup");
    }
  }

  async function startCall() {
    clearCallError();
    if (window.FiorituraLeaderboard.getMode() !== "server") {
      showCallError(
        "Le videochiamate funzionano solo con la classifica condivisa attiva (server Python o Netlify)."
      );
      return;
    }

    let self = callSelf();
    if (!self) {
      const username = normalizeCallName(dom.callSelfName ? dom.callSelfName.value : "");
      const country = String(dom.callSelfCountry ? dom.callSelfCountry.value : "").toUpperCase();
      if (!CALL_NAME_RE.test(username)) {
        showCallError("Scrivi un nome da 2 a 20 caratteri.");
        if (dom.callSelfName) dom.callSelfName.focus();
        return;
      }
      if (!/^[A-Z]{2}$/.test(country)) {
        showCallError("Scegli il tuo paese.");
        return;
      }
      callIdentity = { username, country };
      saveCallIdentity();
      self = callIdentity;
      syncCallIdentityUI();
    }

    if (!dom.callTarget || !dom.callTarget.value) {
      showCallError("Scegli chi vuoi chiamare.");
      return;
    }
    const [toName, toCountry] = dom.callTarget.value.split("|");
    if (!CALL_NAME_RE.test(normalizeCallName(toName)) || !/^[A-Z]{2}$/.test(toCountry)) {
      showCallError("La persona scelta non è valida.");
      return;
    }
    if (callKey({ username: toName, country: toCountry }) === callKey(self)) {
      showCallError("Non puoi chiamare te stesso.");
      return;
    }

    setCallBusy(true);
    try {
      const data = await postCallAction({
        action: "invite",
        from: self,
        to: { username: normalizeCallName(toName), country: toCountry }
      });
      applyCallPayload(data);
      if (data && data.outgoing) {
        call.outgoing = data.outgoing;
        setCallView("waiting");
      }
      startCallPolling();
    } catch (error) {
      showCallError(error.message);
    } finally {
      setCallBusy(false);
    }
  }

  async function acceptCall(id) {
    const self = callSelf();
    if (!self) {
      showCallError("Prima scrivi il tuo nome nella scheda della chiamata.");
      return;
    }
    setCallBusy(true);
    try {
      const data = await postCallAction({
        action: "accept",
        id,
        username: self.username,
        country: self.country
      });
      clearIncoming();
      applyCallPayload(data);
      if (!call.active) {
        showCallError("La chiamata non è più disponibile.");
      }
    } catch (error) {
      clearIncoming();
      setCallView("setup");
      showToast(error.message);
    } finally {
      setCallBusy(false);
    }
  }

  async function declineCall(id) {
    const self = callSelf();
    if (self) {
      try {
        await postCallAction({
          action: "decline",
          id,
          username: self.username,
          country: self.country
        });
      } catch (error) {
        /* la chiamata potrebbe essere già scaduta */
      }
    }
    clearIncoming();
    setCallView("setup");
    showToast("Chiamata rifiutata.");
  }

  async function cancelCall() {
    const self = callSelf();
    const outgoing = call.outgoing;
    if (self && outgoing) {
      try {
        await postCallAction({
          action: "cancel",
          id: outgoing.id,
          username: self.username,
          country: self.country
        });
      } catch (error) {
        /* la richiesta potrebbe essere già scaduta */
      }
    }
    call.outgoing = null;
    setCallView("setup");
    showToast("Chiamata annullata.");
  }

  async function endCall(options = {}) {
    const self = callSelf();
    const active = call.active;
    if (self && active) {
      try {
        await postCallAction({
          action: "end",
          id: active.id,
          username: self.username,
          country: self.country
        });
      } catch (error) {
        /* chiudo comunque la stanza locale */
      }
    }
    leaveCall({ remote: false });
    if (!options.silent) showToast("Chiamata terminata.");
  }

  function openCall() {
    syncCallIdentityUI();
    renderCallTargets();
    clearCallError();

    if (window.FiorituraLeaderboard.getMode() !== "server") {
      showCallError(
        "Le videochiamate hanno bisogno della classifica condivisa attiva. Apri Fioritura dal server Python o da Netlify."
      );
    }

    if (call.active) {
      setCallView("active");
    } else if (call.incoming) {
      setCallView("incoming");
    } else if (call.outgoing) {
      setCallView("waiting");
    } else {
      setCallView("setup");
    }

    openModal("callModal", "#callSelfName");
    if (window.FiorituraLeaderboard.getMode() === "server" && callSelf()) {
      refreshCalls({ silent: true });
    }
  }

  function startCallPolling() {
    stopCallPolling();
    if (window.FiorituraLeaderboard.getMode() !== "server") return;
    if (!callSelf()) return;
    refreshCalls({ silent: true });
    callPollTimer = window.setInterval(() => {
      if (!document.hidden) refreshCalls({ silent: true });
    }, 4500);
  }

  function stopCallPolling() {
    if (callPollTimer) window.clearInterval(callPollTimer);
    callPollTimer = 0;
  }

  /* ---------- dati ---------- */

  function exportData() {
    const data = {};
    try {
      Object.keys(window.localStorage).forEach((key) => {
        if (!key.startsWith("fioritura.")) return;
        const raw = window.localStorage.getItem(key);
        try {
          data[key] = JSON.parse(raw);
        } catch (error) {
          data[key] = raw;
        }
      });
    } catch (error) {
      showToast("Non riesco a leggere i dati salvati.");
      return;
    }

    const payload = {
      app: "Fioritura",
      version: 1,
      exportedAt: new Date().toISOString(),
      data
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fioritura-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    showToast("Backup scaricato.");
  }

  function armDanger(button, label, armedLabel, action) {
    if (!button) return;
    if (button.dataset.armed === "1") {
      window.clearTimeout(Number(button.dataset.armTimer) || 0);
      button.dataset.armed = "";
      button.classList.remove("is-armed");
      button.textContent = label;
      action();
      return;
    }
    button.dataset.armed = "1";
    button.classList.add("is-armed");
    button.textContent = armedLabel;
    const timer = window.setTimeout(() => {
      button.dataset.armed = "";
      button.dataset.armTimer = "";
      button.classList.remove("is-armed");
      button.textContent = label;
    }, 3500);
    button.dataset.armTimer = String(timer);
  }

  function resetProgress() {
    stats = { totalXp: 0, sessions: 0, minutes: 0, history: [], plantings: [] };
    saveStats();
    pendingSessions = [];
    savePending();
    resetTimer({ silent: true });
    shop = {
      spentXp: 0,
      owned: [],
      equipped: { frame: null, badge: null, accent: null },
      updatedAt: 0
    };
    touchShop();
    saveShop();
    pushShopState({ silent: true });
    if (profile && window.FiorituraLeaderboard.resetLocal) {
      window.FiorituraLeaderboard.resetLocal(profile.username, profile.country);
    }
    renderStats();
    refreshCosmetics();
    renderShop();
    updatePendingNote();
    showToast("Progressi e acquisti azzerati. Si riparte da un nuovo seme.");
  }

  function resetEverything() {
    try {
      Object.keys(window.localStorage).forEach((key) => {
        if (key.startsWith("fioritura.")) window.localStorage.removeItem(key);
      });
    } catch (error) {
      /* noop */
    }
    window.location.reload();
  }

  function handleProfileSubmit(event) {
    event.preventDefault();
    const name = dom.nameInput.value.trim().replace(/\s+/g, " ");
    const country = dom.countryCode.value;

    let error = "";
    if (name.length < 2 || name.length > 20) {
      error = "Il nome deve avere tra 2 e 20 caratteri.";
    } else if (!/^[\p{L}\p{N} ._'-]+$/u.test(name)) {
      error = "Usa solo lettere, numeri, spazi, punti, trattini o apostrofi.";
    } else if (!window.FiorituraCountries || !window.FiorituraCountries.byCode[country]) {
      error = "Scegli un paese dall'elenco.";
    }

    if (error) {
      dom.nameInput.classList.add("is-invalid");
      dom.profileHint.textContent = error;
      dom.profileHint.style.color = "var(--rose)";
      dom.nameInput.focus();
      return;
    }

    dom.nameInput.classList.remove("is-invalid");
    dom.profileHint.textContent = DEFAULT_PROFILE_HINT;
    dom.profileHint.style.color = "";

    const isNew = !profile;
    profile = { username: name, country, avatar: draftAvatar || "" };
    let saved = saveProfile();
    if (!saved && profile.avatar) {
      profile.avatar = "";
      draftAvatar = "";
      saved = saveProfile();
      showToast("Spazio finito: profilo salvato senza foto.");
    }
    renderProfileUI();
    renderSettingsProfile();

    const queue = pendingSessions.slice();
    pendingSessions = [];
    savePending();
    updatePendingNote();

    if (queue.length) {
      const posts = queue.map((item) =>
        window.FiorituraLeaderboard.addSession({
          username: profile.username,
          country: profile.country,
          xp: item.xp,
          minutes: item.minutes,
          ts: item.ts
        })
      );
      Promise.allSettled(posts).then(() => {
        window.FiorituraLeaderboard.refresh().then(() => renderLeaderboard());
      });
    }

    renderLeaderboard();
    closeModal("settingsModal");
    syncShopState({ silent: true });
    if (window.FiorituraLeaderboard.getMode() === "server") startCallPolling();
    showToast(isNew ? `Benvenuto in classifica, ${name}.` : "Profilo aggiornato.");
  }

  /* ---------- classifica ---------- */

  function isMe(entry) {
    if (!profile || !entry) return false;
    return (
      entry.username.toLocaleLowerCase("it") === profile.username.toLocaleLowerCase("it") &&
      entry.country === profile.country
    );
  }

  function appendBadgeLabel(container, item) {
    if (!item) return;
    const badge = document.createElement("span");
    badge.className = badgeClass(item);
    badge.textContent = item.name;
    container.appendChild(document.createTextNode(" "));
    container.appendChild(badge);
  }

  function buildPodiumCard(entry) {
    const country = countryInfo(entry.country);
    const me = isMe(entry);
    const cosmetics = me ? ownCosmetics() : null;
    const card = document.createElement("div");
    card.className =
      "podium__card" +
      (entry.rank === 1 ? " podium__card--first" : "") +
      (me ? " podium__card--me" : "");

    const place = document.createElement("span");
    place.className = "podium__place";
    place.textContent = `${entry.rank}°`;
    card.appendChild(place);

    if (entry.rank === 1) {
      const crown = document.createElement("span");
      crown.className = "podium__crown";
      crown.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.2 8.3 12 12 6l3.7 6L20 8.2l-1.4 9.2H5.4L4 8.2Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
      card.appendChild(crown);
    }

    const avatar = document.createElement("span");
    avatar.className = "podium__avatar";
    paintAvatar(avatar, entry.username, me && profile ? profile.avatar : "", cosmetics);
    card.appendChild(avatar);

    const name = document.createElement("span");
    name.className = "podium__name";
    name.textContent = entry.username;
    if (me) {
      const tag = document.createElement("span");
      tag.className = "lb-you";
      tag.textContent = "tu";
      name.appendChild(document.createTextNode(" "));
      name.appendChild(tag);
      appendBadgeLabel(name, cosmetics.badge);
    }
    card.appendChild(name);

    const countryLine = document.createElement("span");
    countryLine.className = "podium__country";
    countryLine.textContent = `${country.flag} ${country.name}`;
    card.appendChild(countryLine);

    const xp = document.createElement("span");
    xp.className = "podium__xp";
    xp.textContent = formatNumber(entry.xp);
    const xpLabel = document.createElement("small");
    xpLabel.textContent = "XP";
    xp.appendChild(xpLabel);
    card.appendChild(xp);

    return card;
  }

  function buildLeaderboardRow(entry) {
    const country = countryInfo(entry.country);
    const me = isMe(entry);
    const cosmetics = me ? ownCosmetics() : null;
    const row = document.createElement("li");
    row.className = "lb-row";
    if (me) row.classList.add("is-me");

    const rank = document.createElement("span");
    rank.className = "lb-rank";
    rank.textContent = String(entry.rank);

    const avatar = document.createElement("span");
    avatar.className = "lb-avatar";
    paintAvatar(avatar, entry.username, me && profile ? profile.avatar : "", cosmetics);

    const user = document.createElement("span");
    user.className = "lb-user";
    const name = document.createElement("strong");
    name.textContent = entry.username;
    if (me) {
      const tag = document.createElement("span");
      tag.className = "lb-you";
      tag.textContent = "tu";
      name.appendChild(document.createTextNode(" "));
      name.appendChild(tag);
      appendBadgeLabel(name, cosmetics.badge);
    }
    const countryLine = document.createElement("small");
    countryLine.textContent = `${country.flag} ${country.name}`;
    user.appendChild(name);
    user.appendChild(countryLine);

    const score = document.createElement("span");
    score.className = "lb-score";
    const scoreValue = document.createElement("strong");
    scoreValue.textContent = formatNumber(entry.xp);
    const scoreMeta = document.createElement("small");
    scoreMeta.textContent = `XP · ${entry.sessions} ${entry.sessions === 1 ? "sessione" : "sessioni"}`;
    score.appendChild(scoreValue);
    score.appendChild(scoreMeta);

    row.appendChild(rank);
    row.appendChild(avatar);
    row.appendChild(user);
    row.appendChild(score);
    return row;
  }

  function renderLeaderboard() {
    if (!dom.lbList) return;
    if (window.FiorituraLeaderboard.announcement) {
      applyAnnouncement(window.FiorituraLeaderboard.announcement);
    }
    const entries = window.FiorituraLeaderboard.getEntries(state.period);
    const mode = window.FiorituraLeaderboard.getMode();
    const me = profile
      ? window.FiorituraLeaderboard.findMe(state.period, profile.username, profile.country)
      : null;

    if (dom.lbMode) dom.lbMode.classList.toggle("is-server", mode === "server");
    if (dom.lbModeText) {
      dom.lbModeText.textContent =
        mode === "server" ? "Classifica condivisa" : "Classifica salvata su questo dispositivo";
    }

    if (dom.lbSub) {
      if (!entries.length) {
        dom.lbSub.textContent = "Ancora nessuno in classifica. Puoi essere la prima persona.";
      } else if (me) {
        const periodLabel = state.period === "week" ? "questa settimana" : "in totale";
        dom.lbSub.textContent = `Sei al posto #${me.rank} ${periodLabel} con ${formatNumber(me.xp)} XP.`;
      } else if (profile) {
        dom.lbSub.textContent = "Completa una sessione da 5 minuti in su per entrare in classifica.";
      } else {
        dom.lbSub.textContent = "Crea il tuo profilo per entrare in classifica.";
      }
    }

    if (dom.saveScoreButton) {
      dom.saveScoreButton.textContent = profile ? "Modifica profilo" : "Crea il tuo profilo";
    }

    if (dom.podium) {
      dom.podium.innerHTML = "";
      const top = entries.slice(0, 3);
      dom.podium.hidden = top.length === 0;
      if (top.length) {
        dom.podium.removeAttribute("aria-hidden");
        [top[1], top[0], top[2]].filter(Boolean).forEach((entry) => {
          dom.podium.appendChild(buildPodiumCard(entry));
        });
      }
    }

    if (dom.lbList) {
      dom.lbList.innerHTML = "";
      if (!entries.length) {
        const empty = document.createElement("li");
        empty.className = "lb-empty";
        empty.textContent = "Il podio è ancora libero. La tua prima sessione può cambiare la classifica.";
        dom.lbList.appendChild(empty);
        dom.lbList.hidden = false;
      } else {
        const rest = entries.slice(3);
        rest.forEach((entry) => dom.lbList.appendChild(buildLeaderboardRow(entry)));
        dom.lbList.hidden = rest.length === 0;
      }
    }

    if (dom.lbFoot) {
      const periodText =
        state.period === "week"
          ? "XP delle sessioni completate negli ultimi 7 giorni."
          : "XP totali delle sessioni completate.";
      dom.lbFoot.textContent =
        mode === "server"
          ? `${periodText} Classifica condivisa tramite il server Fioritura.`
          : `${periodText} Include partecipanti di esempio, salvati su questo dispositivo.`;
    }
  }

  function setPeriod(period) {
    state.period = period === "all" ? "all" : "week";
    settings.period = state.period;
    saveSettings();
    if (dom.tabWeek) dom.tabWeek.setAttribute("aria-selected", String(state.period === "week"));
    if (dom.tabAll) dom.tabAll.setAttribute("aria-selected", String(state.period === "all"));
    renderLeaderboard();
  }

  /* ---------- pannello admin ---------- */

  function readAdminToken() {
    try {
      return window.sessionStorage.getItem(ADMIN_TOKEN_KEY) || "";
    } catch (error) {
      return "";
    }
  }

  function storeAdminToken(token) {
    adminToken = token;
    try {
      window.sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    } catch (error) {
      /* sessione non disponibile: resta in memoria */
    }
  }

  function clearAdminToken() {
    adminToken = "";
    adminData = null;
    try {
      window.sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    } catch (error) {
      /* niente da fare */
    }
  }

  function basicToken(username, password) {
    const bytes = new TextEncoder().encode(`${username}:${password}`);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return window.btoa(binary);
  }

  function setAdminStatus(text) {
    adminStatusText = text || "";
    if (dom.adminStatus) dom.adminStatus.textContent = adminStatusText;
  }

  function showAdminLogin(message) {
    if (dom.adminLogin) dom.adminLogin.hidden = false;
    if (dom.adminApp) dom.adminApp.hidden = true;
    if (dom.adminLoginError) {
      dom.adminLoginError.textContent = message || "";
      dom.adminLoginError.hidden = !message;
    }
    if (dom.adminOffline) {
      dom.adminOffline.hidden = window.FiorituraLeaderboard.getMode() === "server";
    }
  }

  function showAdminApp() {
    if (dom.adminLogin) dom.adminLogin.hidden = true;
    if (dom.adminApp) dom.adminApp.hidden = false;
    if (dom.adminLoginError) dom.adminLoginError.hidden = true;
  }

  async function adminRequest(method, body) {
    if (!adminToken) {
      const missing = new Error("Accedi al pannello admin.");
      missing.status = 401;
      throw missing;
    }

    const headers = {
      Accept: "application/json",
      Authorization: `Basic ${adminToken}`
    };
    if (body) headers["Content-Type"] = "application/json";

    const response = await fetch("api/admin", {
      method,
      cache: "no-store",
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    let data = null;
    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }

    if (!response.ok) {
      const failure = new Error((data && data.error) || `Errore ${response.status}`);
      failure.status = response.status;
      throw failure;
    }
    if (!data || data.mode !== "server") {
      throw new Error("Risposta admin non valida.");
    }
    return data;
  }

  async function loadAdmin() {
    if (!adminToken || adminBusy) return;
    adminBusy = true;
    setAdminStatus("Aggiorno i dati…");
    try {
      adminData = await adminRequest("GET");
      renderAdmin();
      const time = new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
      setAdminStatus(`Aggiornato alle ${time}`);
    } catch (error) {
      if (error.status === 401) {
        clearAdminToken();
        showAdminLogin("Credenziali admin non valide. Riprova.");
      } else {
        setAdminStatus(error.message || "Non riesco a leggere i dati admin.");
        showToast(error.message || "Non riesco a leggere i dati admin.");
      }
    } finally {
      adminBusy = false;
    }
  }

  function openAdmin() {
    if (!dom.adminModal || activeModal === dom.adminModal) return;
    adminToken = readAdminToken();
    const online = window.FiorituraLeaderboard.getMode() === "server";
    if (dom.adminOffline) dom.adminOffline.hidden = online;

    if (online && adminToken) {
      showAdminApp();
      openModal("adminModal", "#adminRefresh");
      loadAdmin();
    } else {
      showAdminLogin("");
      openModal("adminModal", "#adminUser");
    }
  }

  function handleAdminLogin(event) {
    event.preventDefault();
    if (window.FiorituraLeaderboard.getMode() !== "server") {
      showAdminLogin("Il pannello admin richiede la classifica condivisa attiva.");
      return;
    }

    const username = dom.adminUser ? dom.adminUser.value.trim() : "";
    const password = dom.adminPassword ? dom.adminPassword.value : "";
    if (!username || !password) {
      showAdminLogin("Inserisci nome utente e password.");
      return;
    }

    storeAdminToken(basicToken(username, password));
    if (dom.adminPassword) dom.adminPassword.value = "";
    adminData = null;
    showAdminApp();
    setAdminStatus("Accedo…");
    loadAdmin();
  }

  function handleAdminLogout() {
    clearAdminToken();
    if (dom.adminPassword) dom.adminPassword.value = "";
    showAdminLogin("");
    setAdminStatus("");
  }

  async function runAdminAction(payload, options = {}) {
    if (adminBusy) {
      showToast("Attendi la fine dell'operazione in corso.");
      return null;
    }
    adminBusy = true;
    setAdminStatus("Salvo le modifiche…");

    try {
      const data = await adminRequest("POST", payload);
      adminData = data;
      if (data.announcement) applyAnnouncement(data.announcement);
      if (data.catalog) applyCatalog(data.catalog);
      renderAdmin();

      if (options.shop) {
        renderShop();
        syncShopState({ silent: true });
      }
      if (options.leaderboard) {
        window.FiorituraLeaderboard.refresh().then(() => renderLeaderboard());
      }

      setAdminStatus("Modifiche salvate.");
      if (options.toast) showToast(options.toast);
      return data;
    } catch (error) {
      if (error.status === 401) {
        clearAdminToken();
        showAdminLogin("Sessione scaduta: accedi di nuovo.");
      } else {
        setAdminStatus(error.message || "Non riesco a salvare le modifiche.");
        showToast(error.message || "Non riesco a salvare le modifiche.");
      }
      return null;
    } finally {
      adminBusy = false;
    }
  }

  function adminStat(label, value) {
    const box = document.createElement("div");
    box.className = "admin-stat";
    const name = document.createElement("span");
    name.textContent = label;
    const amount = document.createElement("strong");
    amount.textContent = value;
    box.appendChild(name);
    box.appendChild(amount);
    return box;
  }

  function renderAdminStats() {
    if (!dom.adminStats || !adminData) return;
    const totals = adminData.totals || {};
    dom.adminStats.innerHTML = "";
    dom.adminStats.appendChild(adminStat("Partecipanti", formatNumber(totals.participants)));
    dom.adminStats.appendChild(adminStat("Sessioni", formatNumber(totals.sessions)));
    dom.adminStats.appendChild(adminStat("XP totali", formatNumber(totals.xp)));
    dom.adminStats.appendChild(adminStat("XP settimana", formatNumber(totals.weekXp)));
    dom.adminStats.appendChild(adminStat("Negozi attivi", formatNumber(totals.shopOwners)));
    dom.adminStats.appendChild(adminStat("Prezzi personalizzati", formatNumber(totals.catalogOverrides)));
  }

  function renderAdminAdjustments() {
    if (!dom.adminAdjustments || !adminData) return;
    dom.adminAdjustments.innerHTML = "";
    const adjustments = adminData.adjustments || [];

    if (!adjustments.length) {
      const empty = document.createElement("li");
      empty.className = "admin-empty";
      empty.textContent = "Nessuna rettifica XP registrata.";
      dom.adminAdjustments.appendChild(empty);
      return;
    }

    adjustments.forEach((adjustment) => {
      const row = document.createElement("li");
      row.className = "admin-log__row";

      const who = document.createElement("span");
      who.className = "admin-log__who";
      who.textContent = `${adjustment.username} · ${countryInfo(adjustment.country).flag} ${
        countryInfo(adjustment.country).name
      }${adjustment.note ? ` · ${adjustment.note}` : ""}`;

      const delta = document.createElement("span");
      delta.className = `admin-log__delta ${adjustment.delta > 0 ? "is-plus" : "is-minus"}`;
      delta.textContent = `${adjustment.delta > 0 ? "+" : ""}${formatNumber(adjustment.delta)} XP`;

      const meta = document.createElement("span");
      meta.className = "admin-log__meta";
      meta.textContent = formatWhen(adjustment.ts);

      const undo = document.createElement("button");
      undo.type = "button";
      undo.className = "btn btn--ghost btn--sm";
      undo.dataset.adminAction = "deleteAdjustment";
      undo.dataset.id = adjustment.id;
      undo.textContent = "Annulla";

      row.appendChild(who);
      row.appendChild(delta);
      row.appendChild(meta);
      row.appendChild(undo);
      dom.adminAdjustments.appendChild(row);
    });
  }

  function participantMatches(participant) {
    if (!adminSearch) return true;
    const country = countryInfo(participant.country);
    const haystack = `${participant.username} ${participant.country} ${country.name}`.toLocaleLowerCase("it");
    return haystack.includes(adminSearch);
  }

  function buildAdminParticipant(participant, openKeys) {
    const country = countryInfo(participant.country);
    const key = `${encodeURIComponent(participant.username)}|${participant.country}`;
    const details = document.createElement("details");
    details.className = "admin-person";
    details.dataset.key = key;
    if (openKeys.has(key)) details.open = true;

    const summary = document.createElement("summary");
    const avatar = document.createElement("span");
    avatar.className = "admin-person__avatar";
    avatar.textContent = initialFor(participant.username);

    const identity = document.createElement("span");
    identity.className = "admin-person__id";
    const name = document.createElement("span");
    name.className = "admin-person__name";
    name.textContent = participant.username;
    if (participant.rank) {
      const rank = document.createElement("small");
      rank.textContent = `#${participant.rank}`;
      name.appendChild(rank);
    }
    const meta = document.createElement("span");
    meta.className = "admin-person__meta";
    meta.textContent = `${country.flag} ${country.name} · ${participant.sessions} ${
      participant.sessions === 1 ? "sessione" : "sessioni"
    }${participant.shop ? " · negozio attivo" : ""}`;
    identity.appendChild(name);
    identity.appendChild(meta);

    const numbers = document.createElement("span");
    numbers.className = "admin-person__numbers";
    [
      ["XP", formatNumber(participant.xp)],
      ["7 giorni", formatNumber(participant.weekXp)],
      ["Spesi", formatNumber(participant.shop ? participant.shop.spentXp : 0)]
    ].forEach(([label, value]) => {
      const block = document.createElement("div");
      const small = document.createElement("span");
      small.textContent = label;
      const strong = document.createElement("strong");
      strong.textContent = value;
      block.appendChild(small);
      block.appendChild(strong);
      numbers.appendChild(block);
    });

    summary.appendChild(avatar);
    summary.appendChild(identity);
    summary.appendChild(numbers);

    const body = document.createElement("div");
    body.className = "admin-person__body";

    const xpBlock = document.createElement("div");
    xpBlock.className = "admin-person__block";
    const xpTitle = document.createElement("h4");
    xpTitle.textContent = "XP totali";
    const xpForm = document.createElement("form");
    xpForm.className = "admin-xp-form";
    xpForm.dataset.xpForm = "true";
    xpForm.dataset.username = participant.username;
    xpForm.dataset.country = participant.country;

    const mode = document.createElement("select");
    mode.name = "mode";
    mode.setAttribute("aria-label", "Operazione XP");
    [
      ["add", "Aggiungi"],
      ["remove", "Rimuovi"],
      ["set", "Imposta a"]
    ].forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      mode.appendChild(option);
    });

    const amount = document.createElement("input");
    amount.name = "amount";
    amount.type = "number";
    amount.min = "0";
    amount.step = "1";
    amount.placeholder = "XP";
    amount.required = true;
    amount.setAttribute("aria-label", "Quantità di XP");

    const apply = document.createElement("button");
    apply.type = "submit";
    apply.className = "btn btn--soft btn--sm";
    apply.textContent = "Applica";

    xpForm.appendChild(mode);
    xpForm.appendChild(amount);
    xpForm.appendChild(apply);

    const xpHint = document.createElement("p");
    xpHint.className = "admin-hint";
    xpHint.textContent = "Le rettifiche valgono per la classifica totale; quella settimanale resta basata sulle sessioni.";

    xpBlock.appendChild(xpTitle);
    xpBlock.appendChild(xpForm);
    xpBlock.appendChild(xpHint);

    const shopBlock = document.createElement("div");
    shopBlock.className = "admin-person__block";
    const shopTitle = document.createElement("h4");
    shopTitle.textContent = "Oggetti posseduti";
    shopBlock.appendChild(shopTitle);

    const owned = participant.shop && Array.isArray(participant.shop.owned)
      ? participant.shop.owned
      : [];
    if (owned.length) {
      const chips = document.createElement("div");
      chips.className = "admin-owned";
      owned.forEach((ownedId) => {
        const item = shopItem(ownedId);
        if (!item) return;
        const chip = document.createElement("span");
        chip.className = "admin-chip";
        chip.textContent = item.name;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.dataset.adminAction = "revokeItem";
        remove.dataset.username = participant.username;
        remove.dataset.country = participant.country;
        remove.dataset.id = ownedId;
        remove.setAttribute("aria-label", `Rimuovi ${item.name}`);
        remove.textContent = "×";
        chip.appendChild(remove);
        chips.appendChild(chip);
      });
      shopBlock.appendChild(chips);
    } else {
      const empty = document.createElement("p");
      empty.className = "admin-hint";
      empty.textContent = "Nessun oggetto.";
      shopBlock.appendChild(empty);
    }

    const grant = document.createElement("div");
    grant.className = "admin-item-grant";
    const grantSelect = document.createElement("select");
    grantSelect.dataset.grantSelect = "true";
    grantSelect.setAttribute("aria-label", "Oggetto da assegnare");
    SHOP_ITEMS.filter((item) => !owned.includes(item.id)).forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = `${item.name} · ${item.type === "frame" ? "cornice" : item.type === "badge" ? "titolo" : "colore"}`;
      grantSelect.appendChild(option);
    });
    const grantButton = document.createElement("button");
    grantButton.type = "button";
    grantButton.className = "btn btn--ghost btn--sm";
    grantButton.dataset.adminAction = "grantItem";
    grantButton.dataset.username = participant.username;
    grantButton.dataset.country = participant.country;
    grantButton.textContent = "Assegna";
    grantButton.disabled = grantSelect.options.length === 0;
    grant.appendChild(grantSelect);
    grant.appendChild(grantButton);
    shopBlock.appendChild(grant);

    const danger = document.createElement("div");
    danger.className = "admin-danger-line";
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "btn btn--danger btn--sm";
    deleteButton.dataset.adminAction = "deleteParticipant";
    deleteButton.dataset.username = participant.username;
    deleteButton.dataset.country = participant.country;
    deleteButton.textContent = "Elimina partecipante";
    danger.appendChild(deleteButton);
    shopBlock.appendChild(danger);

    body.appendChild(xpBlock);
    body.appendChild(shopBlock);
    details.appendChild(summary);
    details.appendChild(body);
    return details;
  }

  function renderAdminParticipants() {
    if (!dom.adminParticipants || !adminData) return;
    const openKeys = new Set(
      $$("details.admin-person[open]", dom.adminParticipants).map((item) => item.dataset.key)
    );
    const participants = (adminData.participants || []).filter(participantMatches);

    if (dom.adminParticipantCount) {
      dom.adminParticipantCount.textContent = adminSearch
        ? `${participants.length} di ${(adminData.participants || []).length}`
        : `${(adminData.participants || []).length} partecipanti`;
    }

    dom.adminParticipants.innerHTML = "";
    if (!participants.length) {
      const empty = document.createElement("div");
      empty.className = "admin-empty";
      empty.textContent = adminSearch
        ? "Nessun partecipante corrisponde alla ricerca."
        : "Nessun partecipante: la classifica è vuota.";
      dom.adminParticipants.appendChild(empty);
      return;
    }

    participants.forEach((participant) => {
      dom.adminParticipants.appendChild(buildAdminParticipant(participant, openKeys));
    });
  }

  function renderAdminItems() {
    if (!dom.adminItems || !adminData) return;
    const catalog = adminData.catalog || {};
    dom.adminItems.innerHTML = "";

    SHOP_ITEMS.forEach((base) => {
      const item = effectiveItem(base, catalog);
      const card = document.createElement("article");
      card.className = `admin-item${item.active ? "" : " is-off"}`;
      card.dataset.id = item.id;

      const preview = document.createElement("div");
      preview.className = "admin-item__preview";
      if (item.type === "frame") {
        const avatar = document.createElement("span");
        avatar.className = `avatar avatar--${item.id}`;
        avatar.textContent = initialFor(item.name);
        preview.appendChild(avatar);
      } else if (item.type === "badge") {
        const badge = document.createElement("span");
        badge.className = badgeClass(item);
        badge.textContent = item.name;
        preview.appendChild(badge);
      } else {
        const dot = document.createElement("span");
        dot.className = "admin-item__dot";
        dot.style.background = item.color;
        dot.style.boxShadow = `0 0 20px ${item.glow}`;
        preview.appendChild(dot);
      }

      const main = document.createElement("div");
      const head = document.createElement("div");
      head.className = "admin-item__head";
      const title = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = item.name;
      const kind = document.createElement("small");
      kind.textContent = `${item.rarity} · ${SHOP_FILTERS[item.type] || item.type}${
        catalog[item.id] ? " · prezzo personalizzato" : ""
      }`;
      title.appendChild(name);
      title.appendChild(kind);
      head.appendChild(title);

      const price = document.createElement("div");
      price.className = "admin-item__price";
      const priceInput = document.createElement("input");
      priceInput.type = "number";
      priceInput.min = "0";
      priceInput.max = "100000";
      priceInput.step = "1";
      priceInput.value = String(item.price);
      priceInput.setAttribute("aria-label", `Prezzo di ${item.name}`);
      const priceLabel = document.createElement("span");
      priceLabel.textContent = "XP";
      price.appendChild(priceInput);
      price.appendChild(priceLabel);

      const actions = document.createElement("div");
      actions.className = "admin-item__actions";
      const activeLabel = document.createElement("label");
      activeLabel.className = "admin-check";
      const activeInput = document.createElement("input");
      activeInput.type = "checkbox";
      activeInput.checked = item.active;
      const activeText = document.createElement("span");
      activeText.textContent = "In vendita";
      activeLabel.appendChild(activeInput);
      activeLabel.appendChild(activeText);

      const save = document.createElement("button");
      save.type = "button";
      save.className = "btn btn--soft btn--sm";
      save.dataset.adminAction = "saveCatalogItem";
      save.dataset.id = item.id;
      save.textContent = "Salva";

      actions.appendChild(activeLabel);
      actions.appendChild(save);

      if (catalog[item.id]) {
        const reset = document.createElement("button");
        reset.type = "button";
        reset.className = "btn btn--ghost btn--sm";
        reset.dataset.adminAction = "resetCatalogItem";
        reset.dataset.id = item.id;
        reset.textContent = "Ripristina";
        actions.appendChild(reset);
      }

      main.appendChild(head);
      main.appendChild(price);
      main.appendChild(actions);
      card.appendChild(preview);
      card.appendChild(main);
      dom.adminItems.appendChild(card);
    });
  }

  function renderAdminSessions() {
    if (!dom.adminSessions || !adminData) return;
    dom.adminSessions.innerHTML = "";
    const sessions = adminData.sessions || [];

    if (dom.adminSessionsHint) {
      dom.adminSessionsHint.textContent = sessions.length
        ? `Le ultime ${sessions.length} sessioni condivise. Puoi eliminarle una per una.`
        : "Nessuna sessione condivisa.";
    }

    if (!sessions.length) {
      const empty = document.createElement("div");
      empty.className = "admin-empty";
      empty.textContent = "La classifica non contiene ancora sessioni.";
      dom.adminSessions.appendChild(empty);
      return;
    }

    sessions.forEach((session) => {
      const row = document.createElement("div");
      row.className = "admin-session";

      const who = document.createElement("span");
      who.className = "admin-session__who";
      who.textContent = session.username;
      const country = document.createElement("small");
      country.textContent = ` · ${countryInfo(session.country).flag} ${countryInfo(session.country).name}`;
      who.appendChild(country);

      const meta = document.createElement("span");
      meta.className = "admin-session__meta";
      meta.textContent = `${formatMinutes(session.minutes)} · ${formatWhen(session.ts)}`;

      const xp = document.createElement("strong");
      xp.textContent = `+${formatNumber(session.xp)} XP`;

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "btn btn--ghost btn--sm";
      remove.dataset.adminAction = "deleteSession";
      remove.dataset.username = session.username;
      remove.dataset.country = session.country;
      remove.dataset.ts = String(session.ts);
      remove.textContent = "Elimina";

      row.appendChild(who);
      row.appendChild(meta);
      row.appendChild(xp);
      row.appendChild(remove);
      dom.adminSessions.appendChild(row);
    });
  }

  function renderAdmin() {
    if (!adminData) return;
    renderAdminStats();
    renderAdminAdjustments();

    if (dom.adminAnnouncementText && document.activeElement !== dom.adminAnnouncementText) {
      dom.adminAnnouncementText.value = (adminData.announcement && adminData.announcement.text) || "";
    }

    renderAdminParticipants();
    renderAdminItems();
    renderAdminSessions();
  }

  function setAdminTab(tab) {
    const allowed = ["overview", "participants", "items", "sessions"];
    adminTab = allowed.includes(tab) ? tab : "overview";
    $$("[data-admin-tab]", dom.adminTabs || document).forEach((button) => {
      button.setAttribute("aria-selected", String(button.dataset.adminTab === adminTab));
    });
    $$("[data-admin-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.adminPanel !== adminTab;
    });
  }

  function adminExport() {
    if (!adminData) {
      showToast("Nessun dato admin da esportare.");
      return;
    }
    const payload = {
      exportedAt: new Date().toISOString(),
      ...adminData
    };
    const blob = new window.Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json"
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `fioritura-stato-${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 2000);
    showToast("Stato esportato in JSON.");
  }

  /* ---------- suoni ---------- */

  function updateVolumeFill() {
    if (!dom.volume) return;
    dom.volume.style.setProperty("--fill", `${dom.volume.value}%`);
  }

  function syncSoundUI() {
    const active = window.FiorituraAudio.activeId;
    $$(".sound").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.track === active));
    });

    if (dom.soundQuick) {
      dom.soundQuick.setAttribute("aria-pressed", String(Boolean(active)));
      const label = active ? "Spegni i suoni" : "Accendi i suoni";
      dom.soundQuick.setAttribute("aria-label", label);
      dom.soundQuick.title = label;
    }

    if (dom.stopSound) dom.stopSound.disabled = !active;
    if (dom.soundStatus) {
      dom.soundStatus.textContent = active ? window.FiorituraAudio.label || "In ascolto" : "Silenzio";
    }
    const dot = $(".sound-dot");
    if (dot) dot.classList.toggle("is-on", Boolean(active));

    if (active) {
      settings.track = active;
      saveSettings();
    }
  }

  function initSounds() {
    syncVolumeUI();
    window.FiorituraAudio.setVolume(settings.volume);
    window.FiorituraAudio.onchange = syncSoundUI;

    if (dom.prefMusic) dom.prefMusic.checked = settings.musicAutostart;
    if (dom.prefNotify) dom.prefNotify.checked = settings.notify;
    if (dom.settingsMusic) dom.settingsMusic.checked = settings.musicAutostart;
    if (dom.settingsNotify) dom.settingsNotify.checked = settings.notify;
    syncSoundUI();
  }

  async function toggleSound(trackId) {
    settings.track = trackId;
    saveSettings();
    stopEmbeddedMusic();
    try {
      await window.FiorituraAudio.toggle(trackId);
    } catch (error) {
      showToast("Il browser non ha permesso l'audio. Riprova con un clic.");
    }
  }

  async function toggleQuickSound() {
    if (window.FiorituraAudio.isPlaying) {
      window.FiorituraAudio.stop();
      return;
    }
    stopEmbeddedMusic();
    const trackId = settings.track || "rain";
    settings.track = trackId;
    saveSettings();
    try {
      await window.FiorituraAudio.play(trackId);
    } catch (error) {
      showToast("Il browser non ha permesso l'audio. Riprova con un clic.");
    }
  }

  /* ---------- paese ---------- */

  function normalizeText(value) {
    return String(value)
      .toLocaleLowerCase("it")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function renderCountryOptions(filter = "") {
    if (!dom.countryList) return;
    const countries = window.FiorituraCountries ? window.FiorituraCountries.list : [];
    const query = normalizeText(filter.trim());
    const current = dom.countryCode ? dom.countryCode.value : "IT";
    const matches = countries.filter(
      (country) =>
        !query || normalizeText(country.name).includes(query) || country.code.toLowerCase().includes(query)
    );

    dom.countryList.innerHTML = "";
    if (!matches.length) {
      const empty = document.createElement("li");
      empty.className = "combo__empty";
      empty.textContent = "Nessun paese trovato.";
      dom.countryList.appendChild(empty);
      return;
    }

    matches.forEach((country) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "combo__option";
      button.dataset.code = country.code;
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", String(country.code === current));

      const flag = document.createElement("span");
      flag.className = "combo__flag";
      flag.textContent = country.flag;
      const name = document.createElement("span");
      name.textContent = country.name;
      button.appendChild(flag);
      button.appendChild(name);
      item.appendChild(button);
      dom.countryList.appendChild(item);
    });
  }

  function setCountry(code) {
    if (!window.FiorituraCountries) return;
    const country = window.FiorituraCountries.byCode[code] || window.FiorituraCountries.byCode.IT;
    if (!country) return;
    if (dom.countryCode) dom.countryCode.value = country.code;
    if (dom.countryFlag) dom.countryFlag.textContent = country.flag;
    if (dom.countryName) dom.countryName.textContent = country.name;
    if (dom.countryButton) {
      dom.countryButton.setAttribute("aria-label", `Paese selezionato: ${country.name}. Cambia paese`);
    }
    renderCountryOptions(countryFilter);
  }

  function openCountryPopover() {
    if (!dom.countryPop) return;
    dom.countryPop.hidden = false;
    dom.countrySearch.value = "";
    countryFilter = "";
    renderCountryOptions("");
    dom.countryButton.setAttribute("aria-expanded", "true");
    window.requestAnimationFrame(() => {
      if (dom.countrySearch) dom.countrySearch.focus();
      scrollCountryToSelected();
    });
  }

  function closeCountryPopover() {
    if (!dom.countryPop || dom.countryPop.hidden) return;
    dom.countryPop.hidden = true;
    dom.countryButton.setAttribute("aria-expanded", "false");
  }

  function scrollCountryToSelected() {
    if (!dom.countryList) return;
    const selected = dom.countryList.querySelector('[aria-selected="true"]');
    if (selected) {
      dom.countryList.scrollTop = Math.max(0, selected.offsetTop - 90);
    }
  }

  function initCountries() {
    if (!window.FiorituraCountries || !dom.countryList) return;
    renderCountryOptions("");

    dom.countryButton.addEventListener("click", () => {
      if (dom.countryPop.hidden) openCountryPopover();
      else closeCountryPopover();
    });

    dom.countrySearch.addEventListener("input", () => {
      countryFilter = dom.countrySearch.value;
      renderCountryOptions(countryFilter);
      dom.countryList.scrollTop = 0;
    });

    dom.countrySearch.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeCountryPopover();
        dom.countryButton.focus();
      } else if (event.key === "Enter") {
        event.preventDefault();
        const first = dom.countryList.querySelector(".combo__option");
        if (first) first.click();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        const first = dom.countryList.querySelector(".combo__option");
        if (first) first.focus();
      }
    });

    dom.countryList.addEventListener("click", (event) => {
      const option = event.target.closest(".combo__option");
      if (!option) return;
      setCountry(option.dataset.code);
      closeCountryPopover();
      dom.countryButton.focus();
    });

    dom.countryList.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeCountryPopover();
        dom.countryButton.focus();
      }
    });

    document.addEventListener("pointerdown", (event) => {
      if (!dom.countryPop || dom.countryPop.hidden) return;
      if (!dom.countryCombo.contains(event.target)) closeCountryPopover();
    });

    setCountry(profile ? profile.country : "IT");
  }

  /* ---------- modali ---------- */

  function openModal(id, focusSelector) {
    const modal = document.getElementById(id);
    if (!modal) return;

    if (activeModal && activeModal !== modal) {
      closeModal(activeModal.id);
    }

    previousFocus = document.activeElement;
    modal.hidden = false;
    activeModal = modal;
    document.body.classList.add("modal-open");

    window.setTimeout(() => {
      const target = focusSelector
        ? modal.querySelector(focusSelector)
        : modal.querySelector("button, input, [href]");
      if (target && typeof target.focus === "function") {
        target.focus({ preventScroll: true });
      }
    }, 60);
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    if (id === "callModal" && call.active) {
      endCall({ silent: true });
    }
    modal.hidden = true;
    if (activeModal === modal) {
      activeModal = null;
      document.body.classList.remove("modal-open");
      if (previousFocus && typeof previousFocus.focus === "function") {
        previousFocus.focus({ preventScroll: true });
        previousFocus = null;
      }
    }
  }

  function trapFocus(event) {
    if (!activeModal || event.key !== "Tab") return;
    const focusables = $$(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      activeModal
    ).filter((element) => element.offsetParent !== null && !element.hidden);
    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function dismissDoneAndReset() {
    closeModal("doneModal");
    resetAfterDone();
  }

  /* ---------- particelle ---------- */

  function initParticles() {
    const canvas = document.getElementById("drift");
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const colors = [
      [255, 211, 173],
      [255, 159, 182],
      [195, 170, 255],
      [169, 232, 209]
    ];
    let width = 0;
    let height = 0;
    let dpr = 1;
    const particles = [];

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function makeParticle() {
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 0.7 + Math.random() * 2.4,
        speed: 5 + Math.random() * 16,
        drift: -6 + Math.random() * 12,
        alpha: 0.1 + Math.random() * 0.32,
        twinkle: Math.random() * Math.PI * 2,
        color: colors[Math.floor(Math.random() * colors.length)]
      };
    }

    resize();
    for (let index = 0; index < 34; index += 1) particles.push(makeParticle());
    window.addEventListener("resize", resize);

    let previous = performance.now();
    function frame(now) {
      const dt = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      context.clearRect(0, 0, width, height);

      particles.forEach((particle) => {
        particle.y -= particle.speed * dt;
        particle.x += particle.drift * dt;
        particle.twinkle += dt * 1.1;

        if (particle.y < -12) {
          particle.y = height + 12;
          particle.x = Math.random() * width;
        }
        if (particle.x < -12) particle.x = width + 12;
        if (particle.x > width + 12) particle.x = -12;

        const alpha = particle.alpha * (0.7 + 0.3 * Math.sin(particle.twinkle));
        const [red, green, blue] = particle.color;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
        context.fill();
      });

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  /* ---------- eventi ---------- */

  function bindEvents() {
    dom.startBtn.addEventListener("click", toggleTimer);
    dom.resetBtn.addEventListener("click", () => resetTimer());
    dom.addFiveBtn.addEventListener("click", addFiveMinutes);

    dom.presets.addEventListener("click", (event) => {
      const button = event.target.closest(".preset");
      if (!button) return;
      const minutes = Number(button.dataset.minutes);
      if (!Number.isFinite(minutes)) return;
      setDuration(minutes * 60);
    });

    dom.customForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const minutes = clamp(parseInt(dom.customMinutes.value, 10) || 0, 0, 180);
      const seconds = clamp(parseInt(dom.customSeconds.value, 10) || 0, 0, 59);
      const total = minutes * 60 + seconds;
      if (total < MIN_DURATION) {
        showToast("Il timer minimo è di 1 minuto.");
        return;
      }
      setDuration(total);
      showToast(`Timer impostato: ${formatMinutes(total / 60)}.`);
    });

    dom.prefMusic.addEventListener("change", () => {
      setMusicAutostart(dom.prefMusic.checked);
    });

    dom.prefNotify.addEventListener("change", () => {
      setNotifyEnabled(dom.prefNotify.checked);
    });

    dom.profileButton.addEventListener("click", () => openSettings("profilo"));
    dom.saveScoreButton.addEventListener("click", () => openSettings("profilo"));
    dom.profileForm.addEventListener("submit", handleProfileSubmit);

    if (dom.settingsButton) {
      dom.settingsButton.addEventListener("click", () => openSettings());
    }

    if (dom.shopButton) {
      dom.shopButton.addEventListener("click", openShop);
    }

    if (dom.plantSeed) {
      dom.plantSeed.addEventListener("click", plantSeed);
    }

    if (dom.callButton) {
      dom.callButton.addEventListener("click", openCall);
    }
    if (dom.callStart) {
      dom.callStart.addEventListener("click", startCall);
    }
    if (dom.callTarget) {
      dom.callTarget.addEventListener("change", () => {
        clearCallError();
        if (dom.callStart) {
          dom.callStart.disabled =
            call.busy ||
            window.FiorituraLeaderboard.getMode() !== "server" ||
            !dom.callTarget.value;
        }
      });
    }
    if (dom.callCancel) {
      dom.callCancel.addEventListener("click", cancelCall);
    }
    if (dom.callAccept) {
      dom.callAccept.addEventListener("click", () => {
        if (call.incoming) acceptCall(call.incoming.id);
      });
    }
    if (dom.callDecline) {
      dom.callDecline.addEventListener("click", () => {
        if (call.incoming) declineCall(call.incoming.id);
      });
    }
    if (dom.callEnd) {
      dom.callEnd.addEventListener("click", () => endCall());
    }
    if (dom.callAgain) {
      dom.callAgain.addEventListener("click", () => {
        clearCallError();
        setCallView("setup");
        syncCallIdentityUI();
        renderCallTargets();
      });
    }
    if (dom.callToastAccept) {
      dom.callToastAccept.addEventListener("click", () => {
        if (call.incoming) acceptCall(call.incoming.id);
      });
    }
    if (dom.callToastDecline) {
      dom.callToastDecline.addEventListener("click", () => {
        if (call.incoming) declineCall(call.incoming.id);
      });
    }

    if (dom.shopFilters) {
      dom.shopFilters.addEventListener("click", (event) => {
        const button = event.target.closest("[data-filter]");
        if (button) setShopFilter(button.dataset.filter);
      });
    }

    if (dom.sourceSpotify) {
      dom.sourceSpotify.addEventListener("click", () => openMusicModal("spotify"));
    }
    if (dom.sourceYoutube) {
      dom.sourceYoutube.addEventListener("click", () => openMusicModal("youtube"));
    }
    if (dom.musicTabs) {
      dom.musicTabs.addEventListener("click", (event) => {
        const button = event.target.closest("[data-source]");
        if (button) switchMusicSource(button.dataset.source);
      });
    }
    if (dom.musicForm) dom.musicForm.addEventListener("submit", handleMusicSubmit);
    if (dom.musicOpen) dom.musicOpen.addEventListener("click", openLinkedMusic);
    if (dom.musicPlayHere) dom.musicPlayHere.addEventListener("click", playEmbeddedMusic);
    if (dom.musicUnlink) dom.musicUnlink.addEventListener("click", unlinkMusic);

    if (dom.settingsTabs) {
      dom.settingsTabs.addEventListener("click", (event) => {
        const tab = event.target.closest(".settings__tab");
        if (!tab) return;
        settings.settingsPanel = tab.dataset.panel;
        saveSettings();
        switchSettingsPanel(tab.dataset.panel);
      });

      dom.settingsTabs.addEventListener("keydown", (event) => {
        if (!["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
        const tabs = $$(".settings__tab", dom.settingsTabs);
        const index = tabs.indexOf(document.activeElement);
        if (index < 0) return;
        event.preventDefault();
        const forward = event.key === "ArrowDown" || event.key === "ArrowRight";
        const next = tabs[(index + (forward ? 1 : tabs.length - 1)) % tabs.length];
        if (next) {
          next.focus();
          settings.settingsPanel = next.dataset.panel;
          saveSettings();
          switchSettingsPanel(next.dataset.panel);
        }
      });
    }

    if (dom.themeGrid) {
      dom.themeGrid.addEventListener("click", (event) => {
        const swatch = event.target.closest("[data-theme]");
        if (swatch) setTheme(swatch.dataset.theme);
      });
    }

    if (dom.atmosphere) {
      dom.atmosphere.addEventListener("input", () => {
        setAtmosphere(dom.atmosphere.value);
      });
    }

    if (dom.particleToggle) {
      dom.particleToggle.addEventListener("change", () => {
        setParticles(dom.particleToggle.checked);
      });
    }

    if (dom.motionToggle) {
      dom.motionToggle.addEventListener("change", () => {
        setReduceMotion(dom.motionToggle.checked);
      });
    }

    if (dom.scaleChoice) {
      dom.scaleChoice.addEventListener("click", (event) => {
        const button = event.target.closest("[data-scale]");
        if (button) setScale(button.dataset.scale);
      });
    }

    if (dom.avatarPick) {
      dom.avatarPick.addEventListener("click", () => dom.avatarInput.click());
    }
    if (dom.avatarInput) {
      dom.avatarInput.addEventListener("change", () => {
        const file = dom.avatarInput.files && dom.avatarInput.files[0];
        dom.avatarInput.value = "";
        handleAvatarFile(file);
      });
    }
    if (dom.avatarRemove) {
      dom.avatarRemove.addEventListener("click", removeAvatar);
    }

    if (dom.customBgPick) {
      dom.customBgPick.addEventListener("click", () => dom.customBgInput.click());
    }
    if (dom.customBgInput) {
      dom.customBgInput.addEventListener("change", () => {
        const file = dom.customBgInput.files && dom.customBgInput.files[0];
        dom.customBgInput.value = "";
        handleBackgroundFile(file);
      });
    }
    if (dom.customBgRemove) {
      dom.customBgRemove.addEventListener("click", removeBackground);
    }

    if (dom.settingsDurationForm) {
      dom.settingsDurationForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const minutes = clamp(parseInt(dom.settingsDuration.value, 10) || 0, 1, 180);
        setDuration(minutes * 60);
        dom.settingsDuration.value = String(minutes);
        showToast(`Timer impostato su ${formatMinutes(minutes)}.`);
      });
    }

    if (dom.settingsMusic) {
      dom.settingsMusic.addEventListener("change", () => {
        setMusicAutostart(dom.settingsMusic.checked);
      });
    }

    if (dom.settingsNotify) {
      dom.settingsNotify.addEventListener("change", () => {
        setNotifyEnabled(dom.settingsNotify.checked);
      });
    }

    if (dom.settingsChime) {
      dom.settingsChime.addEventListener("change", () => {
        settings.chime = dom.settingsChime.checked;
        saveSettings();
      });
    }

    if (dom.settingsVolume) {
      dom.settingsVolume.addEventListener("input", () => {
        setVolume(Number(dom.settingsVolume.value) / 100);
      });
    }

    if (dom.exportData) dom.exportData.addEventListener("click", exportData);
    if (dom.resetProgress) {
      dom.resetProgress.addEventListener("click", () => {
        armDanger(dom.resetProgress, "Riparti da zero", "Tocca di nuovo per confermare", resetProgress);
      });
    }
    if (dom.resetAll) {
      dom.resetAll.addEventListener("click", () => {
        armDanger(dom.resetAll, "Elimina tutto", "Tocca di nuovo per confermare", resetEverything);
      });
    }

    dom.tabWeek.addEventListener("click", () => setPeriod("week"));
    dom.tabAll.addEventListener("click", () => setPeriod("all"));

    dom.soundList.addEventListener("click", (event) => {
      const button = event.target.closest(".sound");
      if (!button) return;
      toggleSound(button.dataset.track);
    });

    dom.soundQuick.addEventListener("click", toggleQuickSound);
    dom.stopSound.addEventListener("click", () => window.FiorituraAudio.stop());

    dom.volume.addEventListener("input", () => {
      setVolume(Number(dom.volume.value) / 100);
    });

    dom.doneBreak.addEventListener("click", () => {
      closeModal("doneModal");
      setDuration(5 * 60);
      document.getElementById("timer").scrollIntoView({ behavior: "smooth", block: "center" });
      showToast("Pausa di 5 minuti pronta. Premi Inizia quando vuoi.");
    });

    dom.doneProfile.addEventListener("click", () => {
      closeModal("doneModal");
      resetAfterDone();
      openSettings("profilo");
    });

    dom.doneClose.addEventListener("click", dismissDoneAndReset);

    if (dom.brandLogo) {
      dom.brandLogo.addEventListener("dblclick", (event) => {
        event.preventDefault();
        openAdmin();
      });
      dom.brandLogo.addEventListener("click", (event) => {
        if (!window.matchMedia("(hover: none)").matches) return;
        const now = Date.now();
        if (now - lastBrandTap < 520) {
          event.preventDefault();
          lastBrandTap = 0;
          openAdmin();
        } else {
          lastBrandTap = now;
        }
      });
    }

    if (dom.announcementClose) {
      dom.announcementClose.addEventListener("click", dismissAnnouncement);
    }

    if (dom.adminLoginForm) {
      dom.adminLoginForm.addEventListener("submit", handleAdminLogin);
    }

    if (dom.adminLogout) {
      dom.adminLogout.addEventListener("click", handleAdminLogout);
    }

    if (dom.adminRefresh) {
      dom.adminRefresh.addEventListener("click", () => loadAdmin());
    }

    if (dom.adminTabs) {
      dom.adminTabs.addEventListener("click", (event) => {
        const button = event.target.closest("[data-admin-tab]");
        if (button) setAdminTab(button.dataset.adminTab);
      });
    }

    if (dom.adminSearch) {
      dom.adminSearch.addEventListener("input", () => {
        adminSearch = dom.adminSearch.value.trim().toLocaleLowerCase("it");
        renderAdminParticipants();
      });
    }

    if (dom.adminAnnouncementForm) {
      dom.adminAnnouncementForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const text = dom.adminAnnouncementText ? dom.adminAnnouncementText.value.trim() : "";
        runAdminAction(
          { action: "setAnnouncement", text },
          { toast: text ? "Annuncio pubblicato in home." : "Annuncio rimosso." }
        );
      });
    }

    if (dom.adminAnnouncementClear) {
      dom.adminAnnouncementClear.addEventListener("click", () => {
        if (dom.adminAnnouncementText) dom.adminAnnouncementText.value = "";
        runAdminAction({ action: "setAnnouncement", text: "" }, { toast: "Annuncio rimosso." });
      });
    }

    if (dom.adminResetLeaderboard) {
      dom.adminResetLeaderboard.addEventListener("click", () => {
        const clearShop = Boolean(dom.adminResetShop && dom.adminResetShop.checked);
        const clearCatalog = Boolean(dom.adminResetCatalog && dom.adminResetCatalog.checked);
        const warning = [
          "Azzerare la classifica condivisa?",
          "Verranno eliminate tutte le sessioni e le rettifiche XP.",
          clearShop ? "Verranno svuotati anche gli inventari del negozio." : "",
          clearCatalog ? "Verranno ripristinati anche prezzi e disponibilità." : "",
          "L'annuncio resta."
        ]
          .filter(Boolean)
          .join("\n");
        if (!window.confirm(warning)) return;
        runAdminAction(
          { action: "resetLeaderboard", clearShop, clearCatalog },
          { leaderboard: true, shop: clearShop || clearCatalog, toast: "Classifica azzerata." }
        );
      });
    }

    if (dom.adminResetShopOnly) {
      dom.adminResetShopOnly.addEventListener("click", () => {
        if (!window.confirm("Svuotare gli inventari del negozio di tutti i partecipanti?")) return;
        runAdminAction(
          { action: "resetShop" },
          { shop: true, toast: "Inventari del negozio svuotati." }
        );
      });
    }

    if (dom.adminExport) {
      dom.adminExport.addEventListener("click", adminExport);
    }

    if (dom.adminParticipants) {
      dom.adminParticipants.addEventListener("submit", (event) => {
        const form = event.target.closest("[data-xp-form]");
        if (!form) return;
        event.preventDefault();
        const amount = Math.trunc(Number(form.elements.amount.value));
        if (!Number.isFinite(amount) || amount < 0) {
          showToast("Inserisci una quantità XP valida.");
          return;
        }
        runAdminAction(
          {
            action: "adjustXp",
            username: form.dataset.username,
            country: form.dataset.country,
            mode: form.elements.mode.value,
            amount
          },
          { leaderboard: true, toast: "XP aggiornati." }
        );
      });

      dom.adminParticipants.addEventListener("click", (event) => {
        const button = event.target.closest("[data-admin-action]");
        if (!button) return;
        const action = button.dataset.adminAction;
        const username = button.dataset.username;
        const country = button.dataset.country;

        if (action === "deleteParticipant") {
          if (
            !window.confirm(
              `Eliminare ${username}? Verranno rimossi sessioni, rettifiche, XP e oggetti del negozio.`
            )
          ) {
            return;
          }
          runAdminAction(
            { action: "deleteParticipant", username, country },
            { leaderboard: true, shop: true, toast: `${username} eliminato.` }
          );
          return;
        }

        if (action === "revokeItem") {
          const item = shopItem(button.dataset.id);
          runAdminAction(
            { action: "revokeItem", username, country, id: button.dataset.id },
            { shop: true, toast: `${item ? item.name : "Oggetto"} rimosso.` }
          );
          return;
        }

        if (action === "grantItem") {
          const grant = button.closest(".admin-item-grant");
          const select = grant ? grant.querySelector("[data-grant-select]") : null;
          if (!select || !select.value) return;
          const item = shopItem(select.value);
          runAdminAction(
            { action: "grantItem", username, country, id: select.value },
            { shop: true, toast: `${item ? item.name : "Oggetto"} assegnato.` }
          );
        }
      });
    }

    if (dom.adminItems) {
      dom.adminItems.addEventListener("click", (event) => {
        const button = event.target.closest("[data-admin-action]");
        if (!button) return;
        const card = button.closest(".admin-item");
        if (!card) return;
        const id = button.dataset.id;

        if (button.dataset.adminAction === "resetCatalogItem") {
          runAdminAction(
            { action: "resetCatalogItem", id },
            { shop: true, toast: "Prezzo e disponibilità ripristinati." }
          );
          return;
        }

        if (button.dataset.adminAction === "saveCatalogItem") {
          const priceInput = card.querySelector(".admin-item__price input");
          const activeInput = card.querySelector(".admin-check input");
          const price = Math.trunc(Number(priceInput ? priceInput.value : NaN));
          if (!Number.isFinite(price) || price < 0 || price > 100000) {
            showToast("Il prezzo deve stare tra 0 e 100000 XP.");
            return;
          }
          runAdminAction(
            {
              action: "setCatalogItem",
              id,
              price,
              active: Boolean(activeInput && activeInput.checked)
            },
            { shop: true, toast: "Catalogo aggiornato." }
          );
        }
      });
    }

    if (dom.adminSessions) {
      dom.adminSessions.addEventListener("click", (event) => {
        const button = event.target.closest("[data-admin-action]");
        if (!button || button.dataset.adminAction !== "deleteSession") return;
        if (!window.confirm("Eliminare questa sessione dalla classifica condivisa?")) return;
        runAdminAction(
          {
            action: "deleteSession",
            username: button.dataset.username,
            country: button.dataset.country,
            ts: Number(button.dataset.ts)
          },
          { leaderboard: true, toast: "Sessione eliminata." }
        );
      });
    }

    if (dom.adminAdjustments) {
      dom.adminAdjustments.addEventListener("click", (event) => {
        const button = event.target.closest("[data-admin-action]");
        if (!button || button.dataset.adminAction !== "deleteAdjustment") return;
        if (!window.confirm("Annullare questa rettifica XP?")) return;
        runAdminAction(
          { action: "deleteAdjustment", id: button.dataset.id },
          { leaderboard: true, toast: "Rettifica annullata." }
        );
      });
    }

    document.addEventListener("click", (event) => {
      const closer = event.target.closest("[data-close]");
      if (!closer) return;
      const modal = closer.closest(".modal");
      if (!modal) return;
      if (modal.id === "doneModal") dismissDoneAndReset();
      else closeModal(modal.id);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (activeModal) {
          if (dom.countryPop && !dom.countryPop.hidden) {
            closeCountryPopover();
            return;
          }
          if (activeModal.id === "doneModal") dismissDoneAndReset();
          else closeModal(activeModal.id);
          return;
        }
        if (dom.countryPop && !dom.countryPop.hidden) {
          closeCountryPopover();
          return;
        }
      }

      trapFocus(event);

      if (activeModal) return;
      const tag = event.target.tagName;
      if (["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A", "SUMMARY"].includes(tag)) return;

      if (event.code === "Space") {
        event.preventDefault();
        toggleTimer();
      } else if (event.key === "r" || event.key === "R") {
        resetTimer();
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        paintTimer();
        if (window.FiorituraLeaderboard.getMode() === "server") {
          syncShopState({ silent: true });
          refreshCalls({ silent: true });
          if (!callPollTimer) startCallPolling();
          if (adminData) loadAdmin();
        }
      }
    });

    window.addEventListener("resize", () => {
      window.clearTimeout(topbarResizeTimer);
      topbarResizeTimer = window.setTimeout(renderProfileUI, 120);
    });

    window.addEventListener("pagehide", () => {
      if (state.running) saveTimer();
    });
  }

  /* ---------- avvio ---------- */

  function cacheDom() {
    dom.timer = document.getElementById("timer");
    dom.timerCard = document.getElementById("timerCard");
    dom.soundQuick = document.getElementById("soundQuick");
    dom.profileButton = document.getElementById("profileButton");
    dom.profileLabel = document.getElementById("profileLabel");
    dom.topAvatar = document.getElementById("topAvatar");
    dom.settingsButton = document.getElementById("settingsButton");
    dom.backdropPhoto = document.getElementById("backdropPhoto");
    dom.statusPill = document.getElementById("statusPill");
    dom.statusText = document.getElementById("statusText");
    dom.sessionLabel = document.getElementById("sessionLabel");
    dom.dialLabel = document.getElementById("dialLabel");
    dom.ringProgress = document.getElementById("ringProgress");
    dom.ringDot = document.getElementById("ringDot");
    dom.timeDisplay = document.getElementById("timeDisplay");
    dom.xpPreview = document.getElementById("xpPreview");
    dom.startBtn = document.getElementById("startBtn");
    dom.startLabel = document.getElementById("startLabel");
    dom.resetBtn = document.getElementById("resetBtn");
    dom.addFiveBtn = document.getElementById("addFiveBtn");
    dom.presets = document.getElementById("presets");
    dom.customForm = document.getElementById("customForm");
    dom.customMinutes = document.getElementById("customMinutes");
    dom.customSeconds = document.getElementById("customSeconds");
    dom.prefMusic = document.getElementById("prefMusic");
    dom.prefNotify = document.getElementById("prefNotify");
    dom.timerAnnouncer = document.getElementById("timerAnnouncer");
    dom.soundList = document.getElementById("soundList");
    dom.stopSound = document.getElementById("stopSound");
    dom.soundStatus = document.getElementById("soundStatus");
    dom.volume = document.getElementById("volume");
    dom.volumeValue = document.getElementById("volumeValue");
    dom.heroLevel = document.getElementById("heroLevel");
    dom.heroXp = document.getElementById("heroXp");
    dom.heroStreak = document.getElementById("heroStreak");
    dom.topbarQuote = document.getElementById("topbarQuote");
    dom.callButton = document.getElementById("callButton");
    dom.callBadge = document.getElementById("callBadge");
    dom.dialTree = document.getElementById("dialTree");
    dom.gardenTree = document.getElementById("gardenTree");
    dom.treeStage = document.getElementById("treeStage");
    dom.treeStageName = document.getElementById("treeStageName");
    dom.statSeeds = document.getElementById("statSeeds");
    dom.plantSeed = document.getElementById("plantSeed");
    dom.plantTitle = document.getElementById("plantTitle");
    dom.plantHint = document.getElementById("plantHint");
    dom.levelTitle = document.getElementById("levelTitle");
    dom.levelBadge = document.getElementById("levelBadge");
    dom.levelProgress = document.getElementById("levelProgress");
    dom.levelBar = document.getElementById("levelBar");
    dom.levelHint = document.getElementById("levelHint");
    dom.statXp = document.getElementById("statXp");
    dom.statMinutes = document.getElementById("statMinutes");
    dom.statSessions = document.getElementById("statSessions");
    dom.recentList = document.getElementById("recentList");
    dom.tabWeek = document.getElementById("tabWeek");
    dom.tabAll = document.getElementById("tabAll");
    dom.lbMode = document.getElementById("lbMode");
    dom.lbModeText = document.getElementById("lbModeText");
    dom.lbSub = document.getElementById("lbSub");
    dom.saveScoreButton = document.getElementById("saveScoreButton");
    dom.podium = document.getElementById("podium");
    dom.lbList = document.getElementById("lbList");
    dom.lbFoot = document.getElementById("lbFoot");
    dom.profileModal = null;
    dom.profileForm = document.getElementById("profileForm");
    dom.nameInput = document.getElementById("nameInput");
    dom.countryCombo = document.getElementById("countryCombo");
    dom.countryButton = document.getElementById("countryButton");
    dom.countryFlag = document.getElementById("countryFlag");
    dom.countryName = document.getElementById("countryName");
    dom.countryPop = document.getElementById("countryPop");
    dom.countrySearch = document.getElementById("countrySearch");
    dom.countryList = document.getElementById("countryList");
    dom.countryCode = document.getElementById("countryCode");
    dom.profileHint = document.getElementById("profileHint");
    dom.profileSubmit = document.getElementById("profileSubmit");
    dom.profilePending = document.getElementById("profilePending");

    dom.settingsModal = document.getElementById("settingsModal");
    dom.settingsTabs = dom.settingsModal
      ? dom.settingsModal.querySelector(".settings__tabs")
      : null;
    dom.settingsProfileName = document.getElementById("settingsProfileName");
    dom.settingsProfileMeta = document.getElementById("settingsProfileMeta");
    dom.avatarPreview = document.getElementById("avatarPreview");
    dom.avatarPick = document.getElementById("avatarPick");
    dom.avatarRemove = document.getElementById("avatarRemove");
    dom.avatarInput = document.getElementById("avatarInput");
    dom.themeGrid = document.getElementById("themeGrid");
    dom.customBgPick = document.getElementById("customBgPick");
    dom.customBgRemove = document.getElementById("customBgRemove");
    dom.customBgInput = document.getElementById("customBgInput");
    dom.customBgHint = document.getElementById("customBgHint");
    dom.atmosphere = document.getElementById("atmosphere");
    dom.atmosphereValue = document.getElementById("atmosphereValue");
    dom.particleToggle = document.getElementById("particleToggle");
    dom.motionToggle = document.getElementById("motionToggle");
    dom.scaleChoice = document.getElementById("scaleChoice");
    dom.settingsDurationForm = document.getElementById("settingsDurationForm");
    dom.settingsDuration = document.getElementById("settingsDuration");
    dom.settingsMusic = document.getElementById("settingsMusic");
    dom.settingsNotify = document.getElementById("settingsNotify");
    dom.settingsChime = document.getElementById("settingsChime");
    dom.settingsVolume = document.getElementById("settingsVolume");
    dom.settingsVolumeValue = document.getElementById("settingsVolumeValue");
    dom.exportData = document.getElementById("exportData");
    dom.resetProgress = document.getElementById("resetProgress");
    dom.resetAll = document.getElementById("resetAll");
    dom.settingsProfileBadge = document.getElementById("settingsProfileBadge");
    dom.shopButton = document.getElementById("shopButton");
    dom.shopModal = document.getElementById("shopModal");
    dom.shopBalance = document.getElementById("shopBalance");
    dom.shopTotal = document.getElementById("shopTotal");
    dom.shopOwned = document.getElementById("shopOwned");
    dom.shopFilters = document.getElementById("shopFilters");
    dom.shopGrid = document.getElementById("shopGrid");
    dom.shopFoot = document.getElementById("shopFoot");
    dom.brandLogo = document.getElementById("brandLogo");
    dom.announcement = document.getElementById("announcement");
    dom.announcementText = document.getElementById("announcementText");
    dom.announcementClose = document.getElementById("announcementClose");
    dom.callModal = document.getElementById("callModal");
    dom.callSetup = document.getElementById("callSetup");
    dom.callWaiting = document.getElementById("callWaiting");
    dom.callIncoming = document.getElementById("callIncoming");
    dom.callActive = document.getElementById("callActive");
    dom.callEnded = document.getElementById("callEnded");
    dom.callTitle = document.getElementById("callTitle");
    dom.callSub = document.getElementById("callSub");
    dom.callSelfName = document.getElementById("callSelfName");
    dom.callSelfCountry = document.getElementById("callSelfCountry");
    dom.callSelfHint = document.getElementById("callSelfHint");
    dom.callTarget = document.getElementById("callTarget");
    dom.callError = document.getElementById("callError");
    dom.callStart = document.getElementById("callStart");
    dom.callWaitingName = document.getElementById("callWaitingName");
    dom.callWaitingHint = document.getElementById("callWaitingHint");
    dom.callCancel = document.getElementById("callCancel");
    dom.callIncomingAvatar = document.getElementById("callIncomingAvatar");
    dom.callIncomingName = document.getElementById("callIncomingName");
    dom.callAccept = document.getElementById("callAccept");
    dom.callDecline = document.getElementById("callDecline");
    dom.callFrame = document.getElementById("callFrame");
    dom.callPeer = document.getElementById("callPeer");
    dom.callEnd = document.getElementById("callEnd");
    dom.callEndedTitle = document.getElementById("callEndedTitle");
    dom.callEndedText = document.getElementById("callEndedText");
    dom.callAgain = document.getElementById("callAgain");
    dom.callToast = document.getElementById("callToast");
    dom.callToastName = document.getElementById("callToastName");
    dom.callToastText = document.getElementById("callToastText");
    dom.callToastAccept = document.getElementById("callToastAccept");
    dom.callToastDecline = document.getElementById("callToastDecline");
    dom.adminModal = document.getElementById("adminModal");
    dom.adminLogin = document.getElementById("adminLogin");
    dom.adminApp = document.getElementById("adminApp");
    dom.adminLoginForm = document.getElementById("adminLoginForm");
    dom.adminUser = document.getElementById("adminUser");
    dom.adminPassword = document.getElementById("adminPassword");
    dom.adminLoginError = document.getElementById("adminLoginError");
    dom.adminLoginSubmit = document.getElementById("adminLoginSubmit");
    dom.adminOffline = document.getElementById("adminOffline");
    dom.adminRefresh = document.getElementById("adminRefresh");
    dom.adminLogout = document.getElementById("adminLogout");
    dom.adminTabs = document.getElementById("adminTabs");
    dom.adminStats = document.getElementById("adminStats");
    dom.adminStatus = document.getElementById("adminStatus");
    dom.adminAnnouncementForm = document.getElementById("adminAnnouncementForm");
    dom.adminAnnouncementText = document.getElementById("adminAnnouncementText");
    dom.adminAnnouncementClear = document.getElementById("adminAnnouncementClear");
    dom.adminResetShop = document.getElementById("adminResetShop");
    dom.adminResetCatalog = document.getElementById("adminResetCatalog");
    dom.adminResetLeaderboard = document.getElementById("adminResetLeaderboard");
    dom.adminResetShopOnly = document.getElementById("adminResetShopOnly");
    dom.adminExport = document.getElementById("adminExport");
    dom.adminAdjustments = document.getElementById("adminAdjustments");
    dom.adminSearch = document.getElementById("adminSearch");
    dom.adminParticipantCount = document.getElementById("adminParticipantCount");
    dom.adminParticipants = document.getElementById("adminParticipants");
    dom.adminItems = document.getElementById("adminItems");
    dom.adminSessions = document.getElementById("adminSessions");
    dom.adminSessionsHint = document.getElementById("adminSessionsHint");
    dom.sourceSpotify = document.getElementById("sourceSpotify");
    dom.sourceYoutube = document.getElementById("sourceYoutube");
    dom.sourceSpotifyState = document.getElementById("sourceSpotifyState");
    dom.sourceYoutubeState = document.getElementById("sourceYoutubeState");
    dom.musicModal = document.getElementById("musicModal");
    dom.musicTabs = document.getElementById("musicTabs");
    dom.musicForm = document.getElementById("musicForm");
    dom.musicUrl = document.getElementById("musicUrl");
    dom.musicName = document.getElementById("musicName");
    dom.musicHint = document.getElementById("musicHint");
    dom.musicSubmit = document.getElementById("musicSubmit");
    dom.musicCurrent = document.getElementById("musicCurrent");
    dom.musicCurrentChip = document.getElementById("musicCurrentChip");
    dom.musicCurrentName = document.getElementById("musicCurrentName");
    dom.musicCurrentUrl = document.getElementById("musicCurrentUrl");
    dom.musicOpen = document.getElementById("musicOpen");
    dom.musicPlayHere = document.getElementById("musicPlayHere");
    dom.musicUnlink = document.getElementById("musicUnlink");
    dom.musicEmbed = document.getElementById("musicEmbed");
    dom.musicFrame = document.getElementById("musicFrame");
    dom.doneModal = document.getElementById("doneModal");
    dom.doneXp = document.getElementById("doneXp");
    dom.doneSub = document.getElementById("doneSub");
    dom.doneBreakdown = document.getElementById("doneBreakdown");
    dom.doneFoot = document.getElementById("doneFoot");
    dom.doneBreak = document.getElementById("doneBreak");
    dom.doneProfile = document.getElementById("doneProfile");
    dom.doneClose = document.getElementById("doneClose");
    dom.petals = document.getElementById("petals");
    dom.toast = document.getElementById("toast");
  }

  function boot() {
    cacheDom();
    loadSettings();
    loadStats();
    loadProfile();
    loadCallIdentity();
    loadPending();
    loadBackground();
    loadShop();
    loadMusic();
    restoreTimer();

    state.period = settings.period;
    initCountries();
    initSounds();
    initParticles();
    applyAppearance();
    applyAccent();
    syncMusicUI();
    renderShop();
    renderProfileUI();
    renderStats();
    syncCustomInputs();
    markPreset();
    setPeriod(state.period);
    switchSettingsPanel(settingsPanel);
    bindEvents();
    paintTimer();
    startQuoteRotation();

    if (state.running) {
      startLoops();
      announce("Timer ripreso da dove lo avevi lasciato.");
    }

    window.FiorituraLeaderboard.init().then(() => {
      renderLeaderboard();
      renderProfileUI();
      updatePendingNote();
      setAdminTab(adminTab);

      if (window.FiorituraLeaderboard.announcement) {
        applyAnnouncement(window.FiorituraLeaderboard.announcement);
      }

      if (window.FiorituraLeaderboard.getMode() === "server") {
        syncShopState({ silent: true });
        startCallPolling();
      }

      if (state.expired) {
        state.expired = false;
        // La sessione era terminata mentre la pagina non era aperta.
        finishSession();
      }

      if (state.pendingProfile) {
        state.pendingProfile = false;
        openSettings("profilo");
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
