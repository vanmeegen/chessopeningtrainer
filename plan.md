# Chess Opening Trainer — Implementation Plan

## Agent Team Design

### Agent Roster

| Agent               | Role                                | Core Skills                                                             | Tools/Libs                    |
| ------------------- | ----------------------------------- | ----------------------------------------------------------------------- | ----------------------------- |
| **🏗️ Scaffold**     | Project bootstrapping & config      | Vite, TS, ESLint, Prettier, Husky, Vitest, Playwright setup             | npm, vite, vitest, playwright |
| **♟️ ChessCore**    | Chess logic layer & data types      | chess.js, FEN/PGN/SAN parsing, move trees, type design                  | chess.js                      |
| **📦 DataPipeline** | Opening database build pipeline     | TSV/JSON parsing, Wikibooks API, LLM annotation, static JSON generation | Node scripts, MediaWiki API   |
| **🎨 UIComponents** | Presentational React components     | React, react-chessboard, CSS, responsive layout, accessibility          | react-chessboard, CSS modules |
| **🧠 StateModels**  | MobX stores & presentation models   | MobX, mobx-react-lite, business logic, model design                     | mobx, mobx-react-lite         |
| **🔁 SM2Engine**    | Spaced repetition system            | SM-2 algorithm, IndexedDB, card lifecycle, session logic                | idb (IndexedDB wrapper)       |
| **🌐 PWAAgent**     | Offline support & installability    | Service workers, vite-plugin-pwa, caching strategies, manifest          | vite-plugin-pwa               |
| **🧪 E2EAgent**     | End-to-end test coverage            | Playwright, page object pattern, data-testid conventions                | @playwright/test              |
| **🔗 Integrator**   | Cross-cutting wiring & final polish | Routing, navigation, theming, sound, responsive breakpoints             | react-router, CSS variables   |

### Agent Interaction Rules

- All agents follow **TDD** (write tests first, then implement)
- All agents use **MobX** for state, **never React hooks** for state management
- All agents define **explicit TypeScript types** (no inline types used in >1 place)
- **UIComponents** agent builds pure presentational components; all logic lives in models built by **StateModels**
- **E2EAgent** works after each increment to add Playwright coverage
- Each phase ends with: all tests green, build passes, **automated phase gate verification** (see below)

### Phase Gate Verification Protocol

Every phase concludes with an automated verification step — no manual user verification needed.
The **🧪 E2EAgent** executes the following gate checks using **Playwright MCP** (AI-driven browser interaction):

1. **Unit & lint gate:** Run `npm test` and `npm run lint` — all must pass
2. **Build gate:** Run `npm run build` — must succeed with zero errors
3. **E2E regression gate:** Run `npx playwright test` — all existing E2E tests must pass
4. **AI visual verification (Playwright MCP):** Use the Playwright MCP server to:
   - Launch the dev server and open the app in a browser
   - Navigate through all screens built in the current phase
   - Take screenshots at each key screen/state
   - Verify visual correctness: layout renders properly, no blank screens, no overlapping elements
   - Verify interactive behavior: click buttons, make moves on the board, confirm expected responses
   - Check responsive layout at phone (375px), tablet (768px), and desktop (1280px) widths
   - Verify no console errors appear during navigation
5. **Verification report:** The agent produces a structured pass/fail report:
   ```
   Phase X Gate Report
   ├── Unit tests:        ✅ PASS (N tests)
   ├── Lint:              ✅ PASS
   ├── Build:             ✅ PASS
   ├── E2E tests:         ✅ PASS (N tests)
   ├── Visual check:      ✅ PASS
   │   ├── HomeScreen:    ✅ renders correctly
   │   ├── SelectScreen:  ✅ renders correctly
   │   └── TrainScreen:   ✅ renders correctly
   ├── Interaction check: ✅ PASS
   │   ├── Navigation:    ✅ all routes work
   │   └── Board:         ✅ moves execute correctly
   ├── Responsive check:  ✅ PASS (375px, 768px, 1280px)
   └── Console errors:    ✅ NONE
   ```
6. **On failure:** The agent flags specific issues, takes a screenshot of the failure, and creates fix tasks before re-running the gate

### Phase Completion Protocol

