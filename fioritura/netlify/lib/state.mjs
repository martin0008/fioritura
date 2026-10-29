// Fioritura — stato condiviso su Netlify Blobs.
//
// Un solo documento contiene sessioni, rettifiche XP, catalogo del negozio,
// inventari dei profili e annuncio. Le scritture usano il compare-and-set di
// Netlify Blobs (onlyIfMatch/onlyIfNew) per non sovrascriversi a vicenda.

import { getStore } from "@netlify/blobs";
import { randomBytes } from "node:crypto";

export const STORE_NAME = "fioritura";
export const STATE_KEY = "leaderboard/sessions.v1";

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_SESSIONS = 5000;
export const MAX_ADJUSTMENTS = 5000;
export const MAX_ADMIN_SESSIONS = 200;
export const MAX_ADMIN_ADJUSTMENTS = 100;
export const MAX_BODY = 16384;
export const MAX_XP = 10_000_000;
export const MAX_PRICE = 100_000;
export const RATE_LIMIT = 80;
export const RATE_WINDOW = 60 * 60 * 1000;
export const SHOP_RATE_LIMIT = 360;
export const SHOP_RATE_WINDOW = 60 * 60 * 1000;
export const CALL_READ_LIMIT = 4000;
export const CALL_ACTION_LIMIT = 300;
export const CALL_RATE_WINDOW = 60 * 60 * 1000;
export const CALL_PENDING_TTL = 75 * 1000;
export const CALL_ACTIVE_TTL = 2 * 60 * 60 * 1000;
export const CALL_RETENTION = 3 * 60 * 60 * 1000;
export const CALL_MAX = 400;

export const NAME_RE = /^[\p{L}\p{N}_ .'\-]{2,20}$/u;
export const COUNTRY_RE = /^[A-Z]{2}$/;
export const ITEM_ID_RE = /^(frame|badge|accent)-[a-z0-9-]{1,32}$/;
export const CALL_ID_RE = /^call-[a-f0-9]{8,24}$/;
export const ROOM_RE = /^fioritura-[a-f0-9]{6,32}$/;
export const EQUIP_TYPES = ["frame", "badge", "accent"];
export const CALL_STATUSES = ["pending", "accepted", "declined", "cancelled", "ended"];

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer"
};

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function json(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders }
  });
}

export function fail(status, message, extraHeaders = {}) {
  return json({ error: message }, status, extraHeaders);
}

export function normalizeName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

export function keyFor(username, country) {
  return `${String(username).toLocaleLowerCase("it")}|${String(country).toUpperCase()}`;
}

export function defaultState() {
  return {
    version: 3,
    sessions: [],
    adjustments: [],
    shop: { catalog: {}, players: {}, resetAt: 0 },
    announcement: { text: "", updatedAt: 0 },
    calls: []
  };
}

export function cleanSessions(value) {
  if (!Array.isArray(value)) return [];
  const clean = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const username = normalizeName(item.username);
    const country = String(item.country || "").trim().toUpperCase();
    const minutes = Number(item.minutes);
    const xp = Math.round(Number(item.xp));
    const ts = Number(item.ts);
    if (
      !NAME_RE.test(username) ||
      !COUNTRY_RE.test(country) ||
      !(minutes > 0 && minutes <= 600) ||
      !(xp > 0) ||
      !(ts > 0)
    ) {
      continue;
    }
    clean.push({ username, country, minutes, xp, ts });
  }
  return clean.slice(-MAX_SESSIONS);
}

export function cleanAdjustments(value) {
  if (!Array.isArray(value)) return [];
  const clean = [];
  value.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const username = normalizeName(item.username);
    const country = String(item.country || "").trim().toUpperCase();
    const delta = Math.trunc(Number(item.delta));
    const ts = Number(item.ts);
    if (
      !NAME_RE.test(username) ||
      !COUNTRY_RE.test(country) ||
      !Number.isFinite(delta) ||
      delta === 0 ||
      Math.abs(delta) > MAX_XP ||
      !(ts > 0)
    ) {
      return;
    }
    clean.push({
      id: String(item.id || "").trim().slice(0, 48) || `adj-${ts}-${index}`,
      username,
      country,
      delta,
      note: String(item.note || "").trim().slice(0, 80),
      ts
    });
  });
  return clean.slice(-MAX_ADJUSTMENTS);
}

