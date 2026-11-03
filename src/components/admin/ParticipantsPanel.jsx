import { useMemo, useState } from "react";
import { Badge, Button, Select } from "../ui";
import { DataTable } from "../tables/DataTable";
import { PaymentBadge } from "../shared/Badges";
import { useData } from "../../contexts/DataContext";
import { useToast } from "../../contexts/ToastContext";
import { useRefreshable } from "../../hooks/useRefreshable";
import { downloadFile, toCSV } from "../../utils/format";
import { lookupNickname } from "../../services/mlbb";
import { LiveNickname } from "./LiveNickname";

export function ParticipantsPanel({ tournamentId }) {
  const { registrations, settings } = useData();
  const toast = useToast();
  const { loading, refresh } = useRefreshable();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [exporting, setExporting] = useState(false);

  const all = useMemo(
    () => {
      const seenPlayers = new Set();
      return registrations
        .filter((r) => r.tournament_id === tournamentId)
        .flatMap((r) =>
          r.slots.flatMap((s) =>
            [...s.players, ...s.substitutes]
              .filter((p) => {
                const playerKey = `${r.id}:${p.role}:${p.ml_id || p.full_name}:${p.ml_server || ""}`;
                if (seenPlayers.has(playerKey)) return false;
                seenPlayers.add(playerKey);
                return true;
              })
              .map((p, i) => ({ ...p, key: `${r.id}-${p.role}-${p.ml_id || i}-${p.ml_server || ""}`, team: s.team_name, reg: r.id, pay: r.payment_status, isDummy: r.is_dummy }))
          )
        );
    },
    [registrations, tournamentId]
  );
  const rows = all
    .filter((p) => role === "all" || p.role === role)
    .filter((p) => status === "all" || p.pay === status)
    .filter((p) => {
      const q = search.toLowerCase();
      return !q || [p.full_name, p.ml_id, p.ml_server, p.team, p.reg].some((v) => String(v).toLowerCase().includes(q));
    });

  const columns = [
    { key: "full_name", header: "Pemain", primary: true, render: (p) => <span><b className="text-slate-900">{p.full_name}</b><span className="block text-xs text-slate-400">{p.reg}</span></span> },
    { key: "team", header: "Tim", render: (p) => p.team },
    { key: "role", header: "Peran", render: (p) => <Badge tone={p.role === "main" ? "info" : "neutral"} dot={false}>{p.role === "main" ? "Utama" : "Cadangan"}</Badge> },
    { key: "ml", header: "ML ID (Server)", render: (p) => `${p.ml_id} (${p.ml_server})` },
    { key: "nick", header: "Nickname Terbaru", render: (p) => <LiveNickname id={p.ml_id} server={p.ml_server} apiUrl={settings.system.mlbb_api_url} isDummy={p.isDummy} /> },
    { key: "pay", header: "Pembayaran", render: (p) => <PaymentBadge status={p.pay} /> },
  ];

  const exportCsv = async () => {
    if (!rows.length) return toast.warning("Tidak ada data.");
    setExporting(true);
    try {
      const nicknames = new Map();
      let next = 0;
      const workers = Array.from({ length: Math.min(5, rows.length) }, async () => {
        while (next < rows.length) {
          const index = next++;
          const player = rows[index];
          try {
            const nickname = await lookupNickname({ id: player.ml_id, zone: player.ml_server, apiUrl: settings.system.mlbb_api_url });
            nicknames.set(player.key, nickname);
          } catch (error) {
            nicknames.set(player.key, error.code === "not_found" ? "Nickname tidak ditemukan" : "Gagal memuat nickname");
          }
        }
      });
      await Promise.all(workers);
      downloadFile(
        `peserta-${tournamentId}.csv`,
        toCSV(["Nama Lengkap", "Tim", "Registration ID", "Peran", "ML ID", "Server", "Nickname Terbaru", "Status Bayar"], rows.map((p) => [p.full_name, p.team, p.reg, p.role === "main" ? "Utama" : "Cadangan", p.ml_id, p.ml_server, nicknames.get(p.key) || "-", p.pay])),
        "text/csv;charset=utf-8"
      );
      toast.success("Data peserta dengan nickname terbaru diekspor.");
    } catch (error) {
      toast.error(error.message || "Gagal mengekspor data peserta.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey="key"
      loading={loading}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Cari nama, ID, server, tim..."
      onRefresh={refresh}
      pageSize={10}
      filters={
        <>
          <Select size="sm" wrapperClassName="w-full sm:w-40" value={role} onChange={setRole} options={[{ value: "all", label: "Semua Peran" }, { value: "main", label: "Pemain Utama" }, { value: "substitute", label: "Cadangan" }]} />
          <Select size="sm" wrapperClassName="w-full sm:w-44" value={status} onChange={setStatus} options={[{ value: "all", label: "Semua Pembayaran" }, { value: "approved", label: "Approved" }, { value: "pending", label: "Pending" }, { value: "rejected", label: "Rejected" }]} />
        </>
      }
      toolbarRight={<Button variant="outline" size="sm" className="h-10" icon="download" loading={exporting} onClick={exportCsv}>Export CSV</Button>}
      emptyIcon="user"
      emptyTitle="Belum ada peserta"
      emptyDescription="Data pemain dari pendaftaran akan tampil di sini."
    />
  );
}
