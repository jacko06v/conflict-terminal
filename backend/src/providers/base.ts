import { RawItem } from "../types";

/**
 * Base interface for all ingestion providers.
 *
 * Each provider is responsible for one data source type.
 * Providers are pluggable: implement this interface and register
 * in the ingestion scheduler.
 */
export interface IngestionProvider {
  /** Unique provider name for logging and deduplication. */
  readonly name: string;

  /**
   * Fetch raw items from the source.
   * For mock providers, this generates synthetic data.
   * For real providers, this calls external APIs/feeds.
   */
  fetchRawItems(): Promise<RawItem[]>;

  /**
   * Optional: normalize raw source format to RawItem.
   * For providers that work with their own internal format,
   * this step transforms it before saving.
   * Default: identity (items already normalized in fetchRawItems).
   */
  normalize?(rawData: unknown[]): RawItem[];
}

/**
 * Abstract base class with common utilities.
 * Providers can extend this instead of implementing the interface directly.
 */
export abstract class BaseProvider implements IngestionProvider {
  abstract readonly name: string;
  abstract fetchRawItems(): Promise<RawItem[]>;

  protected randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  protected hoursAgo(hours: number): Date {
    return new Date(Date.now() - hours * 60 * 60 * 1000);
  }

  protected randomFrom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }
}
