import { FastifyInstance } from "fastify";
import { MapLayer } from "../types";

const MAP_LAYERS: MapLayer[] = [
  { id: "explosion",      name: "Explosions",         event_type: "explosion",      color: "#ef4444", icon: "explosion",   visible: true },
  { id: "airstrike",      name: "Airstrikes",         event_type: "airstrike",      color: "#f97316", icon: "airstrike",   visible: true },
  { id: "missile",        name: "Missiles",           event_type: "missile",        color: "#f59e0b", icon: "missile",     visible: true },
  { id: "drone",          name: "Drones",             event_type: "drone",          color: "#eab308", icon: "drone",       visible: true },
  { id: "fire",           name: "Fire / Thermal",     event_type: "fire",           color: "#dc2626", icon: "fire",        visible: true },
  { id: "infrastructure", name: "Infrastructure Hit", event_type: "infrastructure", color: "#a855f7", icon: "infra",       visible: true },
  { id: "troop_movement", name: "Troop Movement",     event_type: "troop_movement", color: "#3b82f6", icon: "troops",      visible: true },
  { id: "alert",          name: "Alerts",             event_type: "alert",          color: "#06b6d4", icon: "alert",       visible: true },
];

export async function mapRoutes(app: FastifyInstance): Promise<void> {
  app.get("/map/layers", async () => {
    return { data: MAP_LAYERS };
  });
}
