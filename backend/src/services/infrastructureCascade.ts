/**
 * Infrastructure Cascade Service — ported from worldmonitor infrastructure-cascade.ts
 *
 * Builds a dependency graph of infrastructure nodes (cables, pipelines, ports,
 * chokepoints, countries) and computes cascade impact via BFS when a node is
 * disrupted.
 *
 * "If Hormuz closes, who goes into crisis?"
 */

import { STRATEGIC_WATERWAYS } from "../data/geoStrategic";
import { PIPELINES, type Pipeline } from "../data/pipelines";
import { UNDERSEA_CABLES, type UnderseaCable } from "../data/underseaCables";
import { PORTS, type Port } from "../data/ports";

/* ── Types ─────────────────────────────────────────── */

export type InfrastructureNodeType = "cable" | "pipeline" | "port" | "chokepoint" | "country";

export interface InfrastructureNode {
  id: string;
  type: InfrastructureNodeType;
  name: string;
  coordinates?: [number, number];
  metadata?: Record<string, unknown>;
}

export type DependencyType =
  | "serves"
  | "lands_at"
  | "trade_route"
  | "controls_access"
  | "trade_dependency";

export interface DependencyEdge {
  from: string;
  to: string;
  type: DependencyType;
  strength: number;
  redundancy?: number;
  metadata?: Record<string, unknown>;
}

export type CascadeImpactLevel = "critical" | "high" | "medium" | "low";

export interface CascadeAffectedNode {
  node: InfrastructureNode;
  impactLevel: CascadeImpactLevel;
  pathLength: number;
  dependencyChain: string[];
  redundancyAvailable: boolean;
  estimatedRecovery?: string;
}

export interface CascadeCountryImpact {
  country: string;
  countryName: string;
  impactLevel: CascadeImpactLevel;
  affectedCapacity: number;
}

export interface CascadeResult {
  source: InfrastructureNode;
  affectedNodes: CascadeAffectedNode[];
  countriesAffected: CascadeCountryImpact[];
  redundancies: { id: string; name: string; capacityShare: number }[];
}

export interface DependencyGraph {
  nodes: Map<string, InfrastructureNode>;
  edges: DependencyEdge[];
  outgoing: Map<string, DependencyEdge[]>;
  incoming: Map<string, DependencyEdge[]>;
}

/* ── Country names ─────────────────────────────────── */

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States", GB: "United Kingdom", ES: "Spain", FR: "France",
  DE: "Germany", IT: "Italy", PT: "Portugal", NO: "Norway", DK: "Denmark",
  NL: "Netherlands", BE: "Belgium", SE: "Sweden", FI: "Finland", IE: "Ireland",
  AT: "Austria", CH: "Switzerland", GR: "Greece", CZ: "Czech Republic",
  JP: "Japan", CN: "China", TW: "Taiwan", HK: "Hong Kong", SG: "Singapore",
  KR: "South Korea", AU: "Australia", NZ: "New Zealand", IN: "India", PK: "Pakistan",
  AE: "UAE", SA: "Saudi Arabia", EG: "Egypt", KW: "Kuwait", BH: "Bahrain",
  OM: "Oman", QA: "Qatar", IR: "Iran", IQ: "Iraq", TR: "Turkey", IL: "Israel",
  JO: "Jordan", LB: "Lebanon", SY: "Syria", YE: "Yemen",
  NG: "Nigeria", ZA: "South Africa", KE: "Kenya", TZ: "Tanzania",
  MZ: "Mozambique", MG: "Madagascar", SN: "Senegal", GH: "Ghana",
  CI: "Ivory Coast", AO: "Angola", ET: "Ethiopia", UG: "Uganda",
  BR: "Brazil", AR: "Argentina", CL: "Chile",
  PE: "Peru", CO: "Colombia", MX: "Mexico", PA: "Panama", VE: "Venezuela",
  IS: "Iceland", FO: "Faroe Islands", FJ: "Fiji", ID: "Indonesia",
  VN: "Vietnam", TH: "Thailand", MY: "Malaysia", PH: "Philippines",
  RU: "Russia", UA: "Ukraine", PL: "Poland", RO: "Romania", HU: "Hungary",
  CA: "Canada", DJ: "Djibouti", BD: "Bangladesh", LK: "Sri Lanka", MM: "Myanmar",
};

