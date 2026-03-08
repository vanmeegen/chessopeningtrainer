import type {
  OpeningCatalogEntry,
  OpeningCategory,
  OpeningTreeNode,
  CategoryGroup,
  ImportanceRating,
} from "../types/OpeningTypes";

type CategoryMeta = {
  key: OpeningCategory;
  label: string;
  subtitle: string;
};

const CATEGORY_ORDER: CategoryMeta[] = [
  { key: "open", label: "Open Games", subtitle: "(1.e4 e5)" },
  {
    key: "semi-open",
    label: "Semi-Open Games",
    subtitle: "(1.e4, not 1...e5)",
  },
  { key: "closed", label: "Closed Games", subtitle: "(1.d4 d5)" },
  { key: "indian", label: "Indian Defenses", subtitle: "(1.d4 Nf6)" },
  { key: "semi-closed", label: "Semi-Closed Games", subtitle: "(1.d4, other)" },
  { key: "flank", label: "Flank Openings", subtitle: "(1.c4, 1.Nf3)" },
  {
    key: "unusual",
    label: "Unusual Openings",
    subtitle: "(other first moves)",
  },
];

/**
 * Parse a PGN fragment into individual moves (plies).
 * "1. e4 e5 2. Nf3 Nc6" → ["e4", "e5", "Nf3", "Nc6"]
 */
function parseMoves(firstMoves: string): string[] {
  return firstMoves
    .replace(/\d+\.\s*/g, "")
    .split(/\s+/)
    .filter((m) => m.length > 0);
}

/**
 * Insert a sequence of moves into a trie, attaching opening info at the leaf.
 */
function insertIntoTrie(
  roots: OpeningTreeNode[],
  moves: string[],
  entry: OpeningCatalogEntry,
): void {
  let siblings = roots;

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i]!;
    let node = siblings.find((n) => n.move === move);

    if (!node) {
      node = { move, children: [] };
      siblings.push(node);
    }

    if (i === moves.length - 1) {
      node.opening = {
        id: entry.id,
        name: entry.name,
        eco: entry.eco,
        importance: entry.importance,
        variationCount: entry.variationCount,
      };
    }

    siblings = node.children;
  }
}

/**
 * Sort tree nodes: higher importance first, then alphabetical by move.
 */
function sortTree(nodes: OpeningTreeNode[]): void {
  nodes.sort((a, b) => {
    const impA = getMaxImportance(a);
    const impB = getMaxImportance(b);
    if (impA !== impB) return impB - impA;
    return a.move.localeCompare(b.move);
  });
  for (const node of nodes) {
    sortTree(node.children);
  }
}

/**
 * Get the maximum importance of an opening in a subtree.
 */
function getMaxImportance(node: OpeningTreeNode): ImportanceRating {
  let max: ImportanceRating = node.opening?.importance ?? 1;
  for (const child of node.children) {
    const childMax = getMaxImportance(child);
    if (childMax > max) max = childMax;
  }
  return max;
}

/**
 * Build category groups with move trees from the catalog.
 */
export function buildCategoryTrees(
  catalog: OpeningCatalogEntry[],
): CategoryGroup[] {
  const grouped = new Map<OpeningCategory, OpeningCatalogEntry[]>();
  for (const entry of catalog) {
    const list = grouped.get(entry.category) ?? [];
    list.push(entry);
    grouped.set(entry.category, list);
  }

  const result: CategoryGroup[] = [];
  for (const meta of CATEGORY_ORDER) {
    const entries = grouped.get(meta.key) ?? [];
    if (entries.length === 0) continue;

    const roots: OpeningTreeNode[] = [];
    for (const entry of entries) {
      const moves = parseMoves(entry.firstMoves);
      if (moves.length === 0) {
        // Opening with no moves — add as a root node with opening info
        roots.push({
          move: entry.name,
          children: [],
          opening: {
            id: entry.id,
            name: entry.name,
            eco: entry.eco,
            importance: entry.importance,
            variationCount: entry.variationCount,
          },
        });
      } else {
        insertIntoTrie(roots, moves, entry);
      }
    }

    sortTree(roots);

    result.push({
      key: meta.key,
      label: meta.label,
      subtitle: meta.subtitle,
      roots,
    });
  }

  return result;
}

/**
 * Count openings in a tree that match a minimum importance.
 */
export function countOpeningsInTree(
  nodes: OpeningTreeNode[],
  minImportance: ImportanceRating = 1,
): number {
  let count = 0;
  for (const node of nodes) {
    if (node.opening && node.opening.importance >= minImportance) count++;
    count += countOpeningsInTree(node.children, minImportance);
  }
  return count;
}

/**
 * Collect all opening IDs from tree nodes matching a search query.
 * Returns a set of node path keys that should be expanded.
 */
export function searchTree(
  nodes: OpeningTreeNode[],
  query: string,
  parentPath: string = "",
): { matchedIds: Set<string>; expandPaths: Set<string> } {
  const matchedIds = new Set<string>();
  const expandPaths = new Set<string>();
  const q = query.toLowerCase();

  for (const node of nodes) {
    const nodePath = parentPath ? `${parentPath}/${node.move}` : node.move;
    let hasMatch = false;

    if (
      node.opening &&
      (node.opening.name.toLowerCase().includes(q) ||
        node.opening.eco.toLowerCase().includes(q))
    ) {
      matchedIds.add(node.opening.id);
      hasMatch = true;
    }

    const childResult = searchTree(node.children, query, nodePath);
    if (childResult.matchedIds.size > 0) {
      hasMatch = true;
      for (const id of childResult.matchedIds) matchedIds.add(id);
      for (const path of childResult.expandPaths) expandPaths.add(path);
    }

    if (hasMatch) {
      expandPaths.add(nodePath);
    }
  }

  return { matchedIds, expandPaths };
}
