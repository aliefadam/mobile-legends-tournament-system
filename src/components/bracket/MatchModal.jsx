import { useEffect, useMemo, useState } from "react";
import { Badge, Button, ConfirmDialog, DatePicker, Icon, Modal } from "../ui";
import { MatchBadge } from "../shared/Badges";
import { BYE, applyMatchUpdate, canStartMatch, impactOfUpdate, isRealTeam, placeholderFor, teamName } from "../../services/bracket";
import { formatDateTime } from "../../utils/format";
import { cn } from "../../utils/cn";

function Stepper({ value, onChange, disabled, max = 99, canIncrement = true }) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" disabled={disabled || value <= 0} onClick={() => onChange(value - 1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:opacity-40" aria-label="Kurangi skor">
        <Icon name="minus-small" />
      </button>
      <span className="w-10 text-center text-2xl font-extrabold text-slate-900">{value}</span>
      <button type="button" disabled={disabled || !canIncrement || value >= max} onClick={() => onChange(value + 1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:opacity-40" aria-label="Tambah skor">
        <Icon name="plus-small" />
      </button>
    </div>
  );
}

export function MatchModal({ open, match, bracket, matches, onClose, onUpdate, readOnly }) {
  const [schedule, setSchedule] = useState("");
  const [sa, setSa] = useState(0);
  const [sb, setSb] = useState(0);
  const [winner, setWinner] = useState(null);
  const [confirm, setConfirm] = useState(null); // 'complete' | 'reset'

  const m = useMemo(() => (match ? matches.find((x) => x.id === match.id) || match : null), [match, matches]);

  useEffect(() => {
    if (m && open) {
      setSchedule(m.schedule || "");
      setSa(m.score_a || 0);
      setSb(m.score_b || 0);
      setWinner(m.winner_id || null);
      setConfirm(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m?.id, open, m?.status]);

  if (!m) return null;
  const round = bracket.rounds.find((r) => r.match_ids.includes(m.id));
  const ready = canStartMatch(m);
  const completed = m.status === "completed";
  const editable = !readOnly && ready;
  const bestOf = Math.max(1, Number(m.best_of) || 1);
  const winsToWin = Math.ceil(bestOf / 2);
  const nameOf = (side) => {
    const id = side === "a" ? m.team_a : m.team_b;
    return id ? teamName(bracket, id) : placeholderFor(side === "a" ? m.source_a : m.source_b, matches);
  };
  const next = matches.find((x) => [x.source_a, x.source_b].some((s) => s?.type === "winner" && s.match === m.id));
  const nextLoser = matches.find((x) => [x.source_a, x.source_b].some((s) => s?.type === "loser" && s.match === m.id));

  const setScore = (side, v) => {
    const a = side === "a" ? v : sa;
    const b = side === "b" ? v : sb;
    side === "a" ? setSa(v) : setSb(v);
    if (bestOf > 1) {
      setWinner(a >= winsToWin ? m.team_a : b >= winsToWin ? m.team_b : null);
    } else if (a !== b) {
      setWinner(a > b ? m.team_a : m.team_b);
    }
  };

  const completePatch = { score_a: sa, score_b: sb, winner_id: winner, status: "completed", schedule: schedule || null, completed_at: new Date().toISOString() };
  const resetPatch = { score_a: 0, score_b: 0, winner_id: null, status: "upcoming" };
  const impact = confirm === "complete" ? impactOfUpdate(matches, m.id, completePatch) : confirm === "reset" ? impactOfUpdate(matches, m.id, resetPatch) : [];

  const wouldChange = completed && winner !== m.winner_id;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        size="md"
        title={`Match #${m.match_number}`}
        description={`${round?.name || ""}${m.bracket_type === "losers" ? " · Losers Bracket" : ""}`}
        footer={
          readOnly || m.is_bye ? (
            <Button variant="outline" onClick={onClose}>Tutup</Button>
          ) : (
            <>
              {completed && (
                <Button variant="danger-soft" icon="undo" onClick={() => setConfirm("reset")}>Reset Match</Button>
              )}
              <Button variant="outline" icon="calendar" onClick={() => { onUpdate({ schedule: schedule || null }); }}>Simpan Jadwal</Button>
              {!completed && m.status === "upcoming" && (
                <Button variant="soft" icon="play" disabled={!ready} onClick={() => onUpdate({ status: "ongoing", schedule: schedule || null })}>Mulai</Button>
              )}
              {!completed && m.status === "ongoing" && (
                <Button variant="outline" icon="disk" onClick={() => onUpdate({ score_a: sa, score_b: sb })}>Simpan Skor</Button>
              )}
              <Button variant="success" icon="check" disabled={!ready || !winner || (bestOf > 1 && Math.max(sa, sb) < winsToWin)} onClick={() => setConfirm("complete")}>
                {completed ? "Ubah Hasil" : "Selesaikan"}
              </Button>
            </>
          )
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <MatchBadge status={m.status} />
          <Badge tone={bestOf > 1 ? "purple" : "neutral"} dot={false}>Best of {bestOf}{bestOf > 1 ? ` · perlu ${winsToWin} kemenangan` : ""}</Badge>
          {m.is_bye && <Badge tone="neutral">BYE — otomatis lolos</Badge>}
          {m.schedule && <Badge tone="info" dot={false}><Icon name="calendar" className="mr-1" />{formatDateTime(m.schedule)}</Badge>}
        </div>

        <div className="space-y-2.5">
          {["a", "b"].map((side) => {
            const id = side === "a" ? m.team_a : m.team_b;
            const isWinner = winner && id === winner;
            const real = isRealTeam(id);
            return (
              <div key={side} className={cn("flex items-center gap-3 rounded-xl border-2 p-3 transition-colors", isWinner ? "border-electric-500 bg-electric-50/60" : "border-slate-200 bg-white")}>
                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold", isWinner ? "bg-electric-500 text-white" : "bg-slate-100 text-slate-500")}>
                  {side.toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate text-sm font-bold", real ? "text-slate-900" : "italic text-slate-400")}>{nameOf(side)}</p>
                  {isWinner && <p className="text-xs font-semibold text-electric-600"><Icon name="trophy" solid className="mr-1" />Pemenang</p>}
                  {editable && bestOf === 1 && real && !isWinner && (
                    <button type="button" onClick={() => setWinner(id)} className="text-xs font-semibold text-slate-400 hover:text-electric-600">Tetapkan sebagai pemenang</button>
                  )}
                </div>
                {m.is_bye ? null : real || completed || m.status === "ongoing" ? (
                  <Stepper
                    value={side === "a" ? sa : sb}
                    onChange={(v) => setScore(side, v)}
                    disabled={!editable}
                    max={bestOf > 1 ? winsToWin : 99}
                    canIncrement={bestOf === 1 || Math.max(sa, sb) < winsToWin}
                  />
                ) : null}
              </div>
            );
          })}
        </div>

        {!ready && !m.is_bye && !readOnly && (
          <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500"><Icon name="clock" className="mr-1.5" />Menunggu kedua peserta ditentukan dari pertandingan sebelumnya.</p>
        )}
        {bestOf > 1 && (
          <p className="mt-3 rounded-lg bg-electric-50 p-3 text-xs text-electric-700">
            Best of {bestOf}: pertandingan dimenangkan oleh tim pertama yang meraih {winsToWin} kemenangan game.
          </p>
        )}
        {!readOnly && !m.is_bye && (
          <div className="mt-4">
            <DatePicker label="Jadwal Pertandingan" withTime value={schedule} onChange={setSchedule} placeholder="Atur tanggal & jam" />
          </div>
        )}
        {(next || nextLoser) && !m.is_bye && (
          <p className="mt-4 text-xs text-slate-500">
            Pemenang lanjut ke <b>Match #{next?.match_number}</b>
            {nextLoser ? <>; yang kalah turun ke <b>Match #{nextLoser.match_number}</b> (Losers Bracket)</> : null}.
            {!next && !nextLoser ? " Ini adalah pertandingan final." : ""}
          </p>
        )}
        {!next && !nextLoser && !m.is_bye && <p className="mt-4 text-xs text-slate-500">Ini adalah pertandingan final.</p>}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        tone={confirm === "reset" ? "danger" : "info"}
        title={confirm === "reset" ? "Reset pertandingan?" : wouldChange ? "Ubah hasil pertandingan?" : "Simpan hasil pertandingan?"}
        message={
          confirm === "reset"
            ? "Hasil pertandingan ini akan dihapus dan status kembali menjadi Upcoming."
            : `${nameOf("a")} ${sa} — ${sb} ${nameOf("b")}. Pemenang: ${teamName(bracket, winner) || "-"}. Pemenang akan otomatis diteruskan ke babak berikutnya.`
        }
        confirmLabel={confirm === "reset" ? "Ya, Reset" : "Ya, Simpan Hasil"}
        onConfirm={() => {
          onUpdate(confirm === "reset" ? resetPatch : completePatch);
          setConfirm(null);
        }}
      >
        {impact.length > 0 && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <p className="font-bold"><Icon name="exclamation" className="mr-1" />Perhitungan ulang bracket</p>
            <p className="mt-1">Perubahan ini akan mereset {impact.length} pertandingan lanjutan yang sudah dimainkan: {impact.map((x) => `#${x.match_number}`).join(", ")}.</p>
          </div>
        )}
      </ConfirmDialog>
    </>
  );
}

export { BYE, applyMatchUpdate };
