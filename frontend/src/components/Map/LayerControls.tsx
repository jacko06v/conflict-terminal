import { useAppStore } from "../../stores/useAppStore";
import { EventType, EVENT_COLORS, EVENT_LABELS } from "../../types";

export default function LayerControls() {
  const layers = useAppStore((s) => s.layers);
  const setLayerVisibility = useAppStore((s) => s.setLayerVisibility);

  if (layers.length === 0) return null;

  return (
    <div className="hidden md:block absolute top-3 left-3 glass border border-terminal rounded p-3 z-10 text-xs font-mono">
      <div className="text-terminal-dim text-[10px] tracking-wider mb-2 uppercase">
        Layers
      </div>
      <div className="space-y-1.5">
        {layers.map((layer) => (
          <label
            key={layer.id}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <input
              type="checkbox"
              checked={layer.visible}
              onChange={(e) =>
                setLayerVisibility(layer.event_type as EventType, e.target.checked)
              }
              className="sr-only"
            />
            <div
              className={`w-3 h-3 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                layer.visible
                  ? "border-transparent"
                  : "border-terminal-dim bg-transparent"
              }`}
              style={
                layer.visible
                  ? { backgroundColor: EVENT_COLORS[layer.event_type as EventType] }
                  : {}
              }
            >
              {layer.visible && (
                <span className="text-[8px] text-black font-bold">✓</span>
              )}
            </div>
            <span
              className={`transition-colors ${
                layer.visible ? "text-gray-300" : "text-terminal-dim"
              } group-hover:text-gray-100`}
            >
              {EVENT_LABELS[layer.event_type as EventType]}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