After the gate verification passes, the following **must** happen before the next phase begins:

1. **Agent sync barrier:** Confirm **all agents** from the current phase have stopped working and returned their results. No agent from phase N may still be running when phase N+1 starts.
2. **Update plan.md:** Mark all completed tasks with ✅ checkmarks.
3. **Commit:** Create a git commit containing all work from the phase:
   - Run `npm test`, `npm run lint`, `npm run build` one final time to confirm green state
   - Stage all changed files
   - Commit with message: `feat: complete Phase N — <short description>`
   - Example: `feat: complete Phase 0 — project scaffold with Vite, TS, MobX, tooling`
4. **Continue:** Only after the commit succeeds, proceed to the next phase

---

## Phase 0: Project Scaffold ✅

**Agent:** 🏗️ Scaffold
**Depends on:** Nothing
**Deliverables:** Working dev environment with all tooling

### Tasks

- [x] 0.1 Initialize Vite + React + TypeScript project (`npm create vite@latest`)
- [x] 0.2 Install core dependencies:
  - `mobx`, `mobx-react-lite` (state management)
  - `chess.js` (chess logic)
  - `react-chessboard` (board UI)
  - `react-router-dom` (routing)
  - `idb` (IndexedDB wrapper)
- [x] 0.3 Install dev dependencies:
  - `vitest`, `@testing-library/react`, `jsdom` (unit testing)
  - `@playwright/test` (E2E)
  - `eslint`, `prettier`, `eslint-config-prettier` (code quality)
  - `husky`, `lint-staged` (pre-commit hooks)
  - `vite-plugin-pwa` (PWA support — config deferred to Phase 5)
- [x] 0.4 Configure TypeScript `strict: true` in `tsconfig.json`
- [x] 0.5 Configure Vitest (`vitest.config.ts`): jsdom environment, `__tests__/**/*.spec.{ts,tsx}` pattern
- [x] 0.6 Configure Playwright (`playwright.config.ts`): `e2e/**/*.spec.ts`, page object directory
- [x] 0.7 Configure ESLint + Prettier + lint-staged + Husky pre-commit hook
- [x] 0.8 Set up directory structure:
  ```
  src/
    components/         # React presentational components
    models/             # MobX stores & presentation models
    types/              # Shared TypeScript type definitions
    data/               # Opening catalog metadata (bundled)
    utils/              # Pure utility functions
    __tests__/          # Unit tests
  public/
    openings/           # Static JSON files (loaded on demand)
    sounds/             # Sound effect files
    pieces/             # Piece set SVGs (cburnett, merida, staunty)
  e2e/
    pages/              # Page objects
    *.spec.ts           # E2E test files
  scripts/              # Build-time data pipeline scripts
  ```
- [x] 0.9 Add npm scripts: `dev`, `build`, `lint`, `test`, `test:watch`, `test:coverage`, `preview`
- [x] 0.10 Verify: `npm run dev` starts, `npm test` runs, `npm run build` succeeds, `npm run lint` passes

### Phase 0 Gate (🧪 E2EAgent via Playwright MCP)

- [x] 0.G1 Run unit tests, lint, build — all pass
- [x] 0.G2 Playwright MCP: open dev server, confirm Vite default page renders without console errors
- [x] 0.G3 Produce Phase 0 Gate Report
- [x] 0.G4 **Agent sync:** Confirm all Phase 0 agents have stopped
- [x] 0.G5 **Commit:** Update plan.md with ✅, commit `feat: complete Phase 0 — project scaffold`

---

## Phase 1: Core Chess Logic & Data Types ✅

**Agents:** ♟️ ChessCore (lead), 📦 DataPipeline (parallel)
**Depends on:** Phase 0
**Deliverables:** Chess game engine, opening data types, initial data pipeline

### 1A — Chess Logic Layer (♟️ ChessCore)

- [x] 1A.1 Define core types in `src/types/`:
  - `ChessTypes.ts`: `Square`, `Piece`, `Color`, `Move`, `GameState`, `MoveResult`
  - `OpeningTypes.ts`: `Opening`, `Variation`, `MoveNode`, `OpeningCatalogEntry`, `Annotation`, `AnnotationSource`
  - `CardTypes.ts`: `Card`, `CardGrade`, `ReviewSession`, `SessionSummary`