function normalizeCountryCode(country: string): string {
  const mappings: Record<string, string> = {
    USA: "US", "China": "CN", "China (SAR)": "CN", Taiwan: "TW",
    "South Korea": "KR", Netherlands: "NL", Belgium: "BE",
    Malaysia: "MY", Thailand: "TH", Greece: "GR",
    "Saudi Arabia": "SA", Iran: "IR", Qatar: "QA", Russia: "RU",
    Egypt: "EG", "UK (Gibraltar)": "GB", Djibouti: "DJ",
    Yemen: "YE", Panama: "PA", Spain: "ES", Pakistan: "PK",
    "Sri Lanka": "LK", Japan: "JP", UK: "GB", France: "FR",
    Brazil: "BR", India: "IN", Singapore: "SG", Germany: "DE", UAE: "AE",
  };
  return mappings[country] || country;
}

/* ── Graph building ────────────────────────────────── */

let cachedGraph: DependencyGraph | null = null;

export function clearGraphCache(): void {
  cachedGraph = null;
}

function addEdge(graph: DependencyGraph, edge: DependencyEdge): void {
  graph.edges.push(edge);
  if (!graph.outgoing.has(edge.from)) graph.outgoing.set(edge.from, []);
  graph.outgoing.get(edge.from)!.push(edge);
  if (!graph.incoming.has(edge.to)) graph.incoming.set(edge.to, []);
  graph.incoming.get(edge.to)!.push(edge);
}

function ensureCountryNode(graph: DependencyGraph, code: string): void {
  const id = `country:${code}`;
  if (!graph.nodes.has(id)) {
    graph.nodes.set(id, {
      id,
      type: "country",
      name: COUNTRY_NAMES[code] || code,
      metadata: { code },
    });
  }
}

/* --- Cables --- */

function addCablesAsNodes(graph: DependencyGraph): void {
  for (const cable of UNDERSEA_CABLES) {
    const firstPoint = cable.points?.[0];
    graph.nodes.set(`cable:${cable.id}`, {
      id: `cable:${cable.id}`,
      type: "cable",
      name: cable.name,
      coordinates: firstPoint ? [firstPoint[0], firstPoint[1]] : undefined,
      metadata: {
        capacityTbps: cable.capacityTbps,
        rfsYear: cable.rfsYear,
        owners: cable.owners,
        landingPoints: cable.landingPoints,
      },
    });
  }
}

function buildCableCountryEdges(graph: DependencyGraph): void {
  for (const cable of UNDERSEA_CABLES) {
    const cableId = `cable:${cable.id}`;
    cable.countriesServed?.forEach((cs) => {
      const countryId = `country:${cs.country}`;
      ensureCountryNode(graph, cs.country);
      addEdge(graph, {
        from: cableId,
        to: countryId,
        type: "serves",
        strength: cs.capacityShare,
        redundancy: cs.isRedundant ? 0.5 : 0,
        metadata: {
          capacityShare: cs.capacityShare,
          estimatedImpact: cs.isRedundant
            ? "Medium - redundancy available"
            : "High - limited redundancy",
        },
      });
    });
    cable.landingPoints?.forEach((lp) => {
      ensureCountryNode(graph, lp.country);
      addEdge(graph, {
        from: cableId,
        to: `country:${lp.country}`,
        type: "lands_at",
        strength: 0.3,
        redundancy: 0.5,
      });
    });
  }
}

/* --- Pipelines --- */

function addPipelinesAsNodes(graph: DependencyGraph): void {
  for (const pipeline of PIPELINES) {
    const firstPoint = pipeline.points?.[0];
    graph.nodes.set(`pipeline:${pipeline.id}`, {
      id: `pipeline:${pipeline.id}`,
      type: "pipeline",
      name: pipeline.name,
      coordinates: firstPoint ? [firstPoint[0], firstPoint[1]] : undefined,
      metadata: {
        type: pipeline.type,
        status: pipeline.status,
        capacity: pipeline.capacity,
        operator: pipeline.operator,
        countries: pipeline.countries,
      },
    });
  }
}

