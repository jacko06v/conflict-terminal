import { z } from "zod";

export const EventFiltersSchema = z.object({
  country: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  eventType: z
    .enum(["explosion", "airstrike", "missile", "drone", "fire", "infrastructure", "troop_movement", "alert"])
    .optional(),
  verificationStatus: z.enum(["unverified", "partial", "verified"]).optional(),
  minConfidence: z.coerce.number().min(0).max(100).optional(),
  start: z.string().datetime({ offset: true }).optional(),
  end: z.string().datetime({ offset: true }).optional(),
  bbox: z.string().regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/).optional(),
  limit: z.coerce.number().min(1).max(7000).default(4000),
  offset: z.coerce.number().min(0).default(0),
});

export const TimelineRangeSchema = z.object({
  range: z.enum(["24h", "7d", "30d"]).default("7d"),
});

export const UUIDSchema = z.string().uuid();
