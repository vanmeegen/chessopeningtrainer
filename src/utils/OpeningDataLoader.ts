import type { Opening, OpeningCatalogEntry } from "../types/OpeningTypes";
import catalogData from "../data/openingCatalog.json";

const openingCache = new Map<string, Opening>();

/**
 * Load the bundled opening catalog.
 * This data is included in the app bundle and available synchronously.
 */
export function loadOpeningCatalog(): OpeningCatalogEntry[] {
  return catalogData as OpeningCatalogEntry[];
}

/**
 * Load full opening data for a specific opening by ID.
 * Fetches from `/openings/{openingId}.json` and caches the result.
 */
export async function loadOpeningData(openingId: string): Promise<Opening> {
  const cached = openingCache.get(openingId);
  if (cached) {
    return cached;
  }

  const base = import.meta.env.BASE_URL ?? "/";
  const response = await fetch(`${base}openings/${openingId}.json`);
  if (!response.ok) {
    throw new Error(
      `Failed to load opening data for "${openingId}": ${response.statusText}`,
    );
  }

  const data = (await response.json()) as Opening;
  openingCache.set(openingId, data);
  return data;
}

/**
 * Clear the opening data cache.
 * Useful for testing or forcing a re-fetch.
 */
export function clearOpeningCache(): void {
  openingCache.clear();
}
