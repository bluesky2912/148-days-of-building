#!/usr/bin/env python3
"""
GhostSort GUI (V5)

A small Tkinter front-end for GhostSort. Reuses the exact same core
logic as ghostsort.py (must sit in the same folder) behind five
buttons — Scan, Organize, Undo, Stats, Security — with a live,
color-coded log and a progress bar for Organize.

Usage:
    python ghostsort_gui.py

Requires: tkinter, which ships with the standard python.org Windows/Mac
installers by default. If it's missing (rare on Linux distros that split
it out), install it via your package manager, e.g. `sudo apt install
python3-tk` on Debian/Ubuntu.
"""

import threading
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, scrolledtext, ttk

import ghostsort as gs

# ── Dark, terminal-flavored color palette (mirrors the CLI's colors) ──
BG = "#0d1117"
PANEL = "#161b22"
BORDER = "#30363d"
FG = "#c9d1d9"
DIM_FG = "#7d8590"
ACCENT = "#3ddc84"    # green — success
ACCENT2 = "#4fd6e0"   # cyan — headings
WARNING = "#ffd166"   # yellow
ERROR = "#f87171"     # red

# Same idea as gs.category_color(): hash the name to a stable color from
# a fixed palette, so custom categories from a config file still get a
# consistent (if arbitrary) color without needing to be registered here.
CATEGORY_PALETTE = ["#4fd6e0", "#3ddc84", "#ffd166", "#f472b6", "#60a5fa", "#f87171"]


def category_color(category: str) -> str:
    if category == "Others":
        return DIM_FG
    return CATEGORY_PALETTE[sum(map(ord, category)) % len(CATEGORY_PALETTE)]


