import { PlayerRow } from "./PlayerRow";

export function StepPlayers({ form, setForm, errors, clearError, settings }) {
  const slot = form.slots[0];

  const update = (group, idx, patch, field) => {
    setForm((f) => ({
      ...f,
      slots: f.slots.map((s) => ({ ...s, [group]: s[group].map((p, pi) => (pi === idx ? { ...p, ...patch } : p)) })),
    }));
    const prefix = `s0.${group === "players" ? "p" : "b"}${idx}`;
    if (field) clearError(`${prefix}.${field}`);
    if ("ml_id" in patch || "ml_server" in patch || "verified" in patch || "manual" in patch || "nickname" in patch) clearError(`${prefix}.verify`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-navy-900">Data Pemain</h2>
        <p className="mt-1 text-sm text-slate-500">Isi 5 pemain utama (wajib) dan maksimal 2 pemain cadangan. Nickname akan diperiksa otomatis setelah User ID & Server ID diisi lengkap.</p>
        {form.slots.length > 1 && <p className="mt-2 text-sm font-medium text-electric-700">Data pemain ini digunakan untuk kedua slot.</p>}
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Pemain Utama — {slot.team_name || "Tim"}</h3>
          <div className="space-y-3">
            {slot.players.map((p, i) => (
              <PlayerRow key={i} player={p} prefix={`s0.p${i}`} title={`Player ${i + 1}`} errors={errors} apiUrl={settings.system.mlbb_api_url} onChange={(patch, field) => update("players", i, patch, field)} />
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Pemain Cadangan</h3>
          <div className="space-y-3">
            {slot.substitutes.map((p, i) => (
              <PlayerRow key={i} optional player={p} prefix={`s0.b${i}`} title={`Substitute ${i + 1}`} errors={errors} apiUrl={settings.system.mlbb_api_url} onChange={(patch, field) => update("substitutes", i, patch, field)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
