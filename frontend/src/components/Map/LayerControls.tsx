import { useAppStore } from "../../stores/useAppStore";
import { EventType, EVENT_COLORS, EVENT_LABELS } from "../../types";

const INFRA_ITEMS = [
  { key: "riskZones"  as const, label: "Risk Zones",        color: "#ef4444" },
  { key: "military"   as const, label: "Military Bases",    color: "#4a9eff" },
  { key: "nuclear"    as const, label: "Nuclear Sites",     color: "#f97316" },
  { key: "pipelines"  as const, label: "Pipelines",         color: "#f59e0b" },
  { key: "waterways"  as const, label: "Waterways",         color: "#0ea5e9" },
  { key: "hotspots"   as const, label: "Intel Hotspots",    color: "#ef4444" },
  { key: "spaceports" as const, label: "Spaceports",        color: "#8b5cf6" },
];

export default function LayerControls() {
  const layers          = useAppStore((s) => s.layers);
  const setLayerVis     = useAppStore((s) => s.setLayerVisibility);
  const infraLayers     = useAppStore((s) => s.infraLayers);
  const setInfraLayer   = useAppStore((s) => s.setInfraLayer);

  if (layers.length === 0) return null;

  return (
    <div className="hidden md:block absolute top-3 left-3 glass border border-terminal rounded p-3 z-10 text-xs font-mono">
      <div className="text-terminal-dim text-[10px] tracking-wider mb-2 uppercase">Layers</div>
      <div className="space-y-1.5">
        {layers.map((layer) => (
          <CheckRow
            key={layer.id}
            label={EVENT_LABELS[layer.event_type as EventType]}
            color={EVENT_COLORS[layer.event_type as EventType]}
            checked={layer.visible}
            onChange={(v) => setLayerVis(layer.event_type as EventType, v)}
          />
        ))}
      </div>

      <div className="text-terminal-dim text-[10px] tracking-wider mt-3 mb-2 uppercase border-t border-terminal pt-2">
        Overlays
      </div>
      <div className="space-y-1.5">
        {INFRA_ITEMS.map(({ key, label, color }) => (
          <CheckRow
            key={key}
            label={label}
            color={color}
            checked={infraLayers[key]}
            onChange={(v) => setInfraLayer(key, v)}
          />
        ))}
      </div>
    </div>
  );
}

function CheckRow({
  label,
  color,
  checked,
  onChange,
}: {
  label: string;
  color: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <div
        className={`w-3 h-3 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
          checked ? "border-transparent" : "border-terminal-dim bg-transparent"
        }`}
        style={checked ? { backgroundColor: color } : {}}
      >
        {checked && <span className="text-[8px] text-black font-bold">✓</span>}
      </div>
      <span
        className={`transition-colors ${
          checked ? "text-gray-300" : "text-terminal-dim"
        } group-hover:text-gray-100`}
      >
        {label}
      </span>
    </label>
  );
}
