import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { STORAGE_KEYS as K } from "../constants";
import { reportStorageError, storage } from "../services/storage";
import { buildDemoData, defaultSettings } from "../services/seed";
import { getProgress } from "../services/bracket";
import { nowISO } from "../utils/format";
import { uniqueSlug } from "../services/tournament";
import { stripPlayerNicknames } from "../services/registration";

const DataContext = createContext(null);

function mergeSettings(raw) {
  const d = defaultSettings();
  return {
    payment: {
      banks: raw?.payment?.banks ?? [],
      qris: { name: raw?.payment?.qris?.name ?? "", image: raw?.payment?.qris?.image ?? null, active: raw?.payment?.qris?.active ?? false },
    },
    system: { ...d.system, ...(raw?.system || {}) },
  };
}

const EMPTY_DATA = {
  tournaments: [],
  registrations: [],
  payments: [],
  brackets: [],
  matches: [],
  settings: mergeSettings({ payment: { banks: [], qris: { name: "", image: null, active: false } } }),
};

function mapRemoteData(data) {
  return {
    tournaments: data[K.tournaments] || [],
    registrations: (data[K.registrations] || []).map(stripPlayerNicknames),
    payments: data[K.payments] || [],
    brackets: data[K.brackets] || [],
    matches: data[K.matches] || [],
    settings: mergeSettings(data[K.settings] || {}),
  };
}

