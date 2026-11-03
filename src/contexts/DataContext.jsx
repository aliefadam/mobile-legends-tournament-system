import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { STORAGE_KEYS as K } from "../constants";
import { storage } from "../services/storage";
import { defaultSettings, initializeStorage, seedDemo } from "../services/seed";
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

function loadAll() {
  initializeStorage();
  return {
    tournaments: storage.get(K.tournaments, []),
    registrations: storage.get(K.registrations, []).map(stripPlayerNicknames),
    payments: storage.get(K.payments, []),
    brackets: storage.get(K.brackets, []),
    matches: storage.get(K.matches, []),
    settings: mergeSettings(storage.get(K.settings, {})),
  };
}

export function DataProvider({ children }) {
  const [db, setDb] = useState(loadAll);
  const ref = useRef(db);

  const commit = useCallback((patch) => {
    const next = { ...ref.current, ...patch };
    ref.current = next;
    setDb(next);
    return next;
  }, []);

  // Persist ke LocalStorage setiap koleksi berubah
  useEffect(() => void storage.set(K.tournaments, db.tournaments), [db.tournaments]);
  useEffect(() => void storage.set(K.registrations, db.registrations), [db.registrations]);
  useEffect(() => void storage.set(K.payments, db.payments), [db.payments]);
  useEffect(() => void storage.set(K.brackets, db.brackets), [db.brackets]);
  useEffect(() => void storage.set(K.matches, db.matches), [db.matches]);
  useEffect(() => void storage.set(K.settings, db.settings), [db.settings]);

  // Sinkronisasi antar-tab
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key && Object.values(K).includes(e.key)) {
        const fresh = loadAll();
        ref.current = fresh;
        setDb(fresh);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const actions = useMemo(() => {
    const cur = () => ref.current;
    return {
      reload() {
        const fresh = loadAll();
        ref.current = fresh;
        setDb(fresh);
      },
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
      addRegistration(registration, payment) {
        const c = cur();
        const sanitized = stripPlayerNicknames(registration);
        commit({ registrations: [...c.registrations, sanitized], payments: [...c.payments, payment] });
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
      replaceProof(regId, dataUrl, name) {
        const c = cur();
        const now = nowISO();
        commit({
          registrations: c.registrations.map((r) => (r.id === regId ? { ...r, payment_status: "pending", updated_at: now } : r)),
          payments: c.payments.map((p) =>
            p.registration_id === regId ? { ...p, proof: dataUrl, proof_name: name, status: "pending", reject_note: "", updated_at: now } : p
          ),
        });
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
      importData(snapshot) {
        const res = storage.restore(snapshot);
        if (res.ok) {
          const fresh = loadAll();
          ref.current = fresh;
          setDb(fresh);
        }
        return res;
      },
      resetData(mode = "demo") {
        storage.clearAll();
        if (mode === "demo") seedDemo();
        const fresh = loadAll();
        if (mode === "empty") {
          fresh.tournaments = [];
          fresh.registrations = [];
          fresh.payments = [];
        }
        ref.current = fresh;
        setDb(fresh);
      },
    };
  }, [commit]);

  const value = useMemo(() => ({ ...db, ...actions }), [db, actions]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const useData = () => useContext(DataContext);