function buildPipelineCountryEdges(graph: DependencyGraph): void {
  for (const pipeline of PIPELINES) {
    const pipelineId = `pipeline:${pipeline.id}`;
    pipeline.countries?.forEach((country) => {
      const code = country === "USA" ? "US" : country === "Canada" ? "CA" : country;
      ensureCountryNode(graph, code);
      addEdge(graph, {
        from: pipelineId,
        to: `country:${code}`,
        type: "serves",
        strength: 0.2,
        redundancy: 0.3,
      });
    });
  }
}

/* --- Ports --- */

function addPortsAsNodes(graph: DependencyGraph): void {
  for (const port of PORTS) {
    graph.nodes.set(`port:${port.id}`, {
      id: `port:${port.id}`,
      type: "port",
      name: port.name,
      coordinates: [port.lon, port.lat],
      metadata: { country: port.country, type: port.type, rank: port.rank },
    });
  }
}

function getPortImportance(port: Port): number {
  const typeWeight: Record<string, number> = {
    oil: 0.9, lng: 0.85, container: 0.7, mixed: 0.6, bulk: 0.5, naval: 0.4,
  };
  const baseWeight = typeWeight[port.type] || 0.5;
  const rankBoost = port.rank ? Math.max(0, (20 - port.rank) / 20) * 0.3 : 0;
  return Math.min(1, baseWeight + rankBoost);
}

function getAffectedCountries(port: Port): { code: string; strength: number; reason: string }[] {
  const affected: { code: string; strength: number; reason: string }[] = [];

  if (port.id === "port_said" || port.id === "suez_port") {
    affected.push(
      { code: "DE", strength: 0.6, reason: "Major EU importer via Suez" },
      { code: "GB", strength: 0.5, reason: "UK-Asia trade" },
      { code: "NL", strength: 0.5, reason: "Rotterdam connection" },
      { code: "CN", strength: 0.4, reason: "China-EU trade route" },
      { code: "IT", strength: 0.4, reason: "Mediterranean trade" },
    );
  }
  if (port.id === "bandar_abbas" || port.id === "fujairah" || port.id === "ras_tanura") {
    affected.push(
      { code: "JP", strength: 0.7, reason: "Oil import dependency" },
      { code: "KR", strength: 0.6, reason: "Oil import dependency" },
      { code: "IN", strength: 0.5, reason: "Oil imports" },
      { code: "CN", strength: 0.5, reason: "Oil imports" },
    );
  }
  if (port.id === "singapore" || port.id === "klang" || port.id === "tanjung_pelepas") {
    affected.push(
      { code: "CN", strength: 0.6, reason: "Trade route dependency" },
      { code: "JP", strength: 0.5, reason: "Trade route" },
      { code: "KR", strength: 0.5, reason: "Trade route" },
    );
  }
  if (port.id === "colon" || port.id === "balboa") {
    affected.push(
      { code: "US", strength: 0.5, reason: "East-West coast shipping" },
      { code: "CN", strength: 0.4, reason: "Trade route to US East Coast" },
    );
  }
  if (port.id === "aden" || port.id === "djibouti" || port.id === "hodeidah") {
    affected.push(
      { code: "DE", strength: 0.5, reason: "Europe-Asia shipping route" },
      { code: "GB", strength: 0.5, reason: "Shipping route" },
      { code: "IT", strength: 0.4, reason: "Mediterranean access" },
      { code: "SA", strength: 0.4, reason: "Regional trade" },
    );
  }

  return affected;
}

function buildPortCountryEdges(graph: DependencyGraph): void {
  for (const port of PORTS) {
    const portId = `port:${port.id}`;
    const code = normalizeCountryCode(port.country);
    ensureCountryNode(graph, code);
    const importance = getPortImportance(port);

    addEdge(graph, {
      from: portId,
      to: `country:${code}`,
      type: "serves",
      strength: importance,
      redundancy: port.rank && port.rank <= 5 ? 0.2 : 0.4,
      metadata: {
        portType: port.type,
        estimatedImpact: importance > 0.7 ? "Critical port for country" : "Regional port",
      },
    });

    for (const affected of getAffectedCountries(port)) {
      ensureCountryNode(graph, affected.code);
      addEdge(graph, {
        from: portId,
        to: `country:${affected.code}`,
        type: "trade_route",
        strength: affected.strength,
        redundancy: 0.5,
        metadata: { relationship: affected.reason },
      });
    }
  }
}

