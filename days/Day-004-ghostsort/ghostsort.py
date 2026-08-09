#!/usr/bin/env python3
"""
GhostSort - Smart File Organizer (V4)

Scans a folder and sorts files into category subfolders based on
their extension: Images, Documents, Music, Videos, Applications,
Archives, and Others. Has a boxed terminal UI with an animated
progress bar, scan/organize/undo/stats modes, and a security scan
for duplicates, double-extension bait, and mismatched file types.

Usage:
    python ghostsort.py                  # organizes the current folder
    python ghostsort.py /path/to/folder  # organizes a specific folder
    python ghostsort.py --scan           # preview only, moves nothing
    python ghostsort.py --organize       # explicitly organize (same as default)
    python ghostsort.py --undo           # revert the last organize run here
    python ghostsort.py --stats          # show a breakdown of the folder as-is
    python ghostsort.py --security       # check for duplicates & suspicious files
    python ghostsort.py --plain          # old V1 plain-text output, no UI

GUI: run `python ghostsort_gui.py` (same folder) for a small Tkinter
front-end over these same actions.
"""

import argparse
import hashlib
import json
import os
import re
import shutil
import sys
import time
from datetime import datetime
from pathlib import Path

# Enable ANSI escape codes on Windows terminals (cmd.exe / older PowerShell)
if sys.platform == "win32":
    os.system("")

# ── Category rules ───────────────────────────────────────────────
# Extension → folder name. These are the defaults; anyone can extend or
# override them without touching this file — see load_user_config() below.
DEFAULT_CATEGORIES = {
    "Images":       {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg",
                      ".webp", ".tiff", ".ico", ".heic"},
    "Documents":    {".pdf", ".doc", ".docx", ".txt", ".odt", ".rtf",
                      ".xls", ".xlsx", ".ppt", ".pptx", ".csv", ".md"},
    "Music":        {".mp3", ".wav", ".flac", ".aac", ".ogg", ".m4a"},
    "Videos":       {".mp4", ".mkv", ".mov", ".avi", ".wmv", ".flv", ".webm"},
    "Applications": {".exe", ".msi", ".dmg", ".apk", ".deb", ".app"},
    "Archives":     {".zip", ".rar", ".7z", ".tar", ".gz", ".bz2"},
    "Code":         {".py", ".js", ".jsx", ".ts", ".tsx", ".html", ".htm",
                      ".css", ".scss", ".json", ".cpp", ".c", ".h", ".java",
                      ".go", ".rs", ".sh", ".ps1", ".yml", ".yaml", ".sql",
                      ".php", ".rb", ".ipynb"},
}

# Files GhostSort should never touch: itself, its GUI/config/docs, and the
# usual OS junk files that show up in real folders.
DEFAULT_IGNORE_NAMES = {
    "ghostsort.py", "ghostsort_gui.py", "ghostsort_config.json", "readme.md",
    "license", ".ds_store", "desktop.ini", "thumbs.db",
}

# Optional per-user overrides, read once at import time. Put a file named
# ghostsort_config.json next to this script to extend or add categories
# without editing source, e.g.:
#   {"categories": {"Code": ["pyw"], "Fonts": [".ttf", ".otf"]},
#    "ignore": ["notes.txt"]}
CONFIG_FILENAME = "ghostsort_config.json"


