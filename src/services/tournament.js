import { nowISO, pad, slugify } from "../utils/format";
import { sanitizeRichText } from "../utils/richText";

export function getPublicStatus(t) {
  if (!t || t.status === "draft") return null;
  if (t.status === "completed") return "completed";
  if (t.status === "ongoing") return "ongoing";
  if (t.status === "registration_closed") return "registration_closed";
  if (t.registration_status === "open") return "registration_open";
  return "upcoming";
}

export const isPublic = (t) => !!t && t.status !== "draft" && !t.archived;

/** Total slot terdaftar (pendaftaran ditolak tidak dihitung). */
export function countSlots(registrations, tournamentId) {
  return registrations
    .filter((r) => r.tournament_id === tournamentId && r.payment_status !== "rejected")
    .reduce((sum, r) => sum + (r.total_slot || 0), 0);
}

export function getTournamentStats(t, registrations) {
  const regs = registrations.filter((r) => r.tournament_id === t.id);
  const verifiedRegs = regs.filter((r) => r.payment_status === "approved");
  const totalSlots = regs.reduce((s, r) => s + r.total_slot, 0);
  const verifiedTeams = verifiedRegs.reduce((s, r) => s + r.total_slot, 0);
  const pending = regs.filter((r) => r.payment_status === "pending").length;
  const used = countSlots(registrations, t.id);
  const capacity = t.max_teams || null;
  return {
    totalRegistrations: regs.length,
    totalSlots,
    verifiedTeams,
    pending,
    usedSlots: used,
    capacity,
    remaining: capacity ? Math.max(0, capacity - used) : null,
    progress: capacity ? Math.min(100, Math.round((used / capacity) * 100)) : null,
    revenue: verifiedRegs.reduce((s, r) => s + r.total_payment, 0),
  };
}

export function registrationBlockReason(t, registrations) {
  if (!t || !isPublic(t)) return "Turnamen tidak tersedia.";
  if (getPublicStatus(t) !== "registration_open") return "Pendaftaran turnamen ini tidak sedang dibuka.";
  if (t.max_teams) {
    const remaining = t.max_teams - countSlots(registrations, t.id);
    if (remaining <= 0) return "Slot turnamen sudah penuh.";
  }
  return null;
}

export function maxSlotFor(t, registrations) {
  const base = t.support_multi_slot ? 2 : 1;
  if (!t.max_teams) return base;
  const remaining = Math.max(0, t.max_teams - countSlots(registrations, t.id));
  return Math.min(base, remaining);
}

export const nextTournamentId = (list) => {
  const max = list.reduce((m, t) => Math.max(m, parseInt(String(t.id).replace(/\D/g, ""), 10) || 0), 0);
  return `tournament_${pad(max + 1)}`;
};

export function uniqueSlug(base, list, ignoreId) {
  let slug = slugify(base) || "turnamen";
  let candidate = slug;
  let i = 2;
  while (list.some((t) => t.slug === candidate && t.id !== ignoreId)) candidate = `${slug}-${i++}`;
  return candidate;
}

export function googleMapsSearchUrl(t) {
  const savedUrl = t.google_maps_url?.trim();
  if (savedUrl) return savedUrl;
  const query = [t.venue, t.location].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function googleMapsEmbedUrl(t) {
  const savedUrl = t.google_maps_url?.trim();
  if (!savedUrl) return "";
  try {
    const url = new URL(savedUrl);
    if (url.pathname.includes("/maps/embed")) return url.toString();
  } catch {
    return "";
  }
  const query = [t.venue, t.location].filter(Boolean).join(", ");
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

export function validateTournament(input, list, editingId) {
  const e = {};
  if (!input.name?.trim()) e.name = "Nama turnamen wajib diisi.";
  if (!input.date) e.date = "Tanggal turnamen wajib diisi.";
  if (input.start_time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.start_time)) e.start_time = "Jam mulai tidak valid.";
  if (!input.venue?.trim()) e.venue = "Tempat turnamen wajib diisi.";
  if (!input.location?.trim()) e.location = "Lokasi turnamen wajib diisi.";
  if (input.google_maps_url?.trim()) {
    try {
      const url = new URL(input.google_maps_url.trim());
      const host = url.hostname.toLowerCase();
      const validHost = host === "google.com" || host.endsWith(".google.com") || host === "goo.gl" || host === "maps.app.goo.gl";
      if (url.protocol !== "https:" || !validHost) e.google_maps_url = "Masukkan tautan Google Maps yang valid.";
    } catch {
      e.google_maps_url = "Masukkan tautan Google Maps yang valid.";
    }
  }
  if (input.prize_pool === "" || Number(input.prize_pool) < 0 || isNaN(Number(input.prize_pool))) e.prize_pool = "Prize pool tidak valid.";
  if (input.registration_price === "" || Number(input.registration_price) < 0 || isNaN(Number(input.registration_price)))
    e.registration_price = "Harga pendaftaran tidak valid.";
  const slug = slugify(input.slug || "");
  if (!slug) e.slug = "Slug URL wajib diisi.";
  else if (list.some((t) => t.slug === slug && t.id !== editingId)) e.slug = "Slug sudah digunakan turnamen lain.";
  if (input.max_teams !== "" && input.max_teams !== null && input.max_teams !== undefined) {
    const n = Number(input.max_teams);
    if (!Number.isInteger(n) || n < 2) e.max_teams = "Kapasitas minimal 2 tim atau kosongkan.";
  }
  return e;
}

export function buildTournament(input, list, existing) {
  const now = nowISO();
  let registration_status = input.registration_status;
  if (input.status === "registration_open") registration_status = "open";
  if (["registration_closed", "ongoing", "completed"].includes(input.status)) registration_status = "closed";
  return {
    ...(existing || {}),
    id: existing?.id || nextTournamentId(list),
    name: input.name.trim(),
    slug: slugify(input.slug),
    date: input.date,
    start_time: input.start_time || "",
    venue: input.venue.trim(),
    location: input.location.trim(),
    google_maps_url: input.google_maps_url?.trim() || "",
    prize_pool: Number(input.prize_pool),
    registration_price: Number(input.registration_price),
    support_multi_slot: !!input.support_multi_slot,
    max_slot: input.support_multi_slot ? 2 : 1,
    max_teams: input.max_teams === "" || input.max_teams == null ? null : Number(input.max_teams),
    status: input.status,
    registration_status,
    description: "",
    rules: sanitizeRichText(input.rules || ""),
    archived: !!input.archived,
    created_at: existing?.created_at || now,
    updated_at: now,
  };
}

export const emptyTournamentForm = () => ({
  name: "",
  slug: "",
  date: "",
  start_time: "",
  venue: "",
  location: "",
  google_maps_url: "",
  prize_pool: "",
  registration_price: "",
  support_multi_slot: true,
  max_teams: "",
  status: "draft",
  registration_status: "closed",
  rules: "",
  archived: false,
});

export const tournamentToForm = (t) => ({
  ...emptyTournamentForm(),
  ...t,
  start_time: t.start_time ?? "",
  max_teams: t.max_teams ?? "",
  prize_pool: String(t.prize_pool ?? ""),
  registration_price: String(t.registration_price ?? ""),
});

export const tournamentPath = (t) => `/tournament/${t.slug}`;
