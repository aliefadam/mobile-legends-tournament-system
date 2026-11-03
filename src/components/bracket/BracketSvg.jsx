import { BYE, LAYOUT, placeholderFor, teamName } from "../../services/bracket";
import { formatDateTime } from "../../utils/format";

const trunc = (s, n = 22) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s);
const FONT = "'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif";

function MatchNode({ node, bracket, matches, onClick }) {
  const { CARD_W, CARD_H } = LAYOUT;
  const m = node.match;
  const top = node.y - CARD_H / 2;
  const rowH = CARD_H / 2;
  const STRIP = 32;
  const completed = m.status === "completed";
  const stripFill = m.is_bye ? "#94a3b8" : m.status === "ongoing" ? "#7c3aed" : completed ? "#0a1128" : "#1b2a5c";

  const rows = ["a", "b"].map((side, i) => {
    const id = side === "a" ? m.team_a : m.team_b;
    const src = side === "a" ? m.source_a : m.source_b;
    const isWinner = completed && id && m.winner_id === id && !(m.is_bye && id === BYE);
    const isLoser = completed && id && m.winner_id !== id;
    let label = id ? teamName(bracket, id) : placeholderFor(src, matches);
    const muted = !id || id === BYE;
    const score = side === "a" ? m.score_a : m.score_b;
    return { i, id, label, muted, isWinner, isLoser, score };
  });

  return (
    <g
      className="match-node"
      transform={`translate(${node.x},${top})`}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(m);
      }}
      opacity={m.is_bye ? 0.6 : 1}
    >
      <clipPath id={`clip-${m.id}`}>
        <rect x="0" y="0" width={CARD_W} height={CARD_H} rx="9" />
      </clipPath>
      <rect x="0" y="0" width={CARD_W} height={CARD_H} rx="9" fill="#ffffff" />
      <g clipPath={`url(#clip-${m.id})`}>
        {rows.map((r) => (
          <g key={r.i} transform={`translate(0,${r.i * rowH})`}>
            <rect x={STRIP} y="0" width={CARD_W - STRIP} height={rowH} fill={r.isWinner ? "#eaf1ff" : "#ffffff"} />
            {r.isWinner && <rect x={STRIP} y="0" width="3.5" height={rowH} fill="#2f6bff" />}
            <text
              x={STRIP + 12}
              y={rowH / 2 + 4.5}
              fontFamily={FONT}
              fontSize="13"
              fontWeight={r.isWinner ? 800 : 600}
              fontStyle={r.muted ? "italic" : "normal"}
              fill={r.muted ? "#94a3b8" : r.isLoser ? "#94a3b8" : "#0f172a"}
            >
              {trunc(r.label)}
            </text>
            {!m.is_bye && (completed || m.status === "ongoing") && r.id && (
              <text x={CARD_W - 12} y={rowH / 2 + 5} textAnchor="end" fontFamily={FONT} fontSize="14" fontWeight="800" fill={r.isWinner ? "#1d52e8" : r.isLoser ? "#94a3b8" : "#334155"}>
                {r.score}
              </text>
            )}
          </g>
        ))}
        <line x1={STRIP} x2={CARD_W} y1={rowH} y2={rowH} stroke="#e2e8f0" />
        <rect x="0" y="0" width={STRIP} height={CARD_H} fill={stripFill} />
        <text x={STRIP / 2} y={CARD_H / 2 + 4} textAnchor="middle" fontFamily={FONT} fontSize="11" fontWeight="800" fill="#ffffff">
          {m.match_number}
        </text>
        {m.best_of > 1 && (
          <text x={STRIP / 2} y={CARD_H - 6} textAnchor="middle" fontFamily={FONT} fontSize="8" fontWeight="800" fill="#dbeafe">
            BO{m.best_of}
          </text>
        )}
      </g>
      <rect className="match-bg" x="0" y="0" width={CARD_W} height={CARD_H} rx="9" fill="none" stroke={m.status === "ongoing" ? "#7c3aed" : "#cbd5e1"} strokeWidth={m.status === "ongoing" ? 2 : 1.5} />
      {m.schedule && !m.is_bye && (
        <text x={STRIP} y="-7" fontFamily={FONT} fontSize="10.5" fontWeight="600" fill="#64748b">
          {formatDateTime(m.schedule)}
        </text>
      )}
      {m.status === "ongoing" && (
        <g>
          <circle className="live-dot" cx={CARD_W - 38} cy="-10" r="3.5" fill="#ef4444" />
          <text x={CARD_W} y="-6" textAnchor="end" fontFamily={FONT} fontSize="10.5" fontWeight="800" fill="#7c3aed">
            LIVE
          </text>
        </g>
      )}
    </g>
  );
}

const HEADER_FILL = { winners: "#0e1736", losers: "#6a28d4", grand: "#d97706" };

export function BracketSvg({ layout, bracket, matches, onMatchClick, svgRef }) {
  const { CARD_W } = LAYOUT;
  return (
    <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" width={layout.width} height={layout.height} viewBox={`0 0 ${layout.width} ${layout.height}`} style={{ display: "block" }}>
      {layout.sections.map((s) => (
        <text key={s.id} x={LAYOUT.PAD} y={s.y + 14} fontFamily={FONT} fontSize="12" fontWeight="800" letterSpacing="1.5" fill="#94a3b8">
          {s.label}
        </text>
      ))}
      {layout.headers.map((h) => (
        <g key={h.id}>
          <rect x={h.x} y={h.y} width={CARD_W} height="28" rx="14" fill={HEADER_FILL[h.type] || "#0e1736"} />
          <text x={h.x + CARD_W / 2} y={h.y + 18} textAnchor="middle" fontFamily={FONT} fontSize="12" fontWeight="700" fill="#ffffff">
            {h.label}
          </text>
        </g>
      ))}
      {layout.links.map((l) => (
        <path key={l.id} d={l.d} fill="none" stroke={l.done ? "#2f6bff" : "#cbd5e1"} strokeWidth="2" strokeLinejoin="round" />
      ))}
      {layout.nodes.map((n) => (
        <MatchNode key={n.match.id} node={n} bracket={bracket} matches={matches} onClick={onMatchClick} />
      ))}
    </svg>
  );
}
