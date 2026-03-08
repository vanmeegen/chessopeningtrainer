/** Source of a move annotation */
export type AnnotationSource = "wikibooks" | "generated";

/** Annotation for a specific move in an opening */
export type Annotation = {
  moveRationale: string;
  strategicTheme: string;
  source: AnnotationSource;
};

/** A node in the opening move tree */
export type MoveNode = {
  move: string; // SAN notation, e.g. "e4", "Nf3"
  fen: string;
  annotation?: Annotation;
  children: MoveNode[];
  isMainLine: boolean;
};

/** A named variation within an opening */
export type Variation = {
  id: string;
  name: string;
  moves: MoveNode; // tree root
  pgn: string;
};

/** A complete opening with its variations */
export type Opening = {
  id: string;
  name: string;
  eco: string;
  variations: Variation[];
};

/** Importance rating: 3 = essential, 2 = important, 1 = niche */
export type ImportanceRating = 1 | 2 | 3;

/** The 7 chess-theory categories */
export type OpeningCategory =
  | "open"
  | "semi-open"
  | "closed"
  | "indian"
  | "semi-closed"
  | "flank"
  | "unusual";

/** Lightweight catalog entry for the opening list (bundled with app) */
export type OpeningCatalogEntry = {
  id: string;
  name: string;
  eco: string;
  variationCount: number;
  category: OpeningCategory;
  importance: ImportanceRating;
  firstMoves: string;
};

/** A node in the opening selection tree (move trie) */
export type OpeningTreeNode = {
  move: string;
  children: OpeningTreeNode[];
  opening?: {
    id: string;
    name: string;
    eco: string;
    importance: ImportanceRating;
    variationCount: number;
  };
};

/** A category group with its move tree */
export type CategoryGroup = {
  key: OpeningCategory;
  label: string;
  subtitle: string;
  roots: OpeningTreeNode[];
};
