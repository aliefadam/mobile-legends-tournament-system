import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, ConfirmDialog, Input, Modal, Select } from "../../components/ui";
import { DataTable } from "../../components/tables/DataTable";
import { AdminStatusBadge } from "../../components/shared/Badges";
import { TournamentForm } from "../../components/forms/TournamentForm";
import { useData } from "../../contexts/DataContext";
import { useToast } from "../../contexts/ToastContext";
import { useRefreshable } from "../../hooks/useRefreshable";
import { TOURNAMENT_STATUS } from "../../constants";
import { createDummyRegistrations } from "../../services/registration";
import { tournamentToForm } from "../../services/tournament";
import { formatDate, formatRupiah } from "../../utils/format";

export default function Tournaments() {
  const { tournaments, registrations, payments, addRegistrations, saveTournament, deleteTournament, duplicateTournament, patchTournament } = useData();
  const toast = useToast();
  const navigate = useNavigate();
  const { loading, refresh } = useRefreshable();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState(null); // null | 'new' | tournament
  const [toDelete, setToDelete] = useState(null);
  const [dummyTarget, setDummyTarget] = useState(null);
  const [dummyCount, setDummyCount] = useState("1");

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return tournaments
      .filter((t) => (status === "archived" ? t.archived : !t.archived && (status === "all" || t.status === status)))
      .filter((t) => !q || t.name.toLowerCase().includes(q) || t.location.toLowerCase().includes(q) || t.venue.toLowerCase().includes(q))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [tournaments, search, status]);

  const teamCount = (t) => registrations.filter((r) => r.tournament_id === t.id).reduce((s, r) => s + r.total_slot, 0);
  const dummyCapacity = dummyTarget
    ? Math.min(100, dummyTarget.max_teams ? Math.max(0, dummyTarget.max_teams - teamCount(dummyTarget)) : 100)
    : 0;

  const generateDummyData = () => {
    const count = Number(dummyCount);
    if (!Number.isInteger(count) || count < 1 || count > dummyCapacity) {
      toast.error(`Masukkan jumlah tim antara 1 dan ${dummyCapacity}.`);
      return;
    }
    const generated = createDummyRegistrations({ tournament: dummyTarget, count, registrations, payments });
    addRegistrations(generated);
    toast.success(`${count} tim dummy berhasil dibuat dan disetujui untuk kebutuhan bracket.`);
    setDummyTarget(null);
    setDummyCount("1");
  };

  const columns = [
    {
      key: "name",
      header: "Nama Turnamen",
      primary: true,
      render: (t) => (
        <div className="min-w-0">
          <p className="font-bold text-slate-900">{t.name} {t.archived && <Badge tone="neutral" dot={false} className="ml-1">Arsip</Badge>}</p>
          <p className="truncate text-xs text-slate-400">/tournament/{t.slug}</p>
        </div>
      ),
    },
    { key: "date", header: "Tanggal", render: (t) => formatDate(t.date, { short: true }) },
    { key: "loc", header: "Lokasi", render: (t) => <span>{t.venue}<span className="block text-xs text-slate-400">{t.location}</span></span> },
    { key: "prize", header: "Prize Pool", render: (t) => <span className="font-semibold">{formatRupiah(t.prize_pool)}</span> },
    { key: "price", header: "Harga", render: (t) => formatRupiah(t.registration_price) },
    { key: "teams", header: "Total Tim", render: (t) => <span className="font-semibold">{teamCount(t)}{t.max_teams ? <span className="font-normal text-slate-400"> / {t.max_teams}</span> : ""}</span> },
    { key: "status", header: "Status", render: (t) => <AdminStatusBadge status={t.status} /> },
  ];

  const handleSave = (t) => {
    const isNew = !tournaments.some((x) => x.id === t.id);
    saveTournament(t);
    setEditing(null);
    toast.success(isNew ? "Turnamen berhasil dibuat." : "Turnamen berhasil diperbarui.");
    if (isNew && t.status !== "draft") toast.info(`Landing page: /tournament/${t.slug}`, "URL dibuat");
  };

  const actions = (t) => [
    { label: "View Detail", icon: "eye", onClick: () => navigate(`/admin/tournaments/${t.id}`) },
    { label: "Edit", icon: "pencil", onClick: () => setEditing(t) },
    { label: "Duplicate", icon: "duplicate", onClick: () => { const c = duplicateTournament(t.id); c && toast.success(`"${c.name}" dibuat sebagai Draft.`); } },
    { label: "Generate Dummy Data", icon: "users", onClick: () => { setDummyTarget(t); setDummyCount("1"); } },
    { divider: true },
    t.status === "draft"
      ? { label: "Publish", icon: "globe", onClick: () => { patchTournament(t.id, { status: "published" }); toast.success("Turnamen dipublikasikan."); } }
      : { label: "Unpublish", icon: "eye-crossed", onClick: () => { patchTournament(t.id, { status: "draft", registration_status: "closed" }); toast.info("Turnamen dikembalikan ke Draft."); } },
    t.registration_status === "open" || t.status === "registration_open"
      ? { label: "Close Registration", icon: "lock", onClick: () => { patchTournament(t.id, { status: "registration_closed", registration_status: "closed" }); toast.info("Pendaftaran ditutup."); } }
      : null,
    { label: t.archived ? "Kembalikan dari Arsip" : "Arsipkan", icon: "archive", onClick: () => { patchTournament(t.id, { archived: !t.archived }); toast.success(t.archived ? "Turnamen dikembalikan." : "Turnamen diarsipkan."); } },
    t.status !== "draft" && !t.archived ? { label: "Buka Halaman Publik", icon: "link", onClick: () => window.open(`#/tournament/${t.slug}`, "_blank") } : null,
    { divider: true },
    { label: "Delete", icon: "trash", danger: true, onClick: () => setToDelete(t) },
  ];

  const delRegs = toDelete ? registrations.filter((r) => r.tournament_id === toDelete.id).length : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Kelola Turnamen</h2>
          <p className="text-sm text-slate-500">Buat dan atur seluruh turnamen. Data setiap turnamen terisolasi.</p>
        </div>
        <Button icon="plus" onClick={() => setEditing("new")}>Create Tournament</Button>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Cari nama, tempat, lokasi..."
        onRefresh={refresh}
        onRowClick={(t) => navigate(`/admin/tournaments/${t.id}`)}
        actions={actions}
        filters={
          <Select
            size="sm"
            wrapperClassName="w-full sm:w-52"
            value={status}
            onChange={setStatus}
            options={[{ value: "all", label: "Semua Status" }, ...TOURNAMENT_STATUS, { value: "archived", label: "Arsip" }]}
          />
        }
        emptyIcon="trophy"
        emptyTitle="Belum ada turnamen"
        emptyDescription="Buat turnamen pertama Anda untuk mulai menerima pendaftaran."
        emptyAction={<Button icon="plus" onClick={() => setEditing("new")}>Create Tournament</Button>}
      />

      <Modal open={!!editing} onClose={() => setEditing(null)} size="lg" title={editing === "new" ? "Buat Turnamen Baru" : "Edit Turnamen"} closeOnOverlay={false}>
        {editing && (
          <TournamentForm
            initial={editing === "new" ? undefined : tournamentToForm(editing)}
            existing={editing === "new" ? undefined : editing}
            tournaments={tournaments}
            onSubmit={handleSave}
            onCancel={() => setEditing(null)}
            submitLabel={editing === "new" ? "Buat Turnamen" : "Simpan Perubahan"}
          />
        )}
      </Modal>

      <Modal
        open={!!dummyTarget}
        onClose={() => setDummyTarget(null)}
        size="sm"
        title="Generate Dummy Data"
        description={dummyTarget?.name}
        footer={
          <>
            <Button variant="outline" onClick={() => setDummyTarget(null)}>Batal</Button>
            <Button icon="users" onClick={generateDummyData} disabled={!dummyCapacity}>Generate Tim</Button>
          </>
        }
      >
        {dummyCapacity ? (
          <div className="space-y-4">
            <Input
              label="Jumlah tim dummy"
              type="number"
              min="1"
              max={dummyCapacity}
              value={dummyCount}
              onChange={(event) => setDummyCount(event.target.value)}
              hint={dummyTarget?.max_teams ? `Kapasitas tersedia hingga ${dummyCapacity} tim.` : "Maksimal 100 tim per generate."}
            />
            <p className="rounded-xl bg-amber-50 p-3 text-sm leading-relaxed text-amber-800">
              Tim dummy akan dibuat dengan pembayaran berstatus approved agar dapat digunakan untuk menguji bracket. Data ini hanya untuk pengujian.
            </p>
          </div>
        ) : (
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Kapasitas turnamen sudah penuh sehingga tim dummy tidak dapat ditambahkan.</p>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Hapus turnamen?"
        message={toDelete ? `"${toDelete.name}" beserta ${delRegs} pendaftaran, pembayaran, bracket, dan pertandingannya akan dihapus permanen.` : ""}
        acknowledge="Saya mengerti data tidak dapat dikembalikan."
        confirmLabel="Hapus Permanen"
        onConfirm={() => {
          deleteTournament(toDelete.id);
          toast.success("Turnamen dihapus.");
          setToDelete(null);
        }}
      />
    </div>
  );
}
