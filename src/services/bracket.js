import { shuffle, nowISO, pad } from "../utils/format";

export const BYE = "BYE";

export const nextPow2 = (n) => {
  let p = 1;
  while (p < n) p *= 2;
  return p;
};

/** Urutan seed standar (1 vs terakhir, dst) agar bye jatuh ke seed teratas. */
export function seedOrder(size) {
  let order = [1, 2];
  while (order.length < size) {
    const total = order.length * 2 + 1;
    const next = [];
    order.forEach((s) => next.push(s, total - s));
    order = next;
  }
  return order.slice(0, size);
}

export function orderTeams(teams, seeding, manualOrder = []) {
  if (seeding === "random") return shuffle(teams);
  if (seeding === "manual" && manualOrder.length) {
    const map = new Map(teams.map((t) => [t.id, t]));
    const ordered = manualOrder.map((id) => map.get(id)).filter(Boolean);
    teams.forEach((t) => {
      if (!ordered.includes(t)) ordered.push(t);
    });
    return ordered;
  }
  return [...teams].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
}

export function requiredTeams(format) {
  return format === "double_elimination" ? 3 : 2;
}

const DEFAULT_SERIES_FORMATS = { regular: 1, semifinal: 3, final: 3 };
const normalizeBestOf = (value, fallback) => ([1, 3].includes(Number(value)) ? Number(value) : fallback);

function separateRegistrationSlots(teams, size) {
  const half = size / 2;
  const seeds = [[], []];
  seedOrder(size).forEach((seed, position) => {
    if (seed <= teams.length) seeds[position < half ? 0 : 1].push(seed);
  });
  seeds.forEach((side) => side.sort((a, b) => a - b));

  const groups = new Map();
  teams.forEach((team) => {
    const registrationId = team.registration_id || team.id;
    if (!groups.has(registrationId)) groups.set(registrationId, []);
    groups.get(registrationId).push(team);
  });

  const assignment = new Map();
  const pairedGroups = [...groups.values()].filter((group) => group.length === 2);
  pairedGroups.forEach((group, index) => {
    const side = index % 2;
    assignment.set(group[0].id, side);
    assignment.set(group[1].id, 1 - side);
  });

  const counts = [pairedGroups.length, pairedGroups.length];
  const assignRemaining = (team) => {
    const available = [0, 1].filter((side) => counts[side] < seeds[side].length);
    if (!available.length) return;
    const side = available.reduce((best, candidate) =>
      counts[candidate] / seeds[candidate].length < counts[best] / seeds[best].length ? candidate : best
    );
    assignment.set(team.id, side);
    counts[side] += 1;
  };

  groups.forEach((group) => {
    if (group.length !== 2) group.forEach(assignRemaining);
  });

  const orderedBySeed = new Array(teams.length);
  [0, 1].forEach((side) => {
    const sideTeams = teams.filter((team) => assignment.get(team.id) === side);
    seeds[side].forEach((seed, index) => {
      orderedBySeed[seed - 1] = sideTeams[index];
    });
  });
  return orderedBySeed;
}

const wbName = (r, R, double) => {
  if (r === R) return double ? "Winners Final" : "Final";
  if (r === R - 1) return double ? "Winners Semi Final" : "Semi Final";
  if (r === R - 2 && !double) return "Quarter Final";
  return double ? `Winners Round ${r}` : `Round ${r}`;
};

