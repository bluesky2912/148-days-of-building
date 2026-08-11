"""
genetics.py — DNA, crossover, and mutation.

Traits live on a plain dataclass rather than a dict so creature.py gets
attribute access and typos become AttributeErrors instead of silent bugs.
This is also the seam where a future day bolts on neural-network weights:
DNA just grows a `weights` field and crossover/mutate learn to handle it.
"""

from __future__ import annotations

import random
from dataclasses import dataclass, fields

import config


@dataclass
class DNA:
    speed: float
    vision: float
    size: float
    metabolism: float

    @staticmethod
    def random() -> "DNA":
        return DNA(
            speed=random.uniform(*config.SPEED_RANGE),
            vision=random.uniform(*config.VISION_RANGE),
            size=random.uniform(*config.SIZE_RANGE),
            metabolism=random.uniform(*config.METABOLISM_RANGE),
        )

    def clamp(self) -> "DNA":
        self.speed = max(0.3, self.speed)
        self.vision = max(10.0, self.vision)
        self.size = max(0.8, self.size)
        self.metabolism = max(0.2, self.metabolism)
        return self

    def copy(self) -> "DNA":
        return DNA(**{f.name: getattr(self, f.name) for f in fields(self)})


def crossover(dna_a: DNA, dna_b: DNA) -> DNA:
    """Blend crossover: each trait is a random weighted average of both
    parents rather than a hard pick, so offspring traits form a continuum
    instead of clumping on exactly one parent's values."""
    child_values = {}
    for f in fields(DNA):
        a_val = getattr(dna_a, f.name)
        b_val = getattr(dna_b, f.name)
        t = random.random()
        child_values[f.name] = a_val * t + b_val * (1 - t)
    return DNA(**child_values).clamp()


def mutate(dna: DNA) -> DNA:
    for f in fields(DNA):
        if random.random() < config.MUTATION_RATE:
            current = getattr(dna, f.name)
            jitter = random.uniform(-config.MUTATION_STRENGTH, config.MUTATION_STRENGTH)
            setattr(dna, f.name, current * (1.0 + jitter))
    return dna.clamp()


def reproduce(dna_a: DNA, dna_b: DNA) -> DNA:
    return mutate(crossover(dna_a, dna_b))