export function cleanCatalog(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const clean = {};
  for (const [itemId, entry] of Object.entries(value)) {
    if (!ITEM_ID_RE.test(itemId) || !entry || typeof entry !== "object") continue;
    const price = Math.trunc(Number(entry.price));
    const active = entry.active;
    if (Number.isFinite(price) && price >= 0 && price <= MAX_PRICE && typeof active === "boolean") {
      clean[itemId] = { price, active };
    }
  }
  return clean;
}

export function cleanPlayer(item) {
  if (!item || typeof item !== "object") return null;
  const username = normalizeName(item.username);
  const country = String(item.country || "").trim().toUpperCase();
  if (!NAME_RE.test(username) || !COUNTRY_RE.test(country)) return null;

  const spentXp = Math.trunc(Number(item.spentXp));
  const updatedAt = Math.trunc(Number(item.updatedAt));
  if (!Number.isFinite(spentXp) || !Number.isFinite(updatedAt)) return null;

  const owned = [];
  if (Array.isArray(item.owned)) {
    for (const rawId of item.owned.slice(0, 80)) {
      if (typeof rawId === "string" && ITEM_ID_RE.test(rawId) && !owned.includes(rawId)) {
        owned.push(rawId);
      }
    }
  }

  const equipped = { frame: null, badge: null, accent: null };
  if (item.equipped && typeof item.equipped === "object") {
    for (const type of EQUIP_TYPES) {
      const rawId = item.equipped[type];
      if (typeof rawId === "string" && owned.includes(rawId) && rawId.startsWith(`${type}-`)) {
        equipped[type] = rawId;
      }
    }
  }

  return {
    username,
    country,
    spentXp: Math.max(0, Math.min(spentXp, MAX_XP)),
    owned,
    equipped,
    updatedAt: Math.max(0, updatedAt)
  };
}

export function cleanPlayers(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const clean = {};
  for (const item of Object.values(value)) {
    const player = cleanPlayer(item);
    if (!player) continue;
    const key = keyFor(player.username, player.country);
    const previous = clean[key];
    if (!previous || player.updatedAt >= previous.updatedAt) clean[key] = player;
  }
  return clean;
}

export function cleanCallIdentity(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const username = normalizeName(value.username);
  const country = String(value.country || "").trim().toUpperCase();
  if (!NAME_RE.test(username) || !COUNTRY_RE.test(country)) return null;
  return { username, country };
}

export function cleanCalls(value) {
  if (!Array.isArray(value)) return [];
  const now = Date.now();
  const clean = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const id = String(item.id || "").trim().toLowerCase();
    const status = String(item.status || "").trim().toLowerCase();
    if (!CALL_ID_RE.test(id) || !CALL_STATUSES.includes(status)) continue;
    const from = cleanCallIdentity(item.from);
    const to = cleanCallIdentity(item.to);
    if (!from || !to) continue;
    if (keyFor(from.username, from.country) === keyFor(to.username, to.country)) continue;
    const createdAt = Math.trunc(Number(item.createdAt));
    let updatedAt = Math.trunc(Number(item.updatedAt ?? createdAt));
    let startedAt = Math.trunc(Number(item.startedAt ?? 0));
    let expiresAt = Math.trunc(Number(item.expiresAt ?? 0));
    if (!Number.isFinite(createdAt) || createdAt <= 0) continue;
    if (now - createdAt > CALL_RETENTION) continue;
    if (!Number.isFinite(updatedAt) || updatedAt <= 0) updatedAt = createdAt;
    if (!Number.isFinite(startedAt) || startedAt < 0) startedAt = 0;
    if (!Number.isFinite(expiresAt) || expiresAt <= 0) expiresAt = 0;

    if (status === "pending") {
      if (!expiresAt) expiresAt = createdAt + CALL_PENDING_TTL;
      if (expiresAt <= now) continue;
    } else if (status === "accepted") {
      const room = String(item.room || "").trim().toLowerCase();
      if (!ROOM_RE.test(room)) continue;
      if (!startedAt) startedAt = updatedAt || createdAt;
      if (!expiresAt) expiresAt = startedAt + CALL_ACTIVE_TTL;
      if (expiresAt <= now) continue;
    } else if (!expiresAt) {
      expiresAt = createdAt + CALL_RETENTION;
    }

    clean.push({
      id,
      from,
      to,
      status,
      room: ["accepted", "ended"].includes(status)
        ? String(item.room || "").trim().toLowerCase()
        : "",
      createdAt,
      updatedAt: Math.max(createdAt, updatedAt),
      startedAt: Math.max(0, startedAt),
      expiresAt: Math.max(createdAt, expiresAt)
    });
  }
  clean.sort((a, b) => a.createdAt - b.createdAt);
  return clean.slice(-CALL_MAX);
}

