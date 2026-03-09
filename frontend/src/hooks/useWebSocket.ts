import { useEffect, useRef } from "react";
import { WS_URL } from "../api/client";
import { ConflictEvent, WsMessage, TrendingSpike, BreakingAlert, ConvergenceAlert, HotspotEscalation, FocalPointSummary } from "../types";
import { useAppStore } from "../stores/useAppStore";

export function useWebSocket() {
  const addLiveEvent = useAppStore((s) => s.addLiveEvent);
  const addTrendingSpikes = useAppStore((s) => s.addTrendingSpikes);
  const addBreakingAlerts = useAppStore((s) => s.addBreakingAlerts);
  const setConvergenceAlerts = useAppStore((s) => s.setConvergenceAlerts);
  const setEscalationScores = useAppStore((s) => s.setEscalationScores);
  const setFocalSummary = useAppStore((s) => s.setFocalSummary);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function connect() {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as WsMessage;
          if (msg.type === "new_event" || msg.type === "update_event") {
            addLiveEvent(msg.payload as ConflictEvent);
          } else if (msg.type === "trending_spikes") {
            addTrendingSpikes(msg.payload as TrendingSpike[]);
          } else if (msg.type === "breaking_alerts") {
            addBreakingAlerts(msg.payload as BreakingAlert[]);
          } else if (msg.type === "convergence_alerts") {
            setConvergenceAlerts(msg.payload as ConvergenceAlert[]);
          } else if (msg.type === "hotspot_escalation") {
            setEscalationScores(msg.payload as HotspotEscalation[]);
          } else if (msg.type === "focal_points") {
            setFocalSummary(msg.payload as FocalPointSummary);
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        // Reconnect after 5 seconds
        reconnectTimerRef.current = setTimeout(connect, 5000);
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [addLiveEvent, addTrendingSpikes, addBreakingAlerts, setConvergenceAlerts, setEscalationScores, setFocalSummary]);
}
