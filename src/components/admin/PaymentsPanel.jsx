import { useMemo, useState } from "react";
import { ConfirmDialog, Select } from "../ui";
import { DataTable } from "../tables/DataTable";
import { PaymentBadge } from "../shared/Badges";
import { PaymentReviewModal } from "./PaymentReviewModal";
import { useData } from "../../contexts/DataContext";
import { useToast } from "../../contexts/ToastContext";
import { useRefreshable } from "../../hooks/useRefreshable";
import { PAYMENT_FILTER_OPTIONS } from "../../constants";
import { registrationTeamLabel } from "../../services/registration";
import { formatDateTime, formatRupiah } from "../../utils/format";

export function PaymentsPanel({ tournamentId }) {
  const { registrations, payments, tournaments, brackets, setPaymentStatus } = useData();
  const toast = useToast();
  const { loading, refresh } = useRefreshable();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("pending");
  const [tFilter, setTFilter] = useState("all");
  const [review, setReview] = useState(null);
  const [approve, setApprove] = useState(null);

  const tmap = new Map(tournaments.map((t) => [t.id, t]));
  const pmap = new Map(payments.map((p) => [p.registration_id, p]));

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return registrations
      .filter((r) => !r.is_dummy)
      .filter((r) => (tournamentId ? r.tournament_id === tournamentId : tFilter === "all" || r.tournament_id === tFilter))
      .filter((r) => status === "all" || r.payment_status === status)
      .filter((r) => !q || r.id.toLowerCase().includes(q) || registrationTeamLabel(r).toLowerCase().includes(q))
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }, [registrations, tournamentId, tFilter, status, search]);

  const columns = [
    {
      key: "proof",
      header: "Bukti",
      hideOnMobile: true,
      render: (r) => {
        const p = pmap.get(r.id);
        return p?.proof ? <img src={p.proof} alt="" className="h-10 w-10 rounded-lg border border-slate-200 object-cover" /> : <span className="text-slate-300">—</span>;
      },
    },
    { key: "id", header: "Registration ID", primary: true, render: (r) => <span className="font-bold text-navy-800">{r.id}</span> },
    { key: "team", header: "Nama Tim", render: (r) => <span className="font-semibold text-slate-900">{registrationTeamLabel(r)}</span> },
    !tournamentId && { key: "t", header: "Turnamen", render: (r) => tmap.get(r.tournament_id)?.name || "-" },
    { key: "m", header: "Metode", render: (r) => (pmap.get(r.id)?.method === "qris" ? "QRIS" : "Transfer Bank") },
    { key: "amt", header: "Nominal", render: (r) => <span className="font-semibold">{formatRupiah(r.total_payment)}</span> },
    { key: "st", header: "Status", render: (r) => <PaymentBadge status={r.payment_status} /> },
    { key: "date", header: "Tanggal", render: (r) => formatDateTime(r.created_at) },
  ].filter(Boolean);

  const doApprove = () => {
    setPaymentStatus(approve.id, "approved");
    toast.success(`Pembayaran ${approve.id} disetujui.`);
    if (brackets.some((b) => b.tournament_id === approve.tournament_id)) toast.info("Bracket sudah dibuat. Generate ulang secara manual untuk memasukkan tim ini.");
    setApprove(null);
  };

  return (
    <>
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Cari tim atau Registration ID..."
        onRefresh={refresh}
        onRowClick={(r) => setReview(r.id)}
        filters={
          <>
            {!tournamentId && (
              <Select size="sm" wrapperClassName="w-full sm:w-56" value={tFilter} onChange={setTFilter} options={[{ value: "all", label: "Semua Turnamen" }, ...tournaments.map((t) => ({ value: t.id, label: t.name }))]} />
            )}
            <Select size="sm" wrapperClassName="w-full sm:w-44" value={status} onChange={setStatus} options={PAYMENT_FILTER_OPTIONS} />
          </>
        }
        actions={(r) => [
          { label: r.payment_status === "pending" ? "Lihat Bukti & Verifikasi" : "Lihat Bukti", icon: "eye", onClick: () => setReview(r.id) },
          ...(r.payment_status === "pending"
            ? [
                { label: "Approve", icon: "check", onClick: () => setApprove(r) },
                { label: "Reject", icon: "cross", onClick: () => setReview(r.id) },
              ]
            : []),
        ]}
        emptyIcon="wallet"
        emptyTitle="Tidak ada pembayaran"
        emptyDescription="Tidak ada pembayaran dengan status yang dipilih."
      />
      <PaymentReviewModal registrationId={review} onClose={() => setReview(null)} />
      <ConfirmDialog open={!!approve} onClose={() => setApprove(null)} tone="success" title="Setujui pembayaran?" message={approve ? `${approve.id} — ${registrationTeamLabel(approve)} akan dinyatakan terverifikasi.` : ""} confirmLabel="Ya, Approve" onConfirm={doApprove} />
    </>
  );
}