export function cleanState(payload) {
  if (Array.isArray(payload)) payload = { sessions: payload };
  if (!payload || typeof payload !== "object") payload = {};
  const shop = payload.shop && typeof payload.shop === "object" ? payload.shop : {};
  const announcement = payload.announcement && typeof payload.announcement === "object"
    ? payload.announcement
    : {};
  const text = String(announcement.text || "").trim().slice(0, 240);
  const updatedAt = Math.trunc(Number(announcement.updatedAt));
  const resetAt = Math.trunc(Number(shop.resetAt));
  return {
    version: 3,
    sessions: cleanSessions(payload.sessions),
    adjustments: cleanAdjustments(payload.adjustments),
    shop: {
      catalog: cleanCatalog(shop.catalog),
      players: cleanPlayers(shop.players),
      resetAt: Number.isFinite(resetAt) ? Math.max(0, resetAt) : 0
    },
    announcement: {
      text,
      updatedAt: text && Number.isFinite(updatedAt) ? Math.max(0, updatedAt) : 0
    },
    calls: cleanCalls(payload.calls)
  };
}

export async function readState(store) {
  const result = await store.getWithMetadata(STATE_KEY, { consistency: "strong" });
  if (!result || typeof result.data !== "string") {
    return { state: defaultState(), etag: null, exists: false };
  }
  let parsed = null;
  try {
    parsed = JSON.parse(result.data);
  } catch (error) {
    parsed = null;
  }
  return { state: cleanState(parsed), etag: result.etag || null, exists: true };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function mutateState(store, mutate) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const current = await readState(store);
    const draft = JSON.parse(JSON.stringify(current.state));
    const changed = mutate(draft);
    if (changed === false) return { state: current.state, changed: false };

    const payload = JSON.stringify(draft);
    const options =
      current.exists && current.etag ? { onlyIfMatch: current.etag } : { onlyIfNew: true };
    const result = await store.set(STATE_KEY, payload, options);
    if (!result || result.modified !== false) return { state: draft, changed: true };
    await sleep(40 + attempt * 70);
  }
  throw new Error("Troppe scritture contemporanee");
}

export function collectEntries(sessions, adjustments, since = 0) {
  const grouped = new Map();

  const ensure = (username, country) => {
    const key = keyFor(username, country);
    let entry = grouped.get(key);
    if (!entry) {
      entry = {
        username,
        country,
        xp: 0,
        minutes: 0,
        sessions: 0,
        lastAt: 0
      };
      grouped.set(key, entry);
    }
    return entry;
  };

  for (const session of sessions) {
    if (since && session.ts < since) continue;
    const entry = ensure(session.username, session.country);
    entry.xp += Number(session.xp) || 0;
    entry.minutes += Number(session.minutes) || 0;
    entry.sessions += 1;
    entry.lastAt = Math.max(entry.lastAt, Number(session.ts) || 0);
  }

  if (!since) {
    for (const adjustment of adjustments) {
      const entry = ensure(adjustment.username, adjustment.country);
      entry.xp += Number(adjustment.delta) || 0;
      entry.lastAt = Math.max(entry.lastAt, Number(adjustment.ts) || 0);
    }
  }

  return grouped;
}

function sortEntries(entries) {
  return entries.sort(
    (a, b) =>
      b.xp - a.xp ||
      b.sessions - a.sessions ||
      b.lastAt - a.lastAt ||
      a.username.localeCompare(b.username, "it")
  );
}

