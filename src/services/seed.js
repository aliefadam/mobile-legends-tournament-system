import { DEFAULT_ADMIN, STORAGE_KEYS } from "../constants";
import { hashPassword, nowISO, pad, toISODate } from "../utils/format";
import { DEFAULT_MLBB_API } from "./mlbb";
import { storage } from "./storage";

const FIRST = ["Rizky", "Dimas", "Fajar", "Bagas", "Arya", "Raka", "Naufal", "Galih", "Yoga", "Hafiz", "Ilham", "Bayu", "Andra", "Reza", "Farel", "Kevin", "Dafa", "Rafi", "Satria", "Wahyu"];
const LAST = ["Pratama", "Saputra", "Hidayat", "Wijaya", "Nugroho", "Ramadhan", "Kurniawan", "Setiawan", "Firmansyah", "Permana", "Maulana", "Santoso"];
const TEAMS = ["Alpha Wolves", "Crimson Tigers", "Nebula Esports", "Phoenix Rising", "Shadow Legion", "Thunder Hawks", "Royal Knights", "Venom Squad", "Dragon Fury", "Blaze Gaming", "Storm Riders", "Iron Titans", "Cyber Ninjas"];

const svgUri = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

export function demoQris() {
  let seed = 20260101;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const n = 29;
  const c = 8;
  let cells = "";
  const finder = (x, y) =>
    `<rect x="${x * c}" y="${y * c}" width="${7 * c}" height="${7 * c}" fill="#0a1128"/><rect x="${(x + 1) * c}" y="${(y + 1) * c}" width="${5 * c}" height="${5 * c}" fill="#fff"/><rect x="${(x + 2) * c}" y="${(y + 2) * c}" width="${3 * c}" height="${3 * c}" fill="#0a1128"/>`;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const inFinder = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
      if (!inFinder && rnd() > 0.52) cells += `<rect x="${x * c}" y="${y * c}" width="${c}" height="${c}" fill="#0a1128"/>`;
    }
  const s = n * c;
  return svgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-16 -16 ${s + 32} ${s + 32}" width="400" height="400"><rect x="-16" y="-16" width="${s + 32}" height="${s + 32}" fill="#fff"/>${cells}${finder(0, 0)}${finder(n - 7, 0)}${finder(0, n - 7)}</svg>`
  );
}

