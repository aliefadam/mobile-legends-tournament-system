import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { reportStorageError, storage } from "../services/storage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authed, setAuthed] = useState(false);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    storage.session()
      .then((session) => {
        if (active) {
          setAuthed(session.authed);
          setUsername(session.username || "");
        }
      })
      .catch((error) => console.error("[auth] gagal memeriksa sesi", error))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const login = useCallback(async (user, password, remember) => {
    try {
      const session = await storage.login(user, password, remember);
      setAuthed(true);
      setUsername(session.username);
      window.dispatchEvent(new Event("tms:auth-changed"));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await storage.logout();
    } catch (error) {
      reportStorageError(error);
    }
    setAuthed(false);
    setUsername("");
    window.dispatchEvent(new Event("tms:auth-changed"));
  }, []);

  const changeCredentials = useCallback(async ({ currentPassword, username: nextUsername, password }) => {
    try {
      const result = await storage.changeCredentials(currentPassword, nextUsername, password);
      setUsername(result.username);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }, []);

  const value = useMemo(
    () => ({ authed, username, loading, login, logout, changeCredentials }),
    [authed, username, loading, login, logout, changeCredentials]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
