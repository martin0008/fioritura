#!/usr/bin/env python3
"""
Fioritura — server statico + classifica condivisa + negozio + admin.

Avvio:
    python3 server.py
    python3 server.py --open        # apre anche il browser

Variabili d'ambiente:
    PORT=4173                       porta (default 4173)
    HOST=127.0.0.1                  interfaccia (usa 0.0.0.0 per la rete locale)
    FIORITURA_DEMO=1                inserisce alcuni partecipanti di esempio al primo avvio
    FIORITURA_ADMIN_USER=admin      nome utente del pannello admin
    FIORITURA_ADMIN_PASSWORD=...    password del pannello admin (senza questa l'admin è spento)

API:
    GET  /api/leaderboard           classifica condivisa + annuncio
    POST /api/leaderboard           invia una sessione
    GET  /api/shop                  catalogo, annuncio e inventario del profilo
    POST /api/shop                  sincronizza l'inventario del profilo
    GET  /api/calls                 videochiamate in arrivo, in uscita o attive
    POST /api/calls                 invita, accetta, rifiuta, annulla o termina una chiamata
    GET  /api/admin                 stato completo (Basic auth)
    POST /api/admin                 azioni di gestione (Basic auth)
"""

from __future__ import annotations

import base64
import copy
import hmac
import json
import os
import re
import secrets
import sys
import threading
import time
import webbrowser
from datetime import datetime, timezone
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
DATA_FILE = DATA_DIR / "sessions.json"
WEEK_MS = 7 * 24 * 60 * 60 * 1000
DAY_MS = 24 * 60 * 60 * 1000
MAX_BODY = 16384
MAX_SESSIONS = 5000
MAX_ADJUSTMENTS = 5000
MAX_ADMIN_SESSIONS = 200
MAX_ADMIN_ADJUSTMENTS = 100
RATE_LIMIT = 80
RATE_WINDOW = 60 * 60
SHOP_RATE_LIMIT = 360
SHOP_RATE_WINDOW = 60 * 60
CALL_READ_LIMIT = 4000
CALL_ACTION_LIMIT = 300
CALL_RATE_WINDOW = 60 * 60
CALL_PENDING_TTL = 75 * 1000
CALL_ACTIVE_TTL = 2 * 60 * 60 * 1000
CALL_RETENTION = 3 * 60 * 60 * 1000
CALL_MAX = 400
CALL_ID_RE = re.compile(r"^call-[a-f0-9]{8,24}$")
ROOM_RE = re.compile(r"^fioritura-[a-f0-9]{6,32}$")
CALL_STATUSES = ("pending", "accepted", "declined", "cancelled", "ended")
ADMIN_FAIL_LIMIT = 20
ADMIN_FAIL_WINDOW = 15 * 60
MAX_XP = 10_000_000
MAX_PRICE = 100_000
NAME_RE = re.compile(r"^[\w .'\-]{2,20}$", re.UNICODE)
COUNTRY_RE = re.compile(r"^[A-Z]{2}$")
ITEM_ID_RE = re.compile(r"^(frame|badge|accent)-[a-z0-9-]{1,32}$")
EQUIP_TYPES = ("frame", "badge", "accent")

HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", "4173"))
DEMO = os.environ.get("FIORITURA_DEMO", "0") == "1"
ADMIN_USER = os.environ.get("FIORITURA_ADMIN_USER", "admin")
ADMIN_PASSWORD = os.environ.get("FIORITURA_ADMIN_PASSWORD", "")

_lock = threading.Lock()
_rate: dict[str, list[float]] = {}
_shop_rate: dict[str, list[float]] = {}
_call_read_rate: dict[str, list[float]] = {}
_call_action_rate: dict[str, list[float]] = {}
_admin_failures: dict[str, list[float]] = {}
STATE: dict = {}

DEMO_PLAYERS = [
    ("Marta", "IT", [50, 45, 25, 60, 90, 50], [3, 8, 14, 96, 130, 190]),
    ("Kenji", "JP", [50, 50, 45, 25, 60], [12, 30, 52, 110, 170]),
    ("Sofia", "BR", [25, 45, 60, 25], [6, 20, 74, 150]),
    ("Noa", "SE", [25, 25, 45, 15], [18, 40, 66, 120]),
    ("Liam", "IE", [50, 25, 25, 25], [9, 48, 100, 160]),
    ("Amina", "MA", [25, 45, 15], [26, 58, 140]),
    ("Elena", "ES", [25, 25, 15, 25], [34, 62, 90, 168]),
    ("Théo", "FR", [45, 15, 25], [15, 80, 186]),
    ("Ravi", "IN", [25, 25, 15], [22, 57, 130]),
    ("Maya", "US", [25, 15], [44, 155]),
    ("Luca", "IT", [15, 5, 25], [5, 36, 118]),
    ("Hana", "KR", [5, 15], [28, 104]),
]


def now_ms() -> int:
    return int(time.time() * 1000)


def xp_for_minutes(minutes: float) -> int:
    if minutes < 5:
        return 0
    raw = minutes * 10
    bonus = 0.5 if minutes >= 50 else 0.25 if minutes >= 25 else 0
    return int(round(raw * (1 + bonus)))


def demo_sessions() -> list[dict]:
    now = now_ms()
    sessions = []
    for name, country, minutes_list, hours_ago in DEMO_PLAYERS:
        for minutes, hours in zip(minutes_list, hours_ago):
            sessions.append(
                {
                    "username": name,
                    "country": country,
                    "minutes": minutes,
                    "xp": xp_for_minutes(minutes),
                    "ts": now - hours * 60 * 60 * 1000,
                }
            )
    return sessions


