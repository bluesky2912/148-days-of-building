# DON'T LOOK AWAY

A single-file CCTV horror game. You're a night-shift operator watching four rooms.
Things change when you're not looking. Catch them before the window closes, survive
from midnight to dawn, and don't trust everything you see.

No installs, no build step, no dependencies. Open `dont-look-away.html` in a browser and play.

---

## Quick start

1. Open `dont-look-away.html` in any modern browser (Chrome, Firefox, Safari, Edge).
2. Pick a difficulty.
3. Click **BEGIN SHIFT**.
4. Watch the four cameras. Click one to confirm it's clean, or to catch a change.

That's it — everything runs client-side, nothing to configure.

## Controls

| Input | Action |
|---|---|
| Click a camera | Check it / catch an anomaly there |
| `1` `2` `3` `4` | Same, from the keyboard |
| `P` | Pause / resume |
| Tab away / switch apps | Auto-pauses the shift |

---

## The premise

Four rooms, four static cameras: Living Room, Hallway, Bedroom, Mirror Room. Every so
often, something in one of them changes — a piece of furniture moves, a light flares,
a shape appears that shouldn't be there. Click the camera where you spotted it before
the window runs out. Miss it, and your system stability takes a hit. Run stability to
zero and the connection drops — with consequences.

Survive from **12:00 AM to 6:00 AM** (about 3½ minutes of real time) and the shift ends
successfully at dawn.

## What you're actually up against

**Anomalies** — the core loop. Something in a room visibly changes; click that camera
before the countdown (shown only as a general "anomaly window" meter, not tied to a
specific camera) runs out. Catching one quickly earns a speed bonus and nudges your
system stability back up — misses cost you stability and reset your streak. Later in
the shift, and on harder difficulties, two rooms can be compromised at once.

**Decoys** — not everything that flickers is real. A camera can spike with static that
looks like the start of an anomaly but isn't. Click it and you'll trigger a false
alarm: a stability penalty and a broken streak, for nothing. Decoys are quick and
deliberately easy to mistake for the real thing — the game rewards verifying, not
reflexes.

**The Presence** — every shift, one room (never announced) is quietly being neglected
by you. If you don't check it often enough, a hidden dread meter climbs. Past a
threshold you might notice a faint, slow red pulse on that camera's border if you're
paying attention — it's subtle by design. Ignore it long enough and it manifests: every
camera flashes at once, the screen shakes and desaturates, and you take a heavy
stability hit. The log tells you afterward which room it was. This is the mechanic that
punishes tunnel vision — you have to rotate through all four cameras, not just react to
what's obviously changing.

## Difficulty tiers

| Difficulty | Anomaly pace | Reaction window | Double-threats from | Decoy odds | Room checked at least every… |
|---|---|---|---|---|---|
| **Rookie** | Slow, ~8.5s apart early | ~5.2s, down to 3.8s | Never | 12% | ~15s |
| **Standard** | ~6.2s apart early | ~4.3s, down to 2.6s | Hour 3 | 25% | ~11s |
| **Nightmare** | ~4.2s apart early | ~3.2s, down to 1.9s | Hour 1 | 40% | ~8s |
| **No Sleep** | ~3s apart early | ~2.3s, down to 1.3s | From the start | 55% | ~6s |

All tiers speed up as the shift goes on — the numbers above are where each difficulty
starts; every in-game hour, anomalies arrive faster and the reaction window shrinks.

## Scoring

- Base: `100 × streak multiplier × difficulty multiplier`
- **Quick Eye** bonus: catching an anomaly in the first ~40% of its window pays 1.5×;
  the next ~30% pays 1.2×.
- Streak builds by +0.25 per catch and resets to 1.0 on any miss.
- Every successful catch also restores a small amount of system stability (more on a
  quick catch) — recovery is possible, the shift isn't a pure one-way countdown.

## Badges

Unlocked badges persist across sessions (`localStorage`) and are visible as chips on
the start screen — locked ones show as `???` until you earn them.

| Badge | How |
|---|---|
| First Contact | Catch your first anomaly |
| Sharp Eye | Reach a x3.0 observer streak |
| Nerves of Steel | Recover from critical stability (≤25%) back above 50% |
| Flawless Hour | Complete a full in-game hour without a single miss |
| Ghost Hunter | Catch 15 anomalies in one shift |
| Saw the Dawn | Survive the full shift, any difficulty |
| Unblinking | Survive the full shift on Nightmare |
| No Sleep Till Dawn | Survive the full shift on No Sleep |

## Saved data

Everything is stored locally in the browser via `localStorage` — nothing leaves the
device, there's no backend.

| Key | What it holds |
|---|---|
| `dlaBest` | Highest score achieved |
| `dlaShiftsPlayed` | Total shifts started (used as your "attempt #") |
| `dlaShiftsSurvived` | Total shifts survived to dawn |
| `dlaAchievements` | Array of unlocked badge ids |

Clearing site data / browser storage resets all progress.

---

## Tech notes

- **Single HTML file** — markup, CSS, and JavaScript are all in `dont-look-away.html`.
  No build tools, bundlers, or package installs required.
- **No external dependencies.** No CDN calls, no frameworks. Pure DOM manipulation.
- **Audio** is procedural, generated at runtime with the Web Audio API (oscillators
  and gain envelopes) — there are no audio files.
- **CRT static** is drawn to a `<canvas>` every frame with `requestAnimationFrame`.
- Room art (furniture, doors, mirrors, etc.) is built as plain positioned `<div>`s per
  camera; anomalies are just CSS class toggles plus, for a couple of types, one
  injected element (the entity figure, the glitch veil).
- Game state lives in a single in-memory object (`state`), rebuilt fresh via
  `freshState()` on every new shift — nothing is retained between runs except the
  `localStorage` stats above.

### Adjusting the game

Everything that affects pacing and difficulty is centralized near the top of the
`<script>` block:

- `DIFFICULTIES` — per-tier pacing, damage, decoy odds, and Presence tuning.
- `SECONDS_PER_HOUR` / `TOTAL_HOURS` — shift length.
- `ACHIEVEMENTS` — badge list; add an entry and call `unlock("your_id")` wherever it
  should fire.
- `anomalyTypes` — the pool of visual changes; each maps to a CSS class already
  defined in the stylesheet.

## Browser support

Built on standard, widely-supported web APIs (Canvas 2D, Web Audio, CSS Grid,
`localStorage`). Works in current Chrome, Firefox, Safari, and Edge. No mobile-specific
build, but the layout is responsive down to phone widths.

## Known limitations

- No server-side or account-based leaderboard — all stats are per-browser, per-device.
- Audio requires a user interaction to start (browser autoplay policy); the first
  click on the page initializes it.
- Achievements are keyed by id in `localStorage` with no versioning — renaming an
  achievement id in the source will orphan previously-saved unlocks under the old id.