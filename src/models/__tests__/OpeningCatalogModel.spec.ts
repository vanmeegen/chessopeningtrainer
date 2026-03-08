import { describe, it, expect } from "vitest";
import { OpeningCatalogModel } from "../OpeningCatalogModel";

describe("OpeningCatalogModel", () => {
  describe("initial state", () => {
    it("should load catalog entries from bundled data", () => {
      const model = new OpeningCatalogModel();
      expect(model.entries.length).toBeGreaterThan(0);
    });

    it("should have empty search query", () => {
      const model = new OpeningCatalogModel();
      expect(model.searchQuery).toBe("");
    });

    it("should default groupBy to category", () => {
      const model = new OpeningCatalogModel();
      expect(model.groupBy).toBe("category");
    });
  });

  describe("filteredEntries", () => {
    it("should return all entries when search query is empty", () => {
      const model = new OpeningCatalogModel();
      expect(model.filteredEntries.length).toBe(model.entries.length);
    });

    it("should filter by opening name (case-insensitive)", () => {
      const model = new OpeningCatalogModel();
      model.setSearchQuery("sicilian");
      expect(model.filteredEntries.length).toBeGreaterThan(0);
      for (const entry of model.filteredEntries) {
        expect(entry.name.toLowerCase()).toContain("sicilian");
      }
    });

    it("should filter by ECO code (case-insensitive)", () => {
      const model = new OpeningCatalogModel();
      model.setSearchQuery("b20");
      expect(model.filteredEntries.length).toBeGreaterThan(0);
      for (const entry of model.filteredEntries) {
        expect(
          entry.name.toLowerCase().includes("b20") ||
            entry.eco.toLowerCase().includes("b20"),
        ).toBe(true);
      }
    });

    it("should be case-insensitive for name search", () => {
      const model = new OpeningCatalogModel();
      model.setSearchQuery("FRENCH");
      const upperResults = model.filteredEntries;
      model.setSearchQuery("french");
      const lowerResults = model.filteredEntries;
      expect(upperResults.length).toBe(lowerResults.length);
      expect(upperResults.length).toBeGreaterThan(0);
    });

    it("should return empty array when no matches found", () => {
      const model = new OpeningCatalogModel();
      model.setSearchQuery("xyznonexistent123");
      expect(model.filteredEntries.length).toBe(0);
    });
  });

  describe("groupedEntries", () => {
    it("should group by category", () => {
      const model = new OpeningCatalogModel();
      model.setGroupBy("category");
      const grouped = model.groupedEntries;
      expect(grouped.size).toBeGreaterThan(0);

      // Verify known categories exist
      expect(grouped.has("e4")).toBe(true);
      expect(grouped.has("d4")).toBe(true);

      // Verify all entries in a group have the correct category
      const e4Entries = grouped.get("e4")!;
      for (const entry of e4Entries) {
        expect(entry.category).toBe("e4");
      }
    });

    it("should group alphabetically by first letter", () => {
      const model = new OpeningCatalogModel();
      model.setGroupBy("alphabetical");
      const grouped = model.groupedEntries;
      expect(grouped.size).toBeGreaterThan(0);

      // Verify entries are grouped by first letter
      for (const [letter, entries] of grouped) {
        expect(letter).toHaveLength(1);
        for (const entry of entries) {
          expect((entry.name[0] ?? "").toUpperCase()).toBe(letter);
        }
      }
    });

    it("should respect search filter in grouped results", () => {
      const model = new OpeningCatalogModel();
      model.setSearchQuery("king");
      model.setGroupBy("category");
      const grouped = model.groupedEntries;

      let totalEntries = 0;
      for (const entries of grouped.values()) {
        totalEntries += entries.length;
      }
      expect(totalEntries).toBe(model.filteredEntries.length);
    });
  });

  describe("setSearchQuery", () => {
    it("should update search query", () => {
      const model = new OpeningCatalogModel();
      model.setSearchQuery("ruy lopez");
      expect(model.searchQuery).toBe("ruy lopez");
    });
  });

  describe("setGroupBy", () => {
    it("should update groupBy mode", () => {
      const model = new OpeningCatalogModel();
      model.setGroupBy("alphabetical");
      expect(model.groupBy).toBe("alphabetical");
    });
  });
});
