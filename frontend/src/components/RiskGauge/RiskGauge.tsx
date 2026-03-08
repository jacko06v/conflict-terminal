import { useRiskScore } from "../../hooks/useRiskScore";

// ── SVG geometry ─────────────────────────────────────────────────────────────
const CX = 100, CY = 108, R = 82;

const ZONES = [
  { color: "#22c55e", from: 0, to: 1 }, // MINIMAL
  { color: "#84cc16", from: 1, to: 2 }, // GUARDED
  { color: "#eab308", from: 2, to: 3 }, // ELEVATED
  { color: "#f97316", from: 3, to: 4 }, // HIGH
  { color: "#ef4444", from: 4, to: 5 }, // CRITICAL
];

// Score → angle in radians (π = left/0, 0 = right/5)
function scoreToRad(s: number) {
  return (1 - s / 5) * Math.PI;
}

// Point on arc
function pt(rad: number, r: number): [number, number] {
  return [CX + r * Math.cos(rad), CY - r * Math.sin(rad)];
}

// SVG arc path for a zone (counterclockwise sweep → top of gauge)
function zonePath(from: number, to: number): string {
  const a1 = scoreToRad(from);
  const a2 = scoreToRad(to);
  const [x1, y1] = pt(a1, R);
  const [x2, y2] = pt(a2, R);
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 0 0 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

// Needle triangle
function needlePath(score: number): string {
  const clamped = Math.max(0, Math.min(5, score));
  const angle   = scoreToRad(clamped);
  const [tx, ty] = pt(angle, R - 10);
  const perp = angle + Math.PI / 2;
  const bx1 = CX + 5 * Math.cos(perp);
  const by1 = CY - 5 * Math.sin(perp);
  const bx2 = CX - 5 * Math.cos(perp);
  const by2 = CY + 5 * Math.sin(perp);
  return `M ${tx.toFixed(2)} ${ty.toFixed(2)} L ${bx1.toFixed(2)} ${by1.toFixed(2)} L ${bx2.toFixed(2)} ${by2.toFixed(2)} Z`;
}

// Tick mark coords
function tickCoords(score: number) {
  const a  = scoreToRad(score);
  const [ox, oy] = pt(a, R + 6);
  const [ix, iy] = pt(a, R - 16);
  return { ox, oy, ix, iy };
}

function labelCoords(score: number) {
  const [x, y] = pt(scoreToRad(score), R + 16);
  return { x, y };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RiskGauge() {
  const risk = useRiskScore();
  const isCritical = risk.level === 4;

  return (
    <div className="border-b border-green-900 px-3 py-3 select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] font-mono text-green-700 uppercase tracking-widest">
          Threat Assessment
        </span>
        <span className="text-[9px] font-mono text-green-800">24h window</span>
      </div>

      {/* Gauge SVG */}
      <svg
        viewBox="0 0 200 118"
        className="w-full"
        style={{ maxHeight: 118 }}
      >
        {/* Background arc */}
        <path
          d={zonePath(0, 5)}
          fill="none"
          stroke="#1a2e1a"
          strokeWidth={14}
          strokeLinecap="butt"
        />

        {/* Colored zone arcs */}
        {ZONES.map((z) => (
          <path
            key={z.from}
            d={zonePath(z.from, z.to)}
            fill="none"
            stroke={z.color}
            strokeWidth={14}
            strokeLinecap="butt"
            opacity={0.85}
          />
        ))}

        {/* Zone separator ticks */}
        {[1, 2, 3, 4].map((s) => {
          const { ox, oy, ix, iy } = tickCoords(s);
          return (
            <line
              key={s}
              x1={ox} y1={oy} x2={ix} y2={iy}
              stroke="#0a1a0a"
              strokeWidth={2}
            />
          );
        })}

        {/* Level number labels */}
        {[0, 1, 2, 3, 4, 5].map((s) => {
          const { x, y } = labelCoords(s);
          return (
            <text
              key={s}
              x={x} y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={7}
              fill="#4a6a4a"
              fontFamily="monospace"
            >
              {s}
            </text>
          );
        })}

        {/* Needle */}
        <path
          d={needlePath(risk.score)}
          fill={risk.color}
          opacity={0.95}
          style={{
            filter: `drop-shadow(0 0 4px ${risk.color}80)`,
            transition: "d 1s ease-in-out",
          }}
        />

        {/* Center pivot */}
        <circle cx={CX} cy={CY} r={4} fill={risk.color} opacity={0.9} />
        <circle cx={CX} cy={CY} r={2} fill="#0a1a0a" />

        {/* Score number */}
        <text
          x={CX} y={CY - 28}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={22}
          fontWeight="bold"
          fill={risk.color}
          fontFamily="monospace"
          style={{ filter: `drop-shadow(0 0 6px ${risk.color}60)` }}
        >
          {risk.score.toFixed(1)}
        </text>

        {/* Level label */}
        <text
          x={CX} y={CY - 14}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={8}
          fill={risk.color}
          fontFamily="monospace"
          letterSpacing={2}
        >
          {risk.label}
        </text>
      </svg>

      {/* Footer stats */}
      <div className="flex justify-between items-center mt-1">
        <span className="text-[9px] font-mono text-green-800">
          {risk.eventCount} events
        </span>
        <span
          className={`text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded ${
            isCritical
              ? "bg-red-900/40 text-red-400 animate-pulse"
              : "text-green-700"
          }`}
          style={{ color: risk.color }}
        >
          ● LVL {risk.level + 1}
        </span>
      </div>
    </div>
  );
}