export function aggregate(sessions, adjustments, since = 0) {
  const entries = [...collectEntries(sessions, adjustments, since).values()].filter(
    (entry) => entry.xp > 0
  );
  return sortEntries(entries)
    .slice(0, 50)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
      xp: Math.max(0, Math.round(entry.xp)),
      minutes: Math.round(entry.minutes * 10) / 10
    }));
}

export function leaderboards(state) {
  const now = Date.now();
  return {
    mode: "server",
    all: aggregate(state.sessions, state.adjustments),
    week: aggregate(state.sessions, [], now - WEEK_MS),
    totalSessions: state.sessions.length,
    announcement: state.announcement,
    updatedAt: now
  };
}

export function participantEntries(state) {
  const now = Date.now();
  const entries = collectEntries(state.sessions, state.adjustments);
  const week = collectEntries(state.sessions, [], now - WEEK_MS);
  const players = state.shop.players;

  for (const [key, player] of Object.entries(players)) {
    if (!entries.has(key)) {
      entries.set(key, {
        username: player.username,
        country: player.country,
        xp: 0,
        minutes: 0,
        sessions: 0,
        lastAt: 0
      });
    }
  }

  const participants = [];
  for (const [key, entry] of entries) {
    const weekEntry = week.get(key);
    participants.push({
      username: entry.username,
      country: entry.country,
      xp: Math.max(0, Math.round(entry.xp)),
      minutes: Math.round(entry.minutes * 10) / 10,
      sessions: entry.sessions,
      lastAt: entry.lastAt,
      weekXp: Math.max(0, Math.round(weekEntry ? weekEntry.xp : 0)),
      shop: players[key] || null
    });
  }

  sortEntries(participants);
  let rank = 0;
  for (const entry of participants) {
    if (entry.xp > 0) {
      rank += 1;
      entry.rank = rank;
    } else {
      entry.rank = null;
    }
  }
  return participants;
}

export function adminPayload(state) {
  const now = Date.now();
  const week = aggregate(state.sessions, [], now - WEEK_MS);
  const participants = participantEntries(state);
  const sessions = [...state.sessions]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, MAX_ADMIN_SESSIONS);
  const adjustments = [...state.adjustments]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, MAX_ADMIN_ADJUSTMENTS);
  const players = Object.values(state.shop.players);

  return {
    mode: "server",
    updatedAt: now,
    totals: {
      participants: participants.length,
      sessions: state.sessions.length,
      xp: participants.reduce((sum, entry) => sum + entry.xp, 0),
      weekXp: week.reduce((sum, entry) => sum + entry.xp, 0),
      shopOwners: players.filter((player) => player.owned.length > 0).length,
      catalogOverrides: Object.keys(state.shop.catalog).length,
      calls: state.calls.length
    },
    participants,
    sessions,
    adjustments,
    catalog: state.shop.catalog,
    announcement: state.announcement
  };
}

export function shopPayload(state, username = "", country = "") {
  let player = null;
  if (username && country && NAME_RE.test(username) && COUNTRY_RE.test(country)) {
    player = state.shop.players[keyFor(username, country)] || null;
  }
  return {
    mode: "server",
    catalog: state.shop.catalog,
    announcement: state.announcement,
    player,
    resetAt: state.shop.resetAt,
    updatedAt: Date.now()
  };
}

function callIdentityKey(identity) {
  return keyFor(identity.username, identity.country);
}

function callConflict(state, keys, now) {
  for (const call of state.calls) {
    if (!["pending", "accepted"].includes(call.status)) continue;
    if (call.expiresAt <= now) continue;
    if (keys.has(callIdentityKey(call.from)) || keys.has(callIdentityKey(call.to))) {
      return call;
    }
  }
  return null;
}

