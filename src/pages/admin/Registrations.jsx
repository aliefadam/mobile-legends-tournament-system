import { RegistrationsPanel } from "../../components/admin/RegistrationsPanel";

export default function Registrations() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Semua Pendaftaran</h2>
        <p className="text-sm text-slate-500">Lihat pendaftaran dari seluruh turnamen. Filter berdasarkan turnamen atau status pembayaran.</p>
      </div>
      <RegistrationsPanel />
    </div>
  );
}