/* --- Chokepoints --- */

function addChokepointsAsNodes(graph: DependencyGraph): void {
  for (const waterway of STRATEGIC_WATERWAYS) {
    graph.nodes.set(`chokepoint:${waterway.id}`, {
      id: `chokepoint:${waterway.id}`,
      type: "chokepoint",
      name: waterway.name,
      coordinates: [waterway.lon, waterway.lat],
      metadata: { description: waterway.description },
    });
  }
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getChokepointDependentCountries(
  chokepointId: string,
): { code: string; strength: number; redundancy: number; reason: string }[] {
  const deps: Record<
    string,
    { code: string; strength: number; redundancy: number; reason: string }[]
  > = {
    suez: [
      { code: "DE", strength: 0.6, redundancy: 0.3, reason: "EU-Asia trade" },
      { code: "IT", strength: 0.5, redundancy: 0.3, reason: "Mediterranean" },
      { code: "GB", strength: 0.5, redundancy: 0.4, reason: "UK-Asia trade" },
      { code: "CN", strength: 0.4, redundancy: 0.5, reason: "China-EU exports" },
    ],
    hormuz_strait: [
      { code: "JP", strength: 0.8, redundancy: 0.2, reason: "80% oil imports" },
      { code: "KR", strength: 0.7, redundancy: 0.2, reason: "70% oil imports" },
      { code: "IN", strength: 0.6, redundancy: 0.3, reason: "60% oil imports" },
      { code: "CN", strength: 0.5, redundancy: 0.4, reason: "40% oil imports" },
    ],
    malacca_strait: [
      { code: "CN", strength: 0.7, redundancy: 0.3, reason: "80% oil imports transit" },
      { code: "JP", strength: 0.6, redundancy: 0.3, reason: "Trade route" },
      { code: "KR", strength: 0.6, redundancy: 0.3, reason: "Trade route" },
    ],
    bab_el_mandeb: [
      { code: "DE", strength: 0.5, redundancy: 0.4, reason: "EU shipping" },
      { code: "GB", strength: 0.5, redundancy: 0.4, reason: "UK shipping" },
      { code: "SA", strength: 0.4, redundancy: 0.5, reason: "Red Sea access" },
    ],
    panama: [
      { code: "US", strength: 0.5, redundancy: 0.4, reason: "Inter-coast shipping" },
      { code: "CN", strength: 0.4, redundancy: 0.5, reason: "US East trade" },
    ],
    gibraltar: [
      { code: "ES", strength: 0.4, redundancy: 0.5, reason: "Med access" },
      { code: "IT", strength: 0.3, redundancy: 0.5, reason: "Atlantic trade" },
    ],
    bosphorus: [
      { code: "RU", strength: 0.6, redundancy: 0.3, reason: "Black Sea access" },
      { code: "UA", strength: 0.6, redundancy: 0.3, reason: "Grain exports" },
      { code: "RO", strength: 0.4, redundancy: 0.4, reason: "Black Sea trade" },
    ],
    dardanelles: [
      { code: "RU", strength: 0.5, redundancy: 0.3, reason: "Black Sea access" },
      { code: "UA", strength: 0.5, redundancy: 0.3, reason: "Grain exports" },
    ],
    taiwan_strait: [
      { code: "TW", strength: 0.9, redundancy: 0.1, reason: "Taiwan trade lifeline" },
      { code: "JP", strength: 0.5, redundancy: 0.4, reason: "Trade route" },
      { code: "KR", strength: 0.4, redundancy: 0.4, reason: "Trade route" },
    ],
  };
  return deps[chokepointId] || [];
}

function buildChokepointEdges(graph: DependencyGraph): void {
  for (const waterway of STRATEGIC_WATERWAYS) {
    const chokepointId = `chokepoint:${waterway.id}`;

    // Connect to nearby ports (within 500 km)
    const nearbyPorts = PORTS.filter(
      (port) => haversineDistance(waterway.lat, waterway.lon, port.lat, port.lon) < 500,
    );
    for (const port of nearbyPorts) {
      addEdge(graph, {
        from: chokepointId,
        to: `port:${port.id}`,
        type: "controls_access",
        strength: 0.7,
        redundancy: 0.2,
        metadata: { relationship: "Access controlled by chokepoint" },
      });
    }

    // Connect to dependent countries
    for (const dep of getChokepointDependentCountries(waterway.id)) {
      ensureCountryNode(graph, dep.code);
      addEdge(graph, {
        from: chokepointId,
        to: `country:${dep.code}`,
        type: "trade_dependency",
        strength: dep.strength,
        redundancy: dep.redundancy,
        metadata: { relationship: dep.reason },
      });
    }
  }
}

/* --- Countries from all infra --- */

function addCountriesAsNodes(graph: DependencyGraph): void {
  const countries = new Set<string>();
  for (const cable of UNDERSEA_CABLES) {
    cable.countriesServed?.forEach((c) => countries.add(c.country));
    cable.landingPoints?.forEach((lp) => countries.add(lp.country));
  }
  for (const pipeline of PIPELINES) {
    pipeline.countries?.forEach((c) => {
      countries.add(c === "USA" ? "US" : c === "Canada" ? "CA" : c);
    });
  }
  for (const code of countries) ensureCountryNode(graph, code);
}

/* ── Build graph ───────────────────────────────────── */

export function buildDependencyGraph(): DependencyGraph {
  if (cachedGraph) return cachedGraph;

  const graph: DependencyGraph = {
    nodes: new Map(),
    edges: [],
    outgoing: new Map(),
    incoming: new Map(),
  };

  addCablesAsNodes(graph);
  addPipelinesAsNodes(graph);
  addPortsAsNodes(graph);
  addChokepointsAsNodes(graph);
  addCountriesAsNodes(graph);

  buildCableCountryEdges(graph);
  buildPipelineCountryEdges(graph);
  buildPortCountryEdges(graph);
  buildChokepointEdges(graph);

  cachedGraph = graph;
  return graph;
}

/* ── BFS cascade calculation ───────────────────────── */

function categorizeImpact(strength: number): CascadeImpactLevel {
  if (strength > 0.8) return "critical";
  if (strength > 0.5) return "high";
  if (strength > 0.2) return "medium";
  return "low";
}

export function calculateCascade(
  sourceId: string,
  disruptionLevel = 1.0,
): CascadeResult | null {
  const graph = buildDependencyGraph();
  const source = graph.nodes.get(sourceId);
  if (!source) return null;

  const affected = new Map<string, CascadeAffectedNode>();
  const visited = new Set<string>();
  visited.add(sourceId);

  const queue: { nodeId: string; depth: number; path: string[] }[] = [
    { nodeId: sourceId, depth: 0, path: [sourceId] },
  ];

  while (queue.length > 0) {
    const { nodeId, depth, path } = queue.shift()!;
    if (depth >= 3) continue;

    const dependents = graph.outgoing.get(nodeId) || [];
    for (const edge of dependents) {
      if (visited.has(edge.to)) continue;
      visited.add(edge.to);

      const impactStrength = edge.strength * disruptionLevel * (1 - (edge.redundancy || 0));
      const targetNode = graph.nodes.get(edge.to);
      if (!targetNode || impactStrength < 0.05) continue;

      affected.set(edge.to, {
        node: targetNode,
        impactLevel: categorizeImpact(impactStrength),
        pathLength: depth + 1,
        dependencyChain: [...path, edge.to],
        redundancyAvailable: (edge.redundancy || 0) > 0.3,
        estimatedRecovery: edge.metadata?.estimatedImpact as string | undefined,
      });

      queue.push({ nodeId: edge.to, depth: depth + 1, path: [...path, edge.to] });
    }
  }

  // Extract country impacts
  const countriesAffected: CascadeCountryImpact[] = [];
  for (const [nodeId, affectedNode] of affected) {
    if (affectedNode.node.type === "country") {
      const code = (affectedNode.node.metadata?.code as string) || nodeId.replace("country:", "");
      countriesAffected.push({
        country: code,
        countryName: affectedNode.node.name,
        impactLevel: affectedNode.impactLevel,
        affectedCapacity: getCapacityForCountry(
          sourceId,
          code,
          graph,
          affectedNode.dependencyChain,
        ),
      });
    }
  }

  countriesAffected.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.impactLevel] - order[b.impactLevel] || b.affectedCapacity - a.affectedCapacity;
  });

  return {
    source,
    affectedNodes: Array.from(affected.values()),
    countriesAffected,
    redundancies: findRedundancies(sourceId),
  };
}

