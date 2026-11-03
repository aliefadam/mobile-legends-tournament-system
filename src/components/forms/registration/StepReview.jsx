import { useState } from "react";
import { Badge, Button, Checkbox, Icon, ImageViewer } from "../../ui";
import { formatRupiah } from "../../../utils/format";

function Section({ title, icon, onEdit, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <Icon name={icon} className="text-electric-500" /> {title}
        </h3>
        <Button size="xs" variant="outline" icon="pencil" onClick={onEdit}>Edit</Button>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

const Row = ({ k, v }) => (
  <div className="flex justify-between gap-4 py-1.5 text-sm">
    <span className="text-slate-500">{k}</span>
    <span className="text-right font-semibold text-slate-900">{v}</span>
  </div>
);

function PlayerTable({ players, label }) {
  const filled = players.filter((p) => p.full_name);
  if (!filled.length) return null;
  return (
    <div className="mt-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="overflow-hidden rounded-lg border border-slate-100">
        {filled.map((p, i) => (
          <div key={i} className="flex flex-col gap-1 border-b border-slate-100 px-3 py-2.5 last:border-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{p.full_name}</p>
              <p className="text-xs text-slate-500">ID {p.ml_id} · Server {p.ml_server}</p>
            </div>
            <Badge tone={p.verified ? "success" : "warning"}>{p.nickname || "Nickname tidak ditemukan"}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StepReview({ form, setForm, errors, clearError, tournament, goToStep }) {
  const [zoom, setZoom] = useState(false);
  const total = tournament.registration_price * form.slots.length;
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-extrabold text-navy-900">Review & Konfirmasi</h2>
        <p className="mt-1 text-sm text-slate-500">Periksa kembali seluruh data sebelum mengirim pendaftaran.</p>
      </div>

      <Section title="Informasi Tim" icon="users" onEdit={() => goToStep(0)}>
        <Row k="Nama Tim" v={form.slots[0]?.team_name} />
        <Row k="WhatsApp Ketua" v={form.whatsapp} />
        <Row k="Jumlah Slot" v={`${form.total_slot} slot`} />
      </Section>

      <Section title="Informasi Pemain" icon="user" onEdit={() => goToStep(1)}>
        {form.slots.length > 1 && <p className="mb-3 text-sm text-slate-500">Data pemain yang sama digunakan untuk semua slot.</p>}
        <p className="text-sm font-bold text-navy-800">{form.slots[0]?.team_name}</p>
        <PlayerTable players={form.slots[0]?.players || []} label="Pemain Utama" />
        <PlayerTable players={form.slots[0]?.substitutes || []} label="Pemain Cadangan" />
      </Section>

      <Section title="Informasi Pembayaran" icon="wallet" onEdit={() => goToStep(2)}>
        <Row k="Total Pembayaran" v={<span className="text-base text-electric-700">{formatRupiah(total)}</span>} />
        <Row k="Metode" v={form.method === "qris" ? "QRIS" : "Transfer Bank"} />
        {form.proof && (
          <button onClick={() => setZoom(true)} className="group relative mt-3 block h-40 w-full overflow-hidden rounded-xl bg-slate-100 sm:w-64" aria-label="Perbesar bukti pembayaran">
            <img src={form.proof.dataUrl} alt="Bukti pembayaran" className="h-full w-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-white/80 text-2xl text-electric-700 opacity-0 transition-opacity group-hover:opacity-100">
              <Icon name="zoom-in" />
            </span>
          </button>
        )}
        <ImageViewer src={form.proof?.dataUrl} open={zoom} onClose={() => setZoom(false)} title="Bukti Pembayaran" />
      </Section>

      <div className="rounded-xl border border-electric-200 bg-electric-50/50 p-4">
        <Checkbox
          checked={form.agreed}
          onChange={(v) => {
            setForm((f) => ({ ...f, agreed: v }));
            clearError("agreed");
          }}
          label="Saya menyatakan bahwa seluruh informasi yang saya masukkan sudah benar."
          description="Data yang salah (termasuk ID pemain) dapat menyebabkan tim didiskualifikasi."
          error={errors.agreed}
        />
      </div>
    </div>
  );
}