def load_user_config() -> tuple[dict[str, set[str]], set[str], bool]:
    """Merge ghostsort_config.json (if present) over the defaults.
    Returns (categories, ignore_names, config_was_found)."""
    categories = {name: set(exts) for name, exts in DEFAULT_CATEGORIES.items()}
    ignore = set(DEFAULT_IGNORE_NAMES)

    config_path = Path(__file__).resolve().parent / CONFIG_FILENAME
    if not config_path.exists():
        return categories, ignore, False

    try:
        data = json.loads(config_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return categories, ignore, False

    for name, exts in data.get("categories", {}).items():
        bucket = categories.setdefault(name, set())
        for ext in exts:
            ext = ext.lower()
            bucket.add(ext if ext.startswith(".") else f".{ext}")

    ignore.update(name.lower() for name in data.get("ignore", []))
    return categories, ignore, True


CATEGORIES, IGNORE_NAMES, USING_CUSTOM_CONFIG = load_user_config()

# Small single-width marker + color per category, used to make the boxed
# UI easier to scan at a glance. Anything not listed here (e.g. a brand
# new category from a user's config file) falls back to a stable color
# picked from PALETTE by hashing its name, so it's still consistent
# across runs without needing to be registered by hand.
PALETTE = ["CYAN", "GREEN", "YELLOW", "MAGENTA", "BLUE", "RED"]


def category_color(category: str) -> str:
    if category == "Others":
        return Style.DIM
    name = PALETTE[sum(map(ord, category)) % len(PALETTE)]
    return getattr(Style, name)


# Hidden log file GhostSort writes after each real (non-dry-run) organize,
# so --undo knows exactly what to move back. Lives inside the target folder.
# It's already excluded from scanning since scan_folder() skips dotfiles.
UNDO_LOG_NAME = ".ghostsort_undo.json"

# Hidden, append-only log of past organize runs (capped), used to show a
# "organized N times" note in --stats. Also dotfile-excluded from scans.
HISTORY_LOG_NAME = ".ghostsort_history.json"
MAX_HISTORY_ENTRIES = 20

# ── Security-scan rules ──────────────────────────────────────────
# Extensions that look harmless, commonly used as bait in a double-extension
# trick (e.g. "invoice.pdf.exe" shows as a PDF icon in some file managers).
SAFE_LOOKING_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".txt",
    ".xls", ".xlsx", ".mp3", ".mp4", ".csv",
}
# Extensions that actually run code, dangerous when disguised as the above.
DANGEROUS_EXTENSIONS = {
    ".exe", ".scr", ".bat", ".cmd", ".js", ".vbs", ".jar", ".ps1",
    ".msi", ".com", ".pif", ".hta",
}
# A few common file "magic numbers" — the first bytes of a file that reveal
# its real type regardless of what the extension claims.
MAGIC_SIGNATURES: dict[str, list[bytes]] = {
    ".jpg": [b"\xFF\xD8\xFF"], ".jpeg": [b"\xFF\xD8\xFF"],
    ".png": [b"\x89PNG\r\n\x1a\n"],
    ".gif": [b"GIF87a", b"GIF89a"],
    ".pdf": [b"%PDF"],
    ".zip": [b"PK\x03\x04", b"PK\x05\x06", b"PK\x07\x08"],
    ".exe": [b"MZ"], ".dll": [b"MZ"],
    ".rar": [b"Rar!"],
    ".7z": [b"7z\xBC\xAF\x27\x1C"],
}


def get_category(file_path: Path) -> str:
    """Return the category folder name for a given file, based on extension."""
    ext = file_path.suffix.lower()
    for category, extensions in CATEGORIES.items():
        if ext in extensions:
            return category
    return "Others"


def scan_folder(folder: Path) -> dict[str, list[Path]]:
    """
    Look at every file directly inside `folder` (not subfolders) and
    group them by category. Returns {category: [file, file, ...]}.
    """
    plan: dict[str, list[Path]] = {}

    for item in folder.iterdir():
        # Skip directories (including category folders from a previous run)
        if item.is_dir():
            continue
        # Skip hidden/system files and GhostSort itself
        if item.name.lower() in IGNORE_NAMES or item.name.startswith("."):
            continue

        category = get_category(item)
        plan.setdefault(category, []).append(item)

    return plan


def iter_managed_files(folder: Path) -> list[Path]:
    """
    Every real file GhostSort knows about in `folder`: loose files sitting
    in the root, plus files one level inside any category subfolder it
    created. Used by --stats and --security so both see the same picture.
    """
    files: list[Path] = []
    for item in folder.iterdir():
        if item.is_file():
            if item.name.lower() not in IGNORE_NAMES and not item.name.startswith("."):
                files.append(item)
        elif item.is_dir() and item.name in set(CATEGORIES) | {"Others"}:
            files.extend(f for f in item.iterdir() if f.is_file())
    return files


