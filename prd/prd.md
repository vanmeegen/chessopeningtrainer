# Chess Opening Trainer (COT) — Product Requirements Document

## 1. Vision & Goals

**Vision:** A forever-free, offline-first chess opening trainer that teaches openings through understanding, not just rote memorization. Users learn *why* moves are played, not just *which* moves to play.

**Goals:**
- Zero-cost, no-account-needed PWA that works fully offline after first load
- Mobile-first design optimized for phones and tablets
- Three complementary training modes: Learn, Memorize, Play
- Spaced repetition (SM-2) ensures efficient long-term retention
- Static opening database bundled in the app — no server required

**Non-Goals (v1):**
- Stockfish engine integration (deferred to v2)
- User-contributed opening annotations
- Multiplayer or social features
- Server-side storage or user accounts

---

## 2. User Journeys

### 2.1 Learn Mode — "Teach me this opening"

**Purpose:** Guided exploration of an opening with strategic explanations.

**Flow:**
1. User selects an opening from the opening catalog (e.g., "Sicilian Defense")
2. User optionally selects a specific variation (e.g., "Najdorf Variation")
3. User chooses to play as White or Black
4. The board is set up from the starting position
5. COT plays the opponent's moves automatically, one at a time
6. After each move (both sides), COT displays:
   - The move in algebraic notation
   - A strategic explanation of why this move is played
   - The current opening/variation name
7. At branch points (where multiple variations exist), COT shows:
   - A list of possible continuations
   - A strength rating (1-10) for each option
   - The user can pick which variation to explore
8. User can navigate back and forth through the move sequence
9. User can restart or switch to a different variation at any point

**Key behaviors:**
- The board auto-plays both sides in a guided walkthrough
- User controls the pace (tap to advance to next move)
- Strategic explanations appear below/beside the board
- Move history is shown as a clickable move list

### 2.2 Memorize Mode — "Test my recall"

**Purpose:** Spaced repetition drilling of previously learned openings.

**Flow:**
1. User selects an opening and optional variation to memorize
2. User chooses to play as White or Black
3. COT sets up the starting position
4. The opponent's moves are played automatically
5. On the user's turn, they must play the correct move from memory
   - Legal move highlighting: when a piece is tapped, all legal target squares are highlighted
   - If correct: a brief "why this move" explanation appears, and the game continues
   - If wrong: COT shows the correct move with explanation, then lets the user retry
6. After completing the line (or failing), COT grades the attempt:
   - Each position where the user had to move is a "card"
   - Cards are graded on the SM-2 scale (see §5)
7. COT schedules each card for future review based on SM-2 intervals
8. A session summary shows:
   - Positions practiced
   - Correct/incorrect ratio
   - Next scheduled review dates

**Key behaviors:**
- Positions due for review are prioritized (overdue cards first)
- User can see their memorization progress per opening/variation
- Dashboard shows which openings are "due" for review today

### 2.3 Play Mode — "I just want to play the opening"

**Purpose:** Free play where COT responds with book moves and comments on the opening.

**Flow:**
1. User starts a game (chooses White or Black)
2. User plays moves freely on the board
3. COT responds with the most popular/best book move from the opening database
4. After each move, COT displays:
   - The current opening name and variation (if recognized)
   - Whether the user's move is: **Book move** (known good), **Playable** (legal but not in book), or **Inaccuracy** (clearly suboptimal)
   - Brief comment on the move quality
5. When the opening book runs out (moves go beyond database depth), COT notifies the user: "You've left the opening book. The opening phase is complete."
6. User can restart at any time

**Key behaviors:**
- COT uses the static opening database only (no engine in v1)
- If user plays a non-book move, COT can show what the book move would have been
- Move assessment is based on database frequency/win rates, not engine evaluation

---

## 3. Opening Database

### 3.1 Data Source

**Primary:** [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings) (CC0 public domain)
- TSV format with ECO code, opening name, PGN move sequence
- 500+ named openings and variations

