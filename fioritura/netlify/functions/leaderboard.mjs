// Fioritura — classifica condivisa su Netlify.
//
//   GET  /api/leaderboard  -> { mode, all, week, totalSessions, announcement, updatedAt }
//   POST /api/leaderboard  -> { username, country, minutes, xp }
//
// Lo stato completo (sessioni, rettifiche, negozio, annuncio) vive in un unico
// documento Netlify Blobs. Le scritture usano onlyIfMatch/onlyIfNew.

import {
  getStore,
  STORE_NAME,
  readState,
  mutateState,
  leaderboards,
  MAX_SESSIONS,
  MAX_BODY,
  RATE_LIMIT,
  RATE_WINDOW,
  NAME_RE,
  COUNTRY_RE,
  json,
  fail,
  rateLimited,
  clientIp
} from "../lib/state.mjs";

export default async (request) => {
  const store = getStore(STORE_NAME);

  if (request.method === "GET" || request.method === "HEAD") {
    try {
      const { state } = await readState(store);
      return json(leaderboards(state));
    } catch (error) {
      console.error("Fioritura GET:", error);
      return fail(503, "Classifica non disponibile in questo momento.");
    }
  }

  if (request.method !== "POST") {
    return fail(405, "Metodo non consentito.");
  }

  if (rateLimited("leaderboard", clientIp(request), RATE_LIMIT, RATE_WINDOW)) {
    return fail(429, "Troppe sessioni in poco tempo. Riprova più tardi.");
  }

  let raw = "";
  try {
    raw = await request.text();
  } catch (error) {
    return fail(400, "Richiesta vuota.");
  }
  if (!raw) return fail(400, "Richiesta vuota.");
  if (raw.length > MAX_BODY) return fail(413, "Richiesta troppo grande.");

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (error) {
    return fail(400, "JSON non valido.");
  }
  if (!payload || typeof payload !== "object") return fail(400, "Formato non valido.");

  const username = String(payload.username || "").trim().replace(/\s+/g, " ");
  const country = String(payload.country || "").trim().toUpperCase();
  const minutes = Number(payload.minutes);
  const xpInput = Math.round(Number(payload.xp));

  if (!NAME_RE.test(username)) {
    return fail(400, "Nome non valido: usa da 2 a 20 caratteri.");
  }
  if (!COUNTRY_RE.test(country)) return fail(400, "Paese non valido.");
  if (!(minutes >= 5 && minutes <= 600)) {
    return fail(400, "La sessione deve durare tra 5 e 600 minuti.");
  }
  if (!Number.isFinite(xpInput)) return fail(400, "Minuti o XP non validi.");

  const maximum = Math.round(minutes * 20);
  const xp = Math.max(0, Math.min(xpInput, maximum));
  if (xp <= 0) return fail(400, "XP non validi.");

  const session = {
    username,
    country,
    minutes: Math.round(minutes * 100) / 100,
    xp,
    ts: Date.now()
  };

  try {
    const { state } = await mutateState(store, (draft) => {
      draft.sessions.push(session);
      if (draft.sessions.length > MAX_SESSIONS) {
        draft.sessions = draft.sessions.slice(-MAX_SESSIONS);
      }
      return true;
    });
    return json(leaderboards(state), 201);
  } catch (error) {
    console.error("Fioritura POST:", error);
    return fail(503, "Non riesco a salvare la sessione. Riprova più tardi.");
  }
};