const demoProof = (amount, team) =>
  svgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="520" viewBox="0 0 360 520"><rect width="360" height="520" fill="#f4f6fb"/><rect x="20" y="20" width="320" height="480" rx="18" fill="#fff" stroke="#d9deef"/><circle cx="180" cy="90" r="30" fill="#16a34a"/><path d="M165 90l11 11 20-22" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><text x="180" y="160" text-anchor="middle" font-family="sans-serif" font-size="18" font-weight="700" fill="#0a1128">Transfer Berhasil</text><text x="180" y="200" text-anchor="middle" font-family="sans-serif" font-size="30" font-weight="800" fill="#1d52e8">Rp${new Intl.NumberFormat("id-ID").format(amount)}</text><line x1="50" y1="240" x2="310" y2="240" stroke="#e2e8f0"/><text x="50" y="280" font-family="sans-serif" font-size="13" fill="#64748b">Keterangan</text><text x="310" y="280" text-anchor="end" font-family="sans-serif" font-size="13" font-weight="600" fill="#0a1128">${team.replace(/&/g, "&amp;")}</text><text x="50" y="320" font-family="sans-serif" font-size="13" fill="#64748b">Contoh bukti (data demo)</text></svg>`
  );

function makePlayers(k, role, count, offset = 0) {
  return Array.from({ length: count }, (_, i) => {
    const z = k * 7 + i + offset;
    const first = FIRST[z % FIRST.length];
    return {
      full_name: `${first} ${LAST[(z * 3) % LAST.length]}`,
      ml_id: String(210000000 + (z + 1) * 1234567),
      ml_server: String(2000 + ((z * 37) % 7000)),
      nickname: `${first}${["XD", "ML", "Pro", "YT", "GG"][z % 5]}`,
      verified: true,
      manual: false,
      role,
    };
  });
}

function makeReg({ no, tId, tIndex, price, status, daysAgo, note = "" }) {
  const id = `REG-${pad(no, 4)}`;
  const team = TEAMS[tIndex % TEAMS.length];
  const created = new Date(Date.now() - daysAgo * 86400000).toISOString();
  const reg = {
    id,
    tournament_id: tId,
    team_name: team,
    whatsapp: `08123${String(100000 + tIndex * 7311).slice(0, 6)}`,
    total_slot: 1,
    total_payment: price,
    payment_status: status,
    payment_id: `PAY-${pad(no, 4)}`,
    created_at: created,
    updated_at: created,
    slots: [
      {
        id: `${id}-S1`,
        team_name: team,
        players: makePlayers(no, "main", 5),
        substitutes: makePlayers(no, "substitute", tIndex % 2 === 0 ? 1 : 0, 5),
      },
    ],
  };
  const pay = {
    id: reg.payment_id,
    registration_id: id,
    tournament_id: tId,
    method: tIndex % 3 === 0 ? "qris" : "bank",
    amount: price,
    proof: demoProof(price, team),
    proof_name: "bukti-transfer.png",
    status,
    reject_note: note,
    created_at: created,
    updated_at: created,
  };
  return { reg, pay };
}

export function buildDemoData() {
  const day = (n) => toISODate(new Date(Date.now() + n * 86400000));
  const now = nowISO();
  const tournaments = [
    {
      id: "tournament_001", name: "Mobile Legends Season 1", slug: "mobile-legends-season-1", date: day(30),
      venue: "Warkop Sippo", location: "Jl. Raya Darmo No. 21, Surabaya", prize_pool: 1500000, registration_price: 50000,
      support_multi_slot: true, max_slot: 2, max_teams: 16, status: "registration_open", registration_status: "open",
      description: "Turnamen Mobile Legends 5v5 terbuka untuk umum. Bertanding secara offline dengan format bracket resmi, wasit netral, dan live streaming final.",
      rules: "1. Setiap tim terdiri dari 5 pemain utama dan maksimal 2 pemain cadangan.\n2. Seluruh pemain wajib menggunakan akun sendiri sesuai ID yang didaftarkan.\n3. Pertandingan menggunakan format Best of 3 (final Best of 5).\n4. Tim terlambat lebih dari 15 menit dinyatakan kalah WO.\n5. Keputusan panitia bersifat final.",
      archived: false, created_at: now, updated_at: now,
    },
    {
      id: "tournament_002", name: "Mobile Legends Season 2", slug: "mobile-legends-season-2", date: day(75),
      venue: "Arena Gaming Hub", location: "Jl. Pemuda No. 8, Surabaya", prize_pool: 3000000, registration_price: 75000,
      support_multi_slot: false, max_slot: 1, max_teams: 32, status: "published", registration_status: "closed",
      description: "Season 2 hadir dengan prize pool lebih besar dan slot terbatas. Pendaftaran segera dibuka.",
      rules: "1. Satu tim hanya boleh mendaftar satu slot.\n2. Format Double Elimination.\n3. Pemain wajib hadir 30 menit sebelum jadwal.",
      archived: false, created_at: now, updated_at: now,
    },
    {
      id: "tournament_003", name: "Mobile Legends Championship", slug: "mobile-legends-championship", date: day(-40),
      venue: "Grand City Convention", location: "Jl. Walikota Mustajab, Surabaya", prize_pool: 10000000, registration_price: 100000,
      support_multi_slot: true, max_slot: 2, max_teams: 8, status: "completed", registration_status: "closed",
      description: "Championship tahunan yang mempertemukan tim-tim terbaik se-Jawa Timur.",
      rules: "Mengikuti regulasi resmi turnamen Championship.",
      archived: false, created_at: now, updated_at: now,
    },
  ];
  const registrations = [];
  const payments = [];
  const add = (cfg) => {
    const { reg, pay } = makeReg(cfg);
    registrations.push(reg);
    payments.push(pay);
  };
  let no = 1;
  for (let i = 0; i < 8; i++) add({ no: no++, tId: "tournament_001", tIndex: i, price: 50000, status: "approved", daysAgo: 12 - i });
  add({ no: no++, tId: "tournament_001", tIndex: 8, price: 50000, status: "pending", daysAgo: 1 });
  add({ no: no++, tId: "tournament_001", tIndex: 9, price: 50000, status: "pending", daysAgo: 0 });
  add({ no: no++, tId: "tournament_001", tIndex: 10, price: 50000, status: "rejected", daysAgo: 3, note: "Nominal transfer tidak sesuai. Mohon unggah bukti yang benar." });
  for (let i = 0; i < 3; i++) add({ no: no++, tId: "tournament_002", tIndex: i + 3, price: 75000, status: i === 2 ? "pending" : "approved", daysAgo: 5 + i });
  for (let i = 0; i < 6; i++) add({ no: no++, tId: "tournament_003", tIndex: i + 2, price: 100000, status: "approved", daysAgo: 60 + i });

  const settings = {
    payment: {
      banks: [
        { id: "bank_001", bank_name: "BCA", account_number: "1234567890", account_name: "MLBB Arena Official", active: true },
        { id: "bank_002", bank_name: "BRI", account_number: "009876543210", account_name: "MLBB Arena Official", active: true },
      ],
      qris: { name: "QRIS Warkop Sippo", image: demoQris(), active: true },
    },
    system: {
      site_name: "MLBB Arena",
      allow_manual_fallback: true,
      mlbb_api_url: DEFAULT_MLBB_API,
      contact_whatsapp: "6281234567890",
    },
  };
  return { tournaments, registrations, payments, settings };
}

export const defaultSettings = () => buildDemoData().settings;

export function createAdminRecord(username = DEFAULT_ADMIN.username, password = DEFAULT_ADMIN.password) {
  return { username, password_hash: hashPassword(password), created_at: nowISO() };
}

export function seedDemo() {
  const d = buildDemoData();
  storage.set(STORAGE_KEYS.tournaments, d.tournaments);
  storage.set(STORAGE_KEYS.registrations, d.registrations);
  storage.set(STORAGE_KEYS.payments, d.payments);
  storage.set(STORAGE_KEYS.brackets, []);
  storage.set(STORAGE_KEYS.matches, []);
  storage.set(STORAGE_KEYS.settings, d.settings);
}

/** Inisialisasi pertama kali: isi data demo bila LocalStorage masih kosong. */
export function initializeStorage() {
  if (!storage.has(STORAGE_KEYS.tournaments)) seedDemo();
  if (!storage.has(STORAGE_KEYS.admin)) storage.set(STORAGE_KEYS.admin, createAdminRecord());
  if (!storage.has(STORAGE_KEYS.settings)) storage.set(STORAGE_KEYS.settings, defaultSettings());
  [STORAGE_KEYS.registrations, STORAGE_KEYS.payments, STORAGE_KEYS.brackets, STORAGE_KEYS.matches].forEach((k) => {
    if (!storage.has(k)) storage.set(k, []);
  });
}
