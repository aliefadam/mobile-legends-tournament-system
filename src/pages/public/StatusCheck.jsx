import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button, Card, FileUpload, Icon, Input } from "../../components/ui";
import { PaymentBadge } from "../../components/shared/Badges";
import { useData } from "../../contexts/DataContext";
import { useToast } from "../../contexts/ToastContext";
import { formatDateTime, formatRupiah } from "../../utils/format";
import { registrationTeamLabel } from "../../services/registration";

export default function StatusCheck() {
  const [params] = useSearchParams();
  const { registrations, tournaments, payments, brackets, replaceProof } = useData();
  const toast = useToast();
  const [query, setQuery] = useState(params.get("id") || "");
  const [searched, setSearched] = useState(params.get("id") || "");
  const [proof, setProof] = useState(null);

  const id = searched.trim().toUpperCase();
  const reg = id ? registrations.find((r) => r.id === id) : null;
  const t = reg && tournaments.find((x) => x.id === reg.tournament_id);
  const pay = reg && payments.find((p) => p.registration_id === reg.id);
  const bracket = t && brackets.find((b) => b.tournament_id === t.id && b.published);

  const submitProof = () => {
    if (!proof) return toast.error("Pilih bukti pembayaran terlebih dahulu.");
    replaceProof(reg.id, proof.dataUrl, proof.name);
    setProof(null);
    toast.success("Bukti pembayaran baru terkirim. Menunggu verifikasi ulang.");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-electric-50 text-2xl text-electric-600">
          <Icon name="search" />
        </span>
        <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">Cek Status Pendaftaran</h1>
        <p className="mt-2 text-sm text-slate-500">Masukkan Registration ID yang Anda terima setelah mendaftar.</p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSearched(query);
          setProof(null);
        }}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <Input wrapperClassName="flex-1" label="Registration ID" placeholder="Contoh: REG-0001" value={query} onChange={(e) => setQuery(e.target.value)} icon="ticket" />
        <Button type="submit" size="md" icon="search" className="h-11">Cek Status</Button>
      </form>

      {id && !reg && (
        <Card className="mt-6 p-6 text-center">
          <Icon name="cross-circle" className="text-4xl text-red-400" />
          <p className="mt-2 font-bold text-slate-900">Pendaftaran tidak ditemukan</p>
          <p className="text-sm text-slate-500">Pastikan Registration ID yang dimasukkan sudah benar.</p>
        </Card>
      )}

      {reg && t && (
        <Card className="mt-6 overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-electric-50 px-5 py-4 text-slate-900">
            <div>
              <p className="text-xs text-slate-500">Registration ID</p>
              <p className="text-xl font-extrabold tracking-wider">{reg.id}</p>
            </div>
            <PaymentBadge status={reg.payment_status} long />
          </div>
          <dl className="divide-y divide-slate-100 px-5 text-sm">
            {[
              ["Turnamen", t.name],
              ["Nama Tim", registrationTeamLabel(reg)],
              ["Jumlah Slot", `${reg.total_slot} slot`],
              ["Total Pembayaran", formatRupiah(reg.total_payment)],
              ["Tanggal Daftar", formatDateTime(reg.created_at)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-3">
                <dt className="text-slate-500">{k}</dt>
                <dd className="text-right font-semibold text-slate-900">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="space-y-4 p-5 pt-3">
            {reg.payment_status === "pending" && (
              <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800"><Icon name="clock" className="mr-2" />Pembayaran Anda sedang menunggu verifikasi panitia.</div>
            )}
            {reg.payment_status === "approved" && (
              <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"><Icon name="badge-check" solid className="mr-2" />Selamat! Tim Anda telah terverifikasi dan dapat masuk bracket.</div>
            )}
            {reg.payment_status === "rejected" && (
              <div className="space-y-4">
                <div className="rounded-xl bg-red-50 p-4 text-sm text-red-800">
                  <p className="font-bold"><Icon name="cross-circle" className="mr-2" />Pembayaran ditolak</p>
                  <p className="mt-1">Catatan panitia: {pay?.reject_note || "-"}</p>
                </div>
                <FileUpload label="Unggah ulang bukti pembayaran" value={proof} onChange={setProof} onReject={(m) => toast.error(m)} />
                <Button icon="upload" onClick={submitProof} disabled={!proof}>Kirim Bukti Pembayaran</Button>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" to={`/tournament/${t.slug}`}>Halaman Turnamen</Button>
              {bracket && <Button variant="soft" size="sm" icon="sitemap" to={`/tournament/${t.slug}/bracket`}>Lihat Bracket</Button>}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