function getCapacityForCountry(
  sourceId: string,
  countryCode: string,
  graph: DependencyGraph,
  dependencyChain: string[],
): number {
  if (sourceId.startsWith("cable:")) {
    const cableId = sourceId.replace("cable:", "");
    const cable = UNDERSEA_CABLES.find((c) => c.id === cableId);
    const countryData = cable?.countriesServed?.find((cs) => cs.country === countryCode);
    return countryData?.capacityShare || 0;
  }

  const countryId = `country:${countryCode}`;
  const outgoing = graph.outgoing.get(sourceId) || [];
  const direct = outgoing.filter((e) => e.to === countryId);
  if (direct.length > 0) {
    return Math.max(...direct.map((e) => e.strength * (1 - (e.redundancy || 0))));
  }

  if (dependencyChain.length > 2) {
    let pathCapacity = 1;
    for (let i = 0; i < dependencyChain.length - 1; i++) {
      const from = dependencyChain[i]!;
      const to = dependencyChain[i + 1]!;
      const stepEdges = graph.outgoing.get(from) || [];
      const edge = stepEdges.find((e) => e.to === to);
      if (edge) {
        pathCapacity *= edge.strength * (1 - (edge.redundancy || 0));
      } else {
        return 0;
      }
    }
    return pathCapacity;
  }

  return 0;
}