def default_state() -> dict:
    return {
        "version": 3,
        "sessions": [],
        "adjustments": [],
        "shop": {"catalog": {}, "players": {}, "resetAt": 0},
        "announcement": {"text": "", "updatedAt": 0},
        "calls": [],
    }


def normalize_name(value) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip())


def player_key(username: str, country: str) -> str:
    return f"{username.casefold()}|{country}"


def clean_sessions(value) -> list[dict]:
    if not isinstance(value, list):
        return []
    clean = []
    for item in value:
        if not isinstance(item, dict):
            continue
        try:
            username = normalize_name(item.get("username"))
            country = str(item.get("country", "")).strip().upper()
            minutes = float(item.get("minutes", 0))
            xp = int(item.get("xp", 0))
            ts = int(item.get("ts", 0))
        except (TypeError, ValueError):
            continue
        if (
            NAME_RE.match(username)
            and COUNTRY_RE.match(country)
            and 0 < minutes <= 600
            and xp > 0
            and ts > 0
        ):
            clean.append(
                {
                    "username": username,
                    "country": country,
                    "minutes": minutes,
                    "xp": xp,
                    "ts": ts,
                }
            )
    return clean[-MAX_SESSIONS:]


def clean_adjustments(value) -> list[dict]:
    if not isinstance(value, list):
        return []
    clean = []
    for index, item in enumerate(value):
        if not isinstance(item, dict):
            continue
        try:
            username = normalize_name(item.get("username"))
            country = str(item.get("country", "")).strip().upper()
            delta = int(item.get("delta", 0))
            ts = int(item.get("ts", 0))
        except (TypeError, ValueError):
            continue
        if (
            not NAME_RE.match(username)
            or not COUNTRY_RE.match(country)
            or delta == 0
            or abs(delta) > MAX_XP
            or ts <= 0
        ):
            continue
        adjustment_id = str(item.get("id", "")).strip()[:48] or f"adj-{ts}-{index}"
        note = str(item.get("note", "")).strip()[:80]
        clean.append(
            {
                "id": adjustment_id,
                "username": username,
                "country": country,
                "delta": delta,
                "note": note,
                "ts": ts,
            }
        )
    return clean[-MAX_ADJUSTMENTS:]


def clean_catalog(value) -> dict:
    if not isinstance(value, dict):
        return {}
    clean = {}
    for item_id, entry in value.items():
        if not isinstance(item_id, str) or not ITEM_ID_RE.match(item_id):
            continue
        if not isinstance(entry, dict):
            continue
        try:
            price = int(entry.get("price", 0))
        except (TypeError, ValueError):
            continue
        active = entry.get("active", True)
        if 0 <= price <= MAX_PRICE and isinstance(active, bool):
            clean[item_id] = {"price": price, "active": active}
    return clean


def clean_player(item) -> dict | None:
    if not isinstance(item, dict):
        return None
    username = normalize_name(item.get("username"))
    country = str(item.get("country", "")).strip().upper()
    if not NAME_RE.match(username) or not COUNTRY_RE.match(country):
        return None

    try:
        spent_xp = int(item.get("spentXp", 0))
        updated_at = int(item.get("updatedAt", 0))
    except (TypeError, ValueError):
        return None

    owned = []
    raw_owned = item.get("owned", [])
    if isinstance(raw_owned, list):
        for raw_id in raw_owned[:80]:
            if isinstance(raw_id, str) and ITEM_ID_RE.match(raw_id) and raw_id not in owned:
                owned.append(raw_id)

    equipped = {item_type: None for item_type in EQUIP_TYPES}
    raw_equipped = item.get("equipped")
    if isinstance(raw_equipped, dict):
        for item_type in EQUIP_TYPES:
            raw_id = raw_equipped.get(item_type)
            if (
                isinstance(raw_id, str)
                and raw_id in owned
                and raw_id.startswith(f"{item_type}-")
            ):
                equipped[item_type] = raw_id

    return {
        "username": username,
        "country": country,
        "spentXp": max(0, min(spent_xp, MAX_XP)),
        "owned": owned,
        "equipped": equipped,
        "updatedAt": max(0, updated_at),
    }


def clean_players(value) -> dict:
    if not isinstance(value, dict):
        return {}
    clean = {}
    for item in value.values():
        player = clean_player(item)
        if not player:
            continue
        key = player_key(player["username"], player["country"])
        previous = clean.get(key)
        if previous is None or player["updatedAt"] >= previous["updatedAt"]:
            clean[key] = player
    return clean


def clean_call_identity(value) -> dict | None:
    if not isinstance(value, dict):
        return None
    username = normalize_name(value.get("username"))
    country = str(value.get("country", "")).strip().upper()
    if not NAME_RE.match(username) or not COUNTRY_RE.match(country):
        return None
    return {"username": username, "country": country}


