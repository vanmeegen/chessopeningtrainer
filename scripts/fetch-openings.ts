import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL =
  "https://raw.githubusercontent.com/lichess-org/chess-openings/master";

const TSV_FILES = ["a.tsv", "b.tsv", "c.tsv", "d.tsv", "e.tsv"] as const;

type TsvFileName = (typeof TSV_FILES)[number];

const DATA_DIR = join(__dirname, "data");

export async function fetchOpenings(): Promise<void> {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  for (const file of TSV_FILES) {
    const url = `${BASE_URL}/${file}`;
    console.log(`Fetching ${url}...`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }
    const text = await response.text();
    const outputPath = join(DATA_DIR, file);
    writeFileSync(outputPath, text, "utf-8");
    console.log(`Saved ${outputPath} (${text.length} bytes)`);
  }

  console.log("All TSV files downloaded successfully.");
}

export { TSV_FILES, DATA_DIR };
export type { TsvFileName };

// Run directly
if (process.argv[1] === __filename) {
  fetchOpenings().catch((err: unknown) => {
    console.error("Failed to fetch openings:", err);
    process.exit(1);
  });
}