export function callsPayload(state, username = "", country = "") {
  const now = Date.now();
  const identity = cleanCallIdentity({ username, country });
  const payload = {
    mode: "server",
    incoming: [],
    outgoing: null,
    active: null,
    updatedAt: now
  };
  if (!identity) return payload;

  const me = callIdentityKey(identity);
  const incoming = [];
  let outgoing = null;
  let active = null;
  let activeStarted = 0;

  for (const call of state.calls) {
    const fromKey = callIdentityKey(call.from);
    const toKey = callIdentityKey(call.to);
    if (call.status === "pending" && call.expiresAt > now) {
      if (toKey === me) {
        incoming.push({
          id: call.id,
          from: call.from,
          createdAt: call.createdAt,
          expiresAt: call.expiresAt
        });
      } else if (fromKey === me) {
        outgoing = {
          id: call.id,
          to: call.to,
          createdAt: call.createdAt,
          expiresAt: call.expiresAt
        };
      }
    } else if (call.status === "accepted" && call.expiresAt > now) {
      if (fromKey === me || toKey === me) {
        if (call.startedAt >= activeStarted) {
          activeStarted = call.startedAt;
          active = {
            id: call.id,
            room: call.room,
            peer: fromKey === me ? call.to : call.from,
            role: fromKey === me ? "caller" : "callee",
            startedAt: call.startedAt,
            expiresAt: call.expiresAt
          };
        }
      }
    }
  }

  incoming.sort((a, b) => b.createdAt - a.createdAt);
  payload.incoming = incoming.slice(0, 5);
  payload.outgoing = outgoing;
  payload.active = active;
  return payload;
}

export function applyCallAction(state, payload) {
  const action = String(payload.action || "").trim().toLowerCase();
  const now = Date.now();

  if (action === "invite") {
    const sender = cleanCallIdentity(payload.from);
    const receiver = cleanCallIdentity(payload.to);
    if (!sender || !receiver) throw new HttpError(400, "Nome o paese della chiamata non validi.");
    const senderKey = callIdentityKey(sender);
    const receiverKey = callIdentityKey(receiver);
    if (senderKey === receiverKey) throw new HttpError(400, "Non puoi chiamare te stesso.");
    if (callConflict(state, new Set([senderKey, receiverKey]), now)) {
      throw new HttpError(400, "C'è già una chiamata in corso o in attesa per una delle due persone.");
    }
    state.calls.push({
      id: `call-${randomBytes(8).toString("hex")}`,
      from: sender,
      to: receiver,
      status: "pending",
      room: "",
      createdAt: now,
      updatedAt: now,
      startedAt: 0,
      expiresAt: now + CALL_PENDING_TTL
    });
    return;
  }

  if (!["accept", "decline", "cancel", "end"].includes(action)) {
    throw new HttpError(400, "Azione chiamata sconosciuta.");
  }

  const identity = cleanCallIdentity(payload);
  if (!identity) throw new HttpError(400, "Identità della chiamata non valida.");
  const id = String(payload.id || "").trim().toLowerCase();
  const call = state.calls.find((entry) => entry.id === id);
  if (!call) throw new HttpError(400, "Chiamata non trovata.");
  const me = callIdentityKey(identity);
  const fromKey = callIdentityKey(call.from);
  const toKey = callIdentityKey(call.to);

  if (action === "accept") {
    if (call.status !== "pending" || call.expiresAt <= now) {
      throw new HttpError(400, "La chiamata non è più disponibile.");
    }
    if (toKey !== me) throw new HttpError(400, "Solo chi riceve può accettare questa chiamata.");
    call.status = "accepted";
    call.room = `fioritura-${randomBytes(8).toString("hex")}`;
    call.startedAt = now;
    call.updatedAt = now;
    call.expiresAt = now + CALL_ACTIVE_TTL;
    for (const other of state.calls) {
      if (other === call || other.status !== "pending") continue;
      const otherFrom = callIdentityKey(other.from);
      const otherTo = callIdentityKey(other.to);
      if ([fromKey, toKey].includes(otherFrom) || [fromKey, toKey].includes(otherTo)) {
        other.status = "cancelled";
        other.updatedAt = now;
      }
    }
    return;
  }

  if (action === "decline") {
    if (call.status !== "pending") throw new HttpError(400, "La chiamata non è più in attesa.");
    if (toKey !== me) throw new HttpError(400, "Solo chi riceve può rifiutare questa chiamata.");
    call.status = "declined";
    call.updatedAt = now;
    return;
  }

  if (action === "cancel") {
    if (call.status !== "pending") throw new HttpError(400, "La chiamata non è più in attesa.");
    if (fromKey !== me) throw new HttpError(400, "Solo chi chiama può annullare la richiesta.");
    call.status = "cancelled";
    call.updatedAt = now;
    return;
  }

  if (call.status !== "accepted") throw new HttpError(400, "La chiamata non è attiva.");
  if (me !== fromKey && me !== toKey) throw new HttpError(400, "Non fai parte di questa chiamata.");
  call.status = "ended";
  call.updatedAt = now;
  call.expiresAt = now + 10 * 60 * 1000;
}