def organize(folder: Path, dry_run: bool = False) -> dict[str, int]:
    """
    Move every file in `folder` into its category subfolder.
    If dry_run is True, nothing is actually moved — just reported.
    Returns a {category: count} summary.
    """
    plan = scan_folder(folder)
    summary: dict[str, int] = {}
    records: list[dict] = []
    skipped: list[str] = []

    for category, files in plan.items():
        summary[category] = len(files)
        dest_folder = folder / category

        for file_path in files:
            if dry_run:
                print(f"  [DRY RUN] {file_path.name}  →  {category}/")
                continue

            try:
                dest_folder.mkdir(exist_ok=True)
                destination = dest_folder / file_path.name
                # Avoid overwriting a file that already exists in the destination
                destination = resolve_name_collision(destination)
                shutil.move(str(file_path), str(destination))
            except OSError as e:
                skipped.append(file_path.name)
                print(f"  ⚠ skipped {file_path.name} ({e.strerror or 'file in use'})")
                continue

            records.append({"src": str(file_path), "dest": str(destination)})
            print(f"  moved  {file_path.name}  →  {category}/{destination.name}")

    if not dry_run:
        write_undo_log(folder, records)
        append_history(folder, summary)

    return summary


def resolve_name_collision(destination: Path) -> Path:
    """If destination already exists, append (1), (2), etc. until it's free."""
    if not destination.exists():
        return destination

    stem, suffix, parent = destination.stem, destination.suffix, destination.parent
    counter = 1
    while True:
        candidate = parent / f"{stem} ({counter}){suffix}"
        if not candidate.exists():
            return candidate
        counter += 1


def print_summary(summary: dict[str, int], dry_run: bool) -> None:
    """Plain-text summary, used by --plain mode."""
    total = sum(summary.values())
    print()
    print("─" * 36)
    print(f"{'DRY RUN SUMMARY' if dry_run else 'ORGANIZATION COMPLETE'}")
    print("─" * 36)
    if total == 0:
        print("  Nothing to organize — folder is already tidy.")
    else:
        for category, count in sorted(summary.items(), key=lambda x: -x[1]):
            print(f"  {category:<14} {count}")
        print("─" * 36)
        print(f"  {'Total files':<14} {total}")
    print("─" * 36)


