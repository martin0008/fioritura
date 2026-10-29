// Fioritura — pannello admin su Netlify.
//
//   GET  /api/admin   -> stato completo (sessioni, partecipanti, negozio, annuncio)
//   POST /api/admin   -> azioni di gestione
//
// Credenziali da variabili d'ambiente:
//   FIORITURA_ADMIN_USER      (default: admin)
//   FIORITURA_ADMIN_PASSWORD  (se assente, l'admin è spento)
//
// L'autenticazione è HTTP Basic: usala solo su HTTPS.

import { timingSafeEqual } from "node:crypto";
import {
  getStore,
  STORE_NAME,
  readState,
  mutateState,
  adminPayload,
  applyAdminAction,
  json,
  fail,
  HttpError,
  clientIp,
  MAX_BODY
} from "../lib/state.mjs";

const ADMIN_USER = process.env.FIORITURA_ADMIN_USER || "admin";
const ADMIN_PASSWORD = process.env.FIORITURA_ADMIN_PASSWORD || "";
const FAIL_LIMIT = 20;
const FAIL_WINDOW = 15 * 60 * 1000;
const failures = new Map();

function safeEqual(left, right) {
  const a = Buffer.from(String(left), "utf8");
  const b = Buffer.from(String(right), "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function failureState(ip) {
  const now = Date.now();
  const hits = (failures.get(ip) || []).filter((stamp) => now - stamp < FAIL_WINDOW);
  failures.set(ip, hits);
  return { now, hits };
}

function tooManyFailures(ip) {
  return failureState(ip).hits.length >= FAIL_LIMIT;
}

function recordFailure(ip) {
  const { now, hits } = failureState(ip);
  hits.push(now);
  failures.set(ip, hits);
  if (failures.size > 5000) failures.clear();
}

function authStatus(request) {
  if (!ADMIN_PASSWORD) return "disabled";
  const ip = clientIp(request);
  if (tooManyFailures(ip)) return "limited";

  const header = request.headers.get("authorization") || "";
  if (!/^basic /i.test(header)) {
    recordFailure(ip);
    return "unauthorized";
  }

  let decoded = "";
  try {
    decoded = Buffer.from(header.slice(6).trim(), "base64").toString("utf8");
  } catch (error) {
    recordFailure(ip);
    return "unauthorized";
  }
  const separator = decoded.indexOf(":");
  if (separator < 0) {
    recordFailure(ip);
    return "unauthorized";
  }

  const givenUser = decoded.slice(0, separator);
  const givenPassword = decoded.slice(separator + 1);
  const valid = safeEqual(givenUser, ADMIN_USER) && safeEqual(givenPassword, ADMIN_PASSWORD);
  if (!valid) {
    recordFailure(ip);
    return "unauthorized";
  }
  failures.delete(ip);
  return "ok";
}

function authError(status) {
  const headers = { "www-authenticate": 'Basic realm="Fioritura Admin", charset="UTF-8"' };
  if (status === "disabled") {
    return fail(503, "Admin spento: imposta FIORITURA_ADMIN_PASSWORD su Netlify.");
  }
  if (status === "limited") {
    return fail(429, "Troppi tentativi. Riprova tra qualche minuto.");
  }
  return fail(401, "Credenziali admin non valide.", headers);
}

export default async (request) => {
  const status = authStatus(request);
  if (status !== "ok") return authError(status);

  const store = getStore(STORE_NAME);

  if (request.method === "GET" || request.method === "HEAD") {
    try {
      const { state } = await readState(store);
      return json(adminPayload(state));
    } catch (error) {
      console.error("Fioritura admin GET:", error);
      return fail(503, "Pannello admin non disponibile in questo momento.");
    }
  }

  if (request.method !== "POST") return fail(405, "Metodo non consentito.");

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

  try {
    const { state } = await mutateState(store, (draft) => {
      applyAdminAction(draft, payload);
      return true;
    });
    return json(adminPayload(state));
  } catch (error) {
    if (error instanceof HttpError) return fail(error.status, error.message);
    console.error("Fioritura admin POST:", error);
    return fail(503, "Non riesco a salvare le modifiche. Riprova.");
  }
};
