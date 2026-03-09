import { useAppStore } from "../../stores/useAppStore";
import { useConvergenceAlerts } from "../../hooks/useAnalytics";

export default function ConvergencePanel() {
  const wsAlerts = useAppStore((s) => s.convergenceAlerts);
  const { data } = useConvergenceAlerts();
  const alerts = wsAlerts.length > 0 ? wsAlerts : data?.data ?? [];

  if (alerts.length === 0) return null;

  return (
    <div className="px-3 py-2 border-b border-terminal">
      <h3 className="text-[10px] font-mono text-terminal-dim uppercase tracking-wider mb-1.5">
        🎯 Convergence Zones ({alerts.length})
      </h3>
      <div className="space-y-1">
        {alerts.slice(0, 5).map((alert) => (
          <div
            key={alert.cellKey}
            className="flex items-center gap-2 text-[11px] font-mono bg-red-500/10 border border-red-500/20 rounded px-2 py-1"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-red-400 truncate">
                {alert.locationName || `${alert.lat.toFixed(1)}°, ${alert.lon.toFixed(1)}°`}
              </div>
              <div className="text-[9px] text-terminal-dim">
                {alert.types.join(" + ")} · {alert.eventCount} events · score {alert.score.toFixed(0)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