# ── V2: boxed terminal UI ────────────────────────────────────────
class Style:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    CYAN = "\033[96m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    MAGENTA = "\033[95m"
    BLUE = "\033[94m"
    RED = "\033[91m"


_ANSI_RE = re.compile(r"\033\[[0-9;]*m")


def _visible_len(text: str) -> int:
    """Length of a string as it appears on screen, ignoring ANSI color codes."""
    return len(_ANSI_RE.sub("", text))


class Box:
    """A simple box-drawing renderer sized to fit whatever content it's given."""

    def __init__(self, content_lines: list[str], min_width: int = 34):
        # width is based on the *visible* length of the longest line
        widest = max((_visible_len(line) for line in content_lines), default=0)
        self.width = max(widest + 4, min_width)

    def top(self):
        print("╔" + "═" * self.width + "╗")

    def divider(self):
        print("╠" + "═" * self.width + "╣")

    def bottom(self):
        print("╚" + "═" * self.width + "╝")

    def line(self, text: str = "", align: str = "left") -> None:
        pad = self.width - _visible_len(text)
        if align == "center":
            left = pad // 2
            right = pad - left
            print("║" + " " * left + text + " " * right + "║")
        else:
            print("║" + text + " " * pad + "║")

    def progress_line(self, text: str) -> str:
        """Build a raw (unprinted) bordered line for \\r animation."""
        pad = self.width - _visible_len(text)
        return "║" + text + " " * pad + "║"


def draw_progress_bar(fraction: float, width: int = 20) -> str:
    filled = int(width * fraction)
    return "█" * filled + "░" * (width - filled)


def run_ui(folder: Path, dry_run: bool) -> dict[str, int]:
    """Scan + organize `folder`, rendering the boxed terminal UI."""
    plan = scan_folder(folder)
    files = [(cat, f) for cat, group in plan.items() for f in group]
    total = len(files)
    summary = {cat: len(group) for cat, group in plan.items()}

    sorted_categories = sorted(summary.items(), key=lambda x: -x[1])
    first_line = f"Files found       {total}"
    category_rows = [f"● {category:<14}   {count}" for category, count in sorted_categories]
    done_text = "DRY RUN — nothing was moved" if dry_run else "✓ Organization complete"
    empty_text = "Nothing to organize — folder is already tidy."
    # Worst case for sizing: every file skipped, so the box is wide enough
    # no matter how many actually are.
    skipped_worst_case = f"⚠ {total} file(s) skipped (locked or inaccessible)"

    box = Box(
        content_lines=["👻 GHOSTSORT v4.0", "FILE ORGANIZATION SYSTEM",
                        f"  {draw_progress_bar(1.0)} 100%", f"  {first_line}",
                        *[f"  {row}" for row in category_rows],
                        done_text, empty_text, f"  {skipped_worst_case}"]
    )

    box.top()
    box.line(f"{Style.BOLD}{Style.CYAN}👻 GHOSTSORT v4.0{Style.RESET}", align="center")
    box.line(f"{Style.DIM}FILE ORGANIZATION SYSTEM{Style.RESET}", align="center")
    box.divider()
    box.line()

    label = "Simulating..." if dry_run else "Organizing..."
    box.line(f"  {label}")

    records: list[dict] = []
    skipped: list[str] = []

    if total == 0:
        box.line()
        box.line(f"  {empty_text}")
    else:
        for i, (category, file_path) in enumerate(files, start=1):
            dest = move_file(folder, category, file_path, dry_run=dry_run)
            if not dry_run:
                if dest is None:
                    skipped.append(file_path.name)
                else:
                    records.append({"src": str(file_path), "dest": str(dest)})
            fraction = i / total
            bar = draw_progress_bar(fraction)
            pct = int(fraction * 100)
            line_text = f"  {bar} {pct:>3}%"
            sys.stdout.write("\r" + box.progress_line(line_text))
            sys.stdout.flush()
            if not dry_run:
                time.sleep(min(0.4, 4.0 / total))  # snappy even for big folders
        print()  # end the \r animation line

        box.line()
        box.line(f"  {first_line}")
        for category, count in sorted_categories:
            colored = f"{category_color(category)}●{Style.RESET} {category:<14}   {count}"
            box.line(f"  {colored}")
        if skipped:
            box.line()
            skipped_line = f"⚠ {len(skipped)} file(s) skipped (locked or inaccessible)"
            box.line(f"  {Style.YELLOW}{skipped_line}{Style.RESET}")

    if not dry_run:
        write_undo_log(folder, records)
        append_history(folder, summary)

    box.line()
    color = Style.YELLOW if dry_run else Style.GREEN
    box.line(f"  {color}{done_text}{Style.RESET}")
    box.bottom()

    return summary


def move_file(folder: Path, category: str, file_path: Path, dry_run: bool) -> Path | None:
    """
    Move a single file into its category folder (or no-op if dry_run).
    Returns None (instead of raising) if the move fails — e.g. a locked
    file, a permissions error, or a OneDrive placeholder that won't
    resolve — so callers can skip it and keep going.
    """
    dest_folder = folder / category
    destination = dest_folder / file_path.name
    if dry_run:
        return destination

    try:
        dest_folder.mkdir(exist_ok=True)
        destination = resolve_name_collision(destination)
        shutil.move(str(file_path), str(destination))
    except OSError:
        return None
    return destination


# ── V3: --undo and --stats ───────────────────────────────────────
def write_undo_log(folder: Path, records: list[dict]) -> None:
    """Save exactly what moved where, so --undo can put it all back."""
    if not records:
        return
    log_path = folder / UNDO_LOG_NAME
    log_path.write_text(
        json.dumps({"timestamp": time.time(), "moves": records}, indent=2),
        encoding="utf-8",
    )


def append_history(folder: Path, summary: dict[str, int]) -> None:
    """Append a lightweight record of this run to the rolling history log."""
    total = sum(summary.values())
    if total == 0:
        return

    history_path = folder / HISTORY_LOG_NAME
    entries: list[dict] = []
    if history_path.exists():
        try:
            loaded = json.loads(history_path.read_text(encoding="utf-8"))
            if isinstance(loaded, list):
                entries = loaded
        except (json.JSONDecodeError, OSError):
            entries = []

    entries.append({"timestamp": time.time(), "total": total, "summary": summary})
    entries = entries[-MAX_HISTORY_ENTRIES:]

    try:
        history_path.write_text(json.dumps(entries, indent=2), encoding="utf-8")
    except OSError:
        pass  # history is a nice-to-have; never block on it


def read_history(folder: Path) -> list[dict]:
    history_path = folder / HISTORY_LOG_NAME
    if not history_path.exists():
        return []
    try:
        entries = json.loads(history_path.read_text(encoding="utf-8"))
        return entries if isinstance(entries, list) else []
    except (json.JSONDecodeError, OSError):
        return []


def perform_undo(folder: Path) -> dict:
    """
    Reverse the most recent real organize run recorded in this folder.
    Returns {"found": bool, "restored": int, "total": int} — pure data,
    no printing, so the CLI and GUI can each report it their own way.
    """
    log_path = folder / UNDO_LOG_NAME
    if not log_path.exists():
        return {"found": False, "restored": 0, "total": 0}

    try:
        data = json.loads(log_path.read_text(encoding="utf-8"))
        moves = data.get("moves", [])
    except (json.JSONDecodeError, OSError):
        return {"found": True, "restored": 0, "total": 0, "error": "unreadable"}

    restored = 0
    for record in moves:
        src = Path(record["src"])
        dest = Path(record["dest"])
        if not dest.exists():
            continue  # already moved, renamed, or deleted since — skip safely
        target = resolve_name_collision(src)
        shutil.move(str(dest), str(target))
        restored += 1

    # Clean up any category folders GhostSort created that are now empty
    for category in list(CATEGORIES.keys()) + ["Others"]:
        cat_folder = folder / category
        if cat_folder.is_dir() and not any(cat_folder.iterdir()):
            cat_folder.rmdir()

    log_path.unlink()
    return {"found": True, "restored": restored, "total": len(moves)}


def undo(folder: Path) -> None:
    """CLI wrapper: reverse the last organize run and print the result."""
    result = perform_undo(folder)

    if not result["found"]:
        print("Nothing to undo — no record of a previous GhostSort run here.")
        return
    if result.get("error"):
        print("Undo log is unreadable — nothing was restored.")
        return

    restored, total = result["restored"], result["total"]
    print(f"↩ Restored {restored} of {total} file(s) to their original location.")
    if restored < total:
        print(f"  ({total - restored} file(s) skipped — already moved or missing.)")


def format_size(num_bytes: float) -> str:
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if num_bytes < 1024 or unit == "TB":
            return f"{num_bytes:.0f} {unit}" if unit == "B" else f"{num_bytes:.1f} {unit}"
        num_bytes /= 1024


def short_path(path: Path, max_len: int = 46) -> str:
    s = str(path)
    return s if len(s) <= max_len else "…" + s[-(max_len - 1):]


def gather_stats(folder: Path) -> dict:
    """Collect the folder's current organized state as plain data."""
    loose_plan = scan_folder(folder)
    loose_total = sum(len(v) for v in loose_plan.values())

    rows = []  # (category, count, size_bytes)
    grand_count = 0
    grand_size = 0
    for category in list(CATEGORIES.keys()) + ["Others"]:
        cat_folder = folder / category
        if not cat_folder.is_dir():
            continue
        files = [f for f in cat_folder.iterdir() if f.is_file()]
        if not files:
            continue
        size = sum(f.stat().st_size for f in files)
        rows.append((category, len(files), size))
        grand_count += len(files)
        grand_size += size

    last_run = None
    log_path = folder / UNDO_LOG_NAME
    if log_path.exists():
        try:
            data = json.loads(log_path.read_text(encoding="utf-8"))
            last_run = datetime.fromtimestamp(data["timestamp"]).strftime("%Y-%m-%d %H:%M")
        except (json.JSONDecodeError, OSError, KeyError):
            pass

    return {
        "rows": rows,
        "grand_count": grand_count,
        "grand_size": grand_size,
        "loose_total": loose_total,
        "last_run": last_run,
        "run_count": len(read_history(folder)),
    }


def show_stats(folder: Path) -> None:
    """CLI wrapper: gather stats and render them in a boxed UI."""
    stats = gather_stats(folder)
    rows, grand_count, grand_size = stats["rows"], stats["grand_count"], stats["grand_size"]
    loose_total, last_run, run_count = stats["loose_total"], stats["last_run"], stats["run_count"]

    row_lines = [f"  {category_color(cat)}●{Style.RESET} {cat:<14} {count:>4}  {format_size(size):>9}"
                 for cat, count, size in rows]
    plain_row_lines = [f"  ● {cat:<14} {count:>4}  {format_size(size):>9}"
                       for cat, count, size in rows]
    if not row_lines:
        row_lines = plain_row_lines = ["  No organized files found yet — try --organize first."]

    total_line = f"  Total: {grand_count} files, {format_size(grand_size)}"
    unsorted_line = f"  Unsorted files waiting: {loose_total}" if loose_total else None
    last_run_line = f"  Last organized: {last_run}" if last_run else None
    run_count_line = f"  Organized {run_count} time(s) total" if run_count > 1 else None
    config_line = "  Using custom ghostsort_config.json" if USING_CUSTOM_CONFIG else None

    path_line = short_path(folder)
    content = ["GHOSTSORT STATS", path_line, *plain_row_lines, total_line]
    for extra in (unsorted_line, last_run_line, run_count_line, config_line):
        if extra:
            content.append(extra)

    box = Box(content_lines=content)
    box.top()
    box.line(f"{Style.BOLD}{Style.CYAN}GHOSTSORT STATS{Style.RESET}", align="center")
    box.line(f"{Style.DIM}{path_line}{Style.RESET}", align="center")
    box.divider()
    box.line()
    for line in row_lines:
        box.line(line)
    box.line()
    box.line(f"{Style.BOLD}{total_line}{Style.RESET}")
    if unsorted_line:
        box.line(f"{Style.YELLOW}{unsorted_line}{Style.RESET}")
    if last_run_line:
        box.line(f"{Style.DIM}{last_run_line}{Style.RESET}")
    if run_count_line:
        box.line(f"{Style.DIM}{run_count_line}{Style.RESET}")
    if config_line:
        box.line(f"{Style.CYAN}{config_line}{Style.RESET}")
    box.bottom()


# ── Security scan: duplicates, double extensions, magic-byte mismatches ──
def compute_hash(file_path: Path, chunk_size: int = 65536) -> str | None:
    """SHA-256 of a file's contents, or None if it can't be read."""
    hasher = hashlib.sha256()
    try:
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(chunk_size), b""):
                hasher.update(chunk)
    except OSError:
        return None
    return hasher.hexdigest()


