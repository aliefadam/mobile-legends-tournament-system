import { getStore } from "@netlify/blobs";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const DATA_KEYS = ["tms_settings", "tms_tournaments", "tms_registrations", "tms_payments", "tms_brackets", "tms_matches"];
const ARRAY_KEYS = new Set(DATA_KEYS.filter((key) => key !== "tms_settings"));
const SESSION_COOKIE = "mlbb_tms_session";
const SESSION_MS = 8 * 60 * 60 * 1000;
const REMEMBER_MS = 7 * 24 * 60 * 60 * 1000;
const EMPTY_SETTINGS = {
  payment: { banks: [], qris: { name: "", image: null, active: false } },
  system: { site_name: "MLBB Arena", allow_manual_fallback: true, contact_whatsapp: "" },
};

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
  });

async function readKey(store, key, fallback) {
  return (await store.get(key, { type: "json" })) ?? fallback;
}

async function readData(store) {
  const entries = await Promise.all(DATA_KEYS.map(async (key) => [key, await readKey(store, key, key === "tms_settings" ? EMPTY_SETTINGS : [])]));
  return Object.fromEntries(entries);
}

async function writeData(store, changes) {
  await Promise.all(Object.entries(changes).map(([key, value]) => store.setJSON(key, value)));
}

function publicData(data) {
  const tournaments = data.tms_tournaments.filter((tournament) => tournament.status !== "draft" && !tournament.archived);
  const tournamentIds = new Set(tournaments.map((tournament) => tournament.id));
  const registrations = data.tms_registrations.filter((registration) => tournamentIds.has(registration.tournament_id));
  const publishedBrackets = data.tms_brackets.filter((bracket) => tournamentIds.has(bracket.tournament_id) && bracket.published);
  const publishedBracketIds = new Set(publishedBrackets.map((bracket) => bracket.tournament_id));
  return {
    ...data,
    tms_settings: {
      payment: data.tms_settings.payment,
      system: {
        site_name: data.tms_settings.system?.site_name,
        allow_manual_fallback: data.tms_settings.system?.allow_manual_fallback,
        contact_whatsapp: data.tms_settings.system?.contact_whatsapp,
      },
    },
    tms_tournaments: tournaments,
    tms_registrations: registrations.map((reg) => ({
      id: reg.id,
      tournament_id: reg.tournament_id,
      team_name: reg.team_name,
      total_slot: reg.total_slot,
      total_payment: reg.total_payment,
      payment_status: reg.payment_status,
      created_at: reg.created_at,
      slots: (reg.slots || []).map((slot) => ({ id: slot.id, team_name: slot.team_name })),
    })),
    tms_payments: data.tms_payments.filter((payment) => tournamentIds.has(payment.tournament_id)).map((payment) => ({
      id: payment.id,
      registration_id: payment.registration_id,
      tournament_id: payment.tournament_id,
      status: payment.status,
    })),
    tms_brackets: publishedBrackets,
    tms_matches: data.tms_matches.filter((match) => publishedBracketIds.has(match.tournament_id)),
  };
}

function getCookie(request, name) {
  const cookie = request.headers.get("cookie") || "";
  const item = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : "";
}

function sign(value) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET harus diisi dengan minimal 32 karakter.");
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function credentialVersion() {
  const username = process.env.ADMIN_USERNAME || "";
  const password = process.env.ADMIN_PASSWORD || "";
  return sign(`admin:${username}\0${password}`);
}

function makeSession(username, expiresAt) {
  const payload = Buffer.from(JSON.stringify({ username, expiresAt, credentialVersion: credentialVersion() })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function verifySession(request) {
  const token = getCookie(request, SESSION_COOKIE);
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  const expected = sign(payload);
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return session.expiresAt > Date.now() && session.credentialVersion === credentialVersion() ? session : null;
  } catch {
    return null;
  }
}

function passwordRecord(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function passwordMatches(password, record) {
  if (!record?.salt || !record?.hash) return false;
  const expected = Buffer.from(record.hash, "hex");
  const actual = scryptSync(password, record.salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function cookieHeader(token, request, maxAge) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict;${new URL(request.url).protocol === "https:" ? " Secure;" : ""}${maxAge ? ` Max-Age=${maxAge};` : ""}`;
}

async function bodyJSON(request) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 8 * 1024 * 1024) throw new Error("Ukuran data melebihi batas 8 MB.");
  return request.json();
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "").replace(/^0/, "62");
}

function validImage(dataUrl) {
  return typeof dataUrl === "string" &&
    dataUrl.length <= 7 * 1024 * 1024 &&
    /^data:image\/(?:jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(dataUrl);
}

async function handle(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/\.netlify\/functions\/api/, "/api").replace(/\/+$/, "") || "/";
  const method = request.method.toUpperCase();
  const session = verifySession(request);
  const store = getStore({ name: "mlbb-tms", consistency: "strong" });

  if (path === "/api/auth/session" && method === "GET") {
    return json({ authed: !!session, username: session?.username || null });
  }

  if (path === "/api/auth/login" && method === "POST") {
    const { username, password, remember } = await bodyJSON(request);
    if (typeof username !== "string" || typeof password !== "string" || !username.trim() || !password) {
      return json({ error: "Username dan password wajib diisi." }, 400);
    }
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
      return json({ error: "SESSION_SECRET belum dikonfigurasi dengan minimal 32 karakter." }, 503);
    }
    const initialUsername = process.env.ADMIN_USERNAME;
    const initialPassword = process.env.ADMIN_PASSWORD;
    if (!initialUsername || !initialPassword) {
      return json({ error: "Akun admin belum dikonfigurasi. Atur ADMIN_USERNAME dan ADMIN_PASSWORD pada environment server." }, 503);
    }
    if (initialPassword.length < 8) {
      return json({ error: "ADMIN_PASSWORD harus memiliki minimal 8 karakter. Perbarui environment lalu jalankan ulang server." }, 503);
    }
    let admin = await readKey(store, "admin", null);
    if (!admin || admin.username !== initialUsername || !passwordMatches(initialPassword, admin.password)) {
      admin = { username: initialUsername, password: passwordRecord(initialPassword) };
      await store.setJSON("admin", admin);
    }
    if (admin.username !== username.trim() || !passwordMatches(password, admin.password)) {
      return json({ error: "Username atau password salah." }, 401);
    }
    const expiresAt = Date.now() + (remember ? REMEMBER_MS : SESSION_MS);
    const maxAge = remember ? Math.floor(REMEMBER_MS / 1000) : undefined;
    return json({ authed: true, username: admin.username }, 200, { "Set-Cookie": cookieHeader(makeSession(admin.username, expiresAt), request, maxAge) });
  }

  if (path === "/api/auth/logout" && method === "POST") {
    const secure = new URL(request.url).protocol === "https:" ? " Secure;" : "";
    return json({ ok: true }, 200, { "Set-Cookie": `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict;${secure} Max-Age=0` });
  }

  if (path === "/api/data" && method === "GET") {
    const data = await readData(store);
    return json({ data: session ? data : publicData(data), authed: !!session });
  }

  if (path === "/api/data" && method === "PUT") {
    if (!session) return json({ error: "Hanya admin yang dapat mengubah data." }, 401);
    const { changes } = await bodyJSON(request);
    if (!changes || typeof changes !== "object" || Array.isArray(changes)) return json({ error: "Format perubahan data tidak valid." }, 400);
    for (const [key, value] of Object.entries(changes)) {
      if (!DATA_KEYS.includes(key) || (ARRAY_KEYS.has(key) && !Array.isArray(value)) ||
        (key === "tms_settings" && (!value || typeof value !== "object" || Array.isArray(value)))) {
        return json({ error: `Data "${key}" tidak valid.` }, 400);
      }
    }
    await writeData(store, changes);
    return json({ ok: true });
  }

  if (path === "/api/registration" && method === "GET") {
    const id = (url.searchParams.get("id") || "").trim().toUpperCase();
    const whatsapp = normalizePhone(url.searchParams.get("whatsapp"));
    if (!id || !whatsapp) return json({ error: "Registration ID dan WhatsApp wajib diisi." }, 400);
    const data = await readData(store);
    const reg = data.tms_registrations.find((item) => item.id === id && normalizePhone(item.whatsapp) === whatsapp);
    if (!reg) return json({ error: "Pendaftaran tidak ditemukan." }, 404);
    const tournament = data.tms_tournaments.find((item) => item.id === reg.tournament_id);
    if (!tournament || tournament.status === "draft" || tournament.archived) return json({ error: "Pendaftaran tidak ditemukan." }, 404);
    const payment = data.tms_payments.find((item) => item.registration_id === reg.id);
    return json({
      registration: { ...reg, whatsapp: undefined, slots: (reg.slots || []).map((slot) => ({ id: slot.id, team_name: slot.team_name })) },
      payment: payment ? { status: payment.status, reject_note: payment.reject_note || "" } : null,
    });
  }

  if (path === "/api/registration" && method === "POST") {
    const { registration, payment } = await bodyJSON(request);
    const data = await readData(store);
    const tournament = data.tms_tournaments.find((item) => item.id === registration?.tournament_id);
    if (!tournament || tournament.status === "draft" || tournament.archived || tournament.registration_status !== "open" || tournament.status !== "registration_open") {
      return json({ error: "Pendaftaran turnamen ini tidak sedang dibuka." }, 409);
    }
    if (!/^REG-\d{4,}$/.test(registration?.id || "") || !/^PAY-\d{4,}$/.test(payment?.id || "") ||
      !Array.isArray(registration.slots) || registration.slots.length !== registration.total_slot ||
      registration.slots.length < 1 || registration.slots.length > (tournament.support_multi_slot ? 2 : 1) ||
      !/^(\+?62|0)8\d{7,12}$/.test(String(registration.whatsapp || "").replace(/[\s-]/g, "")) ||
      registration.slots.some((slot) => !slot || typeof slot.team_name !== "string" ||
        !Array.isArray(slot.players) || slot.players.length !== 5 ||
        !Array.isArray(slot.substitutes) || slot.substitutes.length > 2)) {
      return json({ error: "Data pendaftaran tidak valid." }, 400);
    }
    if (data.tms_registrations.some((item) => item.id === registration.id) || data.tms_payments.some((item) => item.id === payment.id)) {
      return json({ error: "ID pendaftaran sudah digunakan. Silakan coba kembali." }, 409);
    }
    const teamName = String(registration.team_name || "").trim().toLocaleLowerCase("id-ID");
    const registrationsForTournament = data.tms_registrations.filter((item) => item.tournament_id === tournament.id && item.payment_status !== "rejected");
    if (!teamName || registrationsForTournament.some((item) => [item.team_name, ...(item.slots || []).map((slot) => slot.team_name)].some((name) => String(name || "").trim().toLocaleLowerCase("id-ID") === teamName))) {
      return json({ error: "Nama tim sudah digunakan pada turnamen ini." }, 409);
    }
    const usedSlots = registrationsForTournament.reduce((sum, item) => sum + (Number(item.total_slot) || 0), 0);
    if (tournament.max_teams && usedSlots + registration.total_slot > tournament.max_teams) return json({ error: "Slot turnamen sudah penuh." }, 409);
    const expectedAmount = Number(tournament.registration_price) * registration.slots.length;
    const settings = data.tms_settings;
    const methodEnabled = payment.method === "bank"
      ? settings.payment?.banks?.some((bank) => bank.active)
      : payment.method === "qris" && settings.payment?.qris?.active && settings.payment.qris.image;
    if (!methodEnabled || Number(registration.total_payment) !== expectedAmount || Number(payment.amount) !== expectedAmount || payment.registration_id !== registration.id || !validImage(payment.proof)) {
      return json({ error: "Data pembayaran tidak valid." }, 400);
    }
    const existingPlayerIds = new Set();
    for (const item of data.tms_registrations) {
      if (item.tournament_id !== tournament.id || item.payment_status === "rejected") continue;
      for (const slot of item.slots || []) for (const player of [...(slot.players || []), ...(slot.substitutes || [])]) {
        if (player.ml_id && player.ml_server) existingPlayerIds.add(`${player.ml_id}:${player.ml_server}`);
      }
    }
    for (const slot of registration.slots) for (const player of [...slot.players, ...slot.substitutes]) {
      if (!player || typeof player.full_name !== "string" || !player.full_name.trim() ||
        typeof player.ml_id !== "string" || !player.ml_id.trim() ||
        typeof player.ml_server !== "string" || !player.ml_server.trim()) {
        return json({ error: "Data pemain tidak valid." }, 400);
      }
      const key = `${String(player.ml_id || "").trim()}:${String(player.ml_server || "").trim()}`;
      if (existingPlayerIds.has(key)) {
        return json({ error: "Data pemain tidak valid atau pemain sudah terdaftar pada turnamen ini." }, 409);
      }
      existingPlayerIds.add(key);
    }
    await writeData(store, {
      tms_registrations: [...data.tms_registrations, { ...registration, payment_status: "pending" }],
      tms_payments: [...data.tms_payments, { ...payment, status: "pending", reject_note: "", verified_at: null }],
    });
    return json({ ok: true });
  }

  if (path === "/api/registration/proof" && method === "POST") {
    const { id, whatsapp, proof, name } = await bodyJSON(request);
    if (!validImage(proof) || typeof name !== "string") return json({ error: "Bukti pembayaran tidak valid." }, 400);
    const data = await readData(store);
    const index = data.tms_registrations.findIndex((item) => item.id === id && normalizePhone(item.whatsapp) === normalizePhone(whatsapp));
    if (index < 0) return json({ error: "Pendaftaran tidak ditemukan." }, 404);
    if (data.tms_registrations[index].payment_status !== "rejected") return json({ error: "Bukti hanya dapat diganti untuk pembayaran yang ditolak." }, 409);
    const now = new Date().toISOString();
    data.tms_registrations[index] = { ...data.tms_registrations[index], payment_status: "pending", updated_at: now };
    data.tms_payments = data.tms_payments.map((item) => item.registration_id === id
      ? { ...item, proof, proof_name: name, status: "pending", reject_note: "", updated_at: now }
      : item);
    await writeData(store, { tms_registrations: data.tms_registrations, tms_payments: data.tms_payments });
    return json({ ok: true });
  }

  return json({ error: "Endpoint tidak ditemukan." }, 404);
}

export default async (request) => {
  try {
    return await handle(request);
  } catch (error) {
    console.error("[api] request failed", error);
    return json({ error: error.message || "Terjadi kesalahan pada server." }, 500);
  }
};

export const config = { path: "/api/*" };
