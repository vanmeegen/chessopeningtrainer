import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import type { Annotation, MoveNode } from "../src/types/OpeningTypes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CACHE_DIR = join(__dirname, "data", "wikibooks-cache");

const WIKIBOOKS_API_URL = "https://en.wikibooks.org/w/api.php";

/** User-Agent required by Wikimedia API policy */
const USER_AGENT =
  "ChessOpeningTrainer/1.0 (https://github.com/vanmeegen/chessopeningtrainer)";

/** Minimum content length to consider a page as having meaningful content */
const MIN_CONTENT_LENGTH = 50;

/** Delay between API requests in milliseconds */
const REQUEST_DELAY_MS = 1100;

/** Result from fetching a Wikibooks page */
type WikibooksPageResult = {
  found: boolean;
  wikitext: string;
  title: string;
};

/** Cached page entry stored on disk */
type CachedPage = {
  found: boolean;
  wikitext: string;
  title: string;
  fetchedAt: string;
};

/**
 * Build the Wikibooks page path for a move sequence.
 * E.g., ["e4", "e5", "Nf3"] -> "Chess_Opening_Theory/1._e4/1...e5/2._Nf3"
 */
export function buildWikibooksPath(moves: string[]): string {
  const parts: string[] = ["Chess_Opening_Theory"];

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i]!;
    const moveNumber = Math.floor(i / 2) + 1;
    const isWhite = i % 2 === 0;

    if (isWhite) {
      parts.push(`${moveNumber}._${move}`);
    } else {
      parts.push(`${moveNumber}...${move}`);
    }
  }

  return parts.join("/");
}

/** Max filename length for most filesystems (255 bytes) minus some margin */
const MAX_FILENAME_LENGTH = 200;

/**
 * Get the cache file path for a given Wikibooks page path.
 * Uses a hash suffix for long paths to avoid ENAMETOOLONG errors.
 */
function getCacheFilePath(pagePath: string): string {
  const safeFileName = pagePath.replace(/\//g, "__") + ".json";
  if (safeFileName.length <= MAX_FILENAME_LENGTH) {
    return join(CACHE_DIR, safeFileName);
  }
  // For long paths: use a truncated prefix + hash for uniqueness
  const hash = createHash("sha256").update(pagePath).digest("hex").slice(0, 16);
  const prefix = safeFileName.slice(0, MAX_FILENAME_LENGTH - 22); // room for _hash.json
  return join(CACHE_DIR, `${prefix}_${hash}.json`);
}

/**
 * Read a cached page if it exists.
 */
export function readCachedPage(pagePath: string): CachedPage | null {
  const cacheFile = getCacheFilePath(pagePath);
  if (!existsSync(cacheFile)) {
    return null;
  }
  const content = readFileSync(cacheFile, "utf-8");
  return JSON.parse(content) as CachedPage;
}

/**
 * Write a page result to the cache.
 */
function writeCachedPage(pagePath: string, result: WikibooksPageResult): void {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
  const cacheFile = getCacheFilePath(pagePath);
  const cached: CachedPage = {
    ...result,
    fetchedAt: new Date().toISOString(),
  };
  writeFileSync(cacheFile, JSON.stringify(cached, null, 2), "utf-8");
}

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch a Wikibooks page via the MediaWiki API.
 */
export async function fetchWikibooksPage(
  pagePath: string,
): Promise<WikibooksPageResult> {
  // Check cache first
  const cached = readCachedPage(pagePath);
  if (cached) {
    return {
      found: cached.found,
      wikitext: cached.wikitext,
      title: cached.title,
    };
  }

  const url = new URL(WIKIBOOKS_API_URL);
  url.searchParams.set("action", "parse");
  url.searchParams.set("page", pagePath);
  url.searchParams.set("prop", "wikitext");
  url.searchParams.set("format", "json");

  try {
    const response = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!response.ok) {
      // Don't cache transient HTTP errors (429 rate limit, 5xx server errors)
      // Only cache 404 as "page not found"
      if (response.status === 404) {
        const result: WikibooksPageResult = {
          found: false,
          wikitext: "",
          title: pagePath,
        };
        writeCachedPage(pagePath, result);
        return result;
      }
      console.warn(
        `  HTTP ${response.status} for ${pagePath} — not caching, will retry later`,
      );
      return { found: false, wikitext: "", title: pagePath };
    }

    const data = (await response.json()) as WikibooksApiResponse;

    if ("error" in data) {
      // MediaWiki "missingtitle" error = page doesn't exist — safe to cache
      const result: WikibooksPageResult = {
        found: false,
        wikitext: "",
        title: pagePath,
      };
      writeCachedPage(pagePath, result);
      return result;
    }

    const wikitext = data.parse?.wikitext?.["*"] ?? "";
    const title = data.parse?.title ?? pagePath;

    const result: WikibooksPageResult = {
      found: wikitext.length > 0,
      wikitext,
      title,
    };
    writeCachedPage(pagePath, result);
    return result;
  } catch {
    // Network errors — don't cache, allow retry
    console.warn(`  Network error for ${pagePath} — not caching`);
    return { found: false, wikitext: "", title: pagePath };
  }
}

/** Shape of a successful MediaWiki API parse response */
type WikibooksApiResponse =
  | {
      parse: {
        title: string;
        wikitext: { "*": string };
      };
    }
  | {
      error: {
        code: string;
        info: string;
      };
    };

/**
 * Extract meaningful prose from Wikibooks wikitext.
 * Strips markup and extracts the textual commentary about the move.
 */
