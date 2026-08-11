"""
LifeSim — Day 006
Central configuration. Every tunable knob for the MVP core loop lives here so
world.py / simulation.py / creature.py stay readable.

Scope note: this build covers World, Creature, Food, Genetics, SpatialHash,
Simulation and Statistics — the "core loop" of the full spec. Predators,
neural controllers, carcasses, environmental events, experiment mode, god
mode and the breeding lab are intentionally deferred to later days.
"""

# ---------------------------------------------------------------------------
# World
# ---------------------------------------------------------------------------
WORLD_WIDTH = 1600
WORLD_HEIGHT = 1000

SPATIAL_CELL_SIZE = 80  # grid cell size for the spatial hash

# ---------------------------------------------------------------------------
# Initial population
# ---------------------------------------------------------------------------
INITIAL_CREATURES = 100
INITIAL_FOOD = 250
MAX_FOOD = 400
FOOD_SPAWN_PER_TICK = 2      # new food items spawned per tick while under MAX_FOOD
FOOD_ENERGY_VALUE = 35

# ---------------------------------------------------------------------------
# DNA trait ranges (used for the initial random population)
# ---------------------------------------------------------------------------
SPEED_RANGE = (1.0, 6.0)
VISION_RANGE = (40.0, 140.0)
SIZE_RANGE = (1.5, 6.0)
METABOLISM_RANGE = (0.6, 1.8)

# ---------------------------------------------------------------------------
# Energy economics — Energy Cost = base + movement + size + vision
# Movement Cost is proportional to speed^2 * size, per the spec, so fast
# large creatures pay disproportionately more to move.
# ---------------------------------------------------------------------------
BASE_METABOLISM_COST = 0.02
MOVEMENT_COST_COEFF = 0.0009      # * speed^2 * size, scaled by how much it actually moved
SIZE_UPKEEP_COEFF = 0.015         # * size
VISION_UPKEEP_COEFF = 0.0025      # * vision_radius

MAX_ENERGY_BASE = 60.0
MAX_ENERGY_PER_SIZE = 14.0        # bigger creatures can store more energy

START_ENERGY_FRACTION = 0.6       # newborn/initial energy as a fraction of max_energy

# ---------------------------------------------------------------------------
# Health / aging
# ---------------------------------------------------------------------------
MAX_HEALTH = 100.0
STARVATION_DAMAGE_PER_TICK = 1.4   # health lost per tick while energy == 0
NATURAL_LIFESPAN_BASE = 2600        # ticks
NATURAL_LIFESPAN_PER_METABOLISM = -600  # higher metabolism -> shorter natural life
OLD_AGE_DAMAGE_PER_TICK = 0.6      # extra decay once past natural lifespan

# ---------------------------------------------------------------------------
# Reproduction
# ---------------------------------------------------------------------------
REPRODUCTION_ENERGY_THRESHOLD = 0.72   # fraction of max_energy required to be "ready"
REPRODUCTION_ENERGY_COST = 0.40        # fraction of max_energy each parent pays
REPRODUCTION_MIN_AGE = 150             # ticks
REPRODUCTION_COOLDOWN = 220            # ticks before a creature can mate again
MATING_RADIUS = 26.0

MUTATION_RATE = 0.02          # probability per-trait a mutation occurs
MUTATION_STRENGTH = 0.18      # max +/- fractional jitter applied on mutation

# ---------------------------------------------------------------------------
# Behaviour (rule-based for the MVP — no neural controller yet)
# ---------------------------------------------------------------------------
WANDER_TURN_JITTER = 0.35     # radians/tick max random heading change while wandering
EAT_RADIUS = 8.0

# ---------------------------------------------------------------------------
# Simulation pacing
# ---------------------------------------------------------------------------
BROADCAST_HZ = 20                    # network updates/sec sent to the browser
BASE_TICKS_PER_BROADCAST = 2         # at 1x speed
MAX_TICK_BUDGET_SECONDS = 0.08       # best-effort wall-clock budget per broadcast frame
SPEED_MULTIPLIERS = [1, 5, 10, 50, 100]

WS_HOST = "0.0.0.0"
WS_PORT = 8765
