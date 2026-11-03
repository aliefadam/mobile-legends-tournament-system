import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button, Card, CardHeader, ConfirmDialog, Icon, StatCard, Tabs } from "../../components/ui";
import { AdminStatusBadge, PublicStatusBadge } from "../../components/shared/Badges";
import { RegistrationsPanel } from "../../components/admin/RegistrationsPanel";
import { ParticipantsPanel } from "../../components/admin/ParticipantsPanel";
import { PaymentsPanel } from "../../components/admin/PaymentsPanel";
import { TournamentForm } from "../../components/forms/TournamentForm";
import Bracket from "./Bracket";
import NotFound from "../public/NotFound";
import { useData } from "../../contexts/DataContext";
import { useToast } from "../../contexts/ToastContext";
import { getPublicStatus, getTournamentStats, tournamentToForm } from "../../services/tournament";
import { copyText, formatDate, formatRupiah, publicUrl } from "../../utils/format";

export default function TournamentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const { tournaments, registrations, brackets, saveTournament, patchTournament, duplicateTournament, deleteTournament } = useData();
  const [del, setDel] = useState(false);
  const t = tournaments.find((x) => x.id === id);
  const tab = params.get("tab") || "overview";
  const stats = useMemo(() => (t ? getTournamentStats(t, registrations) : null), [t, registrations]);

  if (!t) return <NotFound title="Turnamen tidak ditemukan" description="Turnamen mungkin sudah dihapus." />;
  const bracket = brackets.find((b) => b.tournament_id === t.id);
  const publicStatus = getPublicStatus(t);
  const setTab = (v) => setParams({ tab: v }, { replace: true });
  const url = `/tournament/${t.slug}`;

  const copyUrl = async () => ((await copyText(publicUrl(url))) ? toast.success("URL landing page disalin.") : toast.error("Gagal menyalin."));

  const tabs = [
    { value: "overview", label: "Overview", icon: "chart-histogram" },
    { value: "registrations", label: "Registrations", icon: "users", count: stats.totalRegistrations },
    { value: "participants", label: "Participants", icon: "user" },
    { value: "payments", label: "Payments", icon: "wallet", count: stats.pending || undefined },
    { value: "bracket", label: "Bracket", icon: "sitemap" },
    { value: "settings", label: "Settings", icon: "settings" },
  ];

  const info = [
    { label: "Waktu Pertandingan", value: `${formatDate(t.date)}${t.start_time ? `, ${t.start_time}` : ""}`, icon: "calendar", tone: "text-electric-600 bg-electric-50" },
    { label: "Tempat", value: t.venue, icon: "building", tone: "text-accent-600 bg-accent-50" },
    { label: "Lokasi", value: t.location, icon: "marker", tone: "text-red-600 bg-red-50", wide: true },
    { label: "Prize Pool", value: formatRupiah(t.prize_pool), icon: "coins", tone: "text-amber-600 bg-amber-50" },
    { label: "Harga Pendaftaran / Slot", value: formatRupiah(t.registration_price), icon: "ticket", tone: "text-emerald-600 bg-emerald-50" },
    { label: "Multi Slot", value: t.support_multi_slot ? "Aktif (maks. 2)" : "Nonaktif", icon: "users", tone: "text-accent-600 bg-accent-50" },
    { label: "Kapasitas", value: t.max_teams ? `${t.max_teams} slot` : "Tidak dibatasi", icon: "apps", tone: "text-electric-600 bg-electric-50" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <Link to="/admin/tournaments" className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-electric-600">
          <Icon name="arrow-left" /> Semua Turnamen
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl font-extrabold text-slate-900">{t.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <AdminStatusBadge status={t.status} />
              {publicStatus && publicStatus !== t.status && <PublicStatusBadge tournament={t} />}
              <button onClick={copyUrl} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-electric-50 hover:text-electric-700">
                <Icon name="link" /> {url} <Icon name="copy" />
              </button>
            </div>
          </div>
          {t.status !== "draft" && <Button variant="outline" icon="globe" onClick={() => window.open(`#${url}`, "_blank")}>Lihat Landing Page</Button>}
        </div>
      </div>

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === "overview" && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon="users" label="Total Pendaftaran" value={stats.totalRegistrations} tone="info" />
            <StatCard icon="apps" label="Total Slot" value={stats.totalSlots} tone="purple" />
            <StatCard icon="shield-check" label="Tim Terverifikasi" value={stats.verifiedTeams} tone="success" />
            <StatCard icon="clock" label="Menunggu Verifikasi" value={stats.pending} tone="warning" />
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Informasi Turnamen" description="Ringkasan jadwal, lokasi, dan biaya turnamen." />
              <dl className="grid gap-3 p-5 sm:grid-cols-2">
                {info.map(({ label, value, icon, tone, wide }) => (
                  <div key={label} className={`flex min-w-0 items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 ${wide ? "sm:col-span-2" : ""}`}>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
                      <Icon name={icon} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <dt className="text-xs font-medium text-slate-500">{label}</dt>
                      <dd className="mt-1 break-words text-sm font-semibold leading-relaxed text-slate-900">{value}</dd>
                      {label === "Lokasi" && t.google_maps_url && (
                        <a href={t.google_maps_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-electric-700 hover:text-electric-800">
                          <Icon name="marker" /> Buka di Google Maps
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </dl>
            </Card>
            <Card>
              <CardHeader title="Progress Pendaftaran" />
              <div className="space-y-4 p-5">
                {stats.capacity ? (
                  <>
                    <div className="flex items-end justify-between">
                      <p className="text-3xl font-extrabold text-navy-900">{stats.usedSlots}<span className="text-lg font-semibold text-slate-400"> / {stats.capacity}</span></p>
                      <p className="text-sm font-bold text-electric-600">{stats.progress}%</p>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-electric-500 to-accent-500 transition-all" style={{ width: `${stats.progress}%` }} />
                    </div>
                    <p className="text-xs text-slate-500">{stats.remaining} slot tersisa</p>
                  </>
                ) : (
                  <p className="text-sm text-slate-600">{stats.usedSlots} slot terdaftar. Kapasitas tidak dibatasi.</p>
                )}
                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="text-xs text-emerald-700">Pendapatan terverifikasi</p>
                  <p className="text-xl font-extrabold text-emerald-700">{formatRupiah(stats.revenue)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-sm">
                  <span className="text-slate-500">Bracket: </span>
                  <b>{bracket ? `${bracket.team_count} tim (${bracket.published ? "dipublikasikan" : "draft"})` : "Belum dibuat"}</b>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
      {tab === "registrations" && <RegistrationsPanel tournamentId={t.id} />}
      {tab === "participants" && <ParticipantsPanel tournamentId={t.id} />}
      {tab === "payments" && <PaymentsPanel tournamentId={t.id} />}
      {tab === "bracket" && <Bracket tournament={t} />}
      {tab === "settings" && (
        <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
          <Card className="p-5 sm:p-6">
            <TournamentForm
              key={t.updated_at}
              initial={tournamentToForm(t)}
              existing={t}
              tournaments={tournaments}
              submitLabel="Simpan Perubahan"
              onSubmit={(saved) => {
                saveTournament(saved);
                toast.success("Pengaturan turnamen disimpan.");
              }}
            />
          </Card>
          <Card className="h-fit p-5">
            <h3 className="mb-3 font-bold text-slate-900">Aksi Cepat</h3>
            <div className="space-y-2">
              {t.status === "draft" ? (
                <Button full variant="soft" icon="globe" onClick={() => { patchTournament(t.id, { status: "published" }); toast.success("Dipublikasikan."); }}>Publish</Button>
              ) : (
                <Button full variant="outline" icon="eye-crossed" onClick={() => { patchTournament(t.id, { status: "draft", registration_status: "closed" }); toast.info("Kembali ke Draft."); }}>Unpublish</Button>
              )}
              {(t.registration_status === "open" || t.status === "registration_open") && (
                <Button full variant="outline" icon="lock" onClick={() => { patchTournament(t.id, { status: "registration_closed", registration_status: "closed" }); toast.info("Pendaftaran ditutup."); }}>Close Registration</Button>
              )}
              {t.status !== "draft" && t.status !== "registration_open" && t.status !== "completed" && (
                <Button full variant="outline" icon="unlock" onClick={() => { patchTournament(t.id, { status: "registration_open", registration_status: "open" }); toast.success("Pendaftaran dibuka."); }}>Open Registration</Button>
              )}
              <Button full variant="outline" icon="duplicate" onClick={() => { const c = duplicateTournament(t.id); toast.success("Turnamen diduplikasi sebagai Draft."); c && navigate(`/admin/tournaments/${c.id}?tab=settings`); }}>Duplicate</Button>
              <Button full variant="outline" icon="archive" onClick={() => { patchTournament(t.id, { archived: !t.archived }); toast.success(t.archived ? "Dikembalikan dari arsip." : "Turnamen diarsipkan."); }}>{t.archived ? "Kembalikan dari Arsip" : "Arsipkan"}</Button>
              <Button full variant="danger-soft" icon="trash" onClick={() => setDel(true)}>Hapus Turnamen</Button>
            </div>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={del}
        onClose={() => setDel(false)}
        title="Hapus turnamen?"
        message={`"${t.name}" beserta seluruh pendaftaran, pembayaran, dan bracket akan dihapus permanen.`}
        acknowledge="Saya mengerti data tidak dapat dikembalikan."
        confirmLabel="Hapus Permanen"
        onConfirm={() => {
          deleteTournament(t.id);
          toast.success("Turnamen dihapus.");
          navigate("/admin/tournaments");
        }}
      />
    </div>
  );
}
