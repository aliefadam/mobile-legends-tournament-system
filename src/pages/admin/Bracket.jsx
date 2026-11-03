import { useMemo, useState } from "react";
import { Badge, Button, Card, ConfirmDialog, EmptyState, Icon, Switch } from "../../components/ui";
import { BracketViewer } from "../../components/bracket/BracketViewer";
import { MatchModal } from "../../components/bracket/MatchModal";
import { GenerateBracketModal } from "../../components/bracket/GenerateBracketModal";
import { useData } from "../../contexts/DataContext";
import { useToast } from "../../contexts/ToastContext";
import { applyMatchUpdate, canStartMatch, generateBracket, getProgress, teamName } from "../../services/bracket";
import { teamsFromRegistrations } from "../../services/registration";
import { copyText, publicUrl } from "../../utils/format";

/** Tab Bracket pada detail turnamen (admin). */
export default function Bracket({ tournament }) {
  const { registrations, brackets, matches, saveBracket, saveMatches, patchBracket, removeBracket } = useData();
  const toast = useToast();
  const [showGen, setShowGen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [delOpen, setDelOpen] = useState(false);

  const bracket = brackets.find((b) => b.tournament_id === tournament.id);
  const list = useMemo(() => matches.filter((m) => m.tournament_id === tournament.id), [matches, tournament.id]);
  const teams = useMemo(() => teamsFromRegistrations(registrations, tournament.id), [registrations, tournament.id]);
  const progress = useMemo(() => getProgress(list), [list]);
  const recommendedMatches = useMemo(
    () => {
      if (!bracket) return [];
      const ownerByTeam = new Map(
        bracket.teams.map((team) => [team.id, team.registration_id || team.id.replace(/-S\d+$/, "")])
      );
      const ownerOf = (teamId) => ownerByTeam.get(teamId) || teamId;
      const ongoingOwners = new Set(
        list
          .filter((match) => match.status === "ongoing")
          .flatMap((match) => [match.team_a, match.team_b])
          .filter(Boolean)
          .map(ownerOf)
      );
      const reservedOwners = new Set(ongoingOwners);

      return list
        .filter((match) => match.status === "upcoming" && canStartMatch(match))
        .sort((a, b) => a.match_number - b.match_number)
        .filter((match) => {
          const owners = [ownerOf(match.team_a), ownerOf(match.team_b)];
          if (owners.some((owner) => reservedOwners.has(owner))) return false;
          owners.forEach((owner) => reservedOwners.add(owner));
          return true;
        });
    },
    [bracket, list]
  );

  const inBracket = new Set(bracket?.teams.map((t) => t.id) || []);
  const newTeams = bracket ? teams.filter((t) => !inBracket.has(t.id)) : [];
  const removedTeams = bracket ? bracket.teams.filter((t) => !teams.some((x) => x.id === t.id)) : [];

  const onGenerate = ({ format, seeding, teamIds, seriesFormats }) => {
    try {
      const chosen = teams.filter((t) => teamIds.includes(t.id));
      const result = generateBracket({ tournamentId: tournament.id, teams: chosen, format, seeding, manualOrder: teamIds, seriesFormats });
      saveBracket(result.bracket, result.matches);
      setShowGen(false);
      toast.success(`Bracket ${format === "double_elimination" ? "Double" : "Single"} Elimination berhasil dibuat.`);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const onUpdate = (patch) => {
    if (!selected) return;
    const next = applyMatchUpdate(list, selected.id, patch);
    saveMatches(tournament.id, next);
    if (patch.status === "completed") toast.success("Hasil pertandingan disimpan. Pemenang diteruskan ke babak berikutnya.");
    else if (patch.status === "ongoing") toast.info("Pertandingan dimulai.");
    else if (patch.status === "upcoming") toast.info("Pertandingan direset.");
    else toast.success("Perubahan disimpan.");
    if (patch.status === "completed" || patch.status === "upcoming") setSelected(null);
  };

  const share = async () => ((await copyText(publicUrl(`/tournament/${tournament.slug}/bracket`))) ? toast.success("Tautan bracket publik disalin.") : toast.error("Gagal menyalin."));

  if (!bracket)
    return (
      <Card>
        <EmptyState
          icon="sitemap"
          title="Bracket belum dibuat"
          description={teams.length ? `${teams.length} tim terverifikasi siap dimasukkan ke bracket.` : "Belum ada tim dengan pembayaran Approved. Verifikasi pembayaran terlebih dahulu."}
          action={<Button icon="sitemap" onClick={() => setShowGen(true)} disabled={teams.length < 2}>Generate Bracket</Button>}
        />
        <GenerateBracketModal open={showGen} onClose={() => setShowGen(false)} teams={teams} onGenerate={onGenerate} />
      </Card>
    );

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="info" dot={false}>{bracket.format === "double_elimination" ? "Double Elimination" : "Single Elimination"}</Badge>
          <Badge tone="purple" dot={false}>{bracket.team_count} tim</Badge>
          <Badge tone="neutral" dot={false}>{bracket.bye_count} bye</Badge>
          <Badge tone={progress.champion ? "success" : progress.started ? "purple" : "warning"}>{progress.champion ? "Selesai" : progress.started ? "Berjalan" : "Belum dimulai"}</Badge>
          <span className="text-sm text-slate-500">{progress.done}/{progress.total} pertandingan selesai ({progress.percent}%)</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Switch className="mr-2 items-center gap-3" checked={!!bracket.published} onChange={(v) => { patchBracket(tournament.id, { published: v }); toast.success(v ? "Bracket dipublikasikan." : "Bracket disembunyikan dari publik."); }} label="Publikasikan" />
          {bracket.published && <Button size="sm" variant="outline" icon="share" onClick={share}>Share URL</Button>}
          <Button size="sm" variant="outline" icon="refresh" onClick={() => setShowGen(true)}>Generate Ulang</Button>
          <Button size="sm" variant="danger-soft" icon="trash" onClick={() => setDelOpen(true)}>Hapus</Button>
        </div>
      </Card>

      {progress.champion && (
        <Card className="flex items-center gap-4 !border-amber-200 bg-gradient-to-r from-amber-50 to-white p-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400 text-2xl text-white"><Icon name="trophy" solid /></span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Juara</p>
            <p className="text-xl font-extrabold text-navy-900">{teamName(bracket, progress.champion)}</p>
          </div>
        </Card>
      )}

      {(newTeams.length > 0 || removedTeams.length > 0) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-bold"><Icon name="exclamation" className="mr-1.5" />Peserta berubah sejak bracket dibuat</p>
          {newTeams.length > 0 && <p className="mt-1">{newTeams.length} tim terverifikasi belum masuk bracket: {newTeams.map((t) => t.name).join(", ")}.</p>}
          {removedTeams.length > 0 && <p className="mt-1">{removedTeams.length} tim di bracket tidak lagi berstatus Approved: {removedTeams.map((t) => t.name).join(", ")}.</p>}
          <p className="mt-1 text-xs">Registrasi baru tidak otomatis masuk. Gunakan “Generate Ulang” bila diperlukan (hasil pertandingan akan dihapus).</p>
        </div>
      )}

      <Card className="flex flex-col gap-4 border-electric-200 bg-electric-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-electric-100 text-electric-700">
            <Icon name="play" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-electric-700">Rekomendasi pertandingan selanjutnya</p>
            {recommendedMatches.length > 0 ? (
              <>
                <p className="mt-1 text-lg font-extrabold text-slate-900">
                  Match #{recommendedMatches[0].match_number}
                  <span className="ml-2 text-sm font-semibold text-slate-500">
                    {bracket.rounds.find((round) => round.match_ids.includes(recommendedMatches[0].id))?.name}
                  </span>
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {teamName(bracket, recommendedMatches[0].team_a)} vs {teamName(bracket, recommendedMatches[0].team_b)}
                  {recommendedMatches.length > 1 && ` · ${recommendedMatches.length - 1} pertandingan lain juga siap dimulai`}
                </p>
              </>
            ) : progress.champion ? (
              <p className="mt-1 text-sm font-semibold text-slate-700">Semua pertandingan telah selesai.</p>
            ) : progress.ongoing > 0 ? (
              <p className="mt-1 text-sm text-slate-600">
                Belum ada pertandingan lain yang siap dimulai. Selesaikan pertandingan yang sedang berlangsung agar babak berikutnya dapat ditentukan.
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-600">
                Belum ada pertandingan yang siap dimulai. Selesaikan pertandingan sebelumnya untuk menentukan peserta babak berikutnya.
              </p>
            )}
          </div>
        </div>
        {recommendedMatches.length > 0 && (
          <Button className="shrink-0" icon="arrow-right" onClick={() => setSelected(recommendedMatches[0])}>
            Buka Pertandingan
          </Button>
        )}
      </Card>

      <BracketViewer bracket={bracket} matches={list} title={tournament.name} onMatchClick={setSelected} />
      <p className="text-center text-xs text-slate-400">Klik kartu pertandingan untuk mengatur jadwal, skor, dan pemenang.</p>

      <MatchModal open={!!selected} match={selected} bracket={bracket} matches={list} onClose={() => setSelected(null)} onUpdate={onUpdate} />
      <GenerateBracketModal open={showGen} onClose={() => setShowGen(false)} teams={teams} existing={bracket} started={progress.started} defaultFormat={bracket.format} onGenerate={onGenerate} />
      <ConfirmDialog
        open={delOpen}
        onClose={() => setDelOpen(false)}
        title="Hapus bracket?"
        message="Bracket dan seluruh hasil pertandingan turnamen ini akan dihapus."
        acknowledge={progress.started ? "Saya mengerti seluruh skor & hasil pertandingan akan hilang." : undefined}
        confirmLabel="Hapus Bracket"
        onConfirm={() => {
          removeBracket(tournament.id);
          setDelOpen(false);
          toast.success("Bracket dihapus.");
        }}
      />
    </div>
  );
}