export function allTimeTotal(state, username, country) {
  const key = keyFor(username, country);
  let total = 0;
  for (const session of state.sessions) {
    if (keyFor(session.username, session.country) === key) total += Number(session.xp) || 0;
  }
  for (const adjustment of state.adjustments) {
    if (keyFor(adjustment.username, adjustment.country) === key) {
      total += Number(adjustment.delta) || 0;
    }
  }
  return Math.max(0, total);
}

function identityFrom(payload) {
  const username = normalizeName(payload.username);
  const country = String(payload.country || "").trim().toUpperCase();
  if (!NAME_RE.test(username)) throw new HttpError(400, "Nome non valido: usa da 2 a 20 caratteri.");
  if (!COUNTRY_RE.test(country)) throw new HttpError(400, "Paese non valido.");
  return { username, country };
}

function itemIdFrom(payload) {
  const itemId = String(payload.id || "").trim();
  if (!ITEM_ID_RE.test(itemId)) throw new HttpError(400, "Oggetto non valido.");
  return itemId;
}

function ensurePlayer(state, username, country) {
  const key = keyFor(username, country);
  let player = state.shop.players[key];
  if (!player) {
    player = {
      username,
      country,
      spentXp: 0,
      owned: [],
      equipped: { frame: null, badge: null, accent: null },
      updatedAt: 0
    };
    state.shop.players[key] = player;
  }
  player.username = username;
  player.country = country;
  return player;
}

function touchPlayer(player) {
  player.updatedAt = Math.max(Date.now(), (Number(player.updatedAt) || 0) + 1);
}

