import { PaymentsPanel } from "../../components/admin/PaymentsPanel";

export default function Payments() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Verifikasi Pembayaran</h2>
        <p className="text-sm text-slate-500">Periksa bukti pembayaran, setujui, atau tolak dengan catatan. Rekening & QRIS diatur di menu Pengaturan.</p>
      </div>
      <PaymentsPanel />
    </div>
  );
}
