import { DATA_KEYS, STORAGE_KEYS } from "../constants";

const ERROR_EVENT = "tms:api-error";

async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Permintaan gagal (${response.status}).`);
  return result;
}

export const storage = {
  load: () => request("/api/data"),
  save: (changes) => request("/api/data", { method: "PUT", body: JSON.stringify({ changes }) }),
  register: (registration, payment) =>
    request("/api/registration", { method: "POST", body: JSON.stringify({ registration, payment }) }),
  lookupRegistration: (id, whatsapp) =>
    request(`/api/registration?id=${encodeURIComponent(id)}&whatsapp=${encodeURIComponent(whatsapp)}`),
  replaceProof: (id, whatsapp, proof, name) =>
    request("/api/registration/proof", { method: "POST", body: JSON.stringify({ id, whatsapp, proof, name }) }),
  login: (username, password, remember) =>
    request("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password, remember }) }),
  session: () => request("/api/auth/session"),
  logout: () => request("/api/auth/logout", { method: "POST", body: "{}" }),
  changeCredentials: (currentPassword, username, password) =>
    request("/api/auth/credentials", { method: "PUT", body: JSON.stringify({ currentPassword, username, password }) }),
  snapshot(data) {
    return { app: "mlbb-tms", version: 1, exported_at: new Date().toISOString(), data };
  },
  validateSnapshot(snap) {
    if (!snap || typeof snap !== "object" || !snap.data || typeof snap.data !== "object") {
      return "Format file tidak valid.";
    }
    const arrays = [STORAGE_KEYS.tournaments, STORAGE_KEYS.registrations, STORAGE_KEYS.payments, STORAGE_KEYS.brackets, STORAGE_KEYS.matches];
    for (const k of arrays) {
      if (snap.data[k] !== undefined && !Array.isArray(snap.data[k])) return `Data "${k}" harus berupa array.`;
    }
    if (snap.data[STORAGE_KEYS.settings] !== undefined &&
      (!snap.data[STORAGE_KEYS.settings] || typeof snap.data[STORAGE_KEYS.settings] !== "object" || Array.isArray(snap.data[STORAGE_KEYS.settings]))) {
      return `Data "${STORAGE_KEYS.settings}" harus berupa objek.`;
    }
    if (!Array.isArray(snap.data[STORAGE_KEYS.tournaments])) return "Data turnamen tidak ditemukan dalam file.";
    return null;
  },
  async restore(snap) {
    const error = this.validateSnapshot(snap);
    if (error) return { ok: false, error };
    const changes = Object.fromEntries(DATA_KEYS.filter((key) => key !== STORAGE_KEYS.admin && snap.data[key] !== undefined).map((key) => [key, snap.data[key]]));
    try {
      await this.save(changes);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
};

export function reportStorageError(error) {
  window.dispatchEvent(new CustomEvent(ERROR_EVENT, { detail: error }));
}

export const STORAGE_ERROR_EVENT = ERROR_EVENT;
