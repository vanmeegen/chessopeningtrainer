import { describe, it, expect } from "vitest";
import {
  buildCategoryTrees,
  countOpeningsInTree,
  searchTree,
} from "../openingTreeBuilder";
import type { OpeningCatalogEntry } from "../../types/OpeningTypes";

function makeEntry(
  overrides: Partial<OpeningCatalogEntry> &
    Pick<OpeningCatalogEntry, "id" | "name" | "firstMoves" | "category">,
): OpeningCatalogEntry {
  return {
    eco: "C00",
    variationCount: 5,
    importance: 1,
    ...overrides,
  };
}

describe("buildCategoryTrees", () => {
  it("groups entries by category", () => {
    const catalog: OpeningCatalogEntry[] = [
      makeEntry({
        id: "ruy",
        name: "Ruy Lopez",
        firstMoves: "1. e4 e5 2. Nf3 Nc6 3. Bb5",
        category: "open",
        importance: 3,
      }),
      makeEntry({
        id: "sic",
        name: "Sicilian",
        firstMoves: "1. e4 c5",
        category: "semi-open",
        importance: 3,
      }),
    ];

    const groups = buildCategoryTrees(catalog);
    expect(groups).toHaveLength(2);
    expect(groups[0]!.key).toBe("open");
    expect(groups[1]!.key).toBe("semi-open");
  });

  it("builds a trie from shared moves", () => {
    const catalog: OpeningCatalogEntry[] = [
      makeEntry({
        id: "ruy",
        name: "Ruy Lopez",
        firstMoves: "1. e4 e5 2. Nf3 Nc6 3. Bb5",
        category: "open",
        importance: 3,
      }),
      makeEntry({
        id: "italian",
        name: "Italian Game",
        firstMoves: "1. e4 e5 2. Nf3 Nc6 3. Bc4",
        category: "open",
        importance: 3,
      }),
      makeEntry({
        id: "scotch",
        name: "Scotch Game",
        firstMoves: "1. e4 e5 2. Nf3 Nc6 3. d4",
        category: "open",
        importance: 2,
      }),
    ];

    const groups = buildCategoryTrees(catalog);
    expect(groups).toHaveLength(1);

    const open = groups[0]!;
    expect(open.roots).toHaveLength(1); // e4
    expect(open.roots[0]!.move).toBe("e4");

    const e5 = open.roots[0]!.children[0]!;
    expect(e5.move).toBe("e5");

    const nf3 = e5.children[0]!;
    expect(nf3.move).toBe("Nf3");

    const nc6 = nf3.children[0]!;
    expect(nc6.move).toBe("Nc6");

    // Should have 3 children: Bb5 (Ruy), Bc4 (Italian), d4 (Scotch)
    expect(nc6.children).toHaveLength(3);
  });

  it("attaches opening info at leaf nodes", () => {
    const catalog: OpeningCatalogEntry[] = [
      makeEntry({
        id: "ruy",
        name: "Ruy Lopez",
        firstMoves: "1. e4 e5 2. Nf3 Nc6 3. Bb5",
        category: "open",
        importance: 3,
      }),
    ];

    const groups = buildCategoryTrees(catalog);
    const e4 = groups[0]!.roots[0]!;
    const e5 = e4.children[0]!;
    const nf3 = e5.children[0]!;
    const nc6 = nf3.children[0]!;
    const bb5 = nc6.children[0]!;

    expect(bb5.opening).toBeDefined();
    expect(bb5.opening!.id).toBe("ruy");
    expect(bb5.opening!.name).toBe("Ruy Lopez");
    expect(bb5.opening!.importance).toBe(3);
  });

  it("sorts higher importance first", () => {
    const catalog: OpeningCatalogEntry[] = [
      makeEntry({
        id: "a",
        name: "A",
        firstMoves: "1. e4 a5",
        category: "semi-open",
        importance: 1,
      }),
      makeEntry({
        id: "b",
        name: "B",
        firstMoves: "1. e4 c5",
        category: "semi-open",
        importance: 3,
      }),
    ];

    const groups = buildCategoryTrees(catalog);
    const e4 = groups[0]!.roots[0]!;
    // c5 (importance 3) should come before a5 (importance 1)
    expect(e4.children[0]!.move).toBe("c5");
    expect(e4.children[1]!.move).toBe("a5");
  });

  it("omits categories with no entries", () => {
    const catalog: OpeningCatalogEntry[] = [
      makeEntry({
        id: "ruy",
        name: "Ruy Lopez",
        firstMoves: "1. e4 e5",
        category: "open",
      }),
    ];

    const groups = buildCategoryTrees(catalog);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.key).toBe("open");
  });

  it("preserves category order", () => {
    const catalog: OpeningCatalogEntry[] = [
      makeEntry({
        id: "a",
        name: "A",
        firstMoves: "1. Nh3",
        category: "unusual",
      }),
      makeEntry({
        id: "b",
        name: "B",
        firstMoves: "1. e4 e5",
        category: "open",
      }),
      makeEntry({
        id: "c",
        name: "C",
        firstMoves: "1. d4 d5",
        category: "closed",
      }),
    ];

    const groups = buildCategoryTrees(catalog);
    expect(groups.map((g) => g.key)).toEqual(["open", "closed", "unusual"]);
  });
});

