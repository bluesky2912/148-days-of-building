"""
lineage.py — STUB, not yet implemented.

Planned for a later day (see LifeSim spec section 22): phylogenetic tree
reconstruction from parent_ids.

Note for whoever picks this up: World currently discards a creature's
record entirely on death (see world.py's `self.creatures = [c for c in
self.creatures if c.alive]`), so ancestry can't be reconstructed past the
living population yet. This module will need World to persist a lightweight
append-only birth log (id, parent_ids, birth_tick, death_tick) rather than
relying on the live creature list.
"""
