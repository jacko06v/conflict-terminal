/**
 * Geospatial utility functions.
 * Uses the Haversine formula for Earth-surface distance calculations.
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Calculate the distance in km between two lat/lon points using Haversine.
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Check if two events are spatially proximate within a given radius.
 * Accounts for approximate locations: uses the sum of both radii as tolerance.
 */
export function areSpatiallyProximate(
  lat1: number,
  lon1: number,
  radius1Km: number,
  lat2: number,
  lon2: number,
  radius2Km: number
): boolean {
  const dist = haversineDistanceKm(lat1, lon1, lat2, lon2);
  return dist <= radius1Km + radius2Km;
}

/**
 * Parse a bbox string "minLon,minLat,maxLon,maxLat" into its components.
 * Returns null if invalid.
 */
export function parseBbox(
  bbox: string
): [number, number, number, number] | null {
  const parts = bbox.split(",").map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return null;
  const [minLon, minLat, maxLon, maxLat] = parts;
  if (
    minLon < -180 || maxLon > 180 ||
    minLat < -90  || maxLat > 90 ||
    minLon >= maxLon || minLat >= maxLat
  ) return null;
  return [minLon, minLat, maxLon, maxLat];
}
