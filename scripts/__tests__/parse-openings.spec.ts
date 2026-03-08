import { describe, it, expect } from "vitest";
import {
  parseTsv,
  toOpeningId,
  extractParentName,
  extractVariationName,
  groupOpenings,
} from "../parse-openings.js";
import type { TsvRow } from "../parse-openings.js";

describe("parseTsv", () => {
  it("should parse a well-formed TSV string into rows", () => {
    const tsv = `eco\tname\tpgn
B20\tSicilian Defense\t1. e4 c5
B33\tSicilian Defense: Najdorf Variation\t1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6`;

    const rows = parseTsv(tsv);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      eco: "B20",
      name: "Sicilian Defense",
      pgn: "1. e4 c5",
    });
    expect(rows[1]).toEqual({
      eco: "B33",
      name: "Sicilian Defense: Najdorf Variation",
      pgn: "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6",
    });
  });

  it("should skip empty lines", () => {
    const tsv = `eco\tname\tpgn
B20\tSicilian Defense\t1. e4 c5

C50\tItalian Game\t1. e4 e5 2. Nf3 Nc6 3. Bc4`;

    const rows = parseTsv(tsv);
    expect(rows).toHaveLength(2);
  });

  it("should return empty array for header-only TSV", () => {
    const tsv = `eco\tname\tpgn`;
    const rows = parseTsv(tsv);
    expect(rows).toHaveLength(0);
  });

  it("should return empty array for empty input", () => {
    const rows = parseTsv("");
    expect(rows).toHaveLength(0);
  });

  it("should skip rows with fewer than 3 columns", () => {
    const tsv = `eco\tname\tpgn
B20\tSicilian Defense
C50\tItalian Game\t1. e4 e5 2. Nf3 Nc6 3. Bc4`;

    const rows = parseTsv(tsv);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.name).toBe("Italian Game");
  });
});

describe("toOpeningId", () => {
  it("should convert a simple name to kebab-case", () => {
    expect(toOpeningId("Sicilian Defense")).toBe("sicilian-defense");
  });

  it("should remove special characters", () => {
    expect(toOpeningId("King's Gambit")).toBe("kings-gambit");
  });

  it("should handle colons and complex names", () => {
    expect(toOpeningId("Sicilian Defense: Najdorf Variation")).toBe(
      "sicilian-defense-najdorf-variation",
    );
  });

  it("should collapse multiple spaces/dashes", () => {
    expect(toOpeningId("French  Defense")).toBe("french-defense");
  });
});

describe("extractParentName", () => {
  it("should return the name before the colon", () => {
    expect(extractParentName("Sicilian Defense: Najdorf Variation")).toBe(
      "Sicilian Defense",
    );
  });

  it("should return the full name if no colon", () => {
    expect(extractParentName("Sicilian Defense")).toBe("Sicilian Defense");
  });

  it("should handle nested colons by using first one", () => {
    expect(
      extractParentName("Sicilian Defense: Najdorf Variation: Adams Attack"),
    ).toBe("Sicilian Defense");
  });
});

describe("extractVariationName", () => {
  it("should return the part after the colon", () => {
    expect(extractVariationName("Sicilian Defense: Najdorf Variation")).toBe(
      "Najdorf Variation",
    );
  });

  it('should return "Main Line" if no colon', () => {
    expect(extractVariationName("Sicilian Defense")).toBe("Main Line");
  });

  it("should preserve nested variations", () => {
    expect(
      extractVariationName("Sicilian Defense: Najdorf Variation, Adams Attack"),
    ).toBe("Najdorf Variation, Adams Attack");
  });
});

describe("groupOpenings", () => {
  it("should group variations under parent openings", () => {
    const rows: TsvRow[] = [
      { eco: "B20", name: "Sicilian Defense", pgn: "1. e4 c5" },
      {
        eco: "B33",
        name: "Sicilian Defense: Najdorf Variation",
        pgn: "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6",
      },
      {
        eco: "B60",
        name: "Sicilian Defense: Dragon Variation",
        pgn: "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6",
      },
    ];

    const openings = groupOpenings(rows);
    expect(openings).toHaveLength(1);

    const sicilian = openings[0]!;
    expect(sicilian.name).toBe("Sicilian Defense");
    expect(sicilian.id).toBe("sicilian-defense");
    expect(sicilian.eco).toBe("B20");
    expect(sicilian.variations).toHaveLength(3);
    expect(sicilian.variations[0]!.name).toBe("Main Line");
    expect(sicilian.variations[1]!.name).toBe("Najdorf Variation");
    expect(sicilian.variations[2]!.name).toBe("Dragon Variation");
  });

  it("should keep separate openings apart", () => {
    const rows: TsvRow[] = [
      { eco: "B20", name: "Sicilian Defense", pgn: "1. e4 c5" },
      {
        eco: "C50",
        name: "Italian Game",
        pgn: "1. e4 e5 2. Nf3 Nc6 3. Bc4",
      },
    ];

    const openings = groupOpenings(rows);
    expect(openings).toHaveLength(2);
    expect(openings[0]!.name).toBe("Sicilian Defense");
    expect(openings[1]!.name).toBe("Italian Game");
  });

  it("should use the ECO code of the first variation for the parent", () => {
    const rows: TsvRow[] = [
      { eco: "D30", name: "Queen's Gambit Declined", pgn: "1. d4 d5 2. c4 e6" },
      {
        eco: "D35",
        name: "Queen's Gambit Declined: Exchange Variation",
        pgn: "1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. cxd5",
      },
    ];

    const openings = groupOpenings(rows);
    expect(openings).toHaveLength(1);
    expect(openings[0]!.eco).toBe("D30");
    expect(openings[0]!.variations).toHaveLength(2);
  });

  it("should handle empty input", () => {
    const openings = groupOpenings([]);
    expect(openings).toHaveLength(0);
  });
});