def find_duplicates(files: list[Path]) -> list[list[Path]]:
    """
    Group files that are byte-for-byte identical. Cheap first: group by
    file size (free), only hash files that share a size with another file.
    """
    by_size: dict[int, list[Path]] = {}
    for f in files:
        try:
            size = f.stat().st_size
        except OSError:
            continue
        by_size.setdefault(size, []).append(f)

    by_hash: dict[tuple[int, str], list[Path]] = {}
    for size, group in by_size.items():
        if len(group) < 2:
            continue  # unique size — can't possibly have a duplicate
        for f in group:
            digest = compute_hash(f)
            if digest:
                by_hash.setdefault((size, digest), []).append(f)

    return [group for group in by_hash.values() if len(group) > 1]


def check_suspicious_names(files: list[Path]) -> list[Path]:
    """Flag double-extension bait like 'invoice.pdf.exe'."""
    flagged = []
    for f in files:
        suffixes = [s.lower() for s in f.suffixes]
        if len(suffixes) >= 2:
            if suffixes[-2] in SAFE_LOOKING_EXTENSIONS and suffixes[-1] in DANGEROUS_EXTENSIONS:
                flagged.append(f)
    return flagged


def check_extension_mismatches(files: list[Path]) -> list[tuple[Path, str]]:
    """Flag files whose first bytes don't match what their extension claims."""
    flagged = []
    for f in files:
        ext = f.suffix.lower()
        signatures = MAGIC_SIGNATURES.get(ext)
        if not signatures:
            continue
        try:
            with open(f, "rb") as fh:
                header = fh.read(16)
        except OSError:
            continue
        if not any(header.startswith(sig) for sig in signatures):
            flagged.append((f, ext))
    return flagged


