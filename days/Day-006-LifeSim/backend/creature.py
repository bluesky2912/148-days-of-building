"""
creature.py — a single organism.

Behaviour for this MVP is rule-based (chase nearest visible food, else
wander) rather than a neural controller — that's the planned Day 007+
upgrade. The important thing architecturally is that DNA, perception, and
action are already separated, so swapping the decision-making step for a
network forward-pass later doesn't touch movement/energy/reproduction code.
"""

from __future__ import annotations

import itertools
import math
import random

import config
from genetics import DNA

_id_counter = itertools.count(1)


class Creature:
    __slots__ = (
        "id", "x", "y", "rotation", "dna", "generation", "parent_ids",
        "age", "max_energy", "energy", "health", "state", "children_count",
        "last_reproduced_tick", "alive", "lifespan", "_target_food",
    )

    def __init__(
        self,
        x: float,
        y: float,
        dna: DNA,
        generation: int = 0,
        parent_ids: tuple = (None, None),
        birth_tick: int = 0,
    ):
        self.id = next(_id_counter)
        self.x = x
        self.y = y
        self.rotation = random.uniform(0, 2 * math.pi)
        self.dna = dna
        self.generation = generation
        self.parent_ids = parent_ids

        self.age = 0
        self.max_energy = config.MAX_ENERGY_BASE + dna.size * config.MAX_ENERGY_PER_SIZE
        self.energy = self.max_energy * config.START_ENERGY_FRACTION
        self.health = config.MAX_HEALTH
        self.state = "SEARCHING"
        self.children_count = 0
        self.last_reproduced_tick = birth_tick - config.REPRODUCTION_COOLDOWN
        self.alive = True
        self.lifespan = max(
            300,
            config.NATURAL_LIFESPAN_BASE + dna.metabolism * config.NATURAL_LIFESPAN_PER_METABOLISM,
        )
        self._target_food = None

    # ------------------------------------------------------------------
    # Reproduction eligibility
    # ------------------------------------------------------------------
    def is_ready_to_reproduce(self, tick: int) -> bool:
        return (
            self.energy >= self.max_energy * config.REPRODUCTION_ENERGY_THRESHOLD
            and self.age >= config.REPRODUCTION_MIN_AGE
            and (tick - self.last_reproduced_tick) >= config.REPRODUCTION_COOLDOWN
        )

    def pay_reproduction_cost(self, tick: int) -> None:
        self.energy -= self.max_energy * config.REPRODUCTION_ENERGY_COST
        self.last_reproduced_tick = tick
        self.children_count += 1

    # ------------------------------------------------------------------
    # Tick phases — perceive / move / eat / metabolize / age
    # ------------------------------------------------------------------
    def perceive(self, food_hash) -> None:
        candidates = food_hash.query_radius(self.x, self.y, self.dna.vision)
        nearest = None
        nearest_d2 = self.dna.vision ** 2
        for f in candidates:
            d2 = (f.x - self.x) ** 2 + (f.y - self.y) ** 2
            if d2 <= nearest_d2:
                nearest_d2 = d2
                nearest = f
        self._target_food = nearest
        self.state = "MOVING_TO_FOOD" if nearest is not None else "SEARCHING"

    def move(self) -> float:
        """Returns distance actually travelled this tick (used for energy cost)."""
        if self._target_food is not None:
            dx = self._target_food.x - self.x
            dy = self._target_food.y - self.y
            dist_to_target = math.hypot(dx, dy) or 1e-6
            self.rotation = math.atan2(dy, dx)
            move_dist = min(self.dna.speed, dist_to_target)
        else:
            self.rotation += random.uniform(-config.WANDER_TURN_JITTER, config.WANDER_TURN_JITTER)
            move_dist = self.dna.speed * 0.55

        self.x = (self.x + math.cos(self.rotation) * move_dist) % config.WORLD_WIDTH
        self.y = (self.y + math.sin(self.rotation) * move_dist) % config.WORLD_HEIGHT
        return move_dist

    def try_eat(self, world) -> None:
        if self._target_food is None:
            return
        d = math.hypot(self._target_food.x - self.x, self._target_food.y - self.y)
        if d <= config.EAT_RADIUS:
            gained = world.consume_food(self._target_food)
            if gained:
                self.energy = min(self.max_energy, self.energy + gained)
                self._target_food = None
                self.state = "SEARCHING"

    def metabolize(self, move_dist: float) -> None:
        speed_fraction = move_dist / max(self.dna.speed, 0.001)
        movement_cost = (
            config.MOVEMENT_COST_COEFF * (self.dna.speed ** 2) * self.dna.size * speed_fraction
        )
        size_cost = config.SIZE_UPKEEP_COEFF * self.dna.size
        vision_cost = config.VISION_UPKEEP_COEFF * self.dna.vision
        total_cost = config.BASE_METABOLISM_COST + movement_cost + size_cost + vision_cost
        self.energy = max(0.0, self.energy - total_cost)

    def age_and_check_death(self) -> None:
        self.age += 1
        if self.energy <= 0:
            self.health -= config.STARVATION_DAMAGE_PER_TICK
        if self.age > self.lifespan:
            self.health -= config.OLD_AGE_DAMAGE_PER_TICK
        if self.health <= 0:
            self.alive = False

    # ------------------------------------------------------------------
    # Serialization
    # ------------------------------------------------------------------
    def to_state_dict(self) -> dict:
        """Compact per-tick payload — visual state only, no DNA/lineage."""
        return {
            "id": self.id,
            "x": round(self.x, 1),
            "y": round(self.y, 1),
            "rot": round(self.rotation, 2),
            "e": round(self.energy, 1),
            "sz": round(self.dna.size, 2),
            "spd": round(self.dna.speed, 2),
            "st": self.state,
        }

    def to_detail_dict(self) -> dict:
        """Full payload — sent only when the client clicks a creature."""
        return {
            "id": self.id,
            "age": self.age,
            "generation": self.generation,
            "health": round(self.health, 1),
            "energy": round(self.energy, 1),
            "max_energy": round(self.max_energy, 1),
            "speed": round(self.dna.speed, 2),
            "vision": round(self.dna.vision, 1),
            "size": round(self.dna.size, 2),
            "metabolism": round(self.dna.metabolism, 2),
            "lifespan": round(self.lifespan),
            "state": self.state,
            "children": self.children_count,
            "parents": list(self.parent_ids),
        }