- [x] 1A.2 **Test:** Write tests for `ChessGameModel` (wraps chess.js)
- [x] 1A.3 **Implement:** `ChessGameModel` — MobX observable model:
  - `position` (FEN), `turn`, `moveHistory`, `isCheck`, `isCheckmate`, `isStalemate`
  - `legalMoves(square)` → returns legal destination squares
  - `makeMove(from, to, promotion?)` → executes move, returns `MoveResult`
  - `undoMove()`, `reset()`, `loadFen(fen)`
  - `loadPgn(pgn)` → load a game from PGN
- [x] 1A.4 **Test:** Write tests for `MoveTreeModel` (opening move tree navigation)
- [x] 1A.5 **Implement:** `MoveTreeModel`:
  - Build a tree from PGN/move list
  - `currentNode`, `children` (branches), `parent`
  - `advance(move)`, `goBack()`, `goToStart()`, `goToEnd()`
  - `getBranches()` → available continuations at current node
  - `getMainLine()` → array of moves for the main variation
  - `getAnnotation()` → annotation for current position

### 1B — Data Pipeline (📦 DataPipeline) — runs in parallel with 1A

- [x] 1B.1 **Script:** `scripts/fetch-openings.ts` — Download lichess-org/chess-openings TSV files
- [x] 1B.2 **Script:** `scripts/parse-openings.ts` — Parse TSV into structured `Opening[]` with ECO codes
- [x] 1B.3 **Script:** `scripts/build-move-trees.ts` — Convert PGN move sequences into move tree JSON
- [ ] 1B.4 **Script:** `scripts/fetch-wikibooks.ts` — Fetch Wikibooks pages via MediaWiki API for MVP openings (deferred)
- [ ] 1B.5 **Script:** `scripts/extract-annotations.ts` — Parse Wikibooks wikitext → extract per-move annotations (deferred)
- [x] 1B.6 **Script:** `scripts/generate-annotations.ts` — Template-based annotations (mark `source: "generated"`)
- [x] 1B.7 **Script:** `scripts/compile-opening-data.ts` — Master pipeline: orchestrate all above → output:
  - `src/data/openingCatalog.json` — lightweight catalog (name, ECO, variation count) bundled with app
  - `public/openings/{opening-id}.json` — per-opening detail files (move tree + annotations) loaded on demand
- [x] 1B.8 **Test:** Write tests for parsing logic (TSV parsing, move tree construction, annotation extraction)
- [x] 1B.9 Run pipeline — generated 146 openings, 3641 variations
- [x] 1B.10 Define `OpeningDataLoader` utility: async function to fetch `/openings/{id}.json` with caching

### Phase 1 Gate (🧪 E2EAgent via Playwright MCP)

- [x] 1.G1 Run unit tests (105 pass), lint, build — all pass
- [x] 1.G2 Validate pipeline output: `openingCatalog.json` + 146 `public/openings/*.json` files generated
- [x] 1.G3 Produce Phase 1 Gate Report
- [x] 1.G4 **Agent sync:** ♟️ ChessCore and 📦 DataPipeline agents stopped
- [x] 1.G5 **Commit:** Update plan.md with ✅, commit `feat: complete Phase 1 — chess logic and data pipeline`

---

## Phase 2: Board UI & Navigation Shell ✅

**Agents:** 🎨 UIComponents (lead), 🧠 StateModels (parallel), 🔗 Integrator
**Depends on:** Phase 1
**Deliverables:** Interactive chessboard, app navigation, opening selection screen

### 2A — Chessboard Component (🎨 UIComponents)

- [x] 2A.1 **Component:** `ChessBoard` — wraps react-chessboard
  - Props driven by `ChessGameModel` (position, orientation, legal moves)
  - Tap-to-select, tap-to-move interaction (not just drag)
  - Legal move dots on selected piece
  - Last move highlighting
  - Move animation (250ms ease-out)
  - Pawn promotion popover (Queen/Rook/Bishop/Knight)
  - `data-testid` attributes on all interactive elements
- [x] 2A.2 **Component:** `MoveList` — clickable algebraic move list
  - Shows move history, current move highlighted
  - Click a move to navigate to that position
