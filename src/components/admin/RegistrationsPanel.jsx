import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button, ConfirmDialog, Select } from "../ui";
import { DataTable } from "../tables/DataTable";
import { PaymentBadge } from "../shared/Badges";
import { RegistrationDetailModal } from "./RegistrationDetailModal";
import { PaymentReviewModal } from "./PaymentReviewModal";
import { useData } from "../../contexts/DataContext";
import { useToast } from "../../contexts/ToastContext";
import { useRefreshable } from "../../hooks/useRefreshable";
import { PAYMENT_FILTER_OPTIONS } from "../../constants";
import { registrationTeamLabel, registrationsToCSV } from "../../services/registration";
import { downloadFile, formatDateTime, formatRupiah } from "../../utils/format";

/** Dipakai di tab Registrations (per turnamen) dan halaman Pendaftaran (global). */
export function RegistrationsPanel({ tournamentId }) {
  const { registrations, tournaments, deleteRegistration } = useData();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const { loading, refresh } = useRefreshable();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [tFilter, setTFilter] = useState("all");
  const [detail, setDetail] = useState(() => ({ id: params.get("reg"), edit: false }));
  const [review, setReview] = useState(null);
  const [del, setDel] = useState(null);

  const tmap = new Map(tournaments.map((t) => [t.id, t]));
  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return registrations
      .filter((r) => (tournamentId ? r.tournament_id === tournamentId : tFilter === "all" || r.tournament_id === tFilter))
      .filter((r) => status === "all" || r.payment_status === status)
      .filter((r) => !q || r.id.toLowerCase().includes(q) || registrationTeamLabel(r).toLowerCase().includes(q) || r.whatsapp.includes(q))
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }, [registrations, tournamentId, tFilter, status, search]);

  const closeDetail = () => {
    setDetail({ id: null, edit: false });
    if (params.get("reg")) {
      const p = new URLSearchParams(params);
      p.delete("reg");
      setParams(p, { replace: true });
    }
  };

  const columns = [
    { key: "id", header: "Registration ID", primary: true, render: (r) => <span className="font-bold text-navy-800">{r.id}</span> },
    { key: "team", header: "Nama Tim", render: (r) => <span className="font-semibold text-slate-900">{registrationTeamLabel(r)}</span> },
    !tournamentId && { key: "t", header: "Turnamen", render: (r) => tmap.get(r.tournament_id)?.name || "-" },
    { key: "wa", header: "WhatsApp", render: (r) => r.whatsapp },
    { key: "slot", header: "Slot", render: (r) => r.total_slot },
    { key: "pay", header: "Total", render: (r) => <span className="font-semibold">{formatRupiah(r.total_payment)}</span> },
    { key: "st", header: "Status", render: (r) => <PaymentBadge status={r.payment_status} /> },
    { key: "date", header: "Tanggal", render: (r) => formatDateTime(r.created_at) },
  ].filter(Boolean);

  const exportCsv = () => {
    if (!rows.length) return toast.warning("Tidak ada data untuk diekspor.");
    downloadFile(`pendaftaran-${tournamentId || "semua"}.csv`, registrationsToCSV(rows, tournaments), "text/csv;charset=utf-8");
    toast.success(`${rows.length} pendaftaran diekspor ke CSV.`);
  };

  return (
    <>
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Cari tim, ID, atau WhatsApp..."
        onRefresh={refresh}
        onRowClick={(r) => setDetail({ id: r.id, edit: false })}
        filters={
          <>
            {!tournamentId && (
              <Select size="sm" wrapperClassName="w-full sm:w-56" value={tFilter} onChange={setTFilter} options={[{ value: "all", label: "Semua Turnamen" }, ...tournaments.map((t) => ({ value: t.id, label: t.name }))]} />
            )}
            <Select size="sm" wrapperClassName="w-full sm:w-44" value={status} onChange={setStatus} options={PAYMENT_FILTER_OPTIONS} />
          </>
        }
        toolbarRight={<Button variant="outline" size="sm" className="h-10" icon="download" onClick={exportCsv}>Export CSV</Button>}
        actions={(r) => [
          { label: "View Detail", icon: "eye", onClick: () => setDetail({ id: r.id, edit: false }) },
          { label: "Edit", icon: "pencil", onClick: () => setDetail({ id: r.id, edit: true }) },
          { label: "Verifikasi Pembayaran", icon: "wallet", onClick: () => setReview(r.id) },
          { divider: true },
          { label: "Delete", icon: "trash", danger: true, onClick: () => setDel(r) },
        ]}
        emptyIcon="users"
        emptyTitle="Belum ada pendaftaran"
        emptyDescription="Tidak ada pendaftaran yang cocok dengan filter."
      />
      {detail.id && (
        <RegistrationDetailModal key={`${detail.id}-${detail.edit}`} registrationId={detail.id} startEditing={detail.edit} onClose={closeDetail} onVerify={(id) => { closeDetail(); setReview(id); }} />
      )}
      <PaymentReviewModal registrationId={review} onClose={() => setReview(null)} />
      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        title="Hapus pendaftaran?"
        message={del ? `Pendaftaran ${del.id} (${registrationTeamLabel(del)}) beserta bukti pembayarannya akan dihapus permanen.` : ""}
        confirmLabel="Hapus"
        onConfirm={() => {
          deleteRegistration(del.id);
          toast.success("Pendaftaran dihapus.");
          setDel(null);
        }}
      />
    </>
  );
}
