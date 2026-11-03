import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Checkbox, Icon, Modal, RadioGroup, Select } from "../ui";
import { BRACKET_FORMATS, SEEDING_METHODS } from "../../constants";
import { nextPow2, requiredTeams } from "../../services/bracket";
import { cn } from "../../utils/cn";

export function GenerateBracketModal({ open, onClose, teams, existing, started, onGenerate, defaultFormat }) {
  const [format, setFormat] = useState("single_elimination");
  const [seeding, setSeeding] = useState("random");
  const [seriesFormats, setSeriesFormats] = useState({ regular: 1, semifinal: 3, final: 3 });
  const [selected, setSelected] = useState([]);
  const [order, setOrder] = useState([]);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFormat(defaultFormat || "single_elimination");
    setSeeding("random");
    setSeriesFormats(existing?.series_formats || { regular: 1, semifinal: 3, final: 3 });
    setSelected(teams.map((t) => t.id));
    setOrder(teams.map((t) => t.id));
    setAck(false);
    setBusy(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const chosen = useMemo(() => order.filter((id) => selected.includes(id)), [order, selected]);
  const n = chosen.length;
  const min = requiredTeams(format);
  const size = n >= 2 ? nextPow2(n) : 0;
  const byes = size ? size - n : 0;
  const matchCount = n < min ? 0 : format === "single_elimination" ? size - 1 : 2 * size - 2;
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const registrationCounts = new Map();
  chosen.forEach((id) => {
    const registrationId = teamMap.get(id)?.registration_id;
    if (registrationId) registrationCounts.set(registrationId, (registrationCounts.get(registrationId) || 0) + 1);
  });
  const hasMultiSlotRegistration = [...registrationCounts.values()].some((count) => count > 1);

  const move = (id, dir) =>
    setOrder((o) => {
      const vis = o.filter((x) => selected.includes(x));
      const i = vis.indexOf(id);
      const j = i + dir;
      if (j < 0 || j >= vis.length) return o;
      const a = o.indexOf(vis[i]);
      const b = o.indexOf(vis[j]);
      const copy = [...o];
      [copy[a], copy[b]] = [copy[b], copy[a]];
      return copy;
    });

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const needAck = !!existing;
  const canSubmit = n >= min && (!needAck || ack);

  const submit = () => {
    setBusy(true);
    setTimeout(() => {
      onGenerate({ format, seeding, teamIds: chosen, seriesFormats });
      setBusy(false);
    }, 450);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={existing ? "Generate Ulang Bracket" : "Generate Bracket"}
      description="Atur format, peserta, dan metode seeding sebelum bracket dibuat."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button icon="sitemap" disabled={!canSubmit} loading={busy} onClick={submit} variant={existing ? "danger" : "primary"}>
            {existing ? "Generate Ulang" : "Generate Bracket"}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {existing && (
          <div className={cn("rounded-xl border p-4 text-sm", started ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-800")}>
            <p className="font-bold"><Icon name="exclamation" className="mr-1.5" />{started ? "Pertandingan sudah dimulai!" : "Bracket sudah pernah dibuat."}</p>
            <p className="mt-1">
              {started
                ? "Generate ulang akan MENGHAPUS seluruh skor dan hasil pertandingan yang sudah tersimpan. Tindakan ini tidak dapat dibatalkan."
                : "Generate ulang akan menggantikan struktur bracket yang ada."}
            </p>
            <Checkbox className="mt-3" checked={ack} onChange={setAck} label={started ? "Saya mengerti bahwa seluruh hasil pertandingan akan dihapus." : "Saya mengerti bracket lama akan diganti."} />
          </div>
        )}

        <div>
          <p className="mb-2 text-sm font-bold text-slate-800">1. Tournament Format</p>
          <RadioGroup value={format} onChange={setFormat} options={BRACKET_FORMATS.map((f) => ({ value: f.value, label: f.label, description: f.desc, icon: f.value === "single_elimination" ? "sitemap" : "network" }))} />
        </div>

        {format === "single_elimination" && (
          <div>
            <p className="mb-2 text-sm font-bold text-slate-800">2. Format Seri Pertandingan</p>
            <p className="mb-3 text-xs text-slate-500">Atur jumlah kemenangan game yang dibutuhkan pada setiap babak.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["regular", "Babak selain semifinal/final"],
                ["semifinal", "Semifinal"],
                ["final", "Final"],
              ].map(([key, label]) => (
                <Select
                  key={key}
                  label={label}
                  value={seriesFormats[key]}
                  onChange={(value) => setSeriesFormats((current) => ({ ...current, [key]: Number(value) }))}
                  options={[{ value: 1, label: "Best of 1" }, { value: 3, label: "Best of 3" }]}
                />
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-800">{format === "single_elimination" ? "3" : "2"}. Participant Selection <span className="font-medium text-slate-400">(hanya pembayaran Approved)</span></p>
            <button type="button" className="text-xs font-semibold text-electric-600 hover:underline" onClick={() => setSelected(selected.length === teams.length ? [] : teams.map((t) => t.id))}>
              {selected.length === teams.length ? "Kosongkan" : "Pilih semua"}
            </button>
          </div>
          {teams.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Belum ada tim dengan status pembayaran Approved.</p>
          ) : (
            <div className="grid max-h-48 gap-2 overflow-y-auto sm:grid-cols-2 thin-scroll">
              {teams.map((t) => (
                <div key={t.id} className={cn("rounded-lg border px-3 py-2", selected.includes(t.id) ? "border-electric-200 bg-electric-50/50" : "border-slate-200")}>
                  <Checkbox checked={selected.includes(t.id)} onChange={() => toggle(t.id)} label={t.name} description={t.registration_id} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-sm font-bold text-slate-800">{format === "single_elimination" ? "4" : "3"}. Seeding Method</p>
          <RadioGroup columns={3} value={seeding} onChange={setSeeding} options={SEEDING_METHODS.map((s) => ({ value: s.value, label: s.label, description: s.desc }))} />
          {format === "single_elimination" && hasMultiSlotRegistration && (
            <p className="mt-2 rounded-lg bg-electric-50 px-3 py-2 text-xs text-electric-700">
              Slot dari pendaftaran yang sama akan ditempatkan di sisi bracket berbeda agar tidak bertemu sebelum final.
            </p>
          )}
          {seeding === "manual" && (
            <ol className="mt-3 space-y-1.5 rounded-xl bg-slate-50 p-3">
              {chosen.map((id, i) => (
                <li key={id} className="flex items-center gap-3 rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-electric-50 text-xs font-bold text-electric-700">{i + 1}</span>
                  <span className="flex-1 truncate font-semibold text-slate-800">{teamMap.get(id)?.name}</span>
                  <button type="button" disabled={i === 0} onClick={() => move(id, -1)} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label="Naikkan"><Icon name="angle-small-up" /></button>
                  <button type="button" disabled={i === chosen.length - 1} onClick={() => move(id, 1)} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label="Turunkan"><Icon name="angle-small-down" /></button>
                </li>
              ))}
              {!chosen.length && <p className="p-2 text-xs text-slate-400">Pilih peserta terlebih dahulu.</p>}
            </ol>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <Badge tone="info" dot={false}>{n} tim</Badge>
          <Badge tone="purple" dot={false}>Bracket {size || "-"} slot</Badge>
          <Badge tone="warning" dot={false}>{byes} bye</Badge>
          <Badge tone="success" dot={false}>{matchCount} pertandingan</Badge>
          {n < min && <span className="w-full text-xs text-red-300">Minimal {min} tim untuk format ini.</span>}
        </div>
      </div>
    </Modal>
  );
}
