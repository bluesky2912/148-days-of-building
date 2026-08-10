# THE LOST CITY — a terminal RPG in C

A text-based RPG that runs entirely in the terminal. Built in stages
to learn C fundamentals along the way.

## Build & run

```bash
gcc -Wall -Wextra main.c game.c player.c combat.c save.c -o lostcity
./lostcity
```

## Project structure

```
main.c      - entry point, just calls run_game()
game.c/.h   - the game loop and main menu
player.c/.h - the Player struct (HP, attack, defense, level, XP, gold, inventory)
combat.c/.h - combat system (stub for now)
save.c/.h   - save/load system (stub for now)
```

## Status: Step 1 — project scaffolding

Working right now:
- The title screen and main menu render and loop.
- Menu options 1-6 are all wired up.
- `[4] Character stats` shows real player data from the `Player` struct.
- `[6] Quit` exits cleanly.

Stubbed (prints a placeholder message, to be built in later steps):
- `[1] Enter the city` and `[2] Search the area` — the world/map system.
- `[3] Check inventory` — inventory display.
- `[5] Save game` — real file I/O with `save.dat`.
- Combat entirely (`combat.c`) — Attack/Defend/Heal/Run, enemy AI.

## Roadmap

- [x] Step 1: Project structure, main menu, Player struct
- [ ] Step 2: World map (Forest, Ruins, Cave, Village, Lost City) + "Enter/Search"
- [ ] Step 3: Combat system + enemy AI
- [ ] Step 4: Inventory & items
- [ ] Step 5: XP, leveling, weapons/armor
- [ ] Step 6: Save/load with real file I/O
- [ ] Step 7: The boss fight