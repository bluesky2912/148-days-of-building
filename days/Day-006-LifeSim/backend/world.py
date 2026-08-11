"""
world.py — the ecosystem container and the single tick() entry point.

tick() runs the phases in a fixed order every call:
  1. rebuild the food spatial hash
  2. every creature perceives (needs a fresh hash, so this is its own pass)
  3. every creature moves / eats / metabolizes / ages
  4. consumed food is removed, new food spawns in
  5. reproduction pass (needs a fresh creature hash, built post-movement)
  6. dead creatures are dropped

Splitting perceive from move/eat into two passes matters: if a creature ate
mid-loop, a creature perceived earlier in the same tick could otherwise
target food that's already gone. Building the hash once per tick and
perceiving before anyone acts keeps every creature's decision consistent
with the same snapshot of the world.
"""

from __future__ import annotations

import random

import config
import genetics
from creature import Creature
from food import Food
from genetics import DNA
from spatial_hash import SpatialHash


class World:
    def __init__(self):
        self.creatures: list[Creature] = []
        self.food: list[Food] = []
        self.creature_hash = SpatialHash(config.SPATIAL_CELL_SIZE)
        self.food_hash = SpatialHash(config.SPATIAL_CELL_SIZE)
        self.tick_count = 0

        self.last_births = 0
        self.last_deaths = 0
        self.total_births = 0
        self.total_deaths = 0
        self.total_mutations = 0

        self._food_claimed_this_tick: set[int] = set()

        self.reset()

    def reset(self) -> None:
        self.creatures = [
            Creature(
                x=random.uniform(0, config.WORLD_WIDTH),
                y=random.uniform(0, config.WORLD_HEIGHT),
                dna=DNA.random(),
                generation=0,
                birth_tick=0,
            )
            for _ in range(config.INITIAL_CREATURES)
        ]
        self.food = [Food.random_spawn() for _ in range(config.INITIAL_FOOD)]
        self.tick_count = 0
        self.last_births = 0
        self.last_deaths = 0
        self.total_births = 0
        self.total_deaths = 0
        self.total_mutations = 0
        self._food_claimed_this_tick = set()

    # ------------------------------------------------------------------
    def consume_food(self, food_item: Food):
        """First creature to call this for a given food item each tick wins
        (two creatures can target the same pellet in the same tick)."""
        if food_item.id in self._food_claimed_this_tick:
            return None
        self._food_claimed_this_tick.add(food_item.id)
        return food_item.energy

    def get_creature(self, creature_id: int):
        for c in self.creatures:
            if c.id == creature_id:
                return c
        return None

    # ------------------------------------------------------------------
    def tick(self) -> None:
        self.tick_count += 1
        self._food_claimed_this_tick = set()

        self.food_hash.build(self.food)

        for c in self.creatures:
            c.perceive(self.food_hash)

        for c in self.creatures:
            dist = c.move()
            c.try_eat(self)
            c.metabolize(dist)
            c.age_and_check_death()

        if self._food_claimed_this_tick:
            self.food = [f for f in self.food if f.id not in self._food_claimed_this_tick]

        room = max(0, config.MAX_FOOD - len(self.food))
        for _ in range(min(config.FOOD_SPAWN_PER_TICK, room)):
            self.food.append(Food.random_spawn())

        dead_before_births = sum(1 for c in self.creatures if not c.alive)
        newborns = self._handle_reproduction()
        self.creatures = [c for c in self.creatures if c.alive]

        self.last_births = len(newborns)
        self.last_deaths = dead_before_births
        self.total_births += self.last_births
        self.total_deaths += self.last_deaths

    def _handle_reproduction(self) -> list[Creature]:
        self.creature_hash.build(self.creatures)
        paired: set[int] = set()
        newborns: list[Creature] = []

        for c in self.creatures:
            if not c.alive or c.id in paired:
                continue
            if not c.is_ready_to_reproduce(self.tick_count):
                continue

            nearby = self.creature_hash.query_radius(c.x, c.y, config.MATING_RADIUS)
            mate = None
            for other in nearby:
                if other.id == c.id or other.id in paired or not other.alive:
                    continue
                if not other.is_ready_to_reproduce(self.tick_count):
                    continue
                d2 = (other.x - c.x) ** 2 + (other.y - c.y) ** 2
                if d2 <= config.MATING_RADIUS ** 2:
                    mate = other
                    break
            if mate is None:
                continue

            before = (c.dna.speed, c.dna.vision, c.dna.size, c.dna.metabolism,
                      mate.dna.speed, mate.dna.vision, mate.dna.size, mate.dna.metabolism)
            child_dna = genetics.reproduce(c.dna, mate.dna)
            if self._is_mutant(child_dna, c.dna, mate.dna):
                self.total_mutations += 1

            child = Creature(
                x=(c.x + mate.x) / 2 + random.uniform(-6, 6),
                y=(c.y + mate.y) / 2 + random.uniform(-6, 6),
                dna=child_dna,
                generation=max(c.generation, mate.generation) + 1,
                parent_ids=(c.id, mate.id),
                birth_tick=self.tick_count,
            )
            newborns.append(child)

            c.pay_reproduction_cost(self.tick_count)
            mate.pay_reproduction_cost(self.tick_count)
            paired.add(c.id)
            paired.add(mate.id)

        self.creatures.extend(newborns)
        return newborns

    @staticmethod
    def _is_mutant(child: DNA, parent_a: DNA, parent_b: DNA) -> bool:
        """A trait counts as mutated if it falls outside the span the blend
        crossover could have produced from the two parents alone."""
        for name in ("speed", "vision", "size", "metabolism"):
            lo = min(getattr(parent_a, name), getattr(parent_b, name))
            hi = max(getattr(parent_a, name), getattr(parent_b, name))
            if not (lo - 1e-9 <= getattr(child, name) <= hi + 1e-9):
                return True
        return False
