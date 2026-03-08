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

/** Lightweight catalog entry for the opening list (bundled with app) */
export type OpeningCatalogEntry = {
  id: string;
  name: string;
  eco: string;
  variationCount: number;
  category: string;
};
