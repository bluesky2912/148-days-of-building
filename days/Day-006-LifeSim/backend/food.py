"""food.py — a food pellet on the map. Deliberately dumb: World owns spawning
and consumption, Food just holds state."""

from __future__ import annotations

import itertools
import random

import config

_id_counter = itertools.count(1)


class Food:
    __slots__ = ("id", "x", "y", "energy")

    def __init__(self, x: float, y: float, energy: float = config.FOOD_ENERGY_VALUE):
        self.id = next(_id_counter)
        self.x = x
        self.y = y
        self.energy = energy

    @staticmethod
    def random_spawn() -> "Food":
        return Food(
            x=random.uniform(0, config.WORLD_WIDTH),
            y=random.uniform(0, config.WORLD_HEIGHT),
        )
