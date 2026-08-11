"""
predator.py — STUB, not yet implemented.

Planned for a later day (see LifeSim spec section 20):
  - Predator class: position, DNA (speed/vision/hunting efficiency), energy
  - detect prey (reuse SpatialHash query against the creature population)
  - chase -> attack -> consume -> gain energy
  - prey-side pressure this creates: creatures evolving speed/vision/group
    behaviour in response, i.e. an actual predator-prey arms race

Deliberately deferred out of the Day 006 core-loop build: predators need
carcasses (below) to make death meaningful rather than a pure sink, and a
second selective pressure is easier to tune once the food/energy economy
alone is already balanced (see world.py's reproduction/starvation loop).
"""
