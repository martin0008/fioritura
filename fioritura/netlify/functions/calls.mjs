// Fioritura — videochiamate condivise su Netlify.
//
//   GET  /api/calls?username=…&country=…  -> inviti, chiamata in uscita o attiva
//   POST /api/calls                       -> invite | accept | decline | cancel | end
//
// Le chiamate vivono nello stesso documento della classifica. Chi riceve deve
// accettare prima che la stanza Jitsi venga aperta a entrambi.

import {
  getStore,
  STORE_NAME,
  readState,
  mutateState,
  callsPayload,
  applyCallAction,
  cleanCallIdentity,
  MAX_BODY,
  CALL_READ_LIMIT,
  CALL_ACTION_LIMIT,
  CALL_RATE_WINDOW,
  HttpError,
  json,
  fail,
  rateLimited,
  clientIp
} from "../lib/state.mjs";

export default async (request) => {
  const store = getStore(STORE_NAME);

  if (request.method === "GET" || request.method === "HEAD") {
    if (rateLimited("calls-read", clientIp(request), CALL_READ_LIMIT, CALL_RATE_WINDOW)) {
      return fail(429, "Troppe richieste di chiamata. Riprova più tardi.");
    }
    try {
      const url = new URL(request.url);
      const identity =
        cleanCallIdentity({
          username: url.searchParams.get("username") || "",
          country: url.searchParams.get("country") || ""
        }) || { username: "", country: "" };
      const { state } = await readState(store);
      return json(callsPayload(state, identity.username, identity.country));
    } catch (error) {
      console.error("Fioritura calls GET:", error);
      return fail(503, "Videochiamate non disponibili in questo momento.");
    }
  }

  if (request.method !== "POST") return fail(405, "Metodo non consentito.");

  if (rateLimited("calls-action", clientIp(request), CALL_ACTION_LIMIT, CALL_RATE_WINDOW)) {
    return fail(429, "Troppe chiamate in poco tempo. Riprova più tardi.");
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

  const action = String(payload.action || "").trim().toLowerCase();
  const identity = cleanCallIdentity(action === "invite" ? payload.from : payload);

  try {
    const { state } = await mutateState(store, (draft) => {
      applyCallAction(draft, payload);
      return true;
    });
    return json(
      callsPayload(state, identity ? identity.username : "", identity ? identity.country : "")
    );
  } catch (error) {
    if (error instanceof HttpError) return fail(error.status, error.message);
    console.error("Fioritura calls POST:", error);
    return fail(503, "Non riesco a salvare la chiamata. Riprova più tardi.");
  }
};
