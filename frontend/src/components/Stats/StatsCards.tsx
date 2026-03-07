import { useStats } from "../../hooks/useEvents";

interface StatCardProps {
  label: string;
  value: string | number;
  accent?: "green" | "amber" | "red" | "cyan";
  loading?: boolean;
}

function StatCard({ label, value, accent = "green", loading }: StatCardProps) {
  const accentClass = {
    green: "text-terminal-green border-terminal-green/20",
    amber: "text-terminal-amber border-terminal-amber/20",
    red: "text-terminal-red border-terminal-red/20",
    cyan: "text-terminal-cyan border-terminal-cyan/20",
  }[accent];

  return (
    <div className={`bg-terminal-muted border ${accentClass} rounded px-3 py-2 min-w-[120px]`}>
      <div className="text-terminal-dim text-[10px] font-mono uppercase tracking-wider mb-1">
        {label}
      </div>
      {loading ? (
        <div className="h-5 w-12 bg-terminal-border rounded animate-pulse" />
      ) : (
        <div className={`text-lg font-bold font-mono ${accentClass.split(" ")[0]}`}>
          {value}
        </div>
      )}
    </div>
  );
}

export default function StatsCards() {
  const { data: stats, isLoading } = useStats();

  const lastUpdate = stats?.last_event_at
    ? new Date(stats.last_event_at).toISOString().slice(11, 19) + " UTC"
    : "—";

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-terminal border-b border-terminal overflow-x-auto flex-shrink-0">
      <StatCard
        label="Total Events"
        value={stats?.total_events ?? 0}
        accent="cyan"
        loading={isLoading}
      />
      <StatCard
        label="High Confidence"
        value={stats?.high_confidence_events ?? 0}
        accent="green"
        loading={isLoading}
      />
      <StatCard
        label="Missile / Drone"
        value={stats?.missile_drone_events ?? 0}
        accent="red"
        loading={isLoading}
      />
      <StatCard
        label="Hotspots"
        value={stats?.hotspots_count ?? 0}
        accent="amber"
        loading={isLoading}
      />
      <StatCard
        label="Countries"
        value={stats?.countries_affected ?? 0}
        accent="cyan"
        loading={isLoading}
      />
      <div className="ml-auto text-terminal-dim text-[10px] font-mono whitespace-nowrap">
        LAST UPDATE: <span className="text-terminal-amber">{lastUpdate}</span>
      </div>
    </div>
  );
}