**Supplementary:** [@chess-openings/eco.json](https://github.com/JeffML/eco.json) (MIT license)
- 12,000+ entries with FEN position lookup
- npm-installable for easy integration

### 3.2 Strategic Annotations

**Primary:** [Wikibooks Chess Opening Theory](https://en.wikibooks.org/wiki/Chess_Opening_Theory) (CC BY-SA 3.0)
- ~2,756 pages of human-written strategic explanations
- Extractable via MediaWiki API at build time (`/w/api.php?action=parse&page=...&prop=wikitext`)
- Rich prose for major openings (e.g., Sicilian, Ruy Lopez, Italian, Nimzo-Indian)
- Page URL structure is deterministic and move-based (e.g., `/1._e4/1...e5/2._Nf3`)
- Requires attribution notice in the app (CC BY-SA)

**Gap-fill:** LLM-generated annotations at build time
- For positions where Wikibooks pages are stubs or have no prose
- Provide opening name, variation, move sequence → generate 1-2 sentence explanation
- One-time build step, stored as static data in the repository
- Ensures consistent tone and complete coverage

**Build pipeline:** A build script extracts Wikibooks content, identifies gaps, generates LLM annotations for those gaps, and compiles everything into static JSON bundled with the app.

Each position annotation includes:
- **Move rationale:** Why this move is played (1-2 sentences)
- **Strategic theme:** The idea behind the move (e.g., "Controls the center", "Prepares kingside castling")
- **Source:** `wikibooks` or `generated` (for transparency)

### 3.3 MVP Opening Set

For MVP, include the most popular openings with ~10 moves depth (main lines):

**As White:**
| Opening | ECO | Key Variations |
|---------|-----|----------------|
| Italian Game | C50-C54 | Giuoco Piano, Evans Gambit |
| Ruy Lopez | C60-C99 | Morphy Defense, Berlin Defense |
| Queen's Gambit | D06-D69 | Accepted, Declined (Orthodox) |
| London System | D00 | Main line |
| English Opening | A10-A39 | Symmetrical, Reversed Sicilian |

**As Black vs 1.e4:**
| Opening | ECO | Key Variations |
|---------|-----|----------------|
| Sicilian Defense | B20-B99 | Najdorf, Dragon, Classical |
| French Defense | C00-C19 | Winawer, Classical, Tarrasch |
| Caro-Kann Defense | B10-B19 | Classical, Advance, Exchange |

**As Black vs 1.d4:**
| Opening | ECO | Key Variations |
|---------|-----|----------------|
| Queen's Gambit Declined | D30-D69 | Orthodox, Ragozin |
| King's Indian Defense | E60-E99 | Classical, Sämisch |
| Nimzo-Indian Defense | E20-E59 | Classical, Rubinstein |

**Total for MVP:** ~15 openings, ~30 main-line variations, ~150 annotated positions.

---

## 4. User Interface

### 4.1 General Layout Principles

- **Mobile-first:** Designed for portrait mode on phones, landscape on tablets
- **Board prominence:** The chess board occupies the maximum available space
- **Info panel:** Strategic explanations, move list, and controls below the board (phone) or beside it (tablet/desktop)
- **Minimal chrome:** No unnecessary UI elements; focus on board + information

### 4.2 Screen Structure

#### Home Screen
- App title and brief tagline
- Three main action cards:
  - **Learn** — "Explore openings with guided explanations"
  - **Memorize** — "Test and strengthen your opening memory"
  - **Play** — "Play openings freely with commentary"
- Quick-access: "Due for review" badge on Memorize card showing count of cards due today
- Settings icon (top-right)

#### Opening Selection Screen
- Search/filter bar at top
- List of openings grouped by:
  - Color (White / Black vs e4 / Black vs d4)
  - Or alphabetically (user toggle)
- Each opening shows:
  - Name, ECO code
  - Number of variations available
  - Memorization progress (if any): progress bar or "New"
- Tapping an opening expands its variations
- User picks a variation (or "Main Line") to proceed
- User chooses color (White / Black) if not implied

#### Training Screen (shared layout, mode-specific behavior)
- **Chess board** (top/center, maximum size)
  - Tap-to-select, tap-to-move interaction
  - Legal move dots shown when a piece is selected
  - Last move highlighted on the board
  - Board oriented to player's color
- **Info panel** (below board on mobile, right side on tablet)
  - Current opening name and variation
  - Move list (interactive, clickable)
  - Strategic explanation for the current position
  - Mode-specific controls:
    - Learn: Forward/Back/Autoplay buttons, variation selector
    - Memorize: Hint button, progress indicator
    - Play: Move assessment badge, "Show book move" button
- **Navigation bar** (bottom)
  - Back to opening selection
  - Mode indicator

#### Progress Dashboard (accessible from Memorize mode)
- Overview of all openings being studied
- Per opening: cards total / mastered / due today / struggling
- Calendar heat map showing review activity
- Overall statistics: total cards, retention rate, streak

### 4.3 Interaction Design

**Move input (tap-tap):**
1. Tap a piece → piece is highlighted, all legal destination squares show dots
2. Tap a destination → move is executed (with animation)
3. Tap elsewhere → deselect

**Drag-and-drop (future enhancement):**
- Touch and hold a piece → pick it up
- Drag to destination → drop to execute move
- Legal squares highlighted during drag

**Responsive breakpoints:**
- Phone portrait (<640px): Board on top, info panel below, vertically scrollable
- Tablet portrait (640-1024px): Board on top (larger), info panel below
- Tablet landscape / Desktop (>1024px): Board left, info panel right, side-by-side

---

## 5. Spaced Repetition System (SM-2)

### 5.1 Card Model

Each "card" represents a **single position where it is the user's turn to move** within an opening line.

```
Card {
  id: string                    // Unique identifier (e.g., FEN hash + line ID)
  positionFen: string           // Board position as FEN
  correctMoves: string[]        // Accepted correct moves (SAN notation)
  openingId: string             // Parent opening identifier
  variationId: string           // Parent variation identifier
  moveNumber: number            // Move number in the line

  // SM-2 state
  easinessFactor: number        // EF, starts at 2.5, min 1.3
  repetitionCount: number       // Consecutive correct recalls
  interval: number              // Days until next review
  nextReviewDate: string        // ISO date of next scheduled review

  // Statistics
  lastReviewDate: string | null
  totalReviews: number
  totalCorrect: number
}
```

### 5.2 Correct Move Rules

- **With specific variation selected:** Only the variation's move counts as correct. Other book moves are flagged as "Book move, but not the {variation name} line" — graded as incorrect for SM-2, but with an informational message.
- **Without specific variation (opening-level practice):** Any book move for that opening is accepted as correct. The main line move is highlighted with a comment if the user played a sideline: "Correct! The main line is {move}."

### 5.3 Grading

After each position in Memorize mode:

| Grade | Condition | SM-2 Value |
|-------|-----------|------------|
| 5 | Correct move, played without hint | Perfect recall |
| 3 | Correct move after using a hint (shows which piece to move) | Difficult recall |
| 0 | Wrong move played | Failed recall |

**Simplified 3-tier grading** (maps to SM-2 values 5, 3, 0).

### 5.4 Hint System

- One hint level only: **highlights which piece should move** (the piece glows/pulses)
- Using a hint downgrades the grade from 5 to 3 (correct but difficult recall)
- Hint is available via a button in the info panel

### 5.5 SM-2 Algorithm

```
After grading a card with quality q (0-5):

1. Update EF:
   EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
   EF = max(EF', 1.3)

2. If q >= 3 (correct):
   - n = 0: interval = 1 day
   - n = 1: interval = 6 days
   - n >= 2: interval = round(interval * EF)
   - n = n + 1

3. If q < 3 (incorrect):
   - n = 0
   - interval = 1 day
   - (EF unchanged on failure)

4. nextReviewDate = today + interval
```

### 5.6 Session Logic

1. Collect all cards due for review (nextReviewDate <= today)
2. Sort: most overdue first
3. Present cards in order (user plays through the opening line)
4. At end of session, re-drill any cards scored < 4 (same-day repeats, no schedule impact)
5. Show session summary

---

## 6. Data Persistence

### 6.1 Storage

**IndexedDB** for all user data:
- Card states (SM-2 parameters per card)
- User preferences (selected color per opening, display settings)
- Session history (for statistics)

### 6.2 Import/Export

- **Export:** Full user data as a JSON file download
  - Includes all card states, preferences, and history
  - Filename: `cot-backup-{date}.json`
- **Import:** Upload a JSON file to restore data
  - Validates structure before importing
  - User can choose to merge with or replace existing data
- Accessible from Settings screen

---

## 7. PWA Requirements

- **Service Worker:** Cache all app assets and opening data for offline use
- **App Manifest:** Installable on home screen with app icon
- **Offline-first:** All three modes work fully offline
- **Update detection:** Notify user when a new version is available, allow "refresh to update"

---

## 8. Technical Constraints

- **Framework:** Next.js + TypeScript + MobX (per project architecture)
- **Chess logic:** chess.js for move validation and game state
- **Board rendering:** react-chessboard or similar React chess board component
- **Opening data:** Bundled as static JSON at build time (compiled from TSV/JSON sources)
- **Annotation pipeline:** Build script to extract Wikibooks content + LLM gap-fill → static JSON
- **No backend:** Everything runs client-side
- **Target browsers:** Modern evergreen browsers (Chrome, Safari, Firefox, Edge)
- **Licensing:** App itself open-source; annotations CC BY-SA 3.0 (Wikibooks attribution required in app footer/about page)

---

## 9. Incremental Delivery Plan

### Increment 1: Foundation
- Chess board with tap-tap interaction and legal move highlighting
- Opening data pipeline (import lichess-org/chess-openings, compile to app format)
- Basic opening catalog UI (list, search, filter)
- Core navigation (Home → Opening Selection → Training Screen)

### Increment 2: Learn Mode
- Guided walkthrough of opening lines
- Strategic explanations displayed per move
- Forward/back navigation through move sequence
- Variation branching with selection UI
- Annotations for MVP opening set (top 5 openings)

### Increment 3: Memorize Mode
- SM-2 algorithm implementation
- Card creation from opening lines
- Memorize training flow (play correct moves, grading)
- Hint system (highlight which piece to move)
- IndexedDB persistence for card states
- Basic progress view (per opening)

### Increment 4: Play Mode
- Free play against book moves
- Opening recognition (name current opening/variation)
- Move assessment (book/playable/inaccuracy)
- "Show book move" feature

### Increment 5: Polish & PWA
- Service worker and offline support
- App manifest and install prompt
- Import/export user data
- Progress dashboard with statistics
- Responsive layout refinement for all breakpoints
- Expand annotated opening set to full MVP list

---

## 10. Sound & Theming

### 10.1 Sound Effects
- Move sounds: piece placement, capture, check, castling
- **Mute toggle:** Always visible in the top toolbar/status bar as a speaker icon
- Mute state persisted in user preferences

### 10.2 Theming
- **Dark mode:** Full dark mode support, toggle in settings, respects system preference by default
- **Board customization:** Selectable board colors (e.g., green/cream, blue/white, brown/tan)
- **Piece sets:** At least 2-3 piece set options (e.g., standard Staunton, merida, cburnett)

---

## 11. Lichess Explorer API (Optional Enhancement)

- **Not used for win rates** in v1
- **Potential use:** When online, fetch additional variations not stored in COT's static database
- Allows COT to recognize and comment on moves beyond its bundled data
- Graceful degradation: feature simply unavailable when offline

---

## 12. Design Decisions

### 12.1 Wikibooks Stub Threshold
- Pages with <50 words of prose (after stripping wiki markup, templates, and move lists) are treated as stubs → LLM-generated annotation is used instead
- The build pipeline logs which positions used generated content, enabling future improvements to Wikibooks contributions upstream

### 12.2 Piece Sets
- **Default:** cburnett (BSD license, from lichess/lila — the most widely recognized online chess piece style)
- **Alternatives:** merida, staunty (both from lichess/lila, permissive licenses)
- Three sets is sufficient for v1; more can be added later

### 12.3 Move Animation
- Smooth slide animation: **250ms ease-out** for all piece movements
- Captures: piece slides to target square, captured piece disappears on arrival
- Castling: both king and rook animate simultaneously
- No bounce or overshoot — clean and fast
- Animation is important for opponent auto-played moves (Learn/Memorize) so the user can track what happened

### 12.4 Pawn Promotion
- Inline popover appears at the promotion square with 4 piece icons: Queen, Rook, Bishop, Knight
- Queen is pre-highlighted as default (tap promotion square again → auto-Queen for speed)
- Tap a piece icon to confirm promotion
- Tap outside the popover to cancel the move
- Follows the standard lichess/chess.com pattern users already know