def clean_calls(value) -> list[dict]:
    if not isinstance(value, list):
        return []
    now = now_ms()
    clean = []
    for item in value:
        if not isinstance(item, dict):
            continue
        call_id = str(item.get("id", "")).strip().lower()
        status = str(item.get("status", "")).strip().lower()
        if not CALL_ID_RE.match(call_id) or status not in CALL_STATUSES:
            continue
        sender = clean_call_identity(item.get("from"))
        receiver = clean_call_identity(item.get("to"))
        if not sender or not receiver:
            continue
        if player_key(sender["username"], sender["country"]) == player_key(
            receiver["username"], receiver["country"]
        ):
            continue
        try:
            created_at = int(item.get("createdAt", 0))
            updated_at = int(item.get("updatedAt", created_at))
            started_at = int(item.get("startedAt", 0))
            expires_at = int(item.get("expiresAt", 0))
        except (TypeError, ValueError):
            continue
        if created_at <= 0 or now - created_at > CALL_RETENTION:
            continue
        if status == "pending":
            if expires_at <= 0:
                expires_at = created_at + CALL_PENDING_TTL
            if expires_at <= now:
                continue
        elif status == "accepted":
            room = str(item.get("room", "")).strip().lower()
            if not ROOM_RE.match(room):
                continue
            if started_at <= 0:
                started_at = updated_at or created_at
            if expires_at <= 0:
                expires_at = started_at + CALL_ACTIVE_TTL
            if expires_at <= now:
                continue
        else:
            room = ""
            if expires_at <= 0:
                expires_at = created_at + CALL_RETENTION

        call = {
            "id": call_id,
            "from": sender,
            "to": receiver,
            "status": status,
            "room": str(item.get("room", "")).strip().lower()
            if status in ("accepted", "ended")
            else "",
            "createdAt": created_at,
            "updatedAt": max(created_at, updated_at),
            "startedAt": max(0, started_at),
            "expiresAt": max(created_at, expires_at),
        }
        clean.append(call)

    clean.sort(key=lambda entry: entry["createdAt"])
    return clean[-CALL_MAX:]


def clean_state(payload) -> dict:
    state = default_state()
    if isinstance(payload, list):
        payload = {"sessions": payload}
    if not isinstance(payload, dict):
        payload = {}

    state["sessions"] = clean_sessions(payload.get("sessions"))
    state["adjustments"] = clean_adjustments(payload.get("adjustments"))
    state["calls"] = clean_calls(payload.get("calls"))

    shop = payload.get("shop")
    if not isinstance(shop, dict):
        shop = {}
    state["shop"]["catalog"] = clean_catalog(shop.get("catalog"))
    state["shop"]["players"] = clean_players(shop.get("players"))
    try:
        reset_at = int(shop.get("resetAt", 0))
    except (TypeError, ValueError):
        reset_at = 0
    state["shop"]["resetAt"] = max(0, reset_at)

    announcement = payload.get("announcement")
    if isinstance(announcement, dict):
        text = str(announcement.get("text", "")).strip()[:240]
        try:
            updated_at = int(announcement.get("updatedAt", 0))
        except (TypeError, ValueError):
            updated_at = 0
        state["announcement"] = {
            "text": text,
            "updatedAt": max(0, updated_at) if text else 0,
        }

    return state


def load_state() -> dict:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not DATA_FILE.exists():
        state = default_state()
        if DEMO:
            state["sessions"] = demo_sessions()
            save_state(state)
        return state

    try:
        payload = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        print(f"Impossibile leggere {DATA_FILE}: {error}", file=sys.stderr)
        return default_state()

    return clean_state(payload)


