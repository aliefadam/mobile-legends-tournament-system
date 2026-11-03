import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, StatCard, Tabs, Skeleton } from "../../components/ui";
import { DataTable } from "../../components/tables/DataTable";
import { PaymentBadge } from "../../components/shared/Badges";
import { AreaChart, BarChart, DonutChart } from "../../components/charts/Charts";
import { useData } from "../../contexts/DataContext";
import { useRefreshable } from "../../hooks/useRefreshable";
import { formatDateTime, formatRupiah, MONTHS_ID } from "../../utils/format";

export default function Dashboard() {
  const { tournaments, registrations, payments } = useData();
  const navigate = useNavigate();
  const { loading, refresh } = useRefreshable();
  const [period, setPeriod] = useState("daily");
  const [search, setSearch] = useState("");

  const stats = useMemo(() => {
    const approved = registrations.filter((r) => r.payment_status === "approved");
    return {
      tournaments: tournaments.length,
      registrations: registrations.length,
      verified: approved.reduce((s, r) => s + r.total_slot, 0),
      pending: registrations.filter((r) => r.payment_status === "pending").length,
      revenue: approved.reduce((s, r) => s + r.total_payment, 0),
    };
  }, [tournaments, registrations]);

  const byTournament = tournaments.map((t) => ({ label: t.name.replace("Mobile Legends ", "ML "), value: registrations.filter((r) => r.tournament_id === t.id).length }));
  const payment = [
    { label: "Pending", value: registrations.filter((r) => r.payment_status === "pending").length, color: "#f59e0b" },
    { label: "Approved", value: registrations.filter((r) => r.payment_status === "approved").length, color: "#10b981" },
    { label: "Rejected", value: registrations.filter((r) => r.payment_status === "rejected").length, color: "#ef4444" },
  ];

  const series = useMemo(() => {
    const now = new Date();
    if (period === "daily") {
      const days = Array.from({ length: 14 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (13 - i));
        return { key: d.toDateString(), label: `${d.getDate()}/${d.getMonth() + 1}`, value: 0 };
      });
      registrations.forEach((r) => {
        const d = days.find((x) => x.key === new Date(r.created_at).toDateString());
        if (d) d.value += r.total_slot;
      });
      return days;
    }
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTHS_ID[d.getMonth()].slice(0, 3), value: 0 };
    });
    registrations.forEach((r) => {
      const d = new Date(r.created_at);
      const m = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (m) m.value += r.total_slot;
    });
    return months;
  }, [registrations, period]);

  const revenueSeries = useMemo(() => {
    const now = new Date();
    const buckets = period === "daily"
      ? Array.from({ length: 14 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (13 - i));
          return { key: d.toDateString(), label: `${d.getDate()}/${d.getMonth() + 1}`, value: 0 };
        })
      : Array.from({ length: 6 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
          return { key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTHS_ID[d.getMonth()].slice(0, 3), value: 0 };
        });

    payments.filter((payment) => payment.status === "approved").forEach((payment) => {
      const date = new Date(payment.verified_at || payment.updated_at || payment.created_at);
      const key = period === "daily" ? date.toDateString() : `${date.getFullYear()}-${date.getMonth()}`;
      const bucket = buckets.find((item) => item.key === key);
      if (bucket) bucket.value += Number(payment.amount) || 0;
    });
    return buckets;
  }, [payments, period]);

  const compactRupiah = (value) => {
    if (value >= 1_000_000) return `Rp${(value / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
    if (value >= 1_000) return `Rp${(value / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} rb`;
    return `Rp${value}`;
  };

  const tmap = new Map(tournaments.map((t) => [t.id, t]));
  const recent = [...registrations]
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .filter((r) => {
      const q = search.toLowerCase();
      return !q || r.id.toLowerCase().includes(q) || r.team_name.toLowerCase().includes(q) || (tmap.get(r.tournament_id)?.name || "").toLowerCase().includes(q);
    });

  const columns = [
    { key: "id", header: "Registration ID", primary: true, render: (r) => <span className="font-bold text-navy-800">{r.id}</span> },
    { key: "team", header: "Nama Tim", render: (r) => <span className="font-semibold">{r.team_name}</span> },
    { key: "t", header: "Turnamen", render: (r) => tmap.get(r.tournament_id)?.name || "-" },
    { key: "d", header: "Tanggal", render: (r) => formatDateTime(r.created_at) },
    { key: "p", header: "Total", render: (r) => <span className="font-semibold">{formatRupiah(r.total_payment)}</span> },
    { key: "s", header: "Status", render: (r) => <PaymentBadge status={r.payment_status} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : (
          <>
            <StatCard icon="trophy" label="Total Turnamen" value={stats.tournaments} tone="info" />
            <StatCard icon="users" label="Total Pendaftaran" value={stats.registrations} tone="purple" />
            <StatCard icon="shield-check" label="Tim Terverifikasi" value={stats.verified} tone="success" />
            <StatCard icon="clock" label="Menunggu Pembayaran" value={stats.pending} tone="warning" />
            <StatCard icon="money" label="Pendapatan Terverifikasi" value={formatRupiah(stats.revenue)} tone="success" />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Pendaftaran per Turnamen" description="Jumlah pendaftaran masuk" />
          <div className="p-5">{loading ? <Skeleton className="h-52" /> : <BarChart data={byTournament} />}</div>
        </Card>
        <Card>
          <CardHeader title="Distribusi Status Pembayaran" />
          <div className="p-5 py-8">{loading ? <Skeleton className="h-44" /> : <DonutChart data={payment} centerLabel="pendaftaran" />}</div>
        </Card>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Tren Pendaftaran dan Pendapatan</h2>
            <p className="text-sm text-slate-500">Pantau perubahan jumlah slot dan pembayaran terverifikasi.</p>
          </div>
          <Tabs variant="pill" value={period} onChange={setPeriod} tabs={[{ value: "daily", label: "14 Hari" }, { value: "monthly", label: "6 Bulan" }]} />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Jumlah Peserta berdasarkan Periode" description="Total slot yang mendaftar" />
            <div className="p-5">{loading ? <Skeleton className="h-52" /> : <AreaChart data={series} label="Grafik jumlah peserta berdasarkan periode" />}</div>
          </Card>
          <Card>
            <CardHeader title="Pendapatan Terverifikasi" description="Pembayaran Approved berdasarkan tanggal verifikasi" />
            <div className="p-5">
              {loading ? (
                <Skeleton className="h-52" />
              ) : (
                <AreaChart
                  data={revenueSeries}
                  color="#2f6bff"
                  valueFormatter={compactRupiah}
                  label="Grafik pendapatan terverifikasi berdasarkan periode"
                />
              )}
            </div>
          </Card>
        </div>
      </section>

      <div>
        <h2 className="mb-3 text-lg font-bold text-slate-900">Pendaftaran Terbaru</h2>
        <DataTable
          columns={columns}
          rows={recent}
          loading={loading}
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Cari ID, tim, atau turnamen..."
          onRefresh={refresh}
          pageSize={6}
          emptyIcon="users"
          emptyTitle="Belum ada pendaftaran"
          emptyDescription="Pendaftaran peserta akan muncul di sini."
          actions={(r) => [{ label: "View Detail", icon: "eye", onClick: () => navigate(`/admin/tournaments/${r.tournament_id}?tab=registrations&reg=${r.id}`) }]}
        />
      </div>
    </div>
  );
}