export function extractProseFromWikitext(wikitext: string): string {
  let text = wikitext;

  // Remove common wikitext templates
  text = text.replace(/\{\{[^}]*\}\}/g, "");

  // Remove category links
  text = text.replace(/\[\[Category:[^\]]*\]\]/g, "");

  // Remove file/image links
  text = text.replace(/\[\[(?:File|Image):[^\]]*\]\]/g, "");

  // Convert wiki links to plain text: [[link|display]] -> display, [[link]] -> link
  text = text.replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, "$2");
  text = text.replace(/\[\[([^\]]*)\]\]/g, "$1");

  // Remove external links: [http://... display] -> display
  text = text.replace(/\[https?:\/\/[^\s\]]*\s*([^\]]*)\]/g, "$1");

  // Remove bold/italic markers
  text = text.replace(/'{2,5}/g, "");

  // Remove ref tags and their content
  text = text.replace(/<ref[^>]*>.*?<\/ref>/gs, "");
  text = text.replace(/<ref[^>]*\/>/g, "");

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, "");

  // Remove chess board diagrams and tables
  text = text.replace(/\{\|[^}]*\|\}/gs, "");

  // Remove section headers
  text = text.replace(/^=+\s*.*?\s*=+$/gm, "");

  // Remove move notation markers like {{chess_diagram}} etc.
  text = text.replace(/\{\{[^}]*\}\}/g, "");

  // Clean up whitespace
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.trim();

  return text;
}

/**
 * Extract a move rationale from the prose text.
 * Tries to find the most relevant sentence(s) about the move.
 */
export function extractMoveRationale(prose: string): string {
  if (prose.length < MIN_CONTENT_LENGTH) {
    return "";
  }

  // Split into sentences
  const sentences = prose
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);

  if (sentences.length === 0) {
    return "";
  }

  // Take the first 1-2 meaningful sentences as the rationale
  const rationale = sentences.slice(0, 2).join(". ");
  return rationale.length > 0 ? rationale + "." : "";
}

/**
 * Extract a strategic theme from the prose text.
 */
export function extractStrategicTheme(prose: string): string {
  if (prose.length < MIN_CONTENT_LENGTH) {
    return "";
  }

  const themeKeywords: Array<{ pattern: RegExp; theme: string }> = [
    { pattern: /center\s*control/i, theme: "Center control" },
    { pattern: /control\s*(of\s*)?the\s*center/i, theme: "Center control" },
    { pattern: /central\s*squares/i, theme: "Center control" },
    { pattern: /gambit/i, theme: "Gambit play" },
    { pattern: /sacrifice/i, theme: "Tactical sacrifice" },
    { pattern: /develop/i, theme: "Piece development" },
    { pattern: /king\s*safety/i, theme: "King safety" },
    { pattern: /castl/i, theme: "King safety" },
    { pattern: /attack/i, theme: "Attacking play" },
    { pattern: /pawn\s*structure/i, theme: "Pawn structure" },
    { pattern: /space\s*advantage/i, theme: "Space advantage" },
    { pattern: /fianchetto/i, theme: "Fianchetto development" },
    { pattern: /tempo/i, theme: "Tempo play" },
    { pattern: /pressure/i, theme: "Positional pressure" },
    { pattern: /initiative/i, theme: "Initiative" },
    { pattern: /hypermodern/i, theme: "Hypermodern strategy" },
    { pattern: /solid/i, theme: "Solid positional play" },
    { pattern: /sharp/i, theme: "Sharp tactical play" },
    { pattern: /open\s*(game|position|file)/i, theme: "Open game" },
    { pattern: /closed\s*(game|position)/i, theme: "Closed position" },
  ];

  for (const { pattern, theme } of themeKeywords) {
    if (pattern.test(prose)) {
      return theme;
    }
  }

  return "";
}

/**
 * Collect the move sequence leading to a given node by traversing the tree.
 * Returns an array of SAN strings from the root to the node.
 */
function collectMovesFromPath(path: string[]): string[] {
  return path.filter((m) => m !== "");
}

/**
 * Walk the move tree and collect all (path, node) pairs.
 */
function walkTree(
  node: MoveNode,
  currentPath: string[],
): Array<{ path: string[]; node: MoveNode }> {
  const result: Array<{ path: string[]; node: MoveNode }> = [];

  const movePath = node.move !== "" ? [...currentPath, node.move] : currentPath;

  if (node.move !== "") {
    result.push({ path: movePath, node });
  }

  for (const child of node.children) {
    result.push(...walkTree(child, movePath));
  }

  return result;
}

/**
 * Annotate a move tree with Wikibooks content.
 * Returns the number of moves that received Wikibooks annotations.
 */
export async function annotateTreeFromWikibooks(
  root: MoveNode,
): Promise<number> {
  const entries = walkTree(root, []);
  let wikibooksCount = 0;

  for (const { path, node } of entries) {
    const moves = collectMovesFromPath(path);
    const pagePath = buildWikibooksPath(moves);

    // Rate limiting: only wait if we need to make an actual API call
    const cached = readCachedPage(pagePath);
    if (!cached) {
      await sleep(REQUEST_DELAY_MS);
    }

    const page = await fetchWikibooksPage(pagePath);

    if (page.found) {
      const prose = extractProseFromWikitext(page.wikitext);
      const moveRationale = extractMoveRationale(prose);
      const strategicTheme = extractStrategicTheme(prose);

      if (moveRationale.length > 0) {
        const annotation: Annotation = {
          moveRationale,
          strategicTheme: strategicTheme || "Opening theory",
          source: "wikibooks",
        };
        node.annotation = annotation;
        wikibooksCount++;
      }
    }
  }

  return wikibooksCount;
}