export function generateBracket({ tournamentId, teams, format, seeding, manualOrder = [], seriesFormats = DEFAULT_SERIES_FORMATS }) {
  const seeded = orderTeams(teams, seeding, manualOrder);
  const n = seeded.length;
  const min = requiredTeams(format);
  if (n < min) throw new Error(`Minimal ${min} tim terverifikasi untuk format ini.`);

  const suffix = tournamentId.replace("tournament_", "");
  const bracketId = `bracket_${suffix}`;
  const size = nextPow2(n);
  const ordered = format === "single_elimination" ? separateRegistrationSlots(seeded, size) : seeded;
  const R = Math.log2(size);
  const double = format === "double_elimination";
  const configuredSeriesFormats = {
    regular: normalizeBestOf(seriesFormats.regular, DEFAULT_SERIES_FORMATS.regular),
    semifinal: normalizeBestOf(seriesFormats.semifinal, DEFAULT_SERIES_FORMATS.semifinal),
    final: normalizeBestOf(seriesFormats.final, DEFAULT_SERIES_FORMATS.final),
  };
  const slots = seedOrder(size).map((s) => (s <= n ? ordered[s - 1].id : BYE));

  let num = 0;
  const matches = [];
  const rounds = [];
  const make = (type, round, idx, sa, sb) => {
    num += 1;
    const bestOf = !double
      ? round === R
        ? configuredSeriesFormats.final
        : R > 1 && round === R - 1
          ? configuredSeriesFormats.semifinal
          : configuredSeriesFormats.regular
      : 1;
    const m = {
      id: `match_${suffix}_${pad(num)}`,
      tournament_id: tournamentId,
      bracket_id: bracketId,
      bracket_type: type,
      round,
      match_number: num,
      index: idx,
      team_a: null,
      team_b: null,
      score_a: 0,
      score_b: 0,
      best_of: bestOf,
      winner_id: null,
      status: "upcoming",
      schedule: null,
      is_bye: false,
      source_a: sa,
      source_b: sb,
    };
    matches.push(m);
    return m;
  };
  const addRound = (type, round, name, list) =>
    rounds.push({ id: `${type}-${round}`, type, round, name, match_ids: list.map((m) => m.id) });

  // Winners bracket
  const wb = [];
  for (let r = 1; r <= R; r++) {
    const count = size / 2 ** r;
    const list = [];
    for (let i = 0; i < count; i++) {
      if (r === 1) {
        list.push(make("winners", r, i, { type: "team", id: slots[2 * i] }, { type: "team", id: slots[2 * i + 1] }));
      } else {
        list.push(
          make(
            "winners",
            r,
            i,
            { type: "winner", match: wb[r - 2][2 * i].id },
            { type: "winner", match: wb[r - 2][2 * i + 1].id }
          )
        );
      }
    }
    wb.push(list);
    addRound("winners", r, wbName(r, R, double), list);
  }

  if (double) {
    const lb = [];
    const LR = 2 * (R - 1);
    for (let j = 1; j <= LR; j++) {
      const k = Math.ceil(j / 2);
      const count = size / 2 ** (k + 1);
      const list = [];
      for (let i = 0; i < count; i++) {
        let sa, sb;
        if (j === 1) {
          sa = { type: "loser", match: wb[0][2 * i].id };
          sb = { type: "loser", match: wb[0][2 * i + 1].id };
        } else if (j % 2 === 0) {
          sa = { type: "winner", match: lb[j - 2][i].id };
          sb = { type: "loser", match: wb[k][i].id };
        } else {
          sa = { type: "winner", match: lb[j - 2][2 * i].id };
          sb = { type: "winner", match: lb[j - 2][2 * i + 1].id };
        }
        list.push(make("losers", j, i, sa, sb));
      }
      lb.push(list);
      addRound("losers", j, j === LR ? "Losers Final" : `Losers Round ${j}`, list);
    }
    const gf = make(
      "grand",
      1,
      0,
      { type: "winner", match: wb[R - 1][0].id },
      { type: "winner", match: lb[LR - 1][0].id }
    );
    addRound("grand", 1, "Grand Final", [gf]);
  }

  const now = nowISO();
  const bracket = {
    id: bracketId,
    tournament_id: tournamentId,
    format,
    seeding,
    series_formats: double ? null : configuredSeriesFormats,
    status: "generated",
    published: false,
    size,
    team_count: n,
    bye_count: size - n,
    teams: ordered.map((t, i) => ({ id: t.id, name: t.name, seed: i + 1, registration_id: t.registration_id })),
    rounds,
    created_at: now,
    updated_at: now,
  };
  return { bracket, matches: recomputeMatches(matches) };
}

