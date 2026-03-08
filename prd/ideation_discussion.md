# Ideation Discussion Summary

This document captures the discussion process that led from the initial idea (`ideation.md`) to the final product requirements (`prd.md`) for the Chess Opening Trainer (COT).

## Starting Point

The ideation document outlined a free, serverless PWA chess opening trainer with three user journeys: Learn (guided exploration), Memorize (spaced repetition drilling), and Play (free play with commentary). Key constraints: mobile/tablet optimized, opening data stored in the repo, no backend needed.

## Phase 1: Initial Analysis & Design Tensions

After reviewing the ideation, four key design tensions were identified:

1. **Learn vs. Memorize overlap:** Both modes involve playing through openings, but Learn is guided exploration while Memorize is recall testing. The distinction needed to be crisp — they are separate modes with separate purposes.
2. **Stockfish in Play mode:** Running Stockfish WASM on mobile is heavy. Question: is it essential for MVP, or could the opening database alone power early-game responses?
3. **Opening database as content backbone:** How deep do lines go? Who writes the strategic explanations? Starting with a small, well-annotated set was suggested as better than a large, thin one.
4. **Spaced repetition needs a clear algorithm** and persistence strategy. SM-2 was identified as an option, needing research.

Six specific questions were posed:

### Q1: MVP scope — should all three modes (Learn, Memorize, Play) be in v1, or should we phase them? Suggestion was Learn + Memorize first, Play later.
**Answer:** Go for all 3. Plan them in parallel increments. The user viewed these as distinct user journeys that should all ship together, with implementation done incrementally.

### Q2: Color perspective — does the user always play White, or can they choose? For openings, both sides matter.
**Answer:** User chooses. Both sides are important for learning openings.

### Q3: Opening database depth — how many half-moves deep? Typical theory goes 10-20 moves. Main lines only, or include sidelines?
**Answer:** Main lines for MVP. 10 moves is a good starting depth. But also: "look what's easily grabbable from the internet for free." The user wanted research into what data is freely available (lichess, Wikipedia, chess wikis) before committing to a scope.

### Q4: Initial opening set — start with the most popular (Sicilian, Ruy Lopez, Queen's Gambit, etc.) or let the user decide?
**Answer:** Start with the most popular openings.

### Q5: Move input — drag-and-drop, click-click, or both? Mobile favors tap-tap.
**Answer:** Tap-tap first, but drag-and-drop would be great too. Specifically requested: "Would be nice if you touch a figure that all possible fields are marked on touch" — legal move highlighting when selecting a piece.

### Q6: Progress tracking — purely local (IndexedDB)? Any export/import for backup?
**Answer:** IndexedDB for persistence, but import/export as JSON dump should be possible.

### Additional: SM-2 explanation requested
The user asked "what is SM-2?" and confirmed "persistence would be great in IndexedDB." This triggered the SM-2 research effort.

### Additional: Opening data research requested
The user explicitly asked to "do a deep research on publicly available data, maybe lichess offers something or wikipedia, or maybe there is a chess wiki free somewhere." This triggered the opening data research effort.

## Phase 3: Deep Research

Two parallel research efforts were conducted:

### Chess Opening Data Sources
Investigated lichess databases, npm packages, Wikipedia, Wikibooks, GitHub repos, and open-source chess trainers. Sources evaluated:

| Source | License | Format | Entries | Strategic Annotations | Verdict |
|--------|---------|--------|---------|----------------------|---------|
| lichess-org/chess-openings | CC0 | TSV | 500+ | No | **Primary structural source** |
| @chess-openings/eco.json | MIT | JSON/npm | 12,000+ | No | Supplementary (FEN lookup) |
| Lichess Explorer API | Free API | JSON | Unlimited | Win rates only | Runtime enrichment (deferred) |
| Wikibooks Chess Opening Theory | CC BY-SA 3.0 | HTML/wiki | ~2,756 pages | **Yes — rich prose** | Best annotation source (found in Phase 4) |
| chess-eco-codes (npm) | MIT | JSON | ECO codes | No | Lightweight lookup |
| fsmosca/eco | MIT | PGN | ECO codes | No | Less convenient format |
| Wikipedia ECO articles | CC BY-SA | HTML | — | Not structured | Not useful as data source |
| Open-source trainers (Chessdriller, Listudy, Anki plugin) | Various | — | — | No built-in data | Ship no annotated data |

**Critical finding:** No free source includes strategic annotations. This became the key challenge addressed in Phase 4.

### SM-2 Spaced Repetition Algorithm
Researched the full SM-2 algorithm (SuperMemo 2) created by Piotr Wozniak in 1987. Key details:

