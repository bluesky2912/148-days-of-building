"""
carcass.py — STUB, not yet implemented.

Planned for a later day (see LifeSim spec section 21):
  - Carcass left behind on Creature death instead of silent removal
  - decays over N ticks, converting into Food (nutrient cycle: plants ->
    herbivores -> predators -> carcasses -> scavengers -> nutrients -> plants)

Current world.py just drops dead creatures — energy leaves the system on
death rather than cycling back in. Worth flagging as the first thing to
revisit once predators exist, since scavenging is what makes death matter
ecologically rather than just numerically.
"""
