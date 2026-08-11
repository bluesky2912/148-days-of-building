"""
simulation.py — the thing app.py actually drives.

Speed control is honest rather than aspirational: at 1x we run a small,
fixed number of ticks per broadcast frame (a comfortable real-time pace).
Higher multipliers ask for proportionally more ticks per frame, but every
frame is capped by a wall-clock time budget — if the population is large
enough that we can't finish the requested ticks in time, we broadcast
whatever we managed and let the achieved tick-rate (visible in the stats
payload) tell the real story instead of silently stalling the server.
"""

from __future__ import annotations

import time

import config
from statistics import Statistics
from world import World


class Simulation:
    def __init__(self):
        self.world = World()
        self.stats = Statistics()
        self.running = True
        self.speed = 1

    def set_speed(self, multiplier: int) -> None:
        if multiplier in config.SPEED_MULTIPLIERS:
            self.speed = multiplier

    def start(self) -> None:
        self.running = True

    def pause(self) -> None:
        self.running = False

    def reset(self) -> None:
        self.world.reset()
        self.stats.reset()
        self.running = True
        self.speed = 1

    def advance_frame(self) -> tuple[int, float]:
        """Run one broadcast-frame's worth of ticks. Returns (ticks_run, elapsed_seconds)."""
        if not self.running:
            return 0, 0.0

        target_ticks = max(1, config.BASE_TICKS_PER_BROADCAST * self.speed)
        start = time.perf_counter()
        ticks_run = 0
        while ticks_run < target_ticks:
            self.world.tick()
            ticks_run += 1
            if time.perf_counter() - start >= config.MAX_TICK_BUDGET_SECONDS:
                break
        return ticks_run, time.perf_counter() - start

    def snapshot_for_broadcast(self, ticks_this_frame: int = 0, frame_seconds: float = 0.0) -> dict:
        stats = self.stats.snapshot(self.world)
        stats["ticks_per_sec_actual"] = (
            round(ticks_this_frame / frame_seconds) if frame_seconds > 0 else 0
        )
        return {
            "type": "tick",
            "running": self.running,
            "speed": self.speed,
            "creatures": [c.to_state_dict() for c in self.world.creatures],
            "food": [{"id": f.id, "x": round(f.x, 1), "y": round(f.y, 1)} for f in self.world.food],
            "stats": stats,
            "history": self.stats.history_payload(),
        }

    def get_creature_detail(self, creature_id: int) -> dict | None:
        c = self.world.get_creature(creature_id)
        return c.to_detail_dict() if c else None
