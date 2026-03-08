import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TSV_FILES, DATA_DIR } from "./fetch-openings.js";

/** A single parsed row from a TSV file */
export type TsvRow = {
  eco: string;
  name: string;
  pgn: string;
};

/** A parsed opening with its variations grouped together */
export type ParsedOpening = {
  id: string;
  name: string;
  eco: string;
  variations: ParsedVariation[];
};

/** A single variation within an opening */
export type ParsedVariation = {
  id: string;
  name: string;
  eco: string;
  pgn: string;
};

/**
 * Parse a TSV string into an array of TsvRow objects.
 * The first row is assumed to be a header and is skipped.
 */
export function parseTsv(content: string): TsvRow[] {
  const lines = content.trim().split("\n");
  if (lines.length < 2) {
    return [];
  }

  // Skip header row
  const dataLines = lines.slice(1);
  const rows: TsvRow[] = [];

  for (const line of dataLines) {
    const trimmed = line.trim();
    if (trimmed === "") continue;

    const parts = trimmed.split("\t");
    if (parts.length < 3) continue;

    const eco = parts[0]!.trim();
    const name = parts[1]!.trim();
    const pgn = parts[2]!.trim();

    rows.push({ eco, name, pgn });
  }

  return rows;
}

/**
 * Convert an opening name into a URL-friendly ID.
 */
export function toOpeningId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Extract the parent opening name from a full variation name.
 * E.g. "Sicilian Defense: Najdorf Variation" -> "Sicilian Defense"
 * E.g. "Sicilian Defense" -> "Sicilian Defense"
 */
export function extractParentName(fullName: string): string {
  const colonIndex = fullName.indexOf(":");
  if (colonIndex === -1) {
    return fullName;
  }
  return fullName.substring(0, colonIndex).trim();
}

/**
 * Extract the variation name from a full opening name.
 * E.g. "Sicilian Defense: Najdorf Variation" -> "Najdorf Variation"
 * E.g. "Sicilian Defense" -> "Main Line"
 */
export function extractVariationName(fullName: string): string {
  const colonIndex = fullName.indexOf(":");
  if (colonIndex === -1) {
    return "Main Line";
  }
  // Handle nested variations: "Sicilian Defense: Najdorf Variation, Adams Attack"
  return fullName.substring(colonIndex + 1).trim();
}

/**
 * Group TSV rows into ParsedOpening objects.
 * Related variations (sharing the same parent name before the colon) are grouped together.
 */
export function groupOpenings(rows: TsvRow[]): ParsedOpening[] {
  const openingMap = new Map<string, ParsedOpening>();

  for (const row of rows) {
    const parentName = extractParentName(row.name);
    const parentId = toOpeningId(parentName);

    let opening = openingMap.get(parentId);
    if (!opening) {
      opening = {
        id: parentId,
        name: parentName,
        eco: row.eco,
        variations: [],
      };
      openingMap.set(parentId, opening);
    }

    const variationName = extractVariationName(row.name);
    const variationId = toOpeningId(row.name);

    opening.variations.push({
      id: variationId,
      name: variationName,
      eco: row.eco,
      pgn: row.pgn,
    });
  }

  return Array.from(openingMap.values());
}

/**
 * Parse all downloaded TSV files and return grouped openings.
 */
export function parseAllOpenings(dataDir?: string): ParsedOpening[] {
  const dir = dataDir ?? DATA_DIR;
  const allRows: TsvRow[] = [];

  for (const file of TSV_FILES) {
    const filePath = join(dir, file);
    const content = readFileSync(filePath, "utf-8");
    const rows = parseTsv(content);
    allRows.push(...rows);
  }

  return groupOpenings(allRows);
}