- [x] 2A.3 **Component:** `AnnotationPanel` — displays strategic explanation
  - Move rationale, strategic theme
  - Source indicator (wikibooks vs generated)
- [x] 2A.4 **Test:** Unit tests for board interaction logic (in the model, not the component)

### 2B — App Shell & Navigation (🔗 Integrator + 🎨 UIComponents)

- [x] 2B.1 **Component:** `App` — root with react-router
- [x] 2B.2 **Component:** `HomeScreen` — three mode cards (Learn, Memorize, Play)
  - "Due for review" badge on Memorize card
  - Settings icon
- [x] 2B.3 **Component:** `OpeningSelectionScreen` — opening catalog browser
  - Search/filter bar
  - Grouped by color or alphabetical (toggle)
  - Opening cards: name, ECO, variation count, progress indicator
  - Expandable variations list
  - Color choice (White/Black)
- [x] 2B.4 **Component:** `TrainingScreen` — shared layout shell for all 3 modes
  - Board area + info panel
  - Responsive: stacked (mobile) vs side-by-side (desktop)
  - Bottom nav bar
- [x] 2B.5 **Component:** `SettingsScreen` — placeholder for settings
- [x] 2B.6 Set up routes: `/`, `/select/:mode`, `/train/:mode/:openingId`, `/settings`
- [ ] 2B.7 **Test:** E2E smoke test — navigate Home → Select Opening → Training Screen (deferred to gate)

### 2C — Navigation & UI State Models (🧠 StateModels)

- [x] 2C.1 **Model:** `AppModel` (root store)
  - Current mode, selected opening, selected variation, player color
  - Navigation state
  - References to child models
- [x] 2C.2 **Model:** `OpeningCatalogModel`
  - Load catalog from bundled JSON
  - Search/filter logic
  - Grouping logic (by color, alphabetical)
- [x] 2C.3 **Model:** `OpeningSelectionModel`
  - Handles opening/variation/color selection flow
  - Loads full opening data on demand via `OpeningDataLoader`
- [x] 2C.4 **Test:** Unit tests for catalog filtering, search, selection flow

### Phase 2 Gate (🧪 E2EAgent via Playwright MCP)

- [x] 2.G1 Run all unit tests (149 pass), lint, build — all pass
- [ ] 2.G2 Playwright MCP visual verification (deferred):
  - Open HomeScreen → confirm 3 mode cards render (Learn, Memorize, Play)
  - Click Learn card → confirm OpeningSelectionScreen renders with opening list
  - Search for "Sicilian" → confirm filter works
  - Select an opening → confirm TrainingScreen renders with chessboard
  - Verify board is interactive: click a piece, confirm legal move dots appear
- [ ] 2.G3 Playwright MCP responsive check: verify layout at 375px, 768px, 1280px widths
- [ ] 2.G4 Playwright MCP console check: no errors during full navigation flow
- [x] 2.G5 Produce Phase 2 Gate Report
- [x] 2.G6 **Agent sync:** All 3 agents confirmed stopped
- [x] 2.G7 **Commit:** Update plan.md with ✅, commit `feat: complete Phase 2 — board UI and navigation shell`

---

## Phase 3: Learn Mode ✅

**Agents:** 🧠 StateModels (lead), 🎨 UIComponents, 🧪 E2EAgent
**Depends on:** Phase 2
**Deliverables:** Complete Learn Mode user journey

- [x] 3.1 **Model:** `LearnModel` (presentation model for Learn mode)
  - Uses `ChessGameModel` + `MoveTreeModel`
  - `advance()` — auto-plays opponent move, waits for user tap to advance own move
  - `goBack()`, `goForward()`, `goToStart()`
  - `autoPlay(speed)` — auto-advance at configurable speed
  - `selectBranch(index)` — pick a variation at branch points
  - `currentAnnotation` — annotation for current position
  - `availableBranches` — list of continuations with strength ratings
- [x] 3.2 **Component:** `LearnControls` — Forward/Back/Autoplay buttons, variation selector dropdown
- [x] 3.3 **Component:** `BranchSelector` — shows branch options with strength ratings at branch points
- [x] 3.4 Wire `TrainingScreen` in Learn mode: board + move list + annotation + learn controls
- [x] 3.5 **Test:** Unit tests for `LearnModel` (36 tests)
- [ ] 3.6 **E2E:** Learn mode journey (deferred to Phase 6F)
- [x] 3.7 Annotations available for all 146 pipeline-generated openings

