"""
neural_controller.py — STUB, not yet implemented.

Planned upgrade path from the current rule-based creature.perceive()/move()
(see LifeSim spec section 13):
  - fixed-topology small MLP: inputs = [dist_to_food, dir_to_food,
    dist_to_predator, dir_to_predator, energy_frac, age_frac]
  - outputs = [turn, acceleration]
  - DNA gains a flat weights+biases array; genetics.crossover/mutate need a
    per-gene (not per-trait) variant for that array

Fixed topology (not NEAT-style topology evolution) is the deliberate choice
here — evolving network structure is a substantially bigger project and
isn't needed to get emergent behaviour out of weight evolution alone.
"""