def save_state(state: dict) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    temporary = DATA_FILE.with_suffix(".tmp")
    normalized = clean_state(state)
    normalized["sessions"] = normalized["sessions"][-MAX_SESSIONS:]
    normalized["adjustments"] = normalized["adjustments"][-MAX_ADJUSTMENTS:]
    temporary.write_text(
        json.dumps(normalized, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    os.replace(temporary, DATA_FILE)


def collect_entries(sessions: list[dict], adjustments: list[dict], since: int = 0) -> dict:
    grouped: dict[str, dict] = {}

    def ensure(username: str, country: str) -> dict:
        key = player_key(username, country)
        entry = grouped.get(key)
        if entry is None:
            entry = {
                "username": username,
                "country": country,
                "xp": 0,
                "minutes": 0.0,
                "sessions": 0,
                "lastAt": 0,
            }
            grouped[key] = entry
        return entry

    for session in sessions:
        if since and session["ts"] < since:
            continue
        entry = ensure(session["username"], session["country"])
        entry["xp"] += int(session["xp"])
        entry["minutes"] += float(session["minutes"])
        entry["sessions"] += 1
        entry["lastAt"] = max(entry["lastAt"], int(session["ts"]))

    if not since:
        for adjustment in adjustments:
            entry = ensure(adjustment["username"], adjustment["country"])
            entry["xp"] += int(adjustment["delta"])
            entry["lastAt"] = max(entry["lastAt"], int(adjustment["ts"]))

    return grouped


def sort_entries(entries: list[dict]) -> list[dict]:
    return sorted(
        entries,
        key=lambda entry: (
            -entry["xp"],
            -entry["sessions"],
            -entry["lastAt"],
            entry["username"].casefold(),
        ),
    )


def aggregate(sessions: list[dict], adjustments: list[dict], since: int = 0) -> list[dict]:
    entries = [
        entry
        for entry in collect_entries(sessions, adjustments, since).values()
        if entry["xp"] > 0
    ]
    ordered = sort_entries(entries)[:50]
    for index, entry in enumerate(ordered, start=1):
        entry["rank"] = index
        entry["xp"] = max(0, int(entry["xp"]))
        entry["minutes"] = round(entry["minutes"], 1)
    return ordered


def leaderboards(state: dict) -> dict:
    now = now_ms()
    return {
        "mode": "server",
        "all": aggregate(state["sessions"], state["adjustments"]),
        "week": aggregate(state["sessions"], [], now - WEEK_MS),
        "totalSessions": len(state["sessions"]),
        "announcement": state["announcement"],
        "updatedAt": now,
    }


def participant_entries(state: dict) -> list[dict]:
    now = now_ms()
    entries = collect_entries(state["sessions"], state["adjustments"])
    week = collect_entries(state["sessions"], [], now - WEEK_MS)
    players = state["shop"]["players"]

    keys = set(entries) | set(players)
    for key, player in players.items():
        if key not in entries:
            entries[key] = {
                "username": player["username"],
                "country": player["country"],
                "xp": 0,
                "minutes": 0.0,
                "sessions": 0,
                "lastAt": 0,
            }

    participants = []
    for key in keys:
        entry = entries.get(key)
        if entry is None:
            continue
        entry["xp"] = max(0, int(entry["xp"]))
        entry["minutes"] = round(float(entry["minutes"]), 1)
        entry["weekXp"] = max(0, int(week.get(key, {}).get("xp", 0)))
        entry["shop"] = players.get(key)
        participants.append(entry)

    participants = sort_entries(participants)
    rank = 0
    for entry in participants:
        if entry["xp"] > 0:
            rank += 1
            entry["rank"] = rank
        else:
            entry["rank"] = None
    return participants


def admin_payload(state: dict) -> dict:
    now = now_ms()
    week = aggregate(state["sessions"], [], now - WEEK_MS)
    participants = participant_entries(state)
    sessions = sorted(
        state["sessions"], key=lambda item: item["ts"], reverse=True
    )[:MAX_ADMIN_SESSIONS]
    adjustments = sorted(
        state["adjustments"], key=lambda item: item["ts"], reverse=True
    )[:MAX_ADMIN_ADJUSTMENTS]
    players = state["shop"]["players"]

    return {
        "mode": "server",
        "updatedAt": now,
        "totals": {
            "participants": len(participants),
            "sessions": len(state["sessions"]),
            "xp": sum(entry["xp"] for entry in participants),
            "weekXp": sum(entry["xp"] for entry in week),
            "shopOwners": sum(1 for player in players.values() if player["owned"]),
            "catalogOverrides": len(state["shop"]["catalog"]),
        },
        "participants": participants,
        "sessions": sessions,
        "adjustments": adjustments,
        "catalog": state["shop"]["catalog"],
        "announcement": state["announcement"],
    }


def shop_payload(state: dict, username: str = "", country: str = "") -> dict:
    player = None
    if username and country and NAME_RE.match(username) and COUNTRY_RE.match(country):
        player = state["shop"]["players"].get(player_key(username, country))
    return {
        "mode": "server",
        "catalog": state["shop"]["catalog"],
        "announcement": state["announcement"],
        "player": player,
        "resetAt": state["shop"]["resetAt"],
        "updatedAt": now_ms(),
    }


def all_time_total(state: dict, username: str, country: str) -> int:
    key = player_key(username, country)
    total = sum(
        int(session["xp"])
        for session in state["sessions"]
        if player_key(session["username"], session["country"]) == key
    )
    total += sum(
        int(adjustment["delta"])
        for adjustment in state["adjustments"]
        if player_key(adjustment["username"], adjustment["country"]) == key
    )
    return max(0, total)


def identity_from(payload: dict) -> tuple[str, str]:
    username = normalize_name(payload.get("username"))
    country = str(payload.get("country", "")).strip().upper()
    if not NAME_RE.match(username):
        raise ValueError("Nome non valido: usa da 2 a 20 caratteri.")
    if not COUNTRY_RE.match(country):
        raise ValueError("Paese non valido.")
    return username, country


def item_id_from(payload: dict) -> str:
    item_id = str(payload.get("id", "")).strip()
    if not ITEM_ID_RE.match(item_id):
        raise ValueError("Oggetto non valido.")
    return item_id


def ensure_player(state: dict, username: str, country: str) -> dict:
    key = player_key(username, country)
    player = state["shop"]["players"].get(key)
    if player is None:
        player = {
            "username": username,
            "country": country,
            "spentXp": 0,
            "owned": [],
            "equipped": {item_type: None for item_type in EQUIP_TYPES},
            "updatedAt": 0,
        }
        state["shop"]["players"][key] = player
    player["username"] = username
    player["country"] = country
    return player


def touch_player(player: dict) -> None:
    player["updatedAt"] = max(now_ms(), int(player.get("updatedAt", 0)) + 1)


def apply_admin_action(state: dict, payload: dict) -> None:
    action = str(payload.get("action", "")).strip()

    if action == "adjustXp":
        username, country = identity_from(payload)
        mode = str(payload.get("mode", "add")).strip()
        if mode not in ("add", "remove", "set"):
            raise ValueError("Modalità XP non valida.")
        try:
            amount = int(payload.get("amount", 0))
        except (TypeError, ValueError):
            raise ValueError("Quantità XP non valida.") from None
        if mode == "set":
            if not (0 <= amount <= MAX_XP):
                raise ValueError(f"Gli XP devono stare tra 0 e {MAX_XP}.")
        elif not (1 <= amount <= MAX_XP):
            raise ValueError(f"Inserisci da 1 a {MAX_XP} XP.")

        current = all_time_total(state, username, country)
        if mode == "add":
            delta = min(amount, MAX_XP - current)
        elif mode == "remove":
            delta = -min(amount, current)
        else:
            delta = amount - current

        if delta == 0:
            raise ValueError("Nessuna variazione: gli XP sono già così.")

        note = str(payload.get("note", "")).strip()[:80]
        timestamp = now_ms()
        state["adjustments"].append(
            {
                "id": f"{timestamp}-{secrets.token_hex(3)}",
                "username": username,
                "country": country,
                "delta": delta,
                "note": note,
                "ts": timestamp,
            }
        )
        state["adjustments"] = state["adjustments"][-MAX_ADJUSTMENTS:]
        return

    if action == "deleteAdjustment":
        adjustment_id = str(payload.get("id", "")).strip()
        if not adjustment_id:
            raise ValueError("Rettifica non valida.")
        before = len(state["adjustments"])
        state["adjustments"] = [
            adjustment
            for adjustment in state["adjustments"]
            if adjustment["id"] != adjustment_id
        ]
        if len(state["adjustments"]) == before:
            raise ValueError("Rettifica non trovata.")
        return

    if action == "deleteParticipant":
        username, country = identity_from(payload)
        key = player_key(username, country)
        found = False
        filtered_sessions = []
        for session in state["sessions"]:
            if player_key(session["username"], session["country"]) == key:
                found = True
            else:
                filtered_sessions.append(session)
        filtered_adjustments = []
        for adjustment in state["adjustments"]:
            if player_key(adjustment["username"], adjustment["country"]) == key:
                found = True
            else:
                filtered_adjustments.append(adjustment)
        if key in state["shop"]["players"]:
            found = True
            state["shop"]["players"].pop(key, None)
        if not found:
            raise ValueError("Partecipante non trovato.")
        state["sessions"] = filtered_sessions
        state["adjustments"] = filtered_adjustments
        return

    if action == "deleteSession":
        username, country = identity_from(payload)
        key = player_key(username, country)
        try:
            timestamp = int(payload.get("ts", 0))
        except (TypeError, ValueError):
            raise ValueError("Sessione non valida.") from None
        for index, session in enumerate(state["sessions"]):
            if (
                session["ts"] == timestamp
                and player_key(session["username"], session["country"]) == key
            ):
                del state["sessions"][index]
                return
        raise ValueError("Sessione non trovata.")

    if action == "resetLeaderboard":
        state["sessions"] = []
        state["adjustments"] = []
        state["calls"] = []
        if payload.get("clearShop") is True:
            state["shop"]["players"] = {}
            state["shop"]["resetAt"] = now_ms()
        if payload.get("clearCatalog") is True:
            state["shop"]["catalog"] = {}
        return

    if action == "resetShop":
        state["shop"]["players"] = {}
        state["shop"]["resetAt"] = now_ms()
        return

    if action == "resetCatalog":
        state["shop"]["catalog"] = {}
        return

    if action == "setAnnouncement":
        text = str(payload.get("text", "")).strip()[:240]
        state["announcement"] = {
            "text": text,
            "updatedAt": now_ms() if text else 0,
        }
        return

    if action == "setCatalogItem":
        item_id = item_id_from(payload)
        try:
            price = int(payload.get("price", 0))
        except (TypeError, ValueError):
            raise ValueError("Prezzo non valido.") from None
        active = payload.get("active", True)
        if not (0 <= price <= MAX_PRICE):
            raise ValueError(f"Il prezzo deve stare tra 0 e {MAX_PRICE} XP.")
        if not isinstance(active, bool):
            raise ValueError("Disponibilità non valida.")
        state["shop"]["catalog"][item_id] = {"price": price, "active": active}
        return

    if action == "resetCatalogItem":
        item_id = item_id_from(payload)
        state["shop"]["catalog"].pop(item_id, None)
        return

    if action == "grantItem":
        username, country = identity_from(payload)
        item_id = item_id_from(payload)
        player = ensure_player(state, username, country)
        if item_id not in player["owned"]:
            player["owned"].append(item_id)
        touch_player(player)
        return

    if action == "revokeItem":
        username, country = identity_from(payload)
        item_id = item_id_from(payload)
        key = player_key(username, country)
        player = state["shop"]["players"].get(key)
        if player is None or item_id not in player["owned"]:
            raise ValueError("Il partecipante non possiede questo oggetto.")
        player["owned"] = [owned for owned in player["owned"] if owned != item_id]
        for item_type in EQUIP_TYPES:
            if player["equipped"].get(item_type) == item_id:
                player["equipped"][item_type] = None
        touch_player(player)
        return

    raise ValueError("Azione admin sconosciuta.")


def update_shop_from_client(state: dict, payload: dict) -> dict | None:
    username, country = identity_from(payload)
    raw_shop = payload.get("shop")
    if not isinstance(raw_shop, dict):
        raise ValueError("Inventario non valido.")

    player = clean_player(
        {
            "username": username,
            "country": country,
            "spentXp": raw_shop.get("spentXp", 0),
            "owned": raw_shop.get("owned", []),
            "equipped": raw_shop.get("equipped", {}),
            "updatedAt": raw_shop.get("updatedAt", 0),
        }
    )
    if player is None:
        raise ValueError("Inventario non valido.")

    if player["updatedAt"] > now_ms() + DAY_MS:
        player["updatedAt"] = now_ms()

    key = player_key(username, country)
    if player["updatedAt"] < state["shop"]["resetAt"]:
        return None
    existing = state["shop"]["players"].get(key)
    if existing is not None and player["updatedAt"] < existing["updatedAt"]:
        return existing

    state["shop"]["players"][key] = player
    return player


def _call_identity_key(identity: dict) -> str:
    return player_key(identity["username"], identity["country"])


def _call_conflict(state: dict, keys: set[str], now: int) -> dict | None:
    for call in state["calls"]:
        if call["status"] not in ("pending", "accepted"):
            continue
        if call["expiresAt"] <= now:
            continue
        if (
            _call_identity_key(call["from"]) in keys
            or _call_identity_key(call["to"]) in keys
        ):
            return call
    return None


def _call_by_id(state: dict, call_id: str) -> dict | None:
    for call in state["calls"]:
        if call["id"] == call_id:
            return call
    return None


def calls_payload(state: dict, username: str = "", country: str = "") -> dict:
    now = now_ms()
    identity = clean_call_identity({"username": username, "country": country})
    payload = {
        "mode": "server",
        "incoming": [],
        "outgoing": None,
        "active": None,
        "updatedAt": now,
    }
    if not identity:
        return payload

    me = _call_identity_key(identity)
    incoming = []
    outgoing = None
    active = None
    active_started = 0

    for call in state["calls"]:
        from_key = _call_identity_key(call["from"])
        to_key = _call_identity_key(call["to"])
        if call["status"] == "pending" and call["expiresAt"] > now:
            if to_key == me:
                incoming.append(
                    {
                        "id": call["id"],
                        "from": call["from"],
                        "createdAt": call["createdAt"],
                        "expiresAt": call["expiresAt"],
                    }
                )
            elif from_key == me:
                outgoing = {
                    "id": call["id"],
                    "to": call["to"],
                    "createdAt": call["createdAt"],
                    "expiresAt": call["expiresAt"],
                }
        elif call["status"] == "accepted" and call["expiresAt"] > now:
            if from_key == me or to_key == me:
                peer = call["to"] if from_key == me else call["from"]
                role = "caller" if from_key == me else "callee"
                if call["startedAt"] >= active_started:
                    active_started = call["startedAt"]
                    active = {
                        "id": call["id"],
                        "room": call["room"],
                        "peer": peer,
                        "role": role,
                        "startedAt": call["startedAt"],
                        "expiresAt": call["expiresAt"],
                    }

    incoming.sort(key=lambda item: item["createdAt"], reverse=True)
    payload["incoming"] = incoming[:5]
    payload["outgoing"] = outgoing
    payload["active"] = active
    return payload


def apply_call_action(state: dict, payload: dict) -> None:
    action = str(payload.get("action", "")).strip().lower()
    now = now_ms()

    if action == "invite":
        sender = clean_call_identity(payload.get("from"))
        receiver = clean_call_identity(payload.get("to"))
        if not sender or not receiver:
            raise ValueError("Nome o paese della chiamata non validi.")
        sender_key = _call_identity_key(sender)
        receiver_key = _call_identity_key(receiver)
        if sender_key == receiver_key:
            raise ValueError("Non puoi chiamare te stesso.")
        if _call_conflict(state, {sender_key, receiver_key}, now):
            raise ValueError("C'è già una chiamata in corso o in attesa per una delle due persone.")

        call_id = f"call-{secrets.token_hex(8)}"
        state["calls"].append(
            {
                "id": call_id,
                "from": sender,
                "to": receiver,
                "status": "pending",
                "room": "",
                "createdAt": now,
                "updatedAt": now,
                "startedAt": 0,
                "expiresAt": now + CALL_PENDING_TTL,
            }
        )
        return

    if action in ("accept", "decline", "cancel", "end"):
        identity = clean_call_identity(
            {"username": payload.get("username"), "country": payload.get("country")}
        )
        if not identity:
            raise ValueError("Identità della chiamata non valida.")
        call_id = str(payload.get("id", "")).strip().lower()
        call = _call_by_id(state, call_id)
        if call is None:
            raise ValueError("Chiamata non trovata.")
        me = _call_identity_key(identity)
        from_key = _call_identity_key(call["from"])
        to_key = _call_identity_key(call["to"])

        if action == "accept":
            if call["status"] != "pending" or call["expiresAt"] <= now:
                raise ValueError("La chiamata non è più disponibile.")
            if to_key != me:
                raise ValueError("Solo chi riceve può accettare questa chiamata.")
            call["status"] = "accepted"
            call["room"] = f"fioritura-{secrets.token_hex(8)}"
            call["startedAt"] = now
            call["updatedAt"] = now
            call["expiresAt"] = now + CALL_ACTIVE_TTL
            for other in state["calls"]:
                if other is call or other["status"] != "pending":
                    continue
                if (
                    _call_identity_key(other["from"]) in (from_key, to_key)
                    or _call_identity_key(other["to"]) in (from_key, to_key)
                ):
                    other["status"] = "cancelled"
                    other["updatedAt"] = now
            return

        if action == "decline":
            if call["status"] != "pending":
                raise ValueError("La chiamata non è più in attesa.")
            if to_key != me:
                raise ValueError("Solo chi riceve può rifiutare questa chiamata.")
            call["status"] = "declined"
            call["updatedAt"] = now
            return

        if action == "cancel":
            if call["status"] != "pending":
                raise ValueError("La chiamata non è più in attesa.")
            if from_key != me:
                raise ValueError("Solo chi chiama può annullare la richiesta.")
            call["status"] = "cancelled"
            call["updatedAt"] = now
            return

        if call["status"] != "accepted":
            raise ValueError("La chiamata non è attiva.")
        if me not in (from_key, to_key):
            raise ValueError("Non fai parte di questa chiamata.")
        call["status"] = "ended"
        call["updatedAt"] = now
        call["expiresAt"] = now + 10 * 60 * 1000
        return

    raise ValueError("Azione chiamata sconosciuta.")


class FiorituraHandler(SimpleHTTPRequestHandler):
    server_version = "Fioritura/2.0"
    protocol_version = "HTTP/1.1"

    def end_headers(self) -> None:
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt: str, *args) -> None:
        if self.path.startswith("/api/"):
            print(f"[api] {self.address_string()} {fmt % args}")

    def translate_path(self, path: str) -> str:
        parsed = urlparse(path).path
        if parsed.startswith("/data") or "/." in parsed:
            return str(ROOT / "__non_esiste__")
        result = Path(super().translate_path(path)).resolve()
        try:
            result.relative_to(ROOT)
        except ValueError:
            return str(ROOT / "__non_esiste__")
        if result == DATA_DIR or DATA_DIR in result.parents:
            return str(ROOT / "__non_esiste__")
        return str(result)

    def _send_json(self, payload, status: int = 200, headers: dict | None = None) -> None:
        body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        if headers:
            for name, value in headers.items():
                self.send_header(name, value)
        self.end_headers()
        self.wfile.write(body)

    def _send_error_json(self, status: int, message: str) -> None:
        self._send_json({"error": message}, status)

    def _read_json(self, limit: int = MAX_BODY):
        try:
            length = int(self.headers.get("Content-Length", "0") or "0")
        except ValueError:
            return None, (400, "Richiesta vuota.")
        if length <= 0:
            return None, (400, "Richiesta vuota.")
        if length > limit:
            return None, (413, "Richiesta troppo grande.")
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return None, (400, "JSON non valido.")
        if not isinstance(payload, dict):
            return None, (400, "Formato non valido.")
        return payload, None

    def _rate_limited(
        self,
        store: dict,
        client_ip: str,
        limit: int,
        window: float,
    ) -> bool:
        now = time.time()
        with _lock:
            hits = [stamp for stamp in store.get(client_ip, []) if now - stamp < window]
            if len(hits) >= limit:
                store[client_ip] = hits
                return True
            hits.append(now)
            store[client_ip] = hits
            if len(store) > 5000:
                store.clear()
            return False

    def _admin_status(self) -> str:
        if not ADMIN_PASSWORD:
            return "disabled"
        client_ip = self.client_address[0]
        now = time.time()
        with _lock:
            failures = [
                stamp
                for stamp in _admin_failures.get(client_ip, [])
                if now - stamp < ADMIN_FAIL_WINDOW
            ]
            _admin_failures[client_ip] = failures
            if len(failures) >= ADMIN_FAIL_LIMIT:
                return "limited"

        header = self.headers.get("Authorization", "")
        if not header.lower().startswith("basic "):
            return "unauthorized"
        try:
            decoded = base64.b64decode(header[6:].strip(), validate=True).decode("utf-8")
        except (ValueError, UnicodeDecodeError):
            return "unauthorized"
        if ":" not in decoded:
            return "unauthorized"
        given_user, given_password = decoded.split(":", 1)
        valid = hmac.compare_digest(given_user.encode("utf-8"), ADMIN_USER.encode("utf-8"))
        valid = valid & hmac.compare_digest(
            given_password.encode("utf-8"), ADMIN_PASSWORD.encode("utf-8")
        )
        if valid:
            with _lock:
                _admin_failures.pop(client_ip, None)
            return "ok"

        with _lock:
            failures = [
                stamp
                for stamp in _admin_failures.get(client_ip, [])
                if now - stamp < ADMIN_FAIL_WINDOW
            ]
            failures.append(now)
            _admin_failures[client_ip] = failures
        return "unauthorized"

    def _send_admin_auth_error(self, status: str) -> None:
        headers = {"WWW-Authenticate": 'Basic realm="Fioritura Admin", charset="UTF-8"'}
        if status == "disabled":
            self._send_json(
                {"error": "Admin spento: imposta FIORITURA_ADMIN_PASSWORD sul server."},
                503,
            )
            return
        if status == "limited":
            self._send_json(
                {"error": "Troppi tentativi. Riprova tra qualche minuto."},
                429,
            )
            return
        self._send_json({"error": "Credenziali admin non valide."}, 401, headers)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/leaderboard":
            with _lock:
                payload = leaderboards(STATE)
            self._send_json(payload)
            return
        if parsed.path == "/api/shop":
            query = parse_qs(parsed.query)
            username = normalize_name((query.get("username") or [""])[0])
            country = str((query.get("country") or [""])[0]).strip().upper()
            with _lock:
                payload = shop_payload(STATE, username, country)
            self._send_json(payload)
            return
        if parsed.path == "/api/calls":
            client_ip = self.client_address[0]
            if self._rate_limited(
                _call_read_rate, client_ip, CALL_READ_LIMIT, CALL_RATE_WINDOW
            ):
                self._send_error_json(429, "Troppe richieste di chiamata. Riprova più tardi.")
                return
            query = parse_qs(parsed.query)
            username = normalize_name((query.get("username") or [""])[0])
            country = str((query.get("country") or [""])[0]).strip().upper()
            with _lock:
                payload = calls_payload(STATE, username, country)
            self._send_json(payload)
            return
        if parsed.path == "/api/admin":
            status = self._admin_status()
            if status != "ok":
                self._send_admin_auth_error(status)
                return
            with _lock:
                payload = admin_payload(STATE)
            self._send_json(payload)
            return
        if parsed.path == "/api/health":
            with _lock:
                payload = {
                    "ok": True,
                    "sessions": len(STATE["sessions"]),
                    "shopPlayers": len(STATE["shop"]["players"]),
                    "calls": len(STATE["calls"]),
                    "admin": bool(ADMIN_PASSWORD),
                }
            self._send_json(payload)
            return
        super().do_GET()

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/leaderboard":
            self._post_session()
            return
        if parsed.path == "/api/shop":
            self._post_shop()
            return
        if parsed.path == "/api/calls":
            self._post_call()
            return
        if parsed.path == "/api/admin":
            self._post_admin()
            return
        self._send_error_json(404, "Risorsa non trovata.")

    def _post_session(self) -> None:
        client_ip = self.client_address[0]
        if self._rate_limited(_rate, client_ip, RATE_LIMIT, RATE_WINDOW):
            self._send_error_json(429, "Troppe sessioni in poco tempo. Riprova più tardi.")
            return

        payload, error = self._read_json()
        if error:
            self._send_error_json(*error)
            return

        try:
            username = normalize_name(payload.get("username"))
            country = str(payload.get("country", "")).strip().upper()
            minutes = float(payload.get("minutes", 0))
            xp = int(round(float(payload.get("xp", 0))))
        except (TypeError, ValueError):
            self._send_error_json(400, "Minuti o XP non validi.")
            return

        if not NAME_RE.match(username):
            self._send_error_json(400, "Nome non valido: usa da 2 a 20 caratteri.")
            return
        if not COUNTRY_RE.match(country):
            self._send_error_json(400, "Paese non valido.")
            return
        if not (5 <= minutes <= 600):
            self._send_error_json(400, "La sessione deve durare tra 5 e 600 minuti.")
            return

        maximum = int(round(minutes * 20))
        xp = max(0, min(xp, maximum))
        if xp <= 0:
            self._send_error_json(400, "XP non validi.")
            return

        session = {
            "username": username,
            "country": country,
            "minutes": round(minutes, 2),
            "xp": xp,
            "ts": now_ms(),
        }

        with _lock:
            STATE["sessions"].append(session)
            if len(STATE["sessions"]) > MAX_SESSIONS:
                del STATE["sessions"][: len(STATE["sessions"]) - MAX_SESSIONS]
            try:
                save_state(STATE)
            except OSError as error_save:
                print(f"Impossibile salvare la classifica: {error_save}", file=sys.stderr)
            payload_out = leaderboards(STATE)

        self._send_json(payload_out, 201)

    def _post_shop(self) -> None:
        client_ip = self.client_address[0]
        if self._rate_limited(_shop_rate, client_ip, SHOP_RATE_LIMIT, SHOP_RATE_WINDOW):
            self._send_error_json(429, "Troppe modifiche al negozio. Riprova più tardi.")
            return

        payload, error = self._read_json(MAX_BODY)
        if error:
            self._send_error_json(*error)
            return

        try:
            with _lock:
                update_shop_from_client(STATE, payload)
                try:
                    save_state(STATE)
                except OSError as error_save:
                    print(f"Impossibile salvare il negozio: {error_save}", file=sys.stderr)
                payload_out = shop_payload(
                    STATE,
                    normalize_name(payload.get("username")),
                    str(payload.get("country", "")).strip().upper(),
                )
        except ValueError as error_value:
            self._send_error_json(400, str(error_value))
            return

        self._send_json(payload_out)

    def _post_call(self) -> None:
        client_ip = self.client_address[0]
        if self._rate_limited(
            _call_action_rate, client_ip, CALL_ACTION_LIMIT, CALL_RATE_WINDOW
        ):
            self._send_error_json(429, "Troppe chiamate in poco tempo. Riprova più tardi.")
            return

        payload, error = self._read_json(MAX_BODY)
        if error:
            self._send_error_json(*error)
            return

        action = str(payload.get("action", "")).strip().lower()
        identity = (
            payload.get("from")
            if action == "invite"
            else {"username": payload.get("username"), "country": payload.get("country")}
        )
        clean = clean_call_identity(identity)

        with _lock:
            working = copy.deepcopy(STATE)
            try:
                apply_call_action(working, payload)
                save_state(working)
                STATE.clear()
                STATE.update(working)
                payload_out = calls_payload(
                    working,
                    clean["username"] if clean else "",
                    clean["country"] if clean else "",
                )
            except ValueError as error_value:
                self._send_error_json(400, str(error_value))
                return
            except OSError as error_save:
                print(f"Impossibile salvare la chiamata: {error_save}", file=sys.stderr)
                self._send_error_json(503, "Non riesco a salvare la chiamata.")
                return

        self._send_json(payload_out)

    def _post_admin(self) -> None:
        status = self._admin_status()
        if status != "ok":
            self._send_admin_auth_error(status)
            return

        payload, error = self._read_json(MAX_BODY)
        if error:
            self._send_error_json(*error)
            return

        with _lock:
            working = copy.deepcopy(STATE)
            try:
                apply_admin_action(working, payload)
                save_state(working)
                payload_out = admin_payload(working)
            except ValueError as error_value:
                self._send_error_json(400, str(error_value))
                return
            except OSError as error_save:
                print(f"Impossibile salvare lo stato admin: {error_save}", file=sys.stderr)
                self._send_error_json(503, "Non riesco a salvare le modifiche.")
                return
            STATE.clear()
            STATE.update(working)

        self._send_json(payload_out)


def print_banner(host: str, port: int) -> None:
    shown_host = "127.0.0.1" if host in ("0.0.0.0", "::") else host
    print("")
    print("  ✿  Fioritura")
    print(f"     Timer e classifica su http://{shown_host}:{port}")
    if ADMIN_PASSWORD:
        print(f"     Admin attivo per l'utente «{ADMIN_USER}» (doppio clic sul logo).")
    else:
        print("     Admin spento: imposta FIORITURA_ADMIN_PASSWORD per attivarlo.")
    print("     Premi Ctrl+C per fermare il server.")
    print("")


def main() -> None:
    print_banner(HOST, PORT)
    if DEMO:
        print("  Modalità demo: partecipanti di esempio inclusi al primo avvio.\n")

    handler = partial(FiorituraHandler, directory=str(ROOT))
    server = ThreadingHTTPServer((HOST, PORT), handler)
    server.daemon_threads = True

    if "--open" in sys.argv:
        shown_host = "127.0.0.1" if HOST in ("0.0.0.0", "::") else HOST
        threading.Timer(0.8, lambda: webbrowser.open(f"http://{shown_host}:{PORT}")).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  A presto. Respira.")
    finally:
        server.server_close()
        with _lock:
            try:
                save_state(STATE)
            except OSError:
                pass


if __name__ == "__main__":
    STATE = load_state()
    main()