function resolveSource(src, byId) {
  if (!src) return null;
  if (src.type === "team") return src.id;
  const sm = byId.get(src.match);
  if (!sm || sm.status !== "completed") return null;
  if (src.type === "winner") return sm.winner_id;
  return sm.winner_id === sm.team_a ? sm.team_b : sm.team_a;
}

const resetMatch = (m) => ({ ...m, score_a: 0, score_b: 0, winner_id: null, status: "upcoming", completed_at: null });

/** Hitung ulang seluruh peserta & progres pertandingan dari hasil yang tersimpan. */
export function recomputeMatches(matches) {
  const byId = new Map();
  const out = [];
  for (const m of matches) {
    const a = resolveSource(m.source_a, byId);
    const b = resolveSource(m.source_b, byId);
    const changed = a !== m.team_a || b !== m.team_b;
    let next = { ...m, team_a: a, team_b: b };
    const bothKnown = a !== null && b !== null;
    if (bothKnown && (a === BYE || b === BYE)) {
      next = {
        ...next,
        is_bye: true,
        winner_id: a === BYE ? b : a,
        status: "completed",
        score_a: 0,
        score_b: 0,
      };
    } else {
      if (m.is_bye) next = { ...resetMatch(next), is_bye: false };
      else if (changed && m.status !== "upcoming") next = resetMatch(next);
      else if (next.winner_id && next.winner_id !== a && next.winner_id !== b) next = resetMatch(next);
    }
    byId.set(next.id, next);
    out.push(next);
  }
  return out;
}

export function applyMatchUpdate(matches, matchId, patch) {
  const normalized = recomputeMatches(matches);
  const updated = normalized.map((m) => (m.id === matchId ? { ...m, ...patch } : m));
  return recomputeMatches(updated);
}

/** Pertandingan lanjutan yang sudah dimainkan namun akan di-reset oleh perubahan ini. */
export function impactOfUpdate(matches, matchId, patch) {
  const next = applyMatchUpdate(matches, matchId, patch);
  const nextMap = new Map(next.map((m) => [m.id, m]));
  return matches.filter((m) => {
    if (m.id === matchId || m.is_bye || m.status === "upcoming") return false;
    return nextMap.get(m.id)?.status === "upcoming";
  });
}

export const isRealTeam = (id) => !!id && id !== BYE;
export const canStartMatch = (m) => isRealTeam(m.team_a) && isRealTeam(m.team_b) && !m.is_bye;

export function hasBracketStarted(matches) {
  return matches.some((m) => !m.is_bye && m.status !== "upcoming");
}

export function getFinalMatch(matches) {
  const grand = matches.find((m) => m.bracket_type === "grand");
  if (grand) return grand;
  const winners = matches.filter((m) => m.bracket_type === "winners");
  if (!winners.length) return null;
  return winners.reduce((a, b) => (b.round > a.round ? b : a));
}

export function getProgress(matches) {
  const playable = matches.filter((m) => !m.is_bye);
  const done = playable.filter((m) => m.status === "completed").length;
  const final = getFinalMatch(matches);
  const champion = final && final.status === "completed" && isRealTeam(final.winner_id) ? final.winner_id : null;
  return {
    total: playable.length,
    done,
    ongoing: playable.filter((m) => m.status === "ongoing").length,
    percent: playable.length ? Math.round((done / playable.length) * 100) : 0,
    started: hasBracketStarted(matches),
    champion,
  };
}

export const teamName = (bracket, id) => {
  if (!id) return null;
  if (id === BYE) return "BYE";
  return bracket?.teams?.find((t) => t.id === id)?.name || id;
};