def security_scan(folder: Path) -> dict:
    """Run all security checks over every file GhostSort manages here."""
    files = iter_managed_files(folder)
    return {
        "duplicates": find_duplicates(files),
        "suspicious": check_suspicious_names(files),
        "mismatches": check_extension_mismatches(files),
        "scanned": len(files),
    }


def show_security_scan(folder: Path) -> None:
    """CLI wrapper: run the security scan and render it in a boxed UI."""
    result = security_scan(folder)
    duplicates, suspicious = result["duplicates"], result["suspicious"]
    mismatches, scanned = result["mismatches"], result["scanned"]

    lines: list[str] = []
    if duplicates:
        lines.append(f"  Duplicate files: {len(duplicates)} group(s)")
        for group in duplicates:
            lines.append(f"    {format_size(group[0].stat().st_size)} × {len(group)}:")
            for f in group:
                lines.append(f"      {f.name}")
    if suspicious:
        lines.append(f"  Double-extension bait: {len(suspicious)} file(s)")
        for f in suspicious:
            lines.append(f"    {f.name}")
    if mismatches:
        lines.append(f"  Extension mismatches: {len(mismatches)} file(s)")
        for f, ext in mismatches:
            lines.append(f"    {f.name}  (claims {ext}, content says otherwise)")

    clean = not (duplicates or suspicious or mismatches)
    status_line = (
        f"  ✓ No issues found across {scanned} file(s)"
        if clean else
        f"  ⚠ Review the {len(duplicates) + len(suspicious) + len(mismatches)} item(s) above"
    )
    empty_text = f"  Scanned {scanned} file(s) — nothing suspicious."

    path_line = short_path(folder)
    content = ["GHOSTSORT SECURITY SCAN", path_line, *lines, status_line, empty_text]
    box = Box(content_lines=content)
    box.top()
    box.line(f"{Style.BOLD}{Style.CYAN}GHOSTSORT SECURITY SCAN{Style.RESET}", align="center")
    box.line(f"{Style.DIM}{path_line}{Style.RESET}", align="center")
    box.divider()
    box.line()
    if not lines:
        box.line(empty_text)
    else:
        for line in lines:
            box.line(line)
    box.line()
    color = Style.GREEN if clean else Style.YELLOW
    box.line(f"{color}{status_line}{Style.RESET}")
    box.bottom()
    print(f"{Style.DIM}  Heuristic checks only — not a substitute for antivirus software.{Style.RESET}")