describe("countOpeningsInTree", () => {
  it("counts all openings with default min importance", () => {
    const catalog: OpeningCatalogEntry[] = [
      makeEntry({
        id: "a",
        name: "A",
        firstMoves: "1. e4 e5",
        category: "open",
        importance: 1,
      }),
      makeEntry({
        id: "b",
        name: "B",
        firstMoves: "1. e4 d5",
        category: "open",
        importance: 3,
      }),
    ];

    const groups = buildCategoryTrees(catalog);
    expect(countOpeningsInTree(groups[0]!.roots)).toBe(2);
  });

  it("filters by minimum importance", () => {
    const catalog: OpeningCatalogEntry[] = [
      makeEntry({
        id: "a",
        name: "A",
        firstMoves: "1. e4 e5",
        category: "open",
        importance: 1,
      }),
      makeEntry({
        id: "b",
        name: "B",
        firstMoves: "1. e4 d5",
        category: "open",
        importance: 3,
      }),
      makeEntry({
        id: "c",
        name: "C",
        firstMoves: "1. e4 c5",
        category: "open",
        importance: 2,
      }),
    ];

    const groups = buildCategoryTrees(catalog);
    expect(countOpeningsInTree(groups[0]!.roots, 2)).toBe(2);
    expect(countOpeningsInTree(groups[0]!.roots, 3)).toBe(1);
  });
});

describe("searchTree", () => {
  it("finds openings matching by name", () => {
    const catalog: OpeningCatalogEntry[] = [
      makeEntry({
        id: "ruy",
        name: "Ruy Lopez",
        firstMoves: "1. e4 e5 2. Nf3 Nc6 3. Bb5",
        category: "open",
      }),
      makeEntry({
        id: "italian",
        name: "Italian Game",
        firstMoves: "1. e4 e5 2. Nf3 Nc6 3. Bc4",
        category: "open",
      }),
    ];

    const groups = buildCategoryTrees(catalog);
    const result = searchTree(groups[0]!.roots, "Ruy");
    expect(result.matchedIds.has("ruy")).toBe(true);
    expect(result.matchedIds.has("italian")).toBe(false);
  });

  it("finds openings matching by ECO code", () => {
    const catalog: OpeningCatalogEntry[] = [
      makeEntry({
        id: "ruy",
        name: "Ruy Lopez",
        eco: "C60",
        firstMoves: "1. e4 e5",
        category: "open",
      }),
      makeEntry({
        id: "sic",
        name: "Sicilian",
        eco: "B20",
        firstMoves: "1. e4 c5",
        category: "open",
      }),
    ];

    const groups = buildCategoryTrees(catalog);
    const result = searchTree(groups[0]!.roots, "C60");
    expect(result.matchedIds.has("ruy")).toBe(true);
    expect(result.matchedIds.has("sic")).toBe(false);
  });

  it("returns expand paths for matched nodes", () => {
    const catalog: OpeningCatalogEntry[] = [
      makeEntry({
        id: "ruy",
        name: "Ruy Lopez",
        firstMoves: "1. e4 e5 2. Nf3 Nc6 3. Bb5",
        category: "open",
      }),
    ];

    const groups = buildCategoryTrees(catalog);
    const result = searchTree(groups[0]!.roots, "Ruy");
    expect(result.expandPaths.size).toBeGreaterThan(0);
    expect(result.expandPaths.has("e4")).toBe(true);
  });

  it("returns empty results for no match", () => {
    const catalog: OpeningCatalogEntry[] = [
      makeEntry({
        id: "ruy",
        name: "Ruy Lopez",
        firstMoves: "1. e4 e5",
        category: "open",
      }),
    ];

    const groups = buildCategoryTrees(catalog);
    const result = searchTree(groups[0]!.roots, "xyznonexistent");
    expect(result.matchedIds.size).toBe(0);
  });
});