export function applyAdminAction(state, payload) {
  const action = String(payload.action || "").trim();

  if (action === "adjustXp") {
    const { username, country } = identityFrom(payload);
    const mode = String(payload.mode || "add").trim();
    if (!["add", "remove", "set"].includes(mode)) {
      throw new HttpError(400, "Modalità XP non valida.");
    }
    const amount = Math.trunc(Number(payload.amount));
    if (!Number.isFinite(amount)) throw new HttpError(400, "Quantità XP non valida.");
    if (mode === "set") {
      if (amount < 0 || amount > MAX_XP) {
        throw new HttpError(400, `Gli XP devono stare tra 0 e ${MAX_XP}.`);
      }
    } else if (amount < 1 || amount > MAX_XP) {
      throw new HttpError(400, `Inserisci da 1 a ${MAX_XP} XP.`);
    }

    const current = allTimeTotal(state, username, country);
    let delta = 0;
    if (mode === "add") delta = Math.min(amount, MAX_XP - current);
    else if (mode === "remove") delta = -Math.min(amount, current);
    else delta = amount - current;
    if (delta === 0) throw new HttpError(400, "Nessuna variazione: gli XP sono già così.");

    const timestamp = Date.now();
    state.adjustments.push({
      id: `${timestamp}-${Math.random().toString(16).slice(2, 8)}`,
      username,
      country,
      delta,
      note: String(payload.note || "").trim().slice(0, 80),
      ts: timestamp
    });
    state.adjustments = state.adjustments.slice(-MAX_ADJUSTMENTS);
    return;
  }

  if (action === "deleteAdjustment") {
    const adjustmentId = String(payload.id || "").trim();
    if (!adjustmentId) throw new HttpError(400, "Rettifica non valida.");
    const before = state.adjustments.length;
    state.adjustments = state.adjustments.filter(
      (adjustment) => adjustment.id !== adjustmentId
    );
    if (state.adjustments.length === before) throw new HttpError(400, "Rettifica non trovata.");
    return;
  }

  if (action === "deleteParticipant") {
    const { username, country } = identityFrom(payload);
    const key = keyFor(username, country);
    let found = false;
    state.sessions = state.sessions.filter((session) => {
      if (keyFor(session.username, session.country) === key) {
        found = true;
        return false;
      }
      return true;
    });
    state.adjustments = state.adjustments.filter((adjustment) => {
      if (keyFor(adjustment.username, adjustment.country) === key) {
        found = true;
        return false;
      }
      return true;
    });
    if (state.shop.players[key]) {
      found = true;
      delete state.shop.players[key];
    }
    if (!found) throw new HttpError(400, "Partecipante non trovato.");
    return;
  }

  if (action === "deleteSession") {
    const { username, country } = identityFrom(payload);
    const key = keyFor(username, country);
    const timestamp = Math.trunc(Number(payload.ts));
    if (!Number.isFinite(timestamp)) throw new HttpError(400, "Sessione non valida.");
    const index = state.sessions.findIndex(
      (session) => session.ts === timestamp && keyFor(session.username, session.country) === key
    );
    if (index < 0) throw new HttpError(400, "Sessione non trovata.");
    state.sessions.splice(index, 1);
    return;
  }

  if (action === "resetLeaderboard") {
    state.sessions = [];
    state.adjustments = [];
    state.calls = [];
    if (payload.clearShop === true) {
      state.shop.players = {};
      state.shop.resetAt = Date.now();
    }
    if (payload.clearCatalog === true) state.shop.catalog = {};
    return;
  }

  if (action === "resetShop") {
    state.shop.players = {};
    state.shop.resetAt = Date.now();
    return;
  }

  if (action === "resetCatalog") {
    state.shop.catalog = {};
    return;
  }

  if (action === "setAnnouncement") {
    const text = String(payload.text || "").trim().slice(0, 240);
    state.announcement = { text, updatedAt: text ? Date.now() : 0 };
    return;
  }

  if (action === "setCatalogItem") {
    const itemId = itemIdFrom(payload);
    const price = Math.trunc(Number(payload.price));
    const active = payload.active;
    if (!Number.isFinite(price) || price < 0 || price > MAX_PRICE) {
      throw new HttpError(400, `Il prezzo deve stare tra 0 e ${MAX_PRICE} XP.`);
    }
    if (typeof active !== "boolean") throw new HttpError(400, "Disponibilità non valida.");
    state.shop.catalog[itemId] = { price, active };
    return;
  }

  if (action === "resetCatalogItem") {
    const itemId = itemIdFrom(payload);
    delete state.shop.catalog[itemId];
    return;
  }

  if (action === "grantItem") {
    const { username, country } = identityFrom(payload);
    const itemId = itemIdFrom(payload);
    const player = ensurePlayer(state, username, country);
    if (!player.owned.includes(itemId)) player.owned.push(itemId);
    touchPlayer(player);
    return;
  }

  if (action === "revokeItem") {
    const { username, country } = identityFrom(payload);
    const itemId = itemIdFrom(payload);
    const key = keyFor(username, country);
    const player = state.shop.players[key];
    if (!player || !player.owned.includes(itemId)) {
      throw new HttpError(400, "Il partecipante non possiede questo oggetto.");
    }
    player.owned = player.owned.filter((owned) => owned !== itemId);
    for (const type of EQUIP_TYPES) {
      if (player.equipped[type] === itemId) player.equipped[type] = null;
    }
    touchPlayer(player);
    return;
  }

  throw new HttpError(400, "Azione admin sconosciuta.");
}

const rateBuckets = new Map();

export function rateLimited(bucketName, ip, limit, windowMs) {
  if (!ip) return false;
  const now = Date.now();
  const key = `${bucketName}:${ip}`;
  const hits = (rateBuckets.get(key) || []).filter((stamp) => now - stamp < windowMs);
  if (hits.length >= limit) {
    rateBuckets.set(key, hits);
    return true;
  }
  hits.push(now);
  rateBuckets.set(key, hits);
  if (rateBuckets.size > 5000) rateBuckets.clear();
  return false;
}

export function clientIp(request) {
  return (
    request.headers.get("x-nf-client-connection-ip") ||
    (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    ""
  );
}

export { getStore };
