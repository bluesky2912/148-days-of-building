# 👻 GhostSort

**A smart command-line (and small GUI) file organizer for Python.**

Point GhostSort at a messy folder and it sorts everything into
category subfolders by file type — Images, Documents, Music, Videos,
Applications, Archives, Code, and anything else into Others. Fully
reversible, fully inspectable, and it'll flag a few common malware
disguise tricks along the way.

> Day 4 of my [148 Days of Building](../../) challenge.

---

## Before → After

```
📂 Downloads/                      📂 Downloads/
├── photo.jpg                      ├── 📁 Images/
├── resume.pdf                          └── photo.jpg
├── song.mp3                       ├── 📁 Documents/
├── movie.mp4                           └── resume.pdf
├── notes.txt              ──▶     ├── 📁 Music/
├── setup.exe                           └── song.mp3
├── project.zip                    ├── 📁 Videos/
└── script.py                           └── movie.mp4
                                    ├── 📁 Applications/
                                         └── setup.exe
                                    ├── 📁 Archives/
                                         └── project.zip
                                    └── 📁 Code/
                                         └── script.py
```

```
python ghostsort.py ~/Downloads
```

```
╔═══════════════════════════════════════════════════╗
║                 👻 GHOSTSORT v4.0                  ║
║             FILE ORGANIZATION SYSTEM               ║
╠═══════════════════════════════════════════════════╣
║                                                     ║
║  Organizing...                                     ║
║  ████████████████████ 100%                         ║
║                                                     ║
║  Files found       8                                ║
║  ● Code             3                               ║
║  ● Documents        2                               ║
║  ● Images           1                               ║
║  ● Applications     1                               ║
║  ● Archives         1                               ║
║                                                     ║
║  ✓ Organization complete                            ║
╚═══════════════════════════════════════════════════╝
```

---

## Features

- **Sorts by extension** into Images / Documents / Music / Videos /
  Applications / Archives / Code / Others — fully customizable, see
  [Custom categories](#custom-categories) below.
- **Boxed terminal UI** with a live animated progress bar, color-coded
  per category, sized automatically to whatever it's showing.
- **Fully reversible.** Every real run writes a hidden log of exactly
  what moved where — `--undo` puts it all back and cleans up any
  folders it created, even if some files were touched in between.
- **`--scan` / dry-run mode** previews exactly what would happen
  without moving a single file.
- **`--stats`** reports the folder's current organized state: counts,
  sizes, how many files are still loose, and how many times you've
  run GhostSort here.
- **`--security`** scans for a few common red flags:
  - **Duplicate files** (hashed, so it catches true byte-for-byte
    copies, not just similar names)
  - **Double-extension bait** — e.g. `invoice.pdf.exe`, a classic
    trick to disguise a program as a document
  - **Extension mismatches** — a file claiming to be a `.jpg` whose
    actual bytes say otherwise
- **Resilient to real-world messy folders.** Locked files, permission
  errors, and OneDrive placeholder files are skipped with a warning
  instead of crashing the whole run.
- **A small GUI** (`ghostsort_gui.py`) for the same five actions —
  Scan, Organize, Undo, Stats, Security — with a dark, color-coded
  log and a progress bar.

---

## Requirements

- Python 3.10+
- No third-party packages for the CLI — standard library only.
- The GUI needs `tkinter`, which ships by default with the standard
  python.org installer on Windows and macOS.

---

## Usage

```bash
python ghostsort.py                  # organize the current folder
python ghostsort.py ~/Downloads      # organize a specific folder

python ghostsort.py ~/Downloads --scan       # preview only, moves nothing
python ghostsort.py ~/Downloads --organize   # explicit organize (same as default)
python ghostsort.py ~/Downloads --undo       # revert the last organize run here
python ghostsort.py ~/Downloads --stats      # breakdown of the folder as-is
python ghostsort.py ~/Downloads --security   # check for duplicates & suspicious files
python ghostsort.py ~/Downloads --plain      # plain-text output, no boxed UI
```

Or launch the GUI:

```bash
python ghostsort_gui.py
```

*(`ghostsort_gui.py` imports `ghostsort.py` directly, so keep them in
the same folder.)*

---

## Custom categories

Drop a `ghostsort_config.json` next to `ghostsort.py` to extend or add
categories, or ignore specific filenames, without touching the source:

```json
{
  "categories": {
    "Code": ["pyw"],
    "Fonts": [".ttf", ".otf"]
  },
  "ignore": ["notes.txt"]
}
```

Categories merge with the defaults (so `"Code": ["pyw"]` adds `.pyw`
alongside the built-in Code extensions); a new category name like
`"Fonts"` is created outright. Extensions work with or without the
leading dot. `--stats` will note when a custom config is active.

---

## How undo works

Every real (non-dry-run) organize writes a hidden
`.ghostsort_undo.json` in the target folder recording exactly which
file went where. `--undo` reads it, moves everything back, deletes any
category folders that are now empty, and removes the log. Running
`--undo` again with nothing left to undo is safe — it just says so.

Only the **most recent** run is undoable; organizing twice in a row
overwrites the log from the first run.

## How the security scan works

`--security` is heuristic pattern-matching, not antivirus:

| Check | What it catches |
|---|---|
| Duplicate detection | Files grouped by size, then SHA-256 hash — true identical copies only |
| Double-extension bait | Names like `report.pdf.exe`, `photo.jpg.scr` |
| Extension mismatch | A file's actual first bytes don't match what its extension claims |

It won't catch everything a real antivirus would, and it's not meant
to — it's a fast, local first pass over a folder, not a replacement
for one.

---

## Project structure

```
ghostsort.py         # CLI: all core logic + boxed terminal UI
ghostsort_gui.py      # Tkinter GUI, built on top of ghostsort.py
ghostsort_config.json # optional — your own category/ignore overrides
```

Hidden files GhostSort creates inside a folder you organize:

```
.ghostsort_undo.json     # last run's move log, used by --undo
.ghostsort_history.json  # rolling log of past runs, used by --stats
```

---

## Roadmap

- [x] V1 — scan, categorize, move
- [x] V2 — boxed terminal UI with animated progress bar
- [x] V3 — `--scan` / `--organize` / `--undo` / `--stats`
- [x] V4 — security scan (duplicates, double extensions, mismatches)
- [x] V5 — small Tkinter GUI
- [ ] Interactive review for unrecognized extensions before sorting
- [ ] Recursive mode for nested folders

---

## License

See [`LICENSE`](./LICENSE).