function findRedundancies(sourceId: string): CascadeResult["redundancies"] {
  if (!sourceId.startsWith("cable:")) return [];

  const cableId = sourceId.replace("cable:", "");
  const sourceCable = UNDERSEA_CABLES.find((c) => c.id === cableId);
  if (!sourceCable) return [];

  const sourceCountries = new Set(sourceCable.countriesServed?.map((c) => c.country) || []);
  const alternatives: CascadeResult["redundancies"] = [];

  for (const cable of UNDERSEA_CABLES) {
    if (cable.id === cableId) continue;
    const shared = cable.countriesServed?.filter((c) => sourceCountries.has(c.country)) || [];
    if (shared.length > 0) {
      const avgCap = shared.reduce((sum, c) => sum + c.capacityShare, 0) / shared.length;
      alternatives.push({ id: cable.id, name: cable.name, capacityShare: avgCap });
    }
  }

  return alternatives.slice(0, 5);
}

/* ── Convenience getters ───────────────────────────── */

export function getCableById(id: string): UnderseaCable | undefined {
  return UNDERSEA_CABLES.find((c) => c.id === id);
}

export function getPipelineById(id: string): Pipeline | undefined {
  return PIPELINES.find((p) => p.id === id);
}

export function getPortById(id: string): Port | undefined {
  return PORTS.find((p) => p.id === id);
}

export function getGraphStats(): {
  nodes: number;
  edges: number;
  cables: number;
  pipelines: number;
  ports: number;
  chokepoints: number;
  countries: number;
} {
  const graph = buildDependencyGraph();
  let cables = 0,
    pipelines = 0,
    ports = 0,
    chokepoints = 0,
    countries = 0;

  for (const node of graph.nodes.values()) {
    if (node.type === "cable") cables++;
    else if (node.type === "pipeline") pipelines++;
    else if (node.type === "port") ports++;
    else if (node.type === "chokepoint") chokepoints++;
    else if (node.type === "country") countries++;
  }

  return { nodes: graph.nodes.size, edges: graph.edges.length, cables, pipelines, ports, chokepoints, countries };
}
