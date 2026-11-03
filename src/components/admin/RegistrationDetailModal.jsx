import { useEffect, useState } from "react";
import { Badge, Button, ImageViewer, Input, Modal } from "../ui";
import { PaymentBadge } from "../shared/Badges";
import { useData } from "../../contexts/DataContext";
import { useToast } from "../../contexts/ToastContext";
import { downloadFile, formatDateTime, formatRupiah } from "../../utils/format";
import { isWaValid, registrationsToCSV } from "../../services/registration";
import { isValidMlId, isValidMlServer } from "../../services/mlbb";
import { LiveNickname } from "./LiveNickname";

const clone = (o) => JSON.parse(JSON.stringify(o));

export function RegistrationDetailModal({ registrationId, startEditing, onClose, onVerify }) {
  const { registrations, tournaments, payments, settings, updateRegistration } = useData();
  const toast = useToast();
  const reg = registrations.find((r) => r.id === registrationId);
  const t = reg && tournaments.find((x) => x.id === reg.tournament_id);
  const pay = reg && payments.find((p) => p.registration_id === reg.id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [errors, setErrors] = useState({});
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    if (reg) {
      setEditing(!!startEditing);
      setDraft(clone(reg));
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registrationId, startEditing]);

  if (!reg || !draft) return null;

  const setPlayer = (si, group, pi, patch) =>
    setDraft((d) => ({
      ...d,
      slots: d.slots.map((s) => ({ ...s, [group]: s[group].map((p, j) => (j === pi ? { ...p, ...patch } : p)) })),
    }));

  const save = () => {
    const e = {};
    if (!isWaValid(draft.whatsapp)) e.whatsapp = "Nomor WhatsApp tidak valid.";
    draft.slots.forEach((s, si) => {
      if (!s.team_name.trim()) e[`s${si}.team`] = "Nama tim wajib diisi.";
      [...s.players, ...s.substitutes].forEach((p, pi) => {
        const k = `s${si}.${pi}`;
        if (!p.full_name.trim()) e[`${k}.n`] = "Wajib";
        if (!isValidMlId(p.ml_id)) e[`${k}.i`] = "ID tidak valid";
        if (!isValidMlServer(p.ml_server)) e[`${k}.s`] = "Server tidak valid";
      });
    });
    if (Object.keys(e).length) {
      setErrors(e);
      return toast.error("Periksa kembali data yang diubah.");
    }
    updateRegistration(reg.id, { whatsapp: draft.whatsapp, slots: draft.slots, team_name: draft.slots[0].team_name });
    toast.success("Data pendaftaran diperbarui.");
    setEditing(false);
  };

  const download = () => {
    downloadFile(`${reg.id}.csv`, registrationsToCSV([reg], tournaments), "text/csv;charset=utf-8");
    toast.success("Detail pendaftaran diunduh.");
  };

  const src = editing ? draft : reg;
  const slot = src.slots[0];
  const si = 0;

  const playerBlock = (group, label) => (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      {slot[group].length === 0 && <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-400">Tidak ada.</p>}
      <div className="space-y-2">
        {slot[group].map((p, pi) => {
          const idx = group === "players" ? pi : pi + slot.players.length;
          return editing ? (
            <div key={pi} className="rounded-xl border border-slate-200 p-3">
              <div className="grid gap-2 sm:grid-cols-3">
                <Input label="Nama Lengkap" value={p.full_name} error={errors[`s${si}.${idx}.n`]} onChange={(e) => setPlayer(si, group, pi, { full_name: e.target.value })} />
                <Input label="ML ID" value={p.ml_id} error={errors[`s${si}.${idx}.i`]} onChange={(e) => setPlayer(si, group, pi, { ml_id: e.target.value.replace(/\D/g, ""), nickname: "", verified: false })} />
                <Input label="Server" value={p.ml_server} error={errors[`s${si}.${idx}.s`]} onChange={(e) => setPlayer(si, group, pi, { ml_server: e.target.value.replace(/\D/g, ""), nickname: "", verified: false })} />
              </div>
              <p className="mt-2 flex items-center gap-2 text-xs text-slate-500"><span>Nickname terbaru:</span><LiveNickname id={p.ml_id} server={p.ml_server} apiUrl={settings.system.mlbb_api_url} isDummy={reg.is_dummy} /></p>
            </div>
          ) : (
            <div key={pi} className="flex flex-col gap-1 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{p.full_name}</p>
                <p className="text-xs text-slate-500">ID {p.ml_id} · Server {p.ml_server}</p>
              </div>
              <LiveNickname id={p.ml_id} server={p.ml_server} apiUrl={settings.system.mlbb_api_url} isDummy={reg.is_dummy} />
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <Modal
        open
        onClose={onClose}
        size="xl"
        title={editing ? `Edit Pendaftaran ${reg.id}` : `Detail Pendaftaran ${reg.id}`}
        description={t?.name}
        footer={
          editing ? (
            <>
              <Button variant="outline" onClick={() => { setDraft(clone(reg)); setEditing(false); setErrors({}); }}>Batal</Button>
              <Button icon="disk" onClick={save}>Simpan Perubahan</Button>
            </>
          ) : (
            <>
              <Button variant="outline" icon="download" onClick={download}>Unduh Detail</Button>
              <Button variant="outline" icon="pencil" onClick={() => setEditing(true)}>Edit</Button>
              <Button icon="wallet" onClick={() => onVerify?.(reg.id)}>Verifikasi Pembayaran</Button>
            </>
          )
        }
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="min-w-0 space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {editing ? (
                <>
                  <Input label="WhatsApp Ketua" value={draft.whatsapp} error={errors.whatsapp} onChange={(e) => setDraft({ ...draft, whatsapp: e.target.value })} />
                </>
              ) : (
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">WhatsApp Ketua</p>
                  <p className="text-sm font-bold text-slate-900">{reg.whatsapp}</p>
                </div>
              )}
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Jumlah Slot</p>
                <p className="text-sm font-bold text-slate-900">{reg.total_slot} slot</p>
              </div>
            </div>

            {editing ? (
              <Input label="Nama Tim" value={slot.team_name} error={errors[`s${si}.team`]} onChange={(e) => setDraft((d) => ({ ...d, slots: d.slots.map((s) => ({ ...s, team_name: e.target.value })) }))} />
            ) : (
              <h3 className="text-lg font-extrabold text-navy-900">{slot.team_name}</h3>
            )}
            {playerBlock("players", "Pemain Utama")}
            {playerBlock("substitutes", "Pemain Cadangan")}
          </div>

          <aside className="space-y-4">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Pembayaran</p>
              <div className="flex items-center justify-between"><span className="text-sm text-slate-500">Status</span><PaymentBadge status={reg.payment_status} long /></div>
              <div className="mt-2 flex items-center justify-between"><span className="text-sm text-slate-500">Total</span><b>{formatRupiah(reg.total_payment)}</b></div>
              <div className="mt-2 flex items-center justify-between"><span className="text-sm text-slate-500">Metode</span><b>{pay?.method === "qris" ? "QRIS" : "Bank"}</b></div>
              <div className="mt-2 flex items-center justify-between"><span className="text-sm text-slate-500">Daftar</span><span className="text-sm font-semibold">{formatDateTime(reg.created_at)}</span></div>
              {pay?.reject_note && reg.payment_status === "rejected" && <p className="mt-3 rounded-lg bg-red-50 p-2.5 text-xs text-red-700"><b>Catatan:</b> {pay.reject_note}</p>}
            </div>
            {pay?.proof && (
              <button onClick={() => setZoom(true)} className="block w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100" aria-label="Perbesar bukti pembayaran">
                <img src={pay.proof} alt="Bukti pembayaran" className="max-h-72 w-full object-contain" />
              </button>
            )}
          </aside>
        </div>
      </Modal>
      <ImageViewer src={pay?.proof} open={zoom} onClose={() => setZoom(false)} title="Bukti Pembayaran" />
    </>
  );
}