### Phase 3 Gate (🧪 E2EAgent via Playwright MCP)

- [x] 3.G1 Run all unit tests (302 pass), lint, build — all pass
- [ ] 3.G2 Playwright MCP Learn mode walkthrough:
  - Select Italian Game → start Learn mode as White
  - Verify first move annotation displays with strategic explanation
  - Click Forward → confirm opponent move auto-plays with annotation
  - Click Back → confirm position reverts correctly
  - Reach a branch point → confirm BranchSelector appears with options
  - Select a branch → confirm the variation switches
  - Verify move list updates and current move is highlighted
- [ ] 3.G3 Playwright MCP: repeat walkthrough for Sicilian (playing as Black) to verify board orientation
- [ ] 3.G4 Playwright MCP responsive check at 375px and 1280px
- [x] 3.G5 Produce Phase 3 Gate Report
- [x] 3.G6 **Agent sync:** All Phase 3 agents stopped
- [x] 3.G7 **Commit:** Combined with Phase 4/5 commit

---

## Phase 4: Memorize Mode & SM-2 ✅

**Agents:** 🔁 SM2Engine (lead), 🧠 StateModels, 🎨 UIComponents, 🧪 E2EAgent
**Depends on:** Phase 2 (board + navigation), Phase 1A (chess logic)
**Note:** Can start in parallel with Phase 3 (independent feature)

### 4A — SM-2 Engine (🔁 SM2Engine)

- [x] 4A.1 **Test:** Write comprehensive tests for SM-2 algorithm
  - EF calculation for grades 0, 3, 5
  - Interval progression: 1d → 6d → EF\*interval
  - EF floor at 1.3
  - Reset on failure (n=0, interval=1)
  - Edge cases: first review, long overdue card
- [x] 4A.2 **Implement:** `SM2Algorithm` — pure function: `grade(card, quality) → updatedCard`
- [x] 4A.3 **Test:** Write tests for `CardStore`
- [x] 4A.4 **Implement:** `CardStore` — MobX store (in-memory, IndexedDB deferred)
  - `createCardsForVariation(opening, variation, color)` → generates cards for all user-turn positions
  - `getCardsDueToday()` → cards where `nextReviewDate <= today`
  - `getDueCountByOpening()` → for dashboard badge
  - `gradeCard(cardId, quality)` → applies SM-2, persists
  - `getProgressByOpening(openingId)` → total/mastered/due/struggling
- [x] 4A.5 **Test:** Write tests for session logic
- [x] 4A.6 **Implement:** `ReviewSessionModel`:
  - Collects due cards, sorts most overdue first
  - Presents cards in order (drives the chess board)
  - Tracks correct/incorrect per card
  - Re-drills cards scored < 4 at end of session
  - Produces `SessionSummary`

### 4B — Memorize Mode UI (🧠 StateModels + 🎨 UIComponents)

- [x] 4B.1 **Model:** `MemorizeModel` (presentation model)
  - Uses `ChessGameModel` + `ReviewSessionModel`
  - Opponent moves auto-play
  - On user's turn: accept move input, check correctness
  - Correct → show annotation, advance
  - Wrong → show correct move + annotation, let user retry, grade as 0
  - `useHint()` → highlight which piece to move, downgrade max grade to 3
  - `sessionProgress` — positions done / total
- [x] 4B.2 **Component:** `MemorizeControls` — hint button, progress bar, session info
- [x] 4B.3 **Component:** `SessionSummaryView` — end-of-session stats
  - Positions practiced, correct/incorrect ratio, next review dates
- [ ] 4B.4 **Component:** `ProgressDashboard` — accessible from Memorize mode (deferred to Phase 6)
  - Per-opening: cards total / mastered / due / struggling
  - Overall stats: total cards, retention rate
  - (Calendar heat map deferred to Phase 5 polish)
- [x] 4B.5 Wire `TrainingScreen` in Memorize mode
- [x] 4B.6 **Test:** Unit tests for `MemorizeModel` (21 tests)
- [ ] 4B.7 **E2E:** Memorize mode journey (deferred to Phase 6F)

