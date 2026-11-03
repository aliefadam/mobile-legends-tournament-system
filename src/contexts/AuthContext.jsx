import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { STORAGE_KEYS } from "../constants";
import { storage } from "../services/storage";
import { createAdminRecord, initializeStorage } from "../services/seed";
import { hashPassword } from "../utils/format";

const AuthContext = createContext(null);
const SESSION_KEY = "tms_session";
const REMEMBER_MS = 7 * 24 * 3600 * 1000;

function readAuthed() {
  initializeStorage();
  try {
    if (sessionStorage.getItem(SESSION_KEY) === "1") return true;
  } catch {
    /* ignore */
  }
  const admin = storage.get(STORAGE_KEYS.admin, {});
  return !!admin.remember_until && new Date(admin.remember_until).getTime() > Date.now();
}

export function AuthProvider({ children }) {
  const [authed, setAuthed] = useState(readAuthed);
  const [admin, setAdmin] = useState(() => storage.get(STORAGE_KEYS.admin, {}));

  const login = useCallback((username, password, remember) => {
    const rec = storage.get(STORAGE_KEYS.admin, {});
    if (!rec.username || rec.username !== username.trim() || rec.password_hash !== hashPassword(password)) {
      return { ok: false, error: "Username atau password salah." };
    }
    const next = { ...rec, remember_until: remember ? new Date(Date.now() + REMEMBER_MS).toISOString() : null };
    storage.set(STORAGE_KEYS.admin, next);
    setAdmin(next);
    try {
      if (remember) sessionStorage.removeItem(SESSION_KEY);
      else sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
    setAuthed(true);
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    const rec = storage.get(STORAGE_KEYS.admin, {});
    const next = { ...rec, remember_until: null };
    storage.set(STORAGE_KEYS.admin, next);
    setAdmin(next);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    setAuthed(false);
  }, []);

  const changeCredentials = useCallback(({ currentPassword, username, password }) => {
    const rec = storage.get(STORAGE_KEYS.admin, {});
    if (rec.password_hash !== hashPassword(currentPassword)) return { ok: false, error: "Password saat ini salah." };
    const fresh = createAdminRecord(username || rec.username, password || currentPassword);
    const next = { ...rec, username: fresh.username, password_hash: fresh.password_hash };
    storage.set(STORAGE_KEYS.admin, next);
    setAdmin(next);
    return { ok: true };
  }, []);

  const value = useMemo(
    () => ({ authed, username: admin.username, login, logout, changeCredentials }),
    [authed, admin.username, login, logout, changeCredentials]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
