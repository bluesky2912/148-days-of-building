"""
spatial_hash.py — uniform grid spatial index.

Avoids the O(creatures x food) checks the spec calls out explicitly. The
grid is rebuilt from scratch every tick rather than incrementally updated —
at this population scale a full rebuild is cheap and it sidesteps a whole
class of "stale bucket" bugs. Swap in a quadtree later only if profiling
shows the rebuild is actually the bottleneck.
"""

from __future__ import annotations

import math
from collections import defaultdict


class SpatialHash:
    def __init__(self, cell_size: float):
        self.cell_size = cell_size
        self._buckets: dict[tuple[int, int], list] = defaultdict(list)

    def _cell_of(self, x: float, y: float) -> tuple[int, int]:
        return (int(x // self.cell_size), int(y // self.cell_size))

    def clear(self) -> None:
        self._buckets.clear()

    def insert(self, item) -> None:
        """item must expose .x and .y attributes."""
        self._buckets[self._cell_of(item.x, item.y)].append(item)

    def build(self, items) -> None:
        self.clear()
        for item in items:
            self.insert(item)

    def query_radius(self, x: float, y: float, radius: float) -> list:
        """Return every item in cells overlapping the query circle's bounding
        box. Callers that need an exact circle should distance-filter the
        result themselves — this keeps the hash generic for both food and
        creature queries."""
        cell_radius = int(math.ceil(radius / self.cell_size))
        cx, cy = self._cell_of(x, y)
        results = []
        for dx in range(-cell_radius, cell_radius + 1):
            for dy in range(-cell_radius, cell_radius + 1):
                bucket = self._buckets.get((cx + dx, cy + dy))
                if bucket:
                    results.extend(bucket)
        return results