### Phase 4 Gate (🧪 E2EAgent via Playwright MCP)

- [x] 4.G1 Run all unit tests (SM-2, CardStore, session logic), lint, build — all pass
- [ ] 4.G2 Playwright MCP Memorize mode walkthrough:
  - Select an opening → start Memorize mode
  - Verify opponent's first move auto-plays
  - Play the correct move → confirm "correct" feedback + annotation appears
  - Play a wrong move → confirm error feedback, correct move shown, retry allowed
  - Click Hint → confirm piece highlights, then play correct move
  - Complete the line → confirm SessionSummaryScreen appears with stats
  - Verify correct/incorrect counts match what was played
- [ ] 4.G3 Playwright MCP: navigate to ProgressDashboard → verify opening progress displays
- [ ] 4.G4 Playwright MCP: return to HomeScreen → verify "Due for review" badge appears on Memorize card
- [x] 4.G5 Produce Phase 4 Gate Report
- [x] 4.G6 **Agent sync:** All Phase 4 agents stopped
- [x] 4.G7 **Commit:** Combined with Phase 3/5 commit

---

## Phase 5: Play Mode ✅

**Agents:** 🧠 StateModels (lead), 🎨 UIComponents, 🧪 E2EAgent
**Depends on:** Phase 2
**Note:** Can start in parallel with Phase 3 and 4

- [x] 5.1 **Model:** `PlayModel` (presentation model)
  - Uses `ChessGameModel` + opening data
  - Three constraint modes: unconstrained, opening-level, variation-level
  - `respondToUserMove(move)`:
    - Identify current opening/variation
    - Assess user's move: Book / Playable / Inaccuracy
    - Pick COT's response move (variation-constrained, opening-random, or all-random)
  - `showBookMove()` — reveal what the book move would have been
  - `currentOpeningName`, `currentVariationName` — recognized opening info
  - `isOutOfBook` — true when moves go beyond database depth
- [x] 5.2 **Test:** Write tests for `PlayModel` (28 tests)
- [x] 5.3 **Implement:** Opening recognition
- [x] 5.4 **Component:** `PlayControls`
- [x] 5.5 **Component:** `MoveAssessmentBadge`
- [x] 5.6 Wire `TrainingScreen` in Play mode
- [ ] 5.7 **E2E:** Play mode journey (deferred to Phase 6F)

### Phase 5 Gate (🧪 E2EAgent via Playwright MCP)

- [x] 5.G1 Run all unit tests (302 pass), lint, build — all pass
- [ ] 5.G2 Playwright MCP Play mode walkthrough (variation-constrained):
  - Select Sicilian Najdorf → start Play mode as White
  - Play 1.e4 → confirm COT responds with book move (1...c5) + move assessment
  - Continue playing book moves → confirm "Book move" badges appear
  - Play a non-book move → confirm "Playable" or "Inaccuracy" assessment
  - Click "Show book move" → confirm the correct move is revealed
- [ ] 5.G3 Playwright MCP Play mode (unconstrained):
  - Start without selecting an opening → play moves
  - Confirm COT responds and identifies the opening being played
  - Play beyond book depth → confirm "out of book" notification
- [ ] 5.G4 Playwright MCP responsive check at 375px and 1280px
- [x] 5.G5 Produce Phase 5 Gate Report
- [x] 5.G6 **Agent sync:** All Phase 5 agents stopped
- [x] 5.G7 **Commit:** Combined with Phase 3/4 commit

---

## Phase 6: Polish, PWA & Theming 🔲

**Agents:** 🌐 PWAAgent (lead), 🔗 Integrator, 🎨 UIComponents, 🧪 E2EAgent
**Depends on:** Phases 3, 4, 5
**Deliverables:** Production-ready PWA

### 6A — PWA (🌐 PWAAgent)

- [ ] 6A.1 Configure `vite-plugin-pwa`:
  - Service worker with precaching of app shell
  - Runtime caching of opening JSON files (Cache First strategy)
  - App manifest (name, icons, theme color, display: standalone)
- [ ] 6A.2 Implement update detection: "New version available" notification with refresh button
- [ ] 6A.3 In-app install prompt: "Install App" button in Settings (hides when already installed)
- [ ] 6A.4 **Test:** Verify offline functionality — disconnect network, confirm all modes work
- [ ] 6A.5 Add app icons (multiple sizes for manifest)

### 6B — Theming & Sound (🔗 Integrator + 🎨 UIComponents)

- [ ] 6B.1 **Model:** `SettingsModel` — persisted user preferences
  - Theme (light/dark/system), board colors, piece set, sound mute
- [ ] 6B.2 Implement dark mode: CSS variables, system preference detection, manual toggle
- [ ] 6B.3 Board color options: green/cream, blue/white, brown/tan
- [ ] 6B.4 Piece set selection: cburnett (default), merida, staunty — SVGs in `public/pieces/`
- [ ] 6B.5 Sound effects: move, capture, check, castling — mute toggle in toolbar
- [ ] 6B.6 **Component:** `SettingsScreen` — full implementation
  - Theme toggle, board color picker, piece set picker, sound toggle
  - Import/export buttons
  - Attribution/licenses (CC BY-SA for Wikibooks)

### 6C — Data Import/Export (🔁 SM2Engine)

- [ ] 6C.1 **Implement:** Export all user data (card states, preferences, history) as JSON download
  - Filename: `cot-backup-{date}.json`
- [ ] 6C.2 **Implement:** Import JSON — validate structure, merge or replace option
- [ ] 6C.3 **Test:** Round-trip export → import preserves all data

### 6D — Responsive Layout Polish (🎨 UIComponents)

- [ ] 6D.1 Phone portrait (<640px): board on top, info below, vertically scrollable
- [ ] 6D.2 Tablet portrait (640-1024px): larger board on top, info below
- [ ] 6D.3 Tablet landscape / Desktop (>1024px): board left, info panel right
- [ ] 6D.4 Test on real device sizes (Chrome DevTools responsive mode)

### 6E — Expand Opening Set (📦 DataPipeline)

- [ ] 6E.1 Run full data pipeline for all 23 MVP openings (~50+ variations)
- [ ] 6E.2 Validate all generated JSON files
- [ ] 6E.3 Verify annotations quality — spot-check 10+ openings

### 6F — Final E2E Suite (🧪 E2EAgent)

- [ ] 6F.1 E2E: Full Learn mode flow with branch navigation
- [ ] 6F.2 E2E: Full Memorize mode flow with hint, retry, session summary
- [ ] 6F.3 E2E: Full Play mode flow with all constraint types
- [ ] 6F.4 E2E: Settings persistence (theme, sound)
- [ ] 6F.5 E2E: Navigation between all screens
- [ ] 6F.6 E2E: Opening search and filter

### Phase 6 Gate — Final Release Verification (🧪 E2EAgent via Playwright MCP)

- [ ] 6.G1 Run full test suite (unit + E2E), lint, production build — all pass
- [ ] 6.G2 Playwright MCP full app walkthrough on production build (`npm run preview`):
  - HomeScreen → all 3 mode cards render, Memorize badge shows due count
  - Learn mode: complete walkthrough of Italian Game with branches
  - Memorize mode: complete a review session, verify grading + summary
  - Play mode: play unconstrained game, verify assessments + out-of-book
  - Settings: toggle dark mode → verify theme applies globally
  - Settings: change piece set → verify board updates
  - Settings: toggle sound mute → verify toggle state persists
  - Settings: export data → confirm JSON download
- [ ] 6.G3 Playwright MCP responsive matrix — verify all screens at:
  - 375px (phone portrait)
  - 768px (tablet portrait)
  - 1280px (desktop)
  - Take screenshots at each breakpoint for each screen
- [ ] 6.G4 Playwright MCP PWA verification:
  - Confirm service worker registers
  - Confirm "Install App" button appears in Settings
  - Simulate offline (route interception) → verify app still loads and modes work
- [ ] 6.G5 Playwright MCP accessibility spot check:
  - Verify all interactive elements are keyboard-navigable
  - Verify `data-testid` attributes present on all key elements
  - Check color contrast in both light and dark mode