/** Teks placeholder untuk slot yang belum terisi. */
export function placeholderFor(src, matches) {
  if (!src || src.type === "team") return "TBD";
  const sm = matches.find((m) => m.id === src.match);
  if (!sm) return "TBD";
  return `${src.type === "winner" ? "Pemenang" : "Kalah"} M${sm.match_number}`;
}

/* ---------- Layout untuk visualisasi ---------- */
export const LAYOUT = { CARD_W: 236, CARD_H: 70, GAP_X: 64, UNIT: 100, PAD: 40 };

export function computeLayout(bracket, matches) {
  const { CARD_W, CARD_H, GAP_X, UNIT, PAD } = LAYOUT;
  const byId = new Map(matches.map((m) => [m.id, m]));
  const double = bracket.format === "double_elimination";
  const size = bracket.size;
  const wbRounds = Math.log2(size);
  const lbRounds = double ? 2 * (wbRounds - 1) : 0;
  const wbHeight = (size / 2) * UNIT;
  const winnersOrigin = PAD + 56;
  const losersOrigin = winnersOrigin + wbHeight + 110;
  const col = (m) => {
    if (m.bracket_type === "grand") return lbRounds;
    return m.round - 1;
  };
  const section = (m) => (m.bracket_type === "losers" ? "losers" : "winners");

  const pos = new Map();
  matches.forEach((m) => {
    const sec = section(m);
    const sameSrc = [m.source_a, m.source_b]
      .filter((s) => s && s.type === "winner")
      .map((s) => byId.get(s.match))
      .filter((sm) => sm && section(sm) === sec && m.bracket_type !== "grand")
      .map((sm) => pos.get(sm.id).yRel);
    let yRel;
    if (m.bracket_type === "grand") {
      const wf = byId.get(m.source_a.match);
      yRel = pos.get(wf.id).yRel;
    } else if (sameSrc.length === 2) yRel = (sameSrc[0] + sameSrc[1]) / 2;
    else if (sameSrc.length === 1) yRel = sameSrc[0];
    else yRel = m.bracket_type === "losers" ? (m.index + 0.5) * 2 * UNIT : (m.index + 0.5) * UNIT;
    const origin = sec === "losers" ? losersOrigin : winnersOrigin;
    pos.set(m.id, {
      yRel,
      x: PAD + col(m) * (CARD_W + GAP_X),
      y: origin + yRel,
    });
  });

  const nodes = matches.map((m) => ({ match: m, ...pos.get(m.id) }));
  const links = [];
  matches.forEach((m) => {
    [m.source_a, m.source_b].forEach((s) => {
      if (!s || s.type !== "winner") return;
      const from = pos.get(s.match);
      const to = pos.get(m.id);
      const sm = byId.get(s.match);
      links.push({
        id: `${s.match}->${m.id}`,
        from: m.id,
        source: s.match,
        d: `M ${from.x + CARD_W} ${from.y} H ${to.x - GAP_X / 2} V ${to.y} H ${to.x}`,
        done: sm.status === "completed" && !sm.is_bye,
      });
    });
  });

  const headers = [];
  (bracket.rounds || []).forEach((r) => {
    const first = byId.get(r.match_ids[0]);
    if (!first) return;
    const sec = section(first);
    const origin = sec === "losers" ? losersOrigin : winnersOrigin;
    headers.push({
      id: r.id,
      label: r.name,
      x: PAD + col(first) * (CARD_W + GAP_X),
      y: origin - 44,
      type: r.type,
    });
  });
  const sections = [{ id: "winners", label: double ? "WINNERS BRACKET" : "BRACKET", y: winnersOrigin - 78 }];
  if (double) sections.push({ id: "losers", label: "LOSERS BRACKET", y: losersOrigin - 78 });

  const totalCols = double ? lbRounds + 1 : wbRounds;
  const width = PAD * 2 + totalCols * CARD_W + (totalCols - 1) * GAP_X;
  const height = (double ? losersOrigin + wbHeight : winnersOrigin + wbHeight) + PAD - 30;
  return { nodes, links, headers, sections, width, height, CARD_W, CARD_H };
}