- **Three values tracked per card:** Easiness Factor (EF, starts 2.5, min 1.3), repetition count (n), interval in days (I)
- **Grading scale:** 0-5, where 3+ = correct (intervals grow), 0-2 = incorrect (reset to day 1)
- **EF update formula:** `EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))`
- **Interval progression** (perfect scores): 1 day → 6 days → 15 days → 39 days → 101 days
- **Chess mapping:** A "card" = one position where it's the user's turn + the correct move(s). A 10-move opening line where you play 5 moves = 5 cards.
- **Simpler alternative considered:** Leitner system (just box numbers 1-5 with fixed intervals). Recommendation was to go straight to SM-2 since it's only marginally more complex (one formula) but gives much better adaptive learning. User agreed.

## Phase 4: The Annotation Problem

The biggest challenge: no free, structured source provides strategic explanations for chess moves. The initial PRD proposed writing annotations manually (~150 positions for MVP).

The user rejected manual annotation effort. A second research round investigated alternatives:

- **Wikibooks Chess Opening Theory** (CC BY-SA 3.0) emerged as the best source: ~2,756 pages of human-written strategic explanations, extractable via MediaWiki API. Verified quality is excellent for major openings.
- **LLM-generated annotations** at build time proposed as gap-fill for positions where Wikibooks has stub pages.

**Final approach:** Hybrid pipeline — extract Wikibooks content + LLM-generate for gaps, compiled at build time into static JSON. No manual writing needed.

## Phase 5: Key Decisions (Round 2)

The initial PRD draft contained six open questions. Each was answered:

### Q1: Annotation effort — writing strategic explanations for ~150 positions is significant. Should we start with fewer openings (top 5) and expand iteratively?
**Answer:** "I do not want to deliver manual annotation, search for better data on the web we can use." This rejected the manual-writing approach entirely and triggered the Phase 4 research that found Wikibooks + LLM gap-fill as the solution.

### Q2: Multiple correct moves — at some positions, multiple moves are "book." How strictly do we grade — is any book move correct, or only the main line move?
**Answer:** "If you have specified a variant, only variant moves should be counted. If not, any book move is accepted but with a comment about the main line move." This created a two-tier grading system: strict when drilling a specific variation, lenient when practicing an opening generally.

### Q3: Hint granularity — what hints are available in Memorize mode? Options were: "show which piece to move", "show the target square", "show the full move."
**Answer:** "Hint only which piece." Single hint level only — the piece to move is highlighted. This keeps it simple and ensures the user still has to figure out the destination themselves.

### Q4: Sound effects — should moves have sound (placement, capture, check)?
**Answer:** "Yes, but mute setting per mute symbol all the time visible in status line or toolbar." Sound is on by default with a persistent, always-visible mute toggle — not buried in settings.

### Q5: Theming — dark mode? Board color/piece set customization?
**Answer:** "Yes both." Full dark mode support (respects system preference) plus board color and piece set customization.

### Q6: Lichess Explorer API — should we fetch live win-rate data when online as enrichment, or keep things purely static?
**Answer:** "No, not for win rates. Maybe interesting for variants not stored in the COT itself." The API won't be used for statistics, but could optionally extend COT's knowledge when online by providing variations beyond the bundled database.

## Phase 6: Final Design Decisions

Four remaining implementation-level questions were posed with concrete suggestions:

### Q1: Wikibooks stub quality threshold — what's the minimum annotation quality before falling back to LLM generation?
**Suggestion:** <20 words of prose (after stripping wiki markup) → LLM fallback. Log which positions were generated so we can improve Wikibooks contributions upstream.
**Answer:** User changed the threshold to 50 words. Everything else accepted.
**Final decision:** <50 words of prose → LLM fallback with logging.

### Q2: Board/piece set assets — which open-source piece set SVGs to bundle?
**Suggestion:** cburnett as default (BSD license, from lichess/lila, most widely recognized), plus merida and staunty as alternatives. Three sets for v1.
**Answer:** Accepted as-is.

### Q3: Move animation — smooth piece sliding vs. instant placement? How much?
**Suggestion:** 250ms ease-out slide for all moves. Captures: piece slides to target, captured piece disappears on arrival. Castling animates both king and rook. No bounce or overshoot — clean and fast. Animation is especially important for auto-played opponent moves so users can track what happened.
**Answer:** Accepted as-is.

### Q4: Pawn promotion UI — how to handle in tap-tap mode?
**Suggestion:** Inline popover at the promotion square with 4 piece icons (Queen, Rook, Bishop, Knight). Queen pre-highlighted as default — tap promotion square again to auto-Queen for speed. Tap a piece icon to confirm. Tap outside cancels. Follows the standard lichess/chess.com pattern.
**Answer:** Accepted as-is.

## Outcome

The result is a complete PRD (`prd.md`) with:
- 3 fully specified user journeys
- Data pipeline strategy (lichess + Wikibooks + LLM)
- SM-2 algorithm specification with chess-specific grading rules
- UI/UX design including responsive breakpoints, interaction patterns, and theming
- 5 incremental delivery phases
- All design decisions resolved — no open questions remaining

The PRD is ready to serve as the basis for detailed technical planning.