def main():
    parser = argparse.ArgumentParser(
        description="GhostSort — organize a messy folder by file type."
    )
    parser.add_argument(
        "folder",
        nargs="?",
        default=".",
        help="Folder to organize (default: current folder)",
    )

    action = parser.add_mutually_exclusive_group()
    action.add_argument(
        "--scan", action="store_true",
        help="Preview only — show what would happen without moving files",
    )
    action.add_argument(
        "--organize", action="store_true",
        help="Organize the folder (this is also the default with no flag)",
    )
    action.add_argument(
        "--undo", action="store_true",
        help="Undo the most recent organize run in this folder",
    )
    action.add_argument(
        "--stats", action="store_true",
        help="Show a breakdown of the folder's current organization",
    )
    action.add_argument(
        "--security", action="store_true",
        help="Scan for duplicate files, double extensions, and mismatched file types",
    )

    parser.add_argument(
        "--dry-run", action="store_true",
        help="Alias for --scan",
    )
    parser.add_argument(
        "--plain", action="store_true",
        help="Use plain V1-style text output instead of the boxed UI",
    )
    args = parser.parse_args()

    target = Path(args.folder).expanduser().resolve()

    if not target.exists() or not target.is_dir():
        print(f"Error: '{target}' is not a valid folder.")
        sys.exit(1)

    if args.undo:
        undo(target)
        return

    if args.stats:
        show_stats(target)
        return

    if args.security:
        show_security_scan(target)
        return

    dry_run = args.scan or args.dry_run

    if args.plain:
        print(f"📂 Scanning: {target}")
        print("   (dry run — no files will be moved)\n" if dry_run else "")
        summary = organize(target, dry_run=dry_run)
        print_summary(summary, dry_run=dry_run)
    else:
        run_ui(target, dry_run=dry_run)


if __name__ == "__main__":
    main()