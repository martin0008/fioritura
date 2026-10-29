// Fioritura — negozio condiviso su Netlify.
//
//   GET  /api/shop?username=…&country=…  -> catalogo, annuncio, inventario
//   POST /api/shop                       -> sincronizza l'inventario del profilo
//
// Il catalogo e gli inventari vivono nello stesso documento della classifica.
// Le modifiche admin arrivano ai client al successivo sync.

import {
  getStore,
  STORE_NAME,
  readState,
  mutateState,
  shopPayload,
  cleanPlayer,
  keyFor,
  normalizeName,
  MAX_BODY,
  DAY_MS,
  SHOP_RATE_LIMIT,
  SHOP_RATE_WINDOW,
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
      const url = new URL(request.url);
      const username = normalizeName(url.searchParams.get("username") || "");
      const country = String(url.searchParams.get("country") || "").trim().toUpperCase();
      const { state } = await readState(store);
      return json(shopPayload(state, username, country));
    } catch (error) {
      console.error("Fioritura shop GET:", error);
      return fail(503, "Negozio non disponibile in questo momento.");
    }
  }

  if (request.method !== "POST") return fail(405, "Metodo non consentito.");

  if (rateLimited("shop", clientIp(request), SHOP_RATE_LIMIT, SHOP_RATE_WINDOW)) {
    return fail(429, "Troppe modifiche al negozio. Riprova più tardi.");
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

  const username = normalizeName(payload.username);
  const country = String(payload.country || "").trim().toUpperCase();
  if (!NAME_RE.test(username)) {
    return fail(400, "Nome non valido: usa da 2 a 20 caratteri.");
  }
  if (!COUNTRY_RE.test(country)) return fail(400, "Paese non valido.");

  const rawShop = payload.shop && typeof payload.shop === "object" ? payload.shop : payload;
  const player = cleanPlayer({
    username,
    country,
    spentXp: rawShop.spentXp,
    owned: rawShop.owned,
    equipped: rawShop.equipped,
    updatedAt: rawShop.updatedAt
  });
  if (!player) return fail(400, "Inventario non valido.");
  if (player.updatedAt > Date.now() + DAY_MS) player.updatedAt = Date.now();

  try {
    const { state } = await mutateState(store, (draft) => {
      const key = keyFor(username, country);
      if (player.updatedAt < draft.shop.resetAt) return false;
      const existing = draft.shop.players[key];
      if (existing && player.updatedAt < existing.updatedAt) return false;
      draft.shop.players[key] = player;
      return true;
    });
    return json(shopPayload(state, username, country));
  } catch (error) {
    console.error("Fioritura shop POST:", error);
    return fail(503, "Non riesco a salvare l'inventario. Riprova più tardi.");
  }
};
