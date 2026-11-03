import { Link } from "react-router-dom";
import { Button, Card, Icon } from "../ui";
import { PublicStatusBadge } from "../shared/Badges";
import { getTournamentStats, getPublicStatus } from "../../services/tournament";
import { formatDate, formatRupiah } from "../../utils/format";
import { useData } from "../../contexts/DataContext";

export function TournamentCard({ tournament: t }) {
  const { registrations } = useData();
  const stats = getTournamentStats(t, registrations);
  const open = getPublicStatus(t) === "registration_open";
  return (
    <Card hover className="flex h-full flex-col overflow-hidden">
      <div className="hero-grid relative overflow-hidden bg-electric-50 p-5">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-electric-300/25 blur-2xl" />
        <div className="relative flex items-start justify-between gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl text-electric-600 shadow-sm">
            <Icon name="trophy" solid />
          </span>
          <PublicStatusBadge tournament={t} className="!bg-white !ring-0" />
        </div>
        <h3 className="relative mt-4 text-lg font-bold leading-snug text-navy-900">{t.name}</h3>
        <p className="relative mt-1 flex items-center gap-1.5 text-sm text-slate-600">
          <Icon name="calendar" /> {formatDate(t.date)}{t.start_time && <> <Icon name="clock" className="ml-1" /> {t.start_time}</>}
        </p>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <ul className="space-y-2.5 text-sm text-slate-600">
          <li className="flex items-start gap-2.5">
            <Icon name="marker" className="mt-0.5 text-electric-500" />
            <span>{t.venue}, {t.location}</span>
          </li>
          <li className="flex items-center gap-2.5">
            <Icon name="coins" className="text-amber-500" />
            Prize pool <b className="font-semibold text-slate-900">{formatRupiah(t.prize_pool)}</b>
          </li>
          <li className="flex items-center gap-2.5">
            <Icon name="ticket" className="text-accent-500" />
            Pendaftaran <b className="font-semibold text-slate-900">{formatRupiah(t.registration_price)}</b> / slot
          </li>
        </ul>
        {t.max_teams ? (
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-xs font-medium text-slate-500">
              <span>Slot terisi</span>
              <span className="font-semibold text-slate-700">{stats.usedSlots}/{t.max_teams}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-electric-500 to-accent-500 transition-all" style={{ width: `${stats.progress}%` }} />
            </div>
          </div>
        ) : (
          <p className="mt-4 text-xs font-medium text-slate-500">{stats.verifiedTeams} tim terverifikasi · slot tidak dibatasi</p>
        )}
        <div className="mt-5 flex-1" />
        <Button to={`/tournament/${t.slug}`} variant={open ? "primary" : "outline"} full iconRight="arrow-right">
          Detail Turnamen
        </Button>
      </div>
    </Card>
  );
}

export const TournamentLink = ({ t, children, className }) => (
  <Link to={`/tournament/${t.slug}`} className={className}>
    {children}
  </Link>
);
