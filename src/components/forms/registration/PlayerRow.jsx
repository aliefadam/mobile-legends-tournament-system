import { useEffect, useRef, useState } from "react";
import { Icon, Input } from "../../ui";
import { isValidMlId, isValidMlServer, lookupNickname } from "../../../services/mlbb";
import { cn } from "../../../utils/cn";

/**
 * Satu baris pemain: nama lengkap, ML User ID, Server ID + lookup nickname otomatis.
 * errors: map { "<prefix>.field": message }
 */
export function PlayerRow({ player, prefix, title, optional, errors, onChange, apiUrl }) {
  const [state, setState] = useState(player.verified ? "success" : player.lookup_failed ? "error" : "idle");
  const token = useRef(0);
  const verifiedKey = useRef(player.verified ? `${player.ml_id}:${player.ml_server}` : "");
  const key = `${player.ml_id.trim()}:${player.ml_server.trim()}`;
  const ready = isValidMlId(player.ml_id) && isValidMlServer(player.ml_server);

  const run = async () => {
    const my = ++token.current;
    setState("loading");
    try {
      const nickname = await lookupNickname({ id: player.ml_id, zone: player.ml_server, apiUrl });
      if (my !== token.current) return;
      verifiedKey.current = key;
      setState("success");
      onChange({ nickname, verified: true, manual: false, lookup_failed: false });
    } catch {
      if (my !== token.current) return;
      setState("error");
      onChange({ nickname: "", verified: false, manual: false, lookup_failed: true });
    }
  };

  useEffect(() => {
    if (!ready) {
      token.current++;
      if (state !== "idle" && !player.manual) setState("idle");
      return;
    }
    if (verifiedKey.current === key || player.lookup_failed) return;
    const t = setTimeout(run, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  const setField = (field) => (e) => {
    const value = e.target.value;
    if (field === "ml_id" || field === "ml_server") {
      const clean = value.replace(/\D/g, "");
      verifiedKey.current = "";
      token.current++;
      setState("idle");
      onChange({ [field]: clean, verified: false, nickname: "", manual: false, lookup_failed: false }, field);
    } else onChange({ [field]: value }, field);
  };

  const e = (f) => errors[`${prefix}.${f}`];
  return (
    <div className={cn("rounded-xl border bg-white p-4 transition-colors", e("verify") ? "border-red-200" : "border-slate-200")}>
      <div className="mb-3 flex items-center gap-2">
        <span className={cn("flex h-6 items-center rounded-md px-2 text-[11px] font-bold uppercase tracking-wide", optional ? "bg-slate-100 text-slate-500" : "bg-electric-50 text-electric-700")}>{title}</span>
        {optional && <span className="text-xs text-slate-400">Opsional</span>}
      </div>
      <div className="grid gap-3 sm:grid-cols-[1.5fr_1fr_0.8fr]">
        <Input label="Nama Lengkap (sesuai identitas)" placeholder="Nama sesuai KTP/KK/Kartu Pelajar" value={player.full_name} onChange={setField("full_name")} error={e("full_name")} />
        <Input label="Mobile Legends User ID" inputMode="numeric" placeholder="Contoh: 123456789" value={player.ml_id} onChange={setField("ml_id")} error={e("ml_id")} maxLength={15} />
        <Input label="Server ID (Zone)" inputMode="numeric" placeholder="Contoh: 1234" value={player.ml_server} onChange={setField("ml_server")} error={e("ml_server")} maxLength={6} />
      </div>

      {(state !== "idle" || e("verify")) && (
        <div className="mt-3">
          {state === "loading" && (
            <p className="flex items-center gap-2 text-sm font-medium text-electric-600">
              <Icon name="spinner" className="animate-spin" /> Memeriksa ID Mobile Legends...
            </p>
          )}
          {state === "success" && player.verified && (
            <p className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
              <Icon name="badge-check" solid /> Nickname: <span className="text-emerald-900">{player.nickname}</span>
            </p>
          )}
          {state === "error" && (
            <p className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">
              <Icon name="cross-circle" className="mt-0.5" /> nickname tidak ditemukan, pastikan id dan server benar
            </p>
          )}
          {e("verify") && state !== "error" && state !== "loading" && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-red-600"><Icon name="exclamation" /> {e("verify")}</p>
          )}
        </div>
      )}
    </div>
  );
}
