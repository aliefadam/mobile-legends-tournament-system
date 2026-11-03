import { DATA_KEYS, STORAGE_KEYS } from "../constants";

const ERROR_EVENT = "tms:storage-error";

export const storage = {
  has(key) {
    try {
      return localStorage.getItem(key) !== null;
    } catch {
      return false;
    }
  },
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.warn("[storage] gagal membaca", key, e);
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn("[storage] gagal menyimpan", key, e);
      window.dispatchEvent(new CustomEvent(ERROR_EVENT, { detail: e }));
      return false;
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
  usage() {
    try {
      let bytes = 0;
      DATA_KEYS.forEach((k) => {
        const v = localStorage.getItem(k);
        if (v) bytes += (k.length + v.length) * 2;
      });
      return bytes;
    } catch {
      return 0;
    }
  },
  snapshot() {
    const data = {};
    DATA_KEYS.forEach((k) => {
      data[k] = this.get(k, k === STORAGE_KEYS.settings || k === STORAGE_KEYS.admin ? {} : []);
    });
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
    if (!Array.isArray(snap.data[STORAGE_KEYS.tournaments])) return "Data turnamen tidak ditemukan dalam file.";
    return null;
  },
  restore(snap) {
    const err = this.validateSnapshot(snap);
    if (err) return { ok: false, error: err };
    for (const k of DATA_KEYS) {
      if (snap.data[k] === undefined) continue;
      if (!this.set(k, snap.data[k])) return { ok: false, error: "Penyimpanan penuh atau tidak tersedia." };
    }
    return { ok: true };
  },
  clearAll() {
    DATA_KEYS.forEach((k) => this.remove(k));
  },
};

export const STORAGE_ERROR_EVENT = ERROR_EVENT;
