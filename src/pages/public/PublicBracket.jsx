import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Card, EmptyState, Icon } from "../../components/ui";
import { BracketViewer } from "../../components/bracket/BracketViewer";
import { MatchModal } from "../../components/bracket/MatchModal";
import NotFound from "./NotFound";
import { useData } from "../../contexts/DataContext";
import { useToast } from "../../contexts/ToastContext";
import { getProgress, teamName } from "../../services/bracket";
import { copyText, publicUrl } from "../../utils/format";
import { isPublic } from "../../services/tournament";

export default function PublicBracket() {
  const { slug } = useParams();
  const { tournaments, brackets, matches } = useData();
  const toast = useToast();
  const [selected, setSelected] = useState(null);
  const t = tournaments.find((x) => x.slug === slug);
  if (!t || !isPublic(t)) return <NotFound title="Turnamen tidak ditemukan" />;
  const bracket = brackets.find((b) => b.tournament_id === t.id && b.published);
  const list = matches.filter((m) => m.tournament_id === t.id);

  const share = async () => ((await copyText(publicUrl(`/tournament/${t.slug}/bracket`))) ? toast.success("Tautan bracket disalin.") : toast.error("Gagal menyalin."));

  if (!bracket)
    return (
      <div className="mx-auto max-w-xl px-4 py-20">
        <EmptyState icon="sitemap" title="Bracket belum dipublikasikan" description="Bracket akan tampil di sini setelah panitia mempublikasikannya." action={<Button to={`/tournament/${t.slug}`} icon="arrow-left">Kembali</Button>} />
      </div>
    );

  const progress = getProgress(list);
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link to={`/tournament/${t.slug}`} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-electric-600">
        <Icon name="arrow-left" /> {t.name}
      </Link>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">Bracket Pertandingan</h1>
          <p className="text-sm text-slate-500">{bracket.format === "double_elimination" ? "Double Elimination" : "Single Elimination"} · {bracket.team_count} tim · {progress.done}/{progress.total} pertandingan selesai</p>
        </div>
        <Button variant="outline" icon="share" onClick={share}>Bagikan</Button>
      </div>
      {progress.champion && (
        <Card className="mb-5 flex items-center gap-4 !border-amber-200 bg-gradient-to-r from-amber-50 to-white p-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400 text-2xl text-white"><Icon name="trophy" solid /></span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Juara</p>
            <p className="text-xl font-extrabold text-navy-900">{teamName(bracket, progress.champion)}</p>
          </div>
        </Card>
      )}
      <BracketViewer bracket={bracket} matches={list} title={t.name} onMatchClick={setSelected} />
      <MatchModal open={!!selected} match={selected} bracket={bracket} matches={list} onClose={() => setSelected(null)} readOnly />
    </div>
  );
}
