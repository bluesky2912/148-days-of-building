"""statistics.py — per-broadcast snapshot + a bounded rolling history for
the client-side sparkline charts. History is sampled once per broadcast
frame (not every tick) so the client gets a readable trend line instead of
thousands of points at high sim speed."""

from __future__ import annotations

from collections import deque


class Statistics:
    def __init__(self, history_len: int = 240):
        self.population_history: deque = deque(maxlen=history_len)
        self.avg_speed_history: deque = deque(maxlen=history_len)
        self.avg_vision_history: deque = deque(maxlen=history_len)
        self.avg_size_history: deque = deque(maxlen=history_len)

    def snapshot(self, world) -> dict:
        creatures = world.creatures
        n = len(creatures)
        if n:
            avg_speed = sum(c.dna.speed for c in creatures) / n
            avg_vision = sum(c.dna.vision for c in creatures) / n
            avg_size = sum(c.dna.size for c in creatures) / n
            avg_gen = sum(c.generation for c in creatures) / n
            max_gen = max(c.generation for c in creatures)
        else:
            avg_speed = avg_vision = avg_size = avg_gen = max_gen = 0.0

        avg_speed, avg_vision, avg_size = round(avg_speed, 2), round(avg_vision, 1), round(avg_size, 2)

        self.population_history.append(n)
        self.avg_speed_history.append(avg_speed)
        self.avg_vision_history.append(avg_vision)
        self.avg_size_history.append(avg_size)

        return {
            "tick": world.tick_count,
            "population": n,
            "food": len(world.food),
            "avg_speed": avg_speed,
            "avg_vision": avg_vision,
            "avg_size": avg_size,
            "avg_generation": round(avg_gen, 1),
            "max_generation": max_gen,
            "births_total": world.total_births,
            "deaths_total": world.total_deaths,
            "births_last": world.last_births,
            "deaths_last": world.last_deaths,
            "mutations_total": world.total_mutations,
        }

    def history_payload(self) -> dict:
        return {
            "population": list(self.population_history),
            "avg_speed": list(self.avg_speed_history),
            "avg_vision": list(self.avg_vision_history),
            "avg_size": list(self.avg_size_history),
        }

    def reset(self) -> None:
        self.population_history.clear()
        self.avg_speed_history.clear()
        self.avg_vision_history.clear()
        self.avg_size_history.clear()