export function DataProvider({ children }) {
  const [db, setDb] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const ref = useRef(db);
  const pendingWrites = useRef(0);
  const writeQueue = useRef(Promise.resolve(true));
  const loadInProgress = useRef(false);
  const silentRefreshFailed = useRef(false);
  const loadData = useCallback(async ({ silent = false, force = false } = {}) => {
    if (pendingWrites.current && !force) return;
    if (loadInProgress.current) return;
    loadInProgress.current = true;
    if (!silent) {
      setLoading(true);
      setLoadError("");
    }
    try {
      const { data } = await storage.load();
      const fresh = mapRemoteData(data);
      ref.current = fresh;
      setDb(fresh);
      setLoadError("");
      silentRefreshFailed.current = false;
    } catch (error) {
      if (silent) {
        if (!silentRefreshFailed.current) {
          silentRefreshFailed.current = true;
          reportStorageError(error);
        }
      }
      else setLoadError(error.message);
    } finally {
      loadInProgress.current = false;
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    storage.session().then(() => loadData()).catch((error) => {
      setLoadError(error.message);
      setLoading(false);
    });
  }, [loadData]);

  useEffect(() => {
    const onAuthChange = () => void loadData();
    window.addEventListener("tms:auth-changed", onAuthChange);
    return () => window.removeEventListener("tms:auth-changed", onAuthChange);
  }, [loadData]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") void loadData({ silent: true });
    };
    const timer = window.setInterval(refresh, 5000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [loadData]);

  const persist = useCallback((changes, save = () => storage.save(changes)) => {
    pendingWrites.current += 1;
    const operation = writeQueue.current
      .catch(() => true)
      .then(save)
      .then(() => true)
      .catch((error) => {
        reportStorageError(error);
        void loadData({ silent: true, force: true });
        return false;
      })
      .finally(() => {
        pendingWrites.current -= 1;
      });
    writeQueue.current = operation;
    return operation;
  }, [loadData]);

  const commit = useCallback((patch, { persist: shouldPersist = true } = {}) => {
    const next = { ...ref.current, ...patch };
    ref.current = next;
    setDb(next);
    if (shouldPersist) {
      const changes = Object.fromEntries(Object.entries(patch).map(([key, value]) => [K[key], value]));
      return persist(changes);
    }
    return Promise.resolve(true);
  }, [persist]);

  const actions = useMemo(() => {
    const cur = () => ref.current;
    return {
      reload: loadData,
      saveTournament(t) {
        const list = cur().tournaments;
        const exists = list.some((x) => x.id === t.id);
        commit({ tournaments: exists ? list.map((x) => (x.id === t.id ? t : x)) : [...list, t] });
        return t;
      },
      patchTournament(id, patch) {
        commit({
          tournaments: cur().tournaments.map((t) => (t.id === id ? { ...t, ...patch, updated_at: nowISO() } : t)),
        });
      },
      deleteTournament(id) {
        const c = cur();
        const regIds = new Set(c.registrations.filter((r) => r.tournament_id === id).map((r) => r.id));
        commit({
          tournaments: c.tournaments.filter((t) => t.id !== id),
          registrations: c.registrations.filter((r) => r.tournament_id !== id),
          payments: c.payments.filter((p) => !regIds.has(p.registration_id) && p.tournament_id !== id),
          brackets: c.brackets.filter((b) => b.tournament_id !== id),
          matches: c.matches.filter((m) => m.tournament_id !== id),
        });
      },
      duplicateTournament(id) {
        const c = cur();
        const src = c.tournaments.find((t) => t.id === id);
        if (!src) return null;
        const max = c.tournaments.reduce((m, t) => Math.max(m, parseInt(String(t.id).replace(/\D/g, ""), 10) || 0), 0);
        const name = `${src.name} (Salinan)`;
        const copy = {
          ...src,
          id: `tournament_${String(max + 1).padStart(3, "0")}`,
          name,
          slug: uniqueSlug(name, c.tournaments),
          status: "draft",
          registration_status: "closed",
          archived: false,
          created_at: nowISO(),
          updated_at: nowISO(),
        };
        commit({ tournaments: [...c.tournaments, copy] });
        return copy;
      },
      async addRegistration(registration, payment) {
        const saved = await persist(null, () => storage.register(registration, payment));
        if (!saved) throw new Error("Pendaftaran gagal disimpan. Silakan coba kembali.");
        const c = cur();
        const sanitized = stripPlayerNicknames(registration);
        commit({ registrations: [...c.registrations, sanitized], payments: [...c.payments, { id: payment.id, registration_id: payment.registration_id, tournament_id: payment.tournament_id, status: payment.status }] }, { persist: false });
        return sanitized;
      },
      addRegistrations(items) {
        const c = cur();
        const registrations = items.map(({ registration }) => stripPlayerNicknames(registration));
        const payments = items.map(({ payment }) => payment);
        commit({
          registrations: [...c.registrations, ...registrations],
          payments: [...c.payments, ...payments],
        });
        return registrations;
      },
      updateRegistration(id, patch) {
        commit({
          registrations: cur().registrations.map((r) =>
            r.id === id ? stripPlayerNicknames({ ...r, ...patch, updated_at: nowISO() }) : r
          ),
        });
      },
      deleteRegistration(id) {
        const c = cur();
        commit({
          registrations: c.registrations.filter((r) => r.id !== id),
          payments: c.payments.filter((p) => p.registration_id !== id),
        });
      },
      setPaymentStatus(regId, status, note = "") {
        const c = cur();
        const now = nowISO();
        commit({
          registrations: c.registrations.map((r) => (r.id === regId ? { ...r, payment_status: status, updated_at: now } : r)),
          payments: c.payments.map((p) =>
            p.registration_id === regId
              ? { ...p, status, reject_note: status === "rejected" ? note : "", verified_at: status === "approved" ? now : null, updated_at: now }
              : p
          ),
        });
      },
      async replaceProof(regId, whatsapp, dataUrl, name) {
        const saved = await persist(null, () => storage.replaceProof(regId, whatsapp, dataUrl, name));
        if (!saved) throw new Error("Bukti pembayaran gagal disimpan. Silakan coba kembali.");
        const c = cur();
        const now = nowISO();
        commit({
          registrations: c.registrations.map((r) => (r.id === regId ? { ...r, payment_status: "pending", updated_at: now } : r)),
          payments: c.payments.map((p) => p.registration_id === regId ? { ...p, status: "pending" } : p),
        }, { persist: false });
      },
      saveBracket(bracket, matches) {
        const c = cur();
        commit({
          brackets: [...c.brackets.filter((b) => b.tournament_id !== bracket.tournament_id), bracket],
          matches: [...c.matches.filter((m) => m.tournament_id !== bracket.tournament_id), ...matches],
        });
      },
      saveMatches(tournamentId, matches) {
        const c = cur();
        const progress = getProgress(matches);
        commit({
          matches: [...c.matches.filter((m) => m.tournament_id !== tournamentId), ...matches],
          brackets: c.brackets.map((b) =>
            b.tournament_id === tournamentId
              ? { ...b, status: progress.champion ? "completed" : progress.started ? "in_progress" : "generated", updated_at: nowISO() }
              : b
          ),
        });
      },
      patchBracket(tournamentId, patch) {
        commit({ brackets: cur().brackets.map((b) => (b.tournament_id === tournamentId ? { ...b, ...patch, updated_at: nowISO() } : b)) });
      },
      removeBracket(tournamentId) {
        const c = cur();
        commit({
          brackets: c.brackets.filter((b) => b.tournament_id !== tournamentId),
          matches: c.matches.filter((m) => m.tournament_id !== tournamentId),
        });
      },
      updateSettings(updater) {
        const next = typeof updater === "function" ? updater(cur().settings) : { ...cur().settings, ...updater };
        commit({ settings: next });
      },
      async importData(snapshot) {
        const error = storage.validateSnapshot(snapshot);
        if (error) return { ok: false, error };
        const changes = Object.fromEntries(
          Object.keys(K)
            .filter((key) => key !== "admin" && snapshot.data[K[key]] !== undefined)
            .map((key) => [K[key], snapshot.data[K[key]]])
        );
        const ok = await persist(changes);
        if (ok) await loadData({ force: true });
        return ok ? { ok: true } : { ok: false, error: "Gagal mengimpor data. Silakan coba lagi." };
      },
      async resetData(mode = "demo") {
        const demo = mode === "demo" ? buildDemoData() : null;
        const fresh = demo ? {
          tournaments: demo.tournaments,
          registrations: demo.registrations.map(stripPlayerNicknames),
          payments: demo.payments,
          brackets: [],
          matches: [],
          settings: mergeSettings(demo.settings),
        } : EMPTY_DATA;
        const changes = {
          [K.tournaments]: fresh.tournaments,
          [K.registrations]: fresh.registrations,
          [K.payments]: fresh.payments,
          [K.brackets]: fresh.brackets,
          [K.matches]: fresh.matches,
          [K.settings]: fresh.settings,
        };
        if (!(await persist(changes))) return;
        ref.current = fresh;
        setDb(fresh);
      },
    };
  }, [commit, loadData, persist]);

  const value = useMemo(() => ({ ...db, ...actions, loading, loadError }), [db, actions, loading, loadError]);
  if (loading) return <div className="flex min-h-screen items-center justify-center text-sm font-medium text-slate-500">Memuat Data</div>;
  if (loadError) return <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center"><p role="alert" className="text-sm text-red-700">Gagal memuat data: {loadError}</p><button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => void loadData()}>Coba lagi</button></div>;
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const useData = () => useContext(DataContext);
