# Data Storage & Build Pipeline

## Storage Strategy: Hybrid Static + Dynamic + Ephemeral

### 1. Static Opening Data (bundled with the app)

- **`src/data/openingCatalog.json`** — Lightweight catalog of 146 openings containing id, name, ECO code, category, and importance rating. Imported directly at build time via `loadOpeningCatalog()`.
- **`public/openings/{id}.json`** — 146 individual JSON files with full move trees, annotations, and variations. Lazy-loaded via `fetch()` when the user selects an opening, then cached in an in-memory `Map`.

### 2. User Settings (localStorage)

- **`SettingsModel`** persists theme, board color scheme, and sound preference to `localStorage` under the key `"chess-opening-trainer-settings"`.
- A MobX `reaction` automatically syncs observable changes to localStorage.
- Includes fallback error handling for unavailable localStorage.

### 3. Spaced-Repetition Cards (in-memory only, for now)

- **`CardStore`** holds cards in a `Map<string, Card>`.
- Each card stores a `positionFen`, `correctMoves[]`, and SM-2 algorithm fields (easinessFactor, interval, nextReviewDate).
- Cards are created dynamically from opening variations via `CardStore.createCardsForVariation()`.
- **Planned**: Will be backed by IndexedDB — the `idb` library (v8.0.3) is already a dependency but not yet wired up.

### 4. Service Worker Cache (offline support)

- The Vite PWA plugin caches opening JSON files with a `CacheFirst` strategy.
- Cache name: `"opening-data-cache"`, max 50 entries, 30-day expiry.
- Enables offline access to previously loaded openings.

## Data Build Pipeline (`scripts/`)

The opening data is compiled from upstream sources via `build-database.ts`:

1. **Fetch Lichess TSV data** (or use cached version)
2. **`compile-opening-data.ts`** — Parse TSV into move trees, build opening structures
3. **`extend-variants.ts`** — Extend short variants with eco.json data
4. **`fetch-wikibooks-annotations.ts`** — Add Wikibooks annotations (cached, no network at build)
5. **Data consistency tests** — Validate output integrity

### Build Output

- `/src/data/openingCatalog.json` — 146 openings, ~1000+ total variations
- `/public/openings/*.json` — 146 individual opening files with full move trees

## Key Data Types

### OpeningTypes (`src/types/OpeningTypes.ts`)

| Type | Description |
|------|-------------|
| `Opening` | Complete opening: id, name, ECO code, variations[] |
| `Variation` | Named variation with moves (tree root) and PGN |
| `MoveNode` | Tree node: move, FEN, annotation, children[], isMainLine |
| `Annotation` | Move rationale, strategic theme, source (wikibooks/generated) |
| `OpeningCatalogEntry` | Lightweight catalog entry for listing UI |
| `ImportanceRating` | 1-3 scale (3=essential, 2=important, 1=niche) |
| `OpeningCategory` | 7 categories: open, semi-open, closed, indian, semi-closed, flank, unusual |

### CardTypes (`src/types/CardTypes.ts`)

| Type | Description |
|------|-------------|
| `Card` | Spaced-repetition card: positionFen, correctMoves[], SM-2 fields |
| `CardGrade` | 0 (wrong), 3 (correct with difficulty), 5 (perfect) |
| `ReviewSession` | Active review: cards[], currentIndex, results Map |

### ChessTypes (`src/types/ChessTypes.ts`)

| Type | Description |
|------|-------------|
| `Square` | a1-h8 notation |
| `Piece` | type + color |
| `Move` | from, to, SAN notation, piece type, color, flags |
| `GameState` | FEN, turn, moveHistory[], status |

## Data Flow

```
openingCatalog.json (bundled)
    |
    v
loadOpeningCatalog() -> OpeningCatalogEntry[] (shown in UI)
    |
    v
User selects opening
    |
    v
loadOpeningData(openingId) -> fetch /openings/{id}.json
    |
    v
Cached in Map<string, Opening>
    |
    v
Opening data used in Learn/Play/Memorize modes
```

## FEN and PGN Formats

### FEN (Forsyth-Edwards Notation)

A compact string describing a single board position. Example (starting position):

```
rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
```

Six space-separated fields:

1. **Piece placement** — Rows from rank 8 to rank 1, `/`-separated. Lowercase = black, uppercase = white. Numbers = consecutive empty squares.
2. **Active color** — `w` or `b`
3. **Castling availability** — `K`/`Q`/`k`/`q` or `-`
4. **En passant target square** — e.g. `e3` or `-`
5. **Halfmove clock** — Moves since last capture/pawn advance (50-move rule)
6. **Fullmove number** — Starts at 1, incremented after black's move

### PGN (Portable Game Notation)

Human-readable format for recording entire games or opening lines:

```
[Event "Training"]
[White "Player"]
[Black "Opponent"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 1-0
```

- **Headers** — Key-value pairs in `[brackets]`
- **Moves** — Standard algebraic notation
- **Comments** `{like this}` and **variations** `(like this)` supported

## Persistence Summary

| Data Type | Storage | Persistence | Implementation |
|-----------|---------|-------------|----------------|
| Opening catalog | `src/data/openingCatalog.json` | Bundled (static) | Imported as JSON |
| Opening detail | `public/openings/{id}.json` | Static files | Fetch API + memory cache |
| User settings | localStorage | Automatic via MobX reaction | JSON stringify |
| Spaced-rep cards | Memory Map | None currently | Pending IndexedDB |
| Offline cache | Service Worker | CacheFirst strategy | vite-plugin-pwa |
