// Layanan lookup nickname Mobile Legends.
// Endpoint dikonfigurasi admin (Settings → Sistem). Gunakan placeholder {id} dan {zone}.
// Jangan menaruh API secret pada frontend.

export const DEFAULT_MLBB_API = "https://api.isan.eu.org/nickname/ml?id={id}&server={zone}";

export class MlbbError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export const isValidMlId = (v) => /^\d{5,15}$/.test(String(v || "").trim());
export const isValidMlServer = (v) => /^\d{3,6}$/.test(String(v || "").trim());

function extractNickname(data) {
  if (!data || typeof data !== "object") return null;
  if (data.success === false || data.status === false || data.error) return null;
  const candidates = [
    data.name,
    data.nickname,
    data.username,
    data.nick,
    data.data?.username,
    data.data?.nickname,
    data.data?.name,
    data.result?.username,
    data.result?.nickname,
    data.result?.name,
  ];
  const found = candidates.find((c) => typeof c === "string" && c.trim());
  return found ? decodeURIComponent(found.replace(/\+/g, " ")).trim() : null;
}

export async function lookupNickname({ id, zone, apiUrl }) {
  if (!isValidMlId(id)) throw new MlbbError("invalid_input", "User ID harus 5–15 digit angka.");
  if (!isValidMlServer(zone)) throw new MlbbError("invalid_input", "Server ID harus 3–6 digit angka.");

  const template = apiUrl || DEFAULT_MLBB_API;
  const url = template
    .replace("{id}", encodeURIComponent(String(id).trim()))
    .replace("{zone}", encodeURIComponent(String(zone).trim()))
    .replace("{server}", encodeURIComponent(String(zone).trim()));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (res.status === 404 || res.status === 400 || res.status === 422) {
      throw new MlbbError("not_found", "ID tidak ditemukan. Periksa User ID dan Server ID.");
    }
    if (!res.ok) throw new MlbbError("network", `Layanan lookup tidak tersedia (HTTP ${res.status}).`);
    let data;
    try {
      data = await res.json();
    } catch {
      throw new MlbbError("network", "Respons layanan lookup tidak valid.");
    }
    const nickname = extractNickname(data);
    if (!nickname) throw new MlbbError("not_found", "ID tidak ditemukan. Periksa User ID dan Server ID.");
    return nickname;
  } catch (e) {
    if (e instanceof MlbbError) throw e;
    if (e?.name === "AbortError") throw new MlbbError("timeout", "Permintaan melebihi batas waktu. Coba lagi.");
    throw new MlbbError("network", "Tidak dapat terhubung ke layanan lookup. Periksa koneksi internet Anda.");
  } finally {
    clearTimeout(timer);
  }
}
