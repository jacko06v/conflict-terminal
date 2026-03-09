import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { useTimeline } from "../../hooks/useEvents";
import { useAppStore } from "../../stores/useAppStore";
import { EVENT_COLORS, EventType } from "../../types";

const TIME_RANGES = ["24h", "7d", "30d"] as const;

interface ChartDatum {
  label: string;
  [eventType: string]: number | string;
}

function buildChartData(
  buckets: { bucket: string; count: number; event_type: EventType }[]
): ChartDatum[] {
  const byBucket: Record<string, ChartDatum> = {};

  for (const b of buckets) {
    const label = new Date(b.bucket).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
    });
    if (!byBucket[b.bucket]) byBucket[b.bucket] = { label };
    const existing = byBucket[b.bucket][b.event_type];
    byBucket[b.bucket][b.event_type] = (typeof existing === "number" ? existing : 0) + b.count;
  }

  return Object.values(byBucket).slice(-24);
}

const EVENT_TYPES: EventType[] = [
  "airstrike", "explosion", "missile", "drone", "infrastructure", "troop_movement", "alert"
];

export default function TimelineChart() {
  const filters = useAppStore((s) => s.filters);
  const setFilters = useAppStore((s) => s.setFilters);
  const { data: timeline, isLoading } = useTimeline();

  const chartData = timeline ? buildChartData(timeline) : [];

  return (
    <div className="bg-terminal-surface border-t border-terminal h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-terminal">
        <span className="text-[10px] font-mono text-terminal-dim uppercase tracking-wider">
          Event Timeline
        </span>
        <div className="flex items-center gap-3">
          {/* Time range selector */}
          <div className="flex items-center gap-1">
            {TIME_RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setFilters({ timeRange: r })}
                className={`text-[10px] font-mono px-2 py-0.5 rounded transition-colors ${
                  filters.timeRange === r
                    ? "bg-terminal-cyan/10 text-terminal-cyan border border-terminal-cyan/30"
                    : "text-terminal-dim hover:text-gray-300"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <span className="text-[10px] font-mono text-terminal-dim/40 select-none" title="Drag the divider above to resize">
            ↕
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="px-1 pt-1 flex-1 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-terminal-dim text-xs font-mono">
            Loading...
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-terminal-dim text-xs font-mono">
            No data for selected range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 2, right: 8, bottom: 0, left: -20 }}>
              <XAxis
                dataKey="label"
                tick={{ fill: "#4a5568", fontSize: 9, fontFamily: "monospace" }}
                axisLine={{ stroke: "#1c2733" }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "#4a5568", fontSize: 9, fontFamily: "monospace" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#0d1117",
                  border: "1px solid #1c2733",
                  borderRadius: 4,
                  fontFamily: "monospace",
                  fontSize: 10,
                  color: "#e2e8f0",
                }}
                cursor={{ fill: "#1c2733" }}
              />
              <Legend
                wrapperStyle={{ fontSize: 9, fontFamily: "monospace", color: "#4a5568" }}
              />
              {EVENT_TYPES.map((type) => (
                <Bar
                  key={type}
                  dataKey={type}
                  stackId="events"
                  fill={EVENT_COLORS[type]}
                  maxBarSize={20}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
