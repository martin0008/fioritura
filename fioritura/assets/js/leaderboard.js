/* =========================================================
   Fioritura — classifica
   Modalità locale (localStorage) oppure condivisa (server Python).
   ========================================================= */
(function () {
  "use strict";

  const KEY_SESSIONS = "fioritura.sessions.v1";
  const KEY_SEEDED = "fioritura.seeded.v1";
  const KEY_PENDING = "fioritura.pending.v1";
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const API_URL = "api/leaderboard";

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
    } catch (error) {
      /* spazio esaurito: pazienza */
    }
  }

  function xpForMinutes(minutes) {
    if (minutes < 5) return 0;
    const base = minutes * 10;
    const bonus = minutes >= 50 ? 0.5 : minutes >= 25 ? 0.25 : 0;
    return Math.round(base * (1 + bonus));
  }

  const DEMO_PLAYERS = [
    { name: "Marta", country: "IT", minutes: [50, 45, 25, 60, 90, 50], ago: [3, 8, 14, 96, 130, 190] },
    { name: "Kenji", country: "JP", minutes: [50, 50, 45, 25, 60], ago: [12, 30, 52, 110, 170] },
    { name: "Sofia", country: "BR", minutes: [25, 45, 60, 25], ago: [6, 20, 74, 150] },
    { name: "Noa", country: "SE", minutes: [25, 25, 45, 15], ago: [18, 40, 66, 120] },
    { name: "Liam", country: "IE", minutes: [50, 25, 25, 25], ago: [9, 48, 100, 160] },
    { name: "Amina", country: "MA", minutes: [25, 45, 15], ago: [26, 58, 140] },
    { name: "Elena", country: "ES", minutes: [25, 25, 15, 25], ago: [34, 62, 90, 168] },
    { name: "Théo", country: "FR", minutes: [45, 15, 25], ago: [15, 80, 186] },
    { name: "Ravi", country: "IN", minutes: [25, 25, 15], ago: [22, 57, 130] },
    { name: "Maya", country: "US", minutes: [25, 15], ago: [44, 155] },
    { name: "Luca", country: "IT", minutes: [15, 5, 25], ago: [5, 36, 118] },
    { name: "Hana", country: "KR", minutes: [5, 15], ago: [28, 104] }
  ];

  function buildDemoSessions() {
    const now = Date.now();
    const sessions = [];
    DEMO_PLAYERS.forEach((player) => {
      player.minutes.forEach((minutes, index) => {
        sessions.push({
          username: player.name,
          country: player.country,
          minutes,
          xp: xpForMinutes(minutes),
          ts: now - player.ago[index] * 60 * 60 * 1000
        });
      });
    });
    return sessions;
  }

  function aggregate(sessions, since) {
    const map = new Map();
    sessions.forEach((session) => {
      if (!session || typeof session.ts !== "number") return;
      if (since && session.ts < since) return;
      const username = String(session.username || "").slice(0, 20);
      const country = String(session.country || "").toUpperCase();
      if (!username || !/^[A-Z]{2}$/.test(country)) return;
      const key = username.toLocaleLowerCase("it") + "|" + country;
      const entry = map.get(key) || {
        username,
        country,
        xp: 0,
        minutes: 0,
        sessions: 0,
        lastAt: 0
      };
      entry.xp += Math.max(0, Math.round(Number(session.xp) || 0));
      entry.minutes += Math.max(0, Math.round(Number(session.minutes) || 0));
      entry.sessions += 1;
      entry.lastAt = Math.max(entry.lastAt, session.ts);
      map.set(key, entry);
    });

    return Array.from(map.values())
      .sort((a, b) => {
        if (b.xp !== a.xp) return b.xp - a.xp;
        if (b.sessions !== a.sessions) return b.sessions - a.sessions;
        if (b.lastAt !== a.lastAt) return b.lastAt - a.lastAt;
        return a.username.localeCompare(b.username, "it");
      })
      .slice(0, 50)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }

  const Leaderboard = {
    mode: "local",
    cache: { all: [], week: [] },
    pending: [],
    lastError: null,
    announcement: null,
    ready: null,

    init() {
      this.pending = readJSON(KEY_PENDING, []);
      this.loadLocalSeeds();
      this.ready = this.detectServer();
      return this.ready;
    },

    loadLocalSeeds() {
      if (readJSON(KEY_SEEDED, false)) return;
      const sessions = readJSON(KEY_SESSIONS, []);
      if (!Array.isArray(sessions) || sessions.length === 0) {
        writeJSON(KEY_SESSIONS, buildDemoSessions());
      }
      writeJSON(KEY_SEEDED, true);
    },

    async detectServer() {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 2200);
      try {
        const response = await fetch(API_URL, {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal
        });
        if (!response.ok) throw new Error("HTTP " + response.status);
        const data = await response.json();
        if (!data || data.mode !== "server" || !Array.isArray(data.all)) {
          throw new Error("Risposta non valida");
        }
        this.mode = "server";
        this.cache = { all: data.all, week: data.week || [] };
        this.announcement = data.announcement || null;
        this.lastError = null;
        if (this.pending.length) this.flushPending();
      } catch (error) {
        this.mode = "local";
        this.cache = {
          all: this.localEntries("all"),
          week: this.localEntries("week")
        };
        this.lastError = error;
      } finally {
        window.clearTimeout(timeout);
      }
      return this.mode;
    },

    localEntries(period) {
      const sessions = readJSON(KEY_SESSIONS, []);
      if (!Array.isArray(sessions)) return [];
      return aggregate(sessions, period === "week" ? Date.now() - WEEK_MS : 0);
    },

    getEntries(period) {
      const key = period === "week" ? "week" : "all";
      if (this.mode === "server") return this.cache[key] || [];
      return this.localEntries(key);
    },

    getMode() {
      return this.mode;
    },

    findMe(period, username, country) {
      if (!username) return null;
      const entries = this.getEntries(period);
      const wanted = username.trim().toLocaleLowerCase("it");
      return (
        entries.find(
          (entry) =>
            entry.username.toLocaleLowerCase("it") === wanted &&
            entry.country === String(country || "").toUpperCase()
        ) || null
      );
    },

    addLocalSession(session) {
      const sessions = readJSON(KEY_SESSIONS, []);
      sessions.push({
        username: session.username,
        country: session.country,
        xp: Math.max(0, Math.round(session.xp)),
        minutes: Math.max(0, Math.round(session.minutes)),
        ts: Number(session.ts) || Date.now()
      });
      while (sessions.length > 5000) sessions.shift();
      writeJSON(KEY_SESSIONS, sessions);
      this.cache = {
        all: this.localEntries("all"),
        week: this.localEntries("week")
      };
    },

    resetLocal(username, country) {
      if (this.mode === "server") return false;
      const sessions = readJSON(KEY_SESSIONS, []);
      if (!Array.isArray(sessions)) return false;
      const wanted = String(username || "").trim().toLocaleLowerCase("it");
      const code = String(country || "").toUpperCase();
      const filtered = sessions.filter(
        (session) =>
          !(
            String(session.username || "").trim().toLocaleLowerCase("it") === wanted &&
            String(session.country || "").toUpperCase() === code
          )
      );
      writeJSON(KEY_SESSIONS, filtered);
      this.cache = {
        all: this.localEntries("all"),
        week: this.localEntries("week")
      };
      return true;
    },

    async postSession(session) {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          username: session.username,
          country: session.country,
          minutes: session.minutes,
          xp: session.xp
        })
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const data = await response.json();
      if (!data || !Array.isArray(data.all)) throw new Error("Risposta non valida");
      this.cache = { all: data.all, week: data.week || [] };
      this.announcement = data.announcement || null;
      return data;
    },

    async addSession(session) {
      if (this.mode === "server") {
        try {
          await this.postSession(session);
          this.lastError = null;
          return { ok: true, queued: false, mode: "server" };
        } catch (error) {
          this.lastError = error;
          this.pending.push({
            username: session.username,
            country: session.country,
            minutes: session.minutes,
            xp: session.xp,
            ts: session.ts || Date.now()
          });
          writeJSON(KEY_PENDING, this.pending);
          return { ok: false, queued: true, mode: "server" };
        }
      }

      this.addLocalSession(session);
      return { ok: true, queued: false, mode: "local" };
    },

    async flushPending() {
      if (this.mode !== "server" || !this.pending.length) return;
      const queue = this.pending.slice();
      const failed = [];
      for (const session of queue) {
        try {
          await this.postSession(session);
        } catch (error) {
          failed.push(session);
          break;
        }
      }
      this.pending = failed;
      writeJSON(KEY_PENDING, this.pending);
    },

    async refresh() {
      if (this.mode !== "server") {
        this.cache = {
          all: this.localEntries("all"),
          week: this.localEntries("week")
        };
        return this.cache;
      }
      if (this.pending.length) await this.flushPending();
      try {
        const response = await fetch(API_URL, { cache: "no-store", headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error("HTTP " + response.status);
        const data = await response.json();
        if (!data || !Array.isArray(data.all)) throw new Error("Risposta non valida");
        this.cache = { all: data.all, week: data.week || [] };
        this.announcement = data.announcement || null;
        this.lastError = null;
      } catch (error) {
        this.lastError = error;
      }
      return this.cache;
    }
  };

  window.FiorituraLeaderboard = Leaderboard;
  window.FiorituraLeaderboard.xpForMinutes = xpForMinutes;
})();
