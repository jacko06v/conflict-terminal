import { useAppStore } from "../../stores/useAppStore";
import { EventType, VerificationStatus } from "../../types";

const EVENT_TYPES: { value: EventType | ""; label: string }[] = [
  { value: "", label: "All Types" },
  { value: "explosion", label: "Explosion" },
  { value: "airstrike", label: "Airstrike" },
  { value: "missile", label: "Missile" },
  { value: "drone", label: "Drone" },
  { value: "fire", label: "Fire / Thermal" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "troop_movement", label: "Troop Movement" },
  { value: "alert", label: "Alert" },
];

const VERIFICATION_OPTIONS: { value: VerificationStatus | ""; label: string }[] = [
  { value: "", label: "All Statuses" },
  { value: "verified", label: "Verified" },
  { value: "partial", label: "Partial" },
  { value: "unverified", label: "Unverified" },
];

export default function FiltersPanel() {
  const filters = useAppStore((s) => s.filters);
  const setFilters = useAppStore((s) => s.setFilters);
  const resetFilters = useAppStore((s) => s.resetFilters);

  return (
    <div className="p-3 space-y-4 text-xs font-mono">
      <div className="flex items-center justify-between">
        <span className="text-terminal-dim text-[10px] uppercase tracking-wider">
          Filters
        </span>
        <button
          onClick={resetFilters}
          className="text-[10px] text-terminal-red/70 hover:text-terminal-red transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Country */}
      <div>
        <label className="block text-terminal-dim text-[10px] uppercase tracking-wider mb-1">
          Country
        </label>
        <input
          type="text"
          value={filters.country}
          onChange={(e) => setFilters({ country: e.target.value })}
          placeholder="Iran, Syria, Iraq..."
          className="w-full bg-terminal-muted border border-terminal rounded px-2 py-1.5 text-xs font-mono text-gray-200 placeholder-terminal-dim focus:outline-none focus:border-terminal-cyan/50"
        />
      </div>

      {/* Event Type */}
      <div>
        <label className="block text-terminal-dim text-[10px] uppercase tracking-wider mb-1">
          Event Type
        </label>
        <select
          value={filters.eventType}
          onChange={(e) => setFilters({ eventType: e.target.value as EventType | "" })}
          className="w-full bg-terminal-muted border border-terminal rounded px-2 py-1.5 text-xs font-mono text-gray-200 focus:outline-none focus:border-terminal-cyan/50"
        >
          {EVENT_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Verification Status */}
      <div>
        <label className="block text-terminal-dim text-[10px] uppercase tracking-wider mb-1">
          Verification
        </label>
        <select
          value={filters.verificationStatus}
          onChange={(e) =>
            setFilters({ verificationStatus: e.target.value as VerificationStatus | "" })
          }
          className="w-full bg-terminal-muted border border-terminal rounded px-2 py-1.5 text-xs font-mono text-gray-200 focus:outline-none focus:border-terminal-cyan/50"
        >
          {VERIFICATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Min Confidence */}
      <div>
        <label className="block text-terminal-dim text-[10px] uppercase tracking-wider mb-1">
          Min Confidence:{" "}
          <span className="text-terminal-amber">{filters.minConfidence}%</span>
        </label>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={filters.minConfidence}
          onChange={(e) => setFilters({ minConfidence: parseInt(e.target.value) })}
          className="w-full accent-terminal-amber h-1"
        />
        <div className="flex justify-between text-[9px] text-terminal-dim mt-0.5">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Time range */}
      <div>
        <label className="block text-terminal-dim text-[10px] uppercase tracking-wider mb-1">
          Time Range
        </label>
        <div className="flex gap-1">
          {(["24h", "7d", "30d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setFilters({ timeRange: r })}
              className={`flex-1 py-1 text-[10px] font-mono rounded border transition-colors ${
                filters.timeRange === r
                  ? "bg-terminal-cyan/10 text-terminal-cyan border-terminal-cyan/30"
                  : "border-terminal text-terminal-dim hover:text-gray-300"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="pt-2 border-t border-terminal text-[9px] text-terminal-dim/50 leading-relaxed">
        ⚠ All displayed data is synthetic demo data. Not verified real-world information.
      </div>
    </div>
  );
}
