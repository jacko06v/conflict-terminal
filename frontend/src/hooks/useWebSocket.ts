import { useEffect, useRef } from "react";
import { WS_URL } from "../api/client";
import { ConflictEvent, WsMessage } from "../types";
import { useAppStore } from "../stores/useAppStore";

export function useWebSocket() {
  const addLiveEvent = useAppStore((s) => s.addLiveEvent);
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
  }, [addLiveEvent]);
}