class GhostSortGUI:
    def __init__(self, root: tk.Tk):
        self.root = root
        root.title("GhostSort")
        root.geometry("660x520")
        root.minsize(540, 420)

        self.folder_var = tk.StringVar(value=str(Path.home() / "Downloads"))
        self.status_var = tk.StringVar(value="Ready.")
        self.progress_pct_var = tk.StringVar(value="")

        self._apply_theme()
        self._build_widgets()

    # ── theme ─────────────────────────────────────────────────
    def _apply_theme(self):
        # Best-effort dark theme, applied in small independent steps: if
        # one style option isn't supported on this platform/Tk version,
        # only that piece is skipped instead of losing the whole theme.
        try:
            self.root.configure(bg=BG)
        except Exception:
            pass

        try:
            style = ttk.Style(self.root)
            style.theme_use("clam")
        except Exception:
            return  # no 'clam' theme available — stick with the OS default

        try:
            style.configure("TFrame", background=BG)
            style.configure("TLabel", background=BG, foreground=FG)
        except Exception:
            pass
        try:
            style.configure("TEntry", fieldbackground=PANEL, foreground=FG,
                             insertcolor=FG, borderwidth=1, relief="flat")
        except Exception:
            pass
        try:
            style.configure("TButton", background=PANEL, foreground=FG,
                             borderwidth=1, padding=6)
            style.map("TButton",
                      background=[("active", BORDER), ("disabled", PANEL)],
                      foreground=[("disabled", DIM_FG)])
        except Exception:
            pass
        try:
            style.configure("Horizontal.TProgressbar",
                             background=ACCENT, troughcolor=PANEL, borderwidth=0)
        except Exception:
            pass

    # ── layout ────────────────────────────────────────────────
    def _build_widgets(self):
        pad = {"padx": 10, "pady": 6}

        header = tk.Frame(self.root, bg=BG)
        header.pack(fill="x", **pad)
        tk.Label(header, text="👻 GhostSort", font=("Segoe UI", 17, "bold"),
                 bg=BG, fg=ACCENT2).pack(side="left")
        tk.Label(header, text="  smart file organizer", font=("Segoe UI", 10),
                 bg=BG, fg=DIM_FG).pack(side="left", anchor="s", pady=(0, 3))

        folder_frame = ttk.Frame(self.root)
        folder_frame.pack(fill="x", padx=10)
        ttk.Entry(folder_frame, textvariable=self.folder_var).pack(
            side="left", fill="x", expand=True, ipady=3
        )
        ttk.Button(folder_frame, text="Browse…", command=self._browse).pack(
            side="left", padx=(6, 0)
        )

        button_frame = ttk.Frame(self.root)
        button_frame.pack(fill="x", **pad)
        actions = [
            ("Scan", self._on_scan),
            ("Organize", self._on_organize),
            ("Undo", self._on_undo),
            ("Stats", self._on_stats),
            ("Security", self._on_security),
        ]
        self.buttons = []
        for text, handler in actions:
            b = ttk.Button(button_frame, text=text, width=10, command=handler)
            b.pack(side="left", padx=3)
            self.buttons.append(b)

        progress_frame = ttk.Frame(self.root)
        progress_frame.pack(fill="x", padx=10, pady=(0, 6))
        self.progress = ttk.Progressbar(progress_frame, mode="determinate")
        self.progress.pack(side="left", fill="x", expand=True)
        ttk.Label(progress_frame, textvariable=self.progress_pct_var, width=5).pack(
            side="left", padx=(6, 0)
        )

        self.output = scrolledtext.ScrolledText(
            self.root, wrap="word", state="disabled", relief="flat",
            font=("Consolas", 10), bg=PANEL, fg=FG, insertbackground=FG,
            borderwidth=0, highlightthickness=1, highlightbackground=BORDER,
        )
        self.output.pack(fill="both", expand=True, padx=10, pady=(0, 6))
        self._configure_tags()

        ttk.Label(self.root, textvariable=self.status_var, anchor="w",
                  foreground=DIM_FG).pack(fill="x", padx=10, pady=(0, 8))

    def _configure_tags(self):
        self.output.tag_config("success", foreground=ACCENT)
        self.output.tag_config("warning", foreground=WARNING)
        self.output.tag_config("error", foreground=ERROR)
        self.output.tag_config("dim", foreground=DIM_FG)
        self.output.tag_config("bold", font=("Consolas", 10, "bold"))
        self._category_tags: set[str] = set()

    def _category_tag(self, category: str) -> str:
        tag = f"cat_{category}"
        if tag not in self._category_tags:
            self.output.tag_config(tag, foreground=category_color(category))
            self._category_tags.add(tag)
        return tag

    # ── small helpers ─────────────────────────────────────────
    def _browse(self):
        chosen = filedialog.askdirectory(initialdir=self.folder_var.get() or ".")
        if chosen:
            self.folder_var.set(chosen)

    def _get_target(self):
        raw = self.folder_var.get().strip()
        if not raw:
            self._log("Pick a folder first.", "warning")
            return None
        path = Path(raw).expanduser()
        if not path.is_dir():
            self._log(f"'{raw}' isn't a valid folder.", "error")
            return None
        return path

    def _log(self, text: str = "", tag: str | None = None):
        self.output.configure(state="normal")
        if tag:
            self.output.insert("end", text + "\n", tag)
        else:
            self.output.insert("end", text + "\n")
        self.output.see("end")
        self.output.configure(state="disabled")

    def _log_category_row(self, category: str, rest: str):
        """Log a line like '  Images  3  120 KB' with the category name colored."""
        self.output.configure(state="normal")
        self.output.insert("end", "  ")
        self.output.insert("end", f"{category:<14}", self._category_tag(category))
        self.output.insert("end", f" {rest}\n")
        self.output.see("end")
        self.output.configure(state="disabled")

    def _clear_log(self):
        self.output.configure(state="normal")
        self.output.delete("1.0", "end")
        self.output.configure(state="disabled")

    def _set_buttons_enabled(self, enabled: bool):
        state = "normal" if enabled else "disabled"
        for b in self.buttons:
            b.configure(state=state)

    def _init_progress(self, total: int):
        self.progress.configure(maximum=max(total, 1), value=0)
        self.progress_pct_var.set("0%")

    def _set_progress(self, value: int, total: int):
        self.progress.configure(value=value)
        pct = int(value / total * 100) if total else 100
        self.progress_pct_var.set(f"{pct}%")

    def _finish(self, status_text: str):
        self.status_var.set(status_text)
        self.progress.configure(value=0)
        self.progress_pct_var.set("")
        self._set_buttons_enabled(True)

    def _run_in_background(self, work_fn):
        """
        Run work_fn() on a worker thread so the window stays responsive.
        work_fn must only touch widgets via self.root.after(...). Any
        exception it raises is caught here so the UI never gets stuck
        with buttons disabled after an unexpected error.
        """
        self._set_buttons_enabled(False)

        def runner():
            try:
                work_fn()
            except Exception as e:
                self.root.after(0, self._log, f"\n✗ Unexpected error: {e}", "error")
                self.root.after(0, self._finish, "Something went wrong — see log.")

        threading.Thread(target=runner, daemon=True).start()

    # ── button handlers ───────────────────────────────────────
    def _on_scan(self):
        target = self._get_target()
        if not target:
            return
        self._clear_log()
        self.status_var.set("Scanning…")

        def work():
            plan = gs.scan_folder(target)
            total = sum(len(v) for v in plan.values())
            if total == 0:
                self.root.after(0, self._log, "Nothing to organize — folder is already tidy.", "dim")
            else:
                self.root.after(0, self._log, f"Found {total} file(s) to sort:\n", "bold")
                for category, files in sorted(plan.items(), key=lambda kv: -len(kv[1])):
                    self.root.after(0, self._log_category_row, category, str(len(files)))
            self.root.after(0, self._finish, "Scan complete — nothing was moved.")

        self._run_in_background(work)

    def _on_organize(self):
        target = self._get_target()
        if not target:
            return
        self._clear_log()
        self.status_var.set("Organizing…")

        def work():
            plan = gs.scan_folder(target)
            files = [(cat, f) for cat, group in plan.items() for f in group]
            total = len(files)
            self.root.after(0, self._init_progress, total)

            if total == 0:
                self.root.after(0, self._log, "Nothing to organize — folder is already tidy.", "dim")
            else:
                records, skipped = [], []
                for i, (category, file_path) in enumerate(files, start=1):
                    dest = gs.move_file(target, category, file_path, dry_run=False)
                    if dest is None:
                        skipped.append(file_path.name)
                        self.root.after(0, self._log, f"⚠ skipped {file_path.name}", "warning")
                    else:
                        records.append({"src": str(file_path), "dest": str(dest)})
                        self.root.after(0, self._log_category_row, category, f"← {file_path.name}")
                    self.root.after(0, self._set_progress, i, total)
                gs.write_undo_log(target, records)
                gs.append_history(target, {cat: len(g) for cat, g in plan.items()})
                self.root.after(0, self._log, f"\n✓ Organized {len(records)} file(s).", "success")
                if skipped:
                    self.root.after(0, self._log,
                                     f"  {len(skipped)} file(s) skipped (locked or inaccessible).", "warning")

            self.root.after(0, self._finish, "Organize complete.")

        self._run_in_background(work)

    def _on_undo(self):
        target = self._get_target()
        if not target:
            return
        self._clear_log()
        self.status_var.set("Undoing…")

        def work():
            result = gs.perform_undo(target)
            if not result["found"]:
                self.root.after(0, self._log, "Nothing to undo — no record of a previous run here.", "dim")
            elif result.get("error"):
                self.root.after(0, self._log, "Undo log is unreadable — nothing was restored.", "error")
            else:
                restored, total = result["restored"], result["total"]
                self.root.after(0, self._log, f"↩ Restored {restored} of {total} file(s).", "success")
                if restored < total:
                    skipped = total - restored
                    self.root.after(0, self._log, f"  ({skipped} skipped — already moved or missing.)", "warning")
            self.root.after(0, self._finish, "Undo complete.")

        self._run_in_background(work)

    def _on_stats(self):
        target = self._get_target()
        if not target:
            return
        self._clear_log()
        self.status_var.set("Gathering stats…")

        def work():
            stats = gs.gather_stats(target)
            self.root.after(0, self._render_stats, stats)
            self.root.after(0, self._finish, "Stats ready.")

        self._run_in_background(work)

    def _render_stats(self, stats: dict):
        rows = stats["rows"]
        if not rows:
            self._log("No organized files found yet — try Organize first.", "dim")
        else:
            for category, count, size in rows:
                self._log_category_row(category, f"{count:>4}  {gs.format_size(size):>9}")
        self._log(f"\nTotal: {stats['grand_count']} files, {gs.format_size(stats['grand_size'])}", "bold")
        if stats["loose_total"]:
            self._log(f"Unsorted files waiting: {stats['loose_total']}", "warning")
        if stats["last_run"]:
            self._log(f"Last organized: {stats['last_run']}", "dim")
        if stats.get("run_count", 0) > 1:
            self._log(f"Organized {stats['run_count']} time(s) total", "dim")
        if gs.USING_CUSTOM_CONFIG:
            self._log("Using custom ghostsort_config.json", "dim")

    def _on_security(self):
        target = self._get_target()
        if not target:
            return
        self._clear_log()
        self.status_var.set("Scanning for issues…")

        def work():
            result = gs.security_scan(target)
            self.root.after(0, self._render_security, result)
            self.root.after(0, self._finish, "Security scan complete.")

        self._run_in_background(work)

    def _render_security(self, result: dict):
        duplicates, suspicious = result["duplicates"], result["suspicious"]
        mismatches, scanned = result["mismatches"], result["scanned"]

        if not (duplicates or suspicious or mismatches):
            self._log(f"✓ No issues found across {scanned} file(s).", "success")
            return

        if duplicates:
            self._log(f"Duplicate files: {len(duplicates)} group(s)", "warning")
            for group in duplicates:
                self._log(f"  {gs.format_size(group[0].stat().st_size)} × {len(group)}:")
                for f in group:
                    self._log(f"    {f.name}", "dim")
        if suspicious:
            self._log(f"\nDouble-extension bait: {len(suspicious)} file(s)", "warning")
            for f in suspicious:
                self._log(f"  {f.name}", "error")
        if mismatches:
            self._log(f"\nExtension mismatches: {len(mismatches)} file(s)", "warning")
            for f, ext in mismatches:
                self._log(f"  {f.name}  (claims {ext}, content says otherwise)", "error")
        self._log("\n⚠ Heuristic checks only — not a substitute for antivirus software.", "dim")


def main():
    root = tk.Tk()
    GhostSortGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()