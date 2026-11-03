import { useEffect, useState } from "react";
import { Button, ConfirmDialog, Icon, ImageViewer, Modal, Textarea } from "../ui";
import { PaymentBadge } from "../shared/Badges";
import { useData } from "../../contexts/DataContext";
import { useToast } from "../../contexts/ToastContext";
import { formatDateTime, formatRupiah } from "../../utils/format";
import { registrationTeamLabel } from "../../services/registration";

export function PaymentReviewModal({ registrationId, onClose }) {
  const { registrations, payments, tournaments, brackets, setPaymentStatus } = useData();
  const toast = useToast();
  const reg = registrations.find((r) => r.id === registrationId);
  const pay = reg && payments.find((p) => p.registration_id === reg.id);
  const t = reg && tournaments.find((x) => x.id === reg.tournament_id);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState("");
  const [zoom, setZoom] = useState(false);
  const [confirmApprove, setConfirmApprove] = useState(false);

  useEffect(() => {
    setNote(pay?.reject_note || "");
    setNoteError("");
  }, [registrationId, pay?.reject_note]);

  const hasBracket = !!reg && brackets.some((b) => b.tournament_id === reg.tournament_id);
  const canReview = reg?.payment_status === "pending";

  const approve = () => {
    setPaymentStatus(reg.id, "approved");
    setConfirmApprove(false);
    toast.success(`Pembayaran ${reg.id} disetujui. Tim terverifikasi.`);
    if (hasBracket) toast.info("Bracket sudah dibuat. Generate ulang bracket secara manual agar tim ini ikut serta.", "Bracket tidak otomatis berubah");
    onClose();
  };
  const reject = () => {
    if (!note.trim()) return setNoteError("Catatan penolakan wajib diisi.");
    setPaymentStatus(reg.id, "rejected", note.trim());
    toast.warning(`Pembayaran ${reg.id} ditolak.`);
    onClose();
  };

  return (
    <>
      <Modal
        open={!!reg}
        onClose={onClose}
        size="lg"
        title="Verifikasi Pembayaran"
        description={reg ? `${reg.id} · ${registrationTeamLabel(reg)}` : ""}
        footer={
          reg && (
            <>
              <Button variant="outline" onClick={onClose}>Tutup</Button>
              {canReview && (
                <>
                  <Button variant="danger-soft" icon="cross" onClick={reject}>Reject</Button>
                  <Button variant="success" icon="check" onClick={() => setConfirmApprove(true)}>Approve</Button>
                </>
              )}
            </>
          )
        }
      >
        {reg && pay && (
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <button onClick={() => setZoom(true)} className="group relative block w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100" aria-label="Perbesar bukti">
                <img src={pay.proof} alt="Bukti pembayaran" className="max-h-[360px] w-full object-contain" />
                <span className="absolute inset-0 flex items-center justify-center bg-white/80 text-3xl text-electric-700 opacity-0 transition-opacity group-hover:opacity-100">
                  <Icon name="zoom-in" />
                </span>
              </button>
              <p className="mt-2 text-center text-xs text-slate-400">Klik gambar untuk memperbesar</p>
            </div>
            <div className="space-y-4">
              <dl className="divide-y divide-slate-100 text-sm">
                {[
                  ["Turnamen", t?.name || "-"],
                  ["Jumlah Slot", `${reg.total_slot} slot`],
                  ["Metode", pay.method === "qris" ? "QRIS" : "Transfer Bank"],
                  ["Total Dibayar", <b className="text-electric-700">{formatRupiah(pay.amount)}</b>],
                  ["Tanggal", formatDateTime(pay.created_at)],
                  ["Status", <PaymentBadge status={reg.payment_status} long />],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3 py-2.5">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="text-right font-semibold text-slate-900">{v}</dd>
                  </div>
                ))}
              </dl>
              {canReview && (
                <Textarea label="Catatan Penolakan" rows={3} value={note} onChange={(e) => { setNote(e.target.value); setNoteError(""); }} error={noteError} placeholder="Wajib diisi bila pembayaran ditolak, mis. nominal tidak sesuai." />
              )}
              {reg.payment_status === "rejected" && pay.reject_note && (
                <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-800">
                  <p className="font-semibold">Catatan Penolakan</p>
                  <p className="mt-1">{pay.reject_note}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
      <ImageViewer src={pay?.proof} open={zoom} onClose={() => setZoom(false)} title="Bukti Pembayaran" />
      <ConfirmDialog open={confirmApprove} onClose={() => setConfirmApprove(false)} tone="success" title="Setujui pembayaran?" message="Tim akan dinyatakan terverifikasi dan dapat dimasukkan ke dalam bracket." confirmLabel="Ya, Approve" onConfirm={approve} />
    </>
  );
}