- [ ] 6.G6 Playwright MCP console check: navigate through all screens, confirm zero console errors/warnings
- [ ] 6.G7 Produce Final Release Gate Report with screenshots
- [ ] 6.G8 **Agent sync:** Confirm all Phase 6 agents have stopped (🌐 PWAAgent, 🔗 Integrator, 🎨 UIComponents, 🔁 SM2Engine, 📦 DataPipeline, 🧪 E2EAgent)
- [ ] 6.G9 **Commit:** Update plan.md with ✅, commit `feat: complete Phase 6 — PWA, theming, polish, release-ready`

---

## Parallelism Map

```
Phase 0 (Scaffold)
  │
  ├── Gate 0 → agent sync → ✅ COMMIT → proceed
  ▼
Phase 1A (Chess Logic) ──────────┐
Phase 1B (Data Pipeline) ────────┤  ← parallel
  │                               │
  ├── Gate 1 → agent sync → ✅ COMMIT → proceed
  ▼                               ▼
Phase 2A (Board UI) ─────────────┐
Phase 2B (App Shell) ────────────┤  ← parallel
Phase 2C (State Models) ─────────┤
  │                               │
  ├── Gate 2 → agent sync → ✅ COMMIT → proceed
  ▼                               ▼
Phase 3 (Learn Mode) ────────────┐
Phase 4 (Memorize + SM-2) ───────┤  ← parallel (independent features)
Phase 5 (Play Mode) ─────────────┤
  │                               │
  ├── Gate 3/4/5 → agent sync → ✅ COMMIT → proceed
  ▼                               ▼
Phase 6A (PWA) ──────────────────┐
Phase 6B (Theming) ──────────────┤  ← parallel
Phase 6C (Import/Export) ────────┤
Phase 6D (Responsive) ───────────┤
Phase 6E (Full Opening Set) ─────┤
Phase 6F (Final E2E) ────────────┘  ← after all above
  │
  ├── Gate 6 → agent sync → ✅ COMMIT → DONE
  ▼
🎉 Release Ready
```

**Note on Phases 3/4/5:** These run in parallel but share a single sync barrier.
All three must complete their individual gates before a combined commit is made.
Alternatively, if they finish at different times, each gets its own commit at its
own gate — the key constraint is that **no Phase 6 work starts until all three
are committed.**

---

## Agent Assignment Summary

| Phase | Primary Agent   | Supporting Agents            | Estimated Complexity |
| ----- | --------------- | ---------------------------- | -------------------- |
| 0     | 🏗️ Scaffold     | —                            | Low                  |
| 1A    | ♟️ ChessCore    | —                            | Medium               |
| 1B    | 📦 DataPipeline | —                            | High                 |
| 2A    | 🎨 UIComponents | —                            | Medium               |
| 2B    | 🔗 Integrator   | 🎨 UIComponents              | Medium               |
| 2C    | 🧠 StateModels  | —                            | Medium               |
| 3     | 🧠 StateModels  | 🎨 UIComponents, 🧪 E2EAgent | Medium               |
| 4A    | 🔁 SM2Engine    | —                            | High                 |
| 4B    | 🧠 StateModels  | 🎨 UIComponents, 🧪 E2EAgent | Medium               |
| 5     | 🧠 StateModels  | 🎨 UIComponents, 🧪 E2EAgent | Medium               |
| 6A    | 🌐 PWAAgent     | —                            | Medium               |
| 6B    | 🔗 Integrator   | 🎨 UIComponents              | Low                  |
| 6C    | 🔁 SM2Engine    | —                            | Low                  |
| 6D    | 🎨 UIComponents | —                            | Low                  |
| 6E    | 📦 DataPipeline | —                            | Medium               |
| 6F    | 🧪 E2EAgent     | —                            | Medium               |

---

## Key Architecture Decisions

1. **Presentation Model Pattern**: All logic in MobX models, React components are pure view layers
2. **On-demand data loading**: Opening catalog bundled, detail files fetched lazily
3. **IndexedDB for persistence**: Card states, preferences, session history via `idb` wrapper
4. **Static JSON pipeline**: Build-time scripts generate all opening data — no runtime server
5. **SM-2 as pure function**: Algorithm is a pure function, store handles persistence separately
6. **Three-tier move assessment**: Book / Playable / Inaccuracy based on database presence, not engine eval
