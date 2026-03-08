import { makeAutoObservable, computed } from "mobx";
import type { OpeningCatalogEntry } from "../types/OpeningTypes";
import { loadOpeningCatalog } from "../utils/OpeningDataLoader";

/** How to group catalog entries in the UI */
export type CatalogGroupBy = "category" | "alphabetical";

/**
 * MobX observable model for the opening catalog.
 * Provides filtering and grouping of the bundled opening catalog entries.
 */
export class OpeningCatalogModel {
  entries: OpeningCatalogEntry[];
  searchQuery: string = "";
  groupBy: CatalogGroupBy = "category";

  constructor() {
    this.entries = loadOpeningCatalog();
    makeAutoObservable(this, {
      filteredEntries: computed,
      groupedEntries: computed,
    });
  }

  get filteredEntries(): OpeningCatalogEntry[] {
    if (this.searchQuery === "") {
      return this.entries;
    }
    const query = this.searchQuery.toLowerCase();
    return this.entries.filter(
      (entry) =>
        entry.name.toLowerCase().includes(query) ||
        entry.eco.toLowerCase().includes(query),
    );
  }

  get groupedEntries(): Map<string, OpeningCatalogEntry[]> {
    const result = new Map<string, OpeningCatalogEntry[]>();
    for (const entry of this.filteredEntries) {
      const key =
        this.groupBy === "category"
          ? entry.category
          : (entry.name[0] ?? "").toUpperCase();
      const group = result.get(key);
      if (group) {
        group.push(entry);
      } else {
        result.set(key, [entry]);
      }
    }
    return result;
  }

  setSearchQuery(query: string): void {
    this.searchQuery = query;
  }

  setGroupBy(mode: CatalogGroupBy): void {
    this.groupBy = mode;
  }
}
