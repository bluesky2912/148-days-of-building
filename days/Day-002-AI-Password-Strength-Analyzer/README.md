# CIPHER — AI Password Strength Analyzer

A client-side password strength analyzer with real entropy math, realistic crack-time modeling, weak-pattern detection, and a local scan history. No backend, no tracking, nothing ever leaves the browser.

![type](https://img.shields.io/badge/type-static%20site-2dd4bf) ![deps](https://img.shields.io/badge/dependencies-none-ffb454) ![license](https://img.shields.io/badge/license-MIT-8b97ab)

## Features

- 🧠 **Real entropy calculation** — `length × log2(charset size)`, then penalized when weak patterns are detected
- ⏱ **Realistic crack-time estimates** across four attack scenarios (online throttled, online unthrottled, offline slow-hash, offline GPU cluster)
- 📉 **Animated instrument-style gauge** with tick marks, glow, and a live score out of 100
- 📊 **Composition donut chart** breaking down uppercase / lowercase / numbers / symbols
- ⚠️ **Pattern detection** — repeated characters, sequential runs, keyboard walks (`qwerty`, `asdf`…), common passwords, dates, dictionary words
- 📋 **One-click copy** with toast notification
- 🎨 **Animated network-style particle background**, respects `prefers-reduced-motion`
- 💾 **Local scan history** — stores a SHA-256 hash + score only, **never the plaintext password**
- 🌗 **Dark / light mode**, persisted to `localStorage`
- 🏆 **Security badges** — Weak → Fair → Good → Strong → Excellent
- 📱 **PWA-ready** — installable and offline-capable once hosted on a real domain

## File structure

```
cipher-password-analyzer/
├── index.html      markup only
├── style.css        all styling
├── script.js        all logic (analysis, canvas drawing, history, PWA hooks)
├── manifest.json     PWA manifest (name, icons, theme colors)
└── sw.js             service worker (offline caching)
```

Keep all five files together in the same folder — `index.html` references the others by relative path.

## Running it

No build step, no dependencies, no server required.

- **Quickest:** double-click `index.html` to open it directly in a browser.
- **Recommended:** serve the folder over HTTP so the service worker and manifest work correctly:

  ```bash
  # any static server works, e.g.
  npx serve .
  # or
  python3 -m http.server 8000
  ```

  Then visit `http://localhost:8000`.

## Installing as a PWA

The install prompt only appears when the site is served over **HTTPS** (or `localhost`) from a real origin — browsers block installability from `file://` or sandboxed previews.

1. Deploy the folder as-is to any static host — GitHub Pages, Netlify, Vercel, Cloudflare Pages all work with zero config.
2. Visit the deployed URL in Chrome, Edge, or another Chromium-based browser.
3. Click the install icon in the address bar, or the in-app install button that appears once the browser fires `beforeinstallprompt`.
4. `sw.js` will cache `index.html` and `manifest.json` for offline use after the first visit.

## How the numbers work

- **Entropy (bits):** `password.length × log2(charset size)`, where charset size adds 26 / 26 / 10 / 33 for lowercase, uppercase, digits, and symbols respectively — then multiplied by a penalty (down to as low as 0.45×) for each weak pattern found, so a long password that's still `password123!` won't score as strong as its raw length suggests.
- **Crack time:** `2^entropy ÷ (2 × guesses-per-second)`, run against four guess-rate assumptions (100/hr, 10/sec, 10k/sec, 10B/sec) to represent throttled login forms, unthrottled login forms, slow offline hashes like bcrypt, and GPU-accelerated offline attacks on fast hashes.
- These are **estimates for education and comparison**, not a guarantee — real-world cracking depends on the specific hash algorithm, salting, attacker resources, and whether the password appears in a leaked-password list verbatim.

## Privacy

Everything runs entirely in your browser:

- The password you type is never sent over the network.
- Scan history stores a SHA-256 hash (truncated for display) plus a score and timestamp — the plaintext password is discarded immediately after analysis and is not retrievable from history.
- Clear history any time with the "Clear history" button, which wipes the `localStorage` key.

## Customization

- **Colors / fonts:** all design tokens are CSS custom properties at the top of `style.css` (`:root` and `[data-theme="light"]`) — change `--cyan`, `--flare`, `--display`, `--mono`, etc.
- **Common password / pattern lists:** edit `COMMON_PASSWORDS` and `KEYBOARD_ROWS` near the top of `script.js`.
- **Crack-time scenarios:** adjust the guesses-per-second constants inside `updateCrackTimes()` in `script.js`.
- **App icon:** replace the inline SVG data URIs in `manifest.json` with your own icon files.

## Browser support

Works in all modern evergreen browsers (Chrome, Edge, Firefox, Safari). Uses `crypto.subtle` for hashing with a non-cryptographic fallback if unavailable, and `navigator.clipboard` for copy with a graceful failure toast if blocked.

## License

MIT — do whatever you like with it.