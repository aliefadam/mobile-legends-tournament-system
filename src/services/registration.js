import { MAIN_PLAYER_COUNT, SUB_PLAYER_COUNT } from "../constants";
import { isValidMlId, isValidMlServer } from "./mlbb";
import { formatDateTime, normalizePhone, nowISO, pad, toCSV } from "../utils/format";

export const createPlayer = (role) => ({
  full_name: "",
  ml_id: "",
  ml_server: "",
  nickname: "",
  verified: false,
  manual: false,
  role,
});

export const createSlot = (index, teamName = "") => ({
  id: `slot_${pad(index + 1)}`,
  team_name: teamName,
  players: Array.from({ length: MAIN_PLAYER_COUNT }, () => createPlayer("main")),
  substitutes: Array.from({ length: SUB_PLAYER_COUNT }, () => createPlayer("substitute")),
});

export const createEmptyForm = () => ({
  whatsapp: "",
  total_slot: 1,
  slots: [createSlot(0)],
  method: "",
  proof: null,
  agreed: false,
});

export const nextRegistrationId = (list) => {
  const used = new Set(list.map((r) => r.id));
  let n = list.reduce((m, r) => Math.max(m, parseInt(String(r.id).replace(/\D/g, ""), 10) || 0), 0) + 1;
  while (used.has(`REG-${pad(n, 4)}`)) n++;
  return `REG-${pad(n, 4)}`;
};

export const nextPaymentId = (list) => {
  const n = list.reduce((m, p) => Math.max(m, parseInt(String(p.id).replace(/\D/g, ""), 10) || 0), 0) + 1;
  return `PAY-${pad(n, 4)}`;
};

export const isWaValid = (v) => /^(\+62|62|0)8\d{7,12}$/.test(normalizePhone(v));
export const playerKey = (p) => `${String(p.ml_id).trim()}:${String(p.ml_server).trim()}`;
export const normalizeTeamName = (name) => String(name || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("id-ID");
const isBlank = (p) => !p.full_name.trim() && !p.ml_id.trim() && !p.ml_server.trim();

export function isTeamNameTaken(name, registrations = [], tournamentId) {
  const normalized = normalizeTeamName(name);
  if (!normalized) return false;
  return registrations.some((registration) =>
    registration.tournament_id === tournamentId &&
    registration.payment_status !== "rejected" &&
    (
      normalizeTeamName(registration.team_name) === normalized ||
      (registration.slots || []).some((slot) => normalizeTeamName(slot.team_name) === normalized)
    )
  );
}

export function validateTeamStep(form, { registrations = [], tournamentId } = {}) {
  const e = {};
  const teamName = form.slots[0]?.team_name.trim() || "";
  if (!teamName) e["s0.team_name"] = "Nama tim wajib diisi.";
  else if (teamName.length < 3) e["s0.team_name"] = "Nama tim minimal 3 karakter.";
  else if (isTeamNameTaken(teamName, registrations, tournamentId)) e["s0.team_name"] = "Nama tim sudah digunakan pada turnamen ini.";
  if (!form.whatsapp.trim()) e.whatsapp = "Nomor WhatsApp wajib diisi.";
  else if (!isWaValid(form.whatsapp)) e.whatsapp = "Nomor WhatsApp tidak valid (contoh: 081234567890).";
  return e;
}

export function validatePlayersStep(form, { existingKeys = new Set() }) {
  const e = {};
  const seen = new Map();
  const check = (p, prefix, optional) => {
    if (optional && isBlank(p)) return;
    if (!p.full_name.trim()) e[`${prefix}.full_name`] = "Nama lengkap wajib diisi.";
    else if (p.full_name.trim().length < 3) e[`${prefix}.full_name`] = "Nama minimal 3 karakter.";
    if (!p.ml_id.trim()) e[`${prefix}.ml_id`] = "User ID wajib diisi.";
    else if (!isValidMlId(p.ml_id)) e[`${prefix}.ml_id`] = "User ID tidak valid.";
    if (!p.ml_server.trim()) e[`${prefix}.ml_server`] = "Server ID wajib diisi.";
    else if (!isValidMlServer(p.ml_server)) e[`${prefix}.ml_server`] = "Server ID tidak valid.";
    if (isValidMlId(p.ml_id) && isValidMlServer(p.ml_server)) {
      const key = playerKey(p);
      if (seen.has(key)) e[`${prefix}.ml_id`] = "ID pemain ini digunakan dua kali dalam pendaftaran.";
      else if (existingKeys.has(key)) e[`${prefix}.ml_id`] = "Pemain ini sudah terdaftar pada turnamen ini.";
      seen.set(key, true);
    }
  };
  const slot = form.slots[0];
  slot?.players.forEach((p, pi) => check(p, `s0.p${pi}`, false));
  slot?.substitutes.forEach((p, bi) => check(p, `s0.b${bi}`, true));
  return e;
}

export function validatePaymentStep(form, paymentOptions) {
  const e = {};
  if (!form.method) e.method = "Pilih metode pembayaran.";
  else if (!paymentOptions.includes(form.method)) e.method = "Metode pembayaran tidak tersedia.";
  if (!form.proof?.dataUrl) e.proof = "Bukti pembayaran wajib diunggah.";
  return e;
}

export function collectExistingKeys(registrations, tournamentId) {
  const set = new Set();
  registrations
    .filter((r) => r.tournament_id === tournamentId && r.payment_status !== "rejected")
    .forEach((r) =>
      r.slots.forEach((s) => [...s.players, ...s.substitutes].forEach((p) => p.ml_id && set.add(playerKey(p))))
    );
  return set;
}

const cleanPlayer = (p, role) => ({
  full_name: p.full_name.trim(),
  ml_id: p.ml_id.trim(),
  ml_server: p.ml_server.trim(),
  role,
});

export const stripPlayerNicknames = (registration) => ({
  ...registration,
  slots: (registration.slots || []).map((slot) => ({
    ...slot,
    players: (slot.players || []).map(({ nickname, verified, manual, lookup_failed, ...player }) => player),
    substitutes: (slot.substitutes || []).map(({ nickname, verified, manual, lookup_failed, ...player }) => player),
  })),
});

export function buildRegistration({ form, tournament, registrations, payments }) {
  const id = nextRegistrationId(registrations);
  const paymentId = nextPaymentId(payments);
  const now = nowISO();
  const teamName = form.slots[0]?.team_name.trim() || "";
  const slots = form.slots.map((s, i) => ({
    id: `${id}-S${i + 1}`,
    team_name: teamName,
    players: s.players.map((p) => cleanPlayer(p, "main")),
    substitutes: s.substitutes.filter((p) => !isBlank(p)).map((p) => cleanPlayer(p, "substitute")),
  }));
  const total = tournament.registration_price * form.slots.length;
  const registration = {
    id,
    tournament_id: tournament.id,
    team_name: slots[0].team_name,
    whatsapp: normalizePhone(form.whatsapp),
    total_slot: slots.length,
    total_payment: total,
    payment_status: "pending",
    payment_id: paymentId,
    created_at: now,
    updated_at: now,
    slots,
  };
  const payment = {
    id: paymentId,
    registration_id: id,
    tournament_id: tournament.id,
    method: form.method,
    amount: total,
    proof: form.proof.dataUrl,
    proof_name: form.proof.name,
    status: "pending",
    reject_note: "",
    created_at: now,
    updated_at: now,
  };
  return { registration, payment };
}

export const registrationTeamLabel = (reg) => [...new Set(reg.slots.map((s) => s.team_name))].join(" / ");

export function createDummyRegistrations({ tournament, count, registrations, payments }) {
  const generated = [];
  const firstTeamNumber = registrations.length + 1;
  let registrationList = registrations;
  let paymentList = payments;

  for (let index = 0; index < count; index++) {
    const id = nextRegistrationId(registrationList);
    const paymentId = nextPaymentId(paymentList);
    const now = nowISO();
    const teamNumber = firstTeamNumber + index;
    const teamName = `Dummy Team ${pad(teamNumber, 3)}`;
    const slot = createSlot(0, teamName);
    slot.id = `${id}-S1`;
    slot.players = slot.players.map((player, playerIndex) => ({
      ...player,
      full_name: `Pemain Dummy ${pad(teamNumber, 3)}-${playerIndex + 1}`,
      ml_id: String(700000000 + teamNumber * 10 + playerIndex),
      ml_server: "1234",
    }));

    const registration = {
      id,
      tournament_id: tournament.id,
      team_name: teamName,
      whatsapp: "6280000000000",
      total_slot: 1,
      total_payment: tournament.registration_price,
      payment_status: "approved",
      payment_id: paymentId,
      created_at: now,
      updated_at: now,
      is_dummy: true,
      slots: [slot],
    };
    const payment = {
      id: paymentId,
      registration_id: id,
      tournament_id: tournament.id,
      method: "dummy",
      amount: tournament.registration_price,
      proof: "",
      proof_name: "",
      status: "approved",
      reject_note: "",
      verified_at: now,
      created_at: now,
      updated_at: now,
      is_dummy: true,
    };
    generated.push({ registration, payment });
    registrationList = [...registrationList, registration];
    paymentList = [...paymentList, payment];
  }

  return generated;
}

export function registrationSlotTeamName(registration, slotIndex) {
  const slot = registration.slots[slotIndex];
  if (!slot) return "";
  const sharedName = registration.slots.length > 1 && registration.slots.every((item) => item.team_name === slot.team_name);
  return sharedName ? `${slot.team_name} (${String.fromCharCode(65 + slotIndex)})` : slot.team_name;
}

/** Setiap slot yang approved menjadi satu tim di bracket. */
export function teamsFromRegistrations(registrations, tournamentId) {
  const teams = [];
  registrations
    .filter((r) => r.tournament_id === tournamentId && r.payment_status === "approved")
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
    .forEach((r) =>
      r.slots.forEach((s, slotIndex) =>
        teams.push({ id: s.id, name: registrationSlotTeamName(r, slotIndex), registration_id: r.id, created_at: r.created_at, slot: s })
      )
    );
  return teams;
}

export function registrationsToCSV(registrations, tournaments) {
  const tmap = new Map(tournaments.map((t) => [t.id, t.name]));
  const headers = [
    "Registration ID", "Turnamen", "Slot", "Nama Tim", "WhatsApp Ketua", "Total Pembayaran", "Status Pembayaran", "Tanggal Daftar",
    "Peran", "Nama Lengkap", "ML ID", "Server ID",
  ];
  const rows = [];
  registrations.forEach((r) =>
    r.slots.forEach((s, si) =>
      [...s.players, ...s.substitutes].forEach((p, pi) =>
        rows.push([
          r.id, tmap.get(r.tournament_id) || r.tournament_id, si + 1, s.team_name, r.whatsapp, r.total_payment, r.payment_status,
          formatDateTime(r.created_at),
          p.role === "main" ? `Pemain ${pi + 1}` : `Cadangan ${pi - s.players.length + 1}`,
          p.full_name, p.ml_id, p.ml_server,
        ])
      )
    )
  );
  return toCSV(headers, rows);
}
