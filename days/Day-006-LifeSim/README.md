# LifeSim — Day 006

An artificial-life laboratory. Python simulates an ecosystem of evolving
organisms; a browser renders it live over a WebSocket.

This build is the **core loop**: a real ecosystem with genetics, energy,
reproduction, mutation, and emergent evolutionary pressure — running and
balanced — rather than a partial slice of every feature in the full spec.
Predators, neural controllers, environmental events, carcasses/scavenging,
the phylogenetic tree UI, experiment mode, god mode, and the breeding lab
are the planned next layers; each has a stub file in `backend/` explaining
what it'll do and why it isn't here yet.

## What's actually running

- **World**: toroidal 1600×1000 map, spatial-hash-indexed food and creatures
- **Creatures**: DNA (speed / vision / size / metabolism) → derived max
  energy and natural lifespan; rule-based behaviour (chase nearest visible
  food, else wander) — the seam for a neural controller later without
  touching movement/energy code
- **Energy economics**: `cost = base + movement(speed² × size) + size upkeep
  + vision upkeep`, so fast+large creatures pay disproportionately to move —
  this is what stops every trait from evolving to its maximum
- **Reproduction**: two energy-ready, age-eligible creatures within mating
  radius → blend crossover + per-trait mutation (2% chance, ±18% jitter) →
  child
- **Statistics**: population, food, avg speed/vision/size/generation,
  cumulative births/deaths/mutations, actual achieved ticks/sec
- **Transport**: one persistent WebSocket per client; compact per-tick
  state only (`id, x, y, rot, e, sz, spd, st`), full DNA/lineage sent only
  when a creature is clicked — matches the spec's "don't send the whole
  world every frame" rule
- **Frontend**: Canvas world view, live sparkline charts, start/pause/reset
  + 1×–100× speed control, and a specimen-card inspector

### A balance check, already run

100 creatures / 250 food, 30,000 ticks, no manual tuning after the first
pass: population found a food-limited equilibrium around 140–150 (never
crashed to extinction, never exploded), average speed drifted 5.17 → 5.75
as faster creatures out-competed for food, and the mutation trigger rate
landed within a point of the theoretical ~7.8% — see `backend/world.py` /
`backend/genetics.py` if you want to re-derive that number.

## Running it

```bash
cd backend
pip install -r requirements.txt
python3 app.py
```

This starts the WebSocket server on `ws://localhost:8765`. Then open
`frontend/index.html` directly in a browser (or serve the folder with
`python3 -m http.server` from `frontend/` if your browser blocks
`file://` → WebSocket connections — Chrome usually doesn't, some setups
do).

To sanity-check the server on its own, with `app.py` running in one
terminal:

```bash
python3 backend/smoke_test.py
```

## Honest limitations worth knowing about

- **Tick rate**: the spec's 500 ticks/sec is a stretch target, not an
  assumption baked into the code. Headless, population ~100–150, this runs
  at roughly **1,300–1,400 ticks/sec in plain Python** (see the smoke-test
  numbers above) — comfortably fast for the MVP, but that will drop as
  population grows or once neural-controller forward-passes are added.
  `simulation.py`'s tick budget (`MAX_TICK_BUDGET_SECONDS`) is a
  deliberate safety valve: at high speed multipliers with a large
  population it'll broadcast whatever it managed rather than stalling, and
  report the real achieved rate in the stats payload instead of pretending.
- **No lineage retention**: dead creatures are dropped outright, so a
  phylogenetic tree can't be reconstructed past the current living
  population yet — `lineage.py` notes what World needs to change first.
- **Death is a pure sink**: no carcasses yet, so a dead creature's energy
  just leaves the system instead of cycling back through scavengers — see
  `carcass.py`.
- **JSON over the wire, not binary**: the right call while the core loop is
  still being tuned (easy to inspect in devtools); worth switching to
  packed binary only once JSON serialization actually shows up as the
  bottleneck.

## Project structure

```
Day-006-LifeSim/
├── backend/
│   ├── app.py                 WebSocket server + broadcast loop
│   ├── simulation.py          running/paused state, speed control, pacing
│   ├── world.py                tick() — the big loop
│   ├── creature.py             DNA-driven organism: perceive/move/eat/age
│   ├── food.py
│   ├── genetics.py             DNA, crossover, mutation
│   ├── spatial_hash.py         uniform grid neighbor queries
│   ├── statistics.py           rolling stats + chart history
│   ├── config.py               every tunable constant
│   ├── smoke_test.py           manual protocol check (dev tool)
│   ├── predator.py             STUB — next up
│   ├── carcass.py              STUB
│   ├── neural_controller.py    STUB
│   ├── environment.py          STUB
│   ├── events.py               STUB
│   ├── lineage.py              STUB
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   ├── style.css
│   ├── app.js                  bootstrap
│   ├── websocket.js
│   ├── canvas.js                world rendering + click-to-inspect
│   ├── charts.js                sparklines
│   ├── controls.js              transport + speed buttons
│   └── inspector.js             specimen-card detail panel
├── experiments/                 (empty — for saved experiment configs/results)
├── screenshots/                 (empty)
└── README.md
```

## Suggested next session

1. `neural_controller.py` — swap the rule-based `creature.perceive()`/
   `move()` decision for a tiny fixed-topology MLP; DNA grows a flat
   weights array, genetics needs a per-gene crossover/mutate variant.
2. `predator.py` + `carcass.py` together — predators need something to
   leave behind, and carcasses need something to create them.
3. `lineage.py` — but first, change `world.py` to keep a lightweight
   append-only birth/death log instead of discarding dead creatures.
