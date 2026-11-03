import { useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Card, Icon, Tabs } from "../../components/ui";
import { PublicStatusBadge } from "../../components/shared/Badges";
import { TournamentMap } from "../../components/tournament/TournamentMap";
import NotFound from "./NotFound";
import { useData } from "../../contexts/DataContext";
import { useToast } from "../../contexts/ToastContext";
import { getPublicStatus, getTournamentStats, isPublic, registrationBlockReason } from "../../services/tournament";
import { registrationSlotTeamName } from "../../services/registration";
import { copyText, formatDate, formatRupiah, publicUrl } from "../../utils/format";
import { sanitizeRichText } from "../../utils/richText";

function InfoItem({ icon, label, value, tone = "text-electric-500 bg-electric-50" }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-4">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg ${tone}`}>
        <Icon name={icon} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 break-words text-sm font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

export default function TournamentDetail() {
  const { slug } = useParams();
  const { tournaments, registrations, brackets } = useData();
  const toast = useToast();
  const [tab, setTab] = useState("rules");
  const infoRef = useRef(null);

  const t = tournaments.find((x) => x.slug === slug);
  const stats = useMemo(() => (t ? getTournamentStats(t, registrations) : null), [t, registrations]);

  if (!t || !isPublic(t)) return <NotFound title="Turnamen tidak ditemukan" description="Turnamen ini belum dipublikasikan atau tidak tersedia." />;

  const block = registrationBlockReason(t, registrations);
  const bracket = brackets.find((b) => b.tournament_id === t.id && b.published);
  const status = getPublicStatus(t);
  const verifiedTeams = registrations
    .filter((r) => r.tournament_id === t.id && r.payment_status === "approved")
    .flatMap((r) => r.slots.map((s, i) => ({ id: s.id, name: registrationSlotTeamName(r, i) })));

  const share = async () => {
    const ok = await copyText(publicUrl(`/tournament/${t.slug}`));
    ok ? toast.success("Tautan turnamen disalin.") : toast.error("Gagal menyalin tautan.");
  };

  const regCard = (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-br from-electric-600 to-accent-600 p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Biaya Pendaftaran</p>
        <p className="mt-1 text-3xl font-extrabold">{formatRupiah(t.registration_price)}</p>
        <p className="text-sm text-white/80">per slot tim</p>
      </div>
      <div className="space-y-4 p-5">
        {stats.capacity ? (
          <div>
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="font-medium text-slate-600">Slot terdaftar</span>
              <span className="font-bold text-slate-900">{stats.usedSlots} / {stats.capacity}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-electric-500 to-accent-500" style={{ width: `${stats.progress}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">{stats.remaining} slot tersisa</p>
          </div>
        ) : (
          <p className="text-sm text-slate-600">Slot pendaftaran <b>tidak dibatasi</b>.</p>
        )}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xl font-extrabold text-navy-900">{stats.usedSlots}</p>
            <p className="text-xs text-slate-500">Slot terdaftar</p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3">
            <p className="text-xl font-extrabold text-emerald-600">{stats.verifiedTeams}</p>
            <p className="text-xs text-slate-500">Tim terverifikasi</p>
          </div>
        </div>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex gap-2"><Icon name="check-circle" className="mt-0.5 text-emerald-500" /> Maks. {t.support_multi_slot ? "2 slot" : "1 slot"} per pendaftaran</li>
          <li className="flex gap-2"><Icon name="check-circle" className="mt-0.5 text-emerald-500" /> 5 pemain utama + 2 cadangan per tim</li>
          <li className="flex gap-2"><Icon name="check-circle" className="mt-0.5 text-emerald-500" /> Verifikasi ID Mobile Legends otomatis</li>
        </ul>
        {block ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
            <Icon name="exclamation" className="mr-1.5" />
            {block}
          </div>
        ) : (
          <Button to={`/tournament/${t.slug}/register`} full size="lg" icon="ticket">
            Daftar Turnamen
          </Button>
        )}
      </div>
    </Card>
  );

  return (
    <div>
      <section className="hero-grid relative overflow-hidden bg-electric-50">
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-accent-300/25 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-electric-300/25 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <Link to="/" className="mb-6 flex w-fit items-center gap-2 text-sm font-medium text-slate-600 hover:text-electric-700">
            <Icon name="arrow-left" /> Semua Turnamen
          </Link>
          <PublicStatusBadge tournament={t} className="!bg-white !ring-0" />
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold leading-tight text-navy-900 sm:text-5xl">{t.name}</h1>
          <div className="mt-5">
            <div className="flex flex-col items-start gap-2 text-sm text-slate-600">
              <span className="flex items-center gap-2"><Icon name="calendar" className="shrink-0 text-electric-600" /> {formatDate(t.date)}</span>
              {t.start_time && <span className="flex items-center gap-2"><Icon name="clock" className="shrink-0 text-electric-600" /> Mulai {t.start_time}</span>}
              <span className="flex items-start gap-2"><Icon name="marker" className="mt-0.5 shrink-0 text-electric-600" /> <span>{t.venue}, {t.location}</span></span>
              <span className="flex items-center gap-2"><Icon name="coins" className="shrink-0 text-amber-500" /> Prize pool {formatRupiah(t.prize_pool)}</span>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            {!block ? (
              <Button to={`/tournament/${t.slug}/register`} size="lg" icon="ticket">Daftar Turnamen</Button>
            ) : (
              <Button size="lg" disabled icon="lock">{status === "completed" ? "Turnamen Selesai" : "Pendaftaran Tidak Tersedia"}</Button>
            )}
            <Button size="lg" variant="outline" icon="info" onClick={() => infoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
              Lihat Informasi
            </Button>
            {bracket && (
              <Button size="lg" variant="outline" icon="sitemap" to={`/tournament/${t.slug}/bracket`}>
                Lihat Bracket
              </Button>
            )}
            <Button size="lg" variant="ghost" className="text-slate-600 hover:bg-white hover:text-electric-700" icon="share" onClick={share} aria-label="Bagikan" />
          </div>
        </div>
      </section>

      <div ref={infoRef} className="mx-auto grid max-w-7xl scroll-mt-20 gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          <section>
            <h2 className="mb-4 text-lg font-extrabold text-navy-900">Informasi Turnamen</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoItem icon="trophy" label="Nama Turnamen" value={t.name} />
              <InfoItem icon="calendar" label="Waktu Pertandingan" value={`${formatDate(t.date)}${t.start_time ? `, ${t.start_time}` : ""}`} tone="text-accent-500 bg-accent-50" />
              <InfoItem icon="building" label="Tempat" value={t.venue} />
              <InfoItem icon="marker" label="Alamat / Lokasi" value={t.location} tone="text-red-500 bg-red-50" />
              <InfoItem icon="coins" label="Total Prize Pool" value={formatRupiah(t.prize_pool)} tone="text-amber-500 bg-amber-50" />
              <InfoItem icon="ticket" label="Harga Pendaftaran / Slot" value={formatRupiah(t.registration_price)} tone="text-emerald-500 bg-emerald-50" />
            </div>
            <div className="mt-4">
              <TournamentMap tournament={t} />
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-extrabold text-navy-900">Informasi Pendaftaran</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <InfoItem icon="apps" label="Total Slot" value={stats.capacity ? `${stats.capacity} slot` : "Tidak dibatasi"} />
              <InfoItem icon="users" label="Slot Terdaftar" value={stats.usedSlots} tone="text-accent-500 bg-accent-50" />
              <InfoItem icon="shield-check" label="Tim Terverifikasi" value={stats.verifiedTeams} tone="text-emerald-500 bg-emerald-50" />
              <InfoItem icon="copy-alt" label="Maks. Slot per Pendaftaran" value={t.support_multi_slot ? "2 slot" : "1 slot"} />
              <InfoItem icon="user" label="Komposisi Tim" value="5 pemain utama + 2 cadangan" tone="text-accent-500 bg-accent-50" />
              <InfoItem icon="flag" label="Status" value={<PublicStatusBadge tournament={t} />} tone="text-slate-500 bg-slate-100" />
            </div>
          </section>

          <Card>
            <Tabs
              className="px-3"
              value={tab}
              onChange={setTab}
              tabs={[
                { value: "rules", label: "Peraturan", icon: "list" },
                { value: "teams", label: "Tim Terverifikasi", icon: "users", count: verifiedTeams.length },
              ]}
            />
            <div className="p-5 sm:p-6">
              {tab === "rules" && (
                t.rules ? (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 [&_a]:text-electric-700 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-electric-300 [&_blockquote]:pl-3 [&_h2]:my-3 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:my-2 [&_h3]:font-bold [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5" dangerouslySetInnerHTML={{ __html: sanitizeRichText(t.rules) }} />
                ) : (
                  <p className="text-sm text-slate-500">Belum ada informasi peraturan.</p>
                )
              )}
              {tab === "teams" &&
                (verifiedTeams.length ? (
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {verifiedTeams.map((tm, i) => (
                      <li key={tm.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-electric-50 text-xs font-semibold text-electric-700">{i + 1}</span>
                        {tm.name}
                        <Icon name="badge-check" solid className="ml-auto text-emerald-500" />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">Belum ada tim yang terverifikasi.</p>
                ))}
            </div>
          </Card>
        </div>
        <aside>
          <div className="lg:sticky lg:top-24">{regCard}</div>
        </aside>
      </div>
    </div>
  );
}
