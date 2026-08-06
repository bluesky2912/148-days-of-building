// =========================================
// DAIWIK OS — Terminal v2.1
// =========================================

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ==========================
// Themes
// ==========================
const THEMES = {
    matrix: "#2bd876",
    amber: "#e8a94c",
    blue: "#4fb8e8",
    red: "#e8555a",
    purple: "#b07ce0"
};

let currentAccent = THEMES.matrix;
let currentThemeName = "matrix";

function setAccent(name) {
    const hex = THEMES[name];
    if(!hex) return false;
    document.documentElement.style.setProperty("--accent", hex);
    currentAccent = hex;
    currentThemeName = name;
    return true;
}

// ==========================
// Profile & coding journey
// ==========================
const PROFILE = {
    user: "daiwik",
    mission: "Build cool things.",
    github: "https://github.com/Bluesky2912",
    linkedin: "",
    twitter: "",
    email: "",
    resumeUrl: "",
    quests: [
        { label: "Matrix Terminal", done: true },
        { label: "AI Chatbot",      done: false },
        { label: "Gym Tracker",     done: false },
        { label: "Cyber Tool",      done: false }
    ]
};

const START_DATE = new Date("2026-03-12T00:00:00");

function daysSinceStart() {
    const diffMs = Date.now() - START_DATE.getTime();
    return Math.max(1, Math.floor(diffMs / 86400000) + 1);
}

function levelFromDays(days) {
    return Math.max(1, Math.floor(days / 10));
}

function xpFromDays(days) {
    return days * 10 + levelFromDays(days) * 25;
}

function buildStreakPanel() {
    const days = daysSinceStart();
    const level = levelFromDays(days);
    const xp = xpFromDays(days);
    const questLines = PROFILE.quests
        .map(q => `${q.done ? "☑" : "☐"} ${q.label}`)
        .join("\n");

    return `TODAY'S STREAK\n${days} Days of Code   ·   Level ${level}   ·   XP ${xp}\n\nTODAY'S QUEST\n${questLines}`;
}

// ==========================
// Canvas setup
// ==========================
const canvas = document.getElementById("matrix");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", () => { resizeCanvas(); initRain(); });

// ==========================
// Matrix Rain V2
// ==========================
const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()アイウエオカキクケコサシスセソ";
const chars = letters.split("");
const fontSize = 18;

let drops = [];
let rainPaused = false;

function initRain() {
    const columns = Math.floor(canvas.width / fontSize);
    drops = [];
    for(let i = 0; i < columns; i++) {
        drops[i] = {
            y: Math.random() * canvas.height,
            speed: 0.6 + Math.random() * 0.9
        };
    }
}
initRain();

function drawMatrix() {
    ctx.fillStyle = "rgba(0,0,0,0.07)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${fontSize}px monospace`;

    for(let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i].y;

        ctx.shadowBlur = 6;
        ctx.shadowColor = currentAccent;

        const isGlitch = Math.random() > 0.995;
        ctx.fillStyle = isGlitch ? "#ffffff" : currentAccent;
        ctx.fillText(char, x, y);

        drops[i].y += fontSize * drops[i].speed;

        if(drops[i].y > canvas.height && Math.random() > 0.975) {
            drops[i].y = 0;
            drops[i].speed = 0.6 + Math.random() * 0.9;
        }
    }
}

function clearRain() {
    ctx.fillStyle = "#050806";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

let frameCount = 0;
const frameSkip = reduceMotion ? 2 : 1;

function animate() {
    frameCount++;
    if(!rainPaused && frameCount % frameSkip === 0) drawMatrix();
    requestAnimationFrame(animate);
}
animate();

// ==========================
// Terminal refs
// ==========================
const output = document.getElementById("terminal-output");
const input = document.getElementById("commandInput");
const suggestionsEl = document.getElementById("suggestions");

const delay = ms => new Promise(res => setTimeout(res, ms));

// ==========================
// Output helpers
// ==========================
function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function linkify(div) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    if(urlRegex.test(div.textContent)) {
        const escaped = escapeHtml(div.textContent);
        div.innerHTML = escaped.replace(urlRegex, url => `<a href="${url}" target="_blank" rel="noopener">${url}</a>`);
    }
}

function print(text, tone = "ink") {
    const div = document.createElement("div");
    div.className = tone === "ink" ? "output-line" : `output-line tone-${tone}`;
    div.textContent = text;
    output.appendChild(div);
    output.scrollTop = output.scrollHeight;
    return div;
}

function typeLine(text, speed = 15, tone = "ink") {
    return new Promise(resolve => {
        const div = document.createElement("div");
        div.className = tone === "ink" ? "output-line" : `output-line tone-${tone}`;
        output.appendChild(div);
        output.scrollTop = output.scrollHeight;

        if(!text) { resolve(); return; }

        if(reduceMotion || text.length > 400) {
            div.textContent = text;
            output.scrollTop = output.scrollHeight;
            linkify(div);
            resolve();
            return;
        }

        let i = 0;
        const interval = setInterval(() => {
            div.textContent += text.charAt(i);
            output.scrollTop = output.scrollHeight;
            i++;
            if(i >= text.length) {
                clearInterval(interval);
                linkify(div);
                resolve();
            }
        }, speed);
    });
}

function runSpinner(label, duration = 700) {
    return new Promise(resolve => {
        const frames = ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"];
        const div = document.createElement("div");
        div.className = "output-line tone-accent";
        output.appendChild(div);

        if(reduceMotion) {
            div.textContent = `✔ ${label}... done`;
            setTimeout(resolve, 150);
            return;
        }

        let i = 0;
        const interval = setInterval(() => {
            div.textContent = `${frames[i % frames.length]} ${label}...`;
            output.scrollTop = output.scrollHeight;
            i++;
        }, 80);

        setTimeout(() => {
            clearInterval(interval);
            div.textContent = `✔ ${label}... done`;
            output.scrollTop = output.scrollHeight;
            resolve();
        }, duration);
    });
}

// ==========================
// Audio
// ==========================
let soundEnabled = true;
let musicEnabled = false;
let audioCtx;
let musicNodes = null;

function getAudioCtx() {
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function playKeySound() {
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.value = 700 + Math.random() * 150;
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
    } catch(e) { /* audio not available */ }
}

function startMusic() {
    try {
        const ctx = getAudioCtx();
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = "sine"; osc1.frequency.value = 110;
        osc2.type = "sine"; osc2.frequency.value = 110 * 1.5;
        gain.gain.value = 0.0001;
        osc1.connect(gain); osc2.connect(gain); gain.connect(ctx.destination);
        osc1.start(); osc2.start();
        gain.gain.exponentialRampToValueAtTime(0.025, now + 2);
        musicNodes = { osc1, osc2, gain };
    } catch(e) { /* audio not available */ }
}

function stopMusic() {
    if(!musicNodes || !audioCtx) return;
    const now = audioCtx.currentTime;
    musicNodes.gain.gain.exponentialRampToValueAtTime(0.0001, now + 1);
    musicNodes.osc1.stop(now + 1.1);
    musicNodes.osc2.stop(now + 1.1);
    musicNodes = null;
}

// ==========================
// Fake file system
// ==========================
const files = {
    "about.txt": `Hi!\n\nI'm Daiwik Malhotra.\n\nI'm passionate about\n\n• Game Development\n• Artificial Intelligence\n• Cybersecurity\n• Web Development\n\nTry "streak" to see my coding journey,\nor "projects" for what I'm building.\n`,
    "skills.txt": `Languages\n\nHTML\nCSS\nJavaScript\nPython\nJava\n\nLearning\n\nReact\nNode.js\nCybersecurity\nAI\n`,
    "projects.txt": `Projects\n\n✔ Matrix Terminal\n✔ Password Checker\n✔ Portfolio\n✔ AI Assistant\n✔ Gym Tracker\n`
};

const hiddenFiles = {
    ".secret": `You found a hidden file 👀\n\nCurious minds get further. Some doors only\nopen if you knock the right way — try\n"redpill" sometime.\n`
};

// ==========================
// Banners & Utilities
// ==========================
const FONT_5X5 = {
    A: [" ███ ","█   █","█████","█   █","█   █"],
    B: ["████ ","█   █","████ ","█   █","████ "],
    C: [" ████","█    ","█    ","█    "," ████"],
    E: ["█████","█    ","███  ","█    ","█████"],
    I: ["█████","  █  ","  █  ","  █  ","█████"],
    R: ["████ ","█   █","████ ","█  █ ","█   █"],
    Y: ["█   █"," █ █ ","  █  ","  █  ","  █  "]
};

function composeWord(word) {
    const glyphs = word.toUpperCase().split("").map(ch => FONT_5X5[ch]);
    if(glyphs.some(g => !g)) return null;
    const rows = ["", "", "", "", ""];
    glyphs.forEach((glyph, idx) => {
        for(let r = 0; r < 5; r++) {
            rows[r] += glyph[r] + (idx < glyphs.length - 1 ? " " : "");
        }
    });
    return rows.join("\n");
}

function boxText(text) {
    const width = text.length + 4;
    const top = "┌" + "─".repeat(width) + "┐";
    const mid = `│  ${text}  │`;
    const bottom = "└" + "─".repeat(width) + "┘";
    return `${top}\n${mid}\n${bottom}`;
}

const BANNERS = {
    cyber: composeWord("CYBER"),
    ai: composeWord("AI")
};

const FORTUNES = [
    "A watched build never finishes. Step away, it'll compile eventually.",
    "Today's bug is tomorrow's blog post.",
    "The commit you're about to force-push — don't.",
    "Somewhere, a rubber duck is proud of you.",
    "Ship it. You can fix it in the next commit."
];

const JOKES = [
    "Why do programmers prefer dark mode? Because light attracts bugs.",
    "There are 10 kinds of people: those who understand binary, and those who don't.",
    "!false — it's funny because it's true.",
    "How many programmers does it take to change a light bulb? None, that's a hardware problem.",
    "I would tell a UDP joke, but you might not get it."
];

const QUOTES = [
    "\"Simplicity is the soul of efficiency.\" — Austin Freeman",
    "\"First, solve the problem. Then, write the code.\" — John Johnson",
    "\"Code is like humor. When you have to explain it, it's bad.\" — Cory House",
    "\"Programs must be written for people to read.\" — Harold Abelson"
];

function safeCalc(expr) {
    const s = expr.replace(/\s+/g, "");
    if(!s || !/^[0-9+\-*/().]+$/.test(s)) throw new Error("Invalid characters");
    let i = 0;
    const peek = () => s[i];

    function parseExpr() {
        let v = parseTerm();
        while(peek() === "+" || peek() === "-") {
            const op = s[i++];
            const rhs = parseTerm();
            v = op === "+" ? v + rhs : v - rhs;
        }
        return v;
    }
    function parseTerm() {
        let v = parseFactor();
        while(peek() === "*" || peek() === "/") {
            const op = s[i++];
            const rhs = parseFactor();
            v = op === "*" ? v * rhs : v / rhs;
        }
        return v;
    }
    function parseFactor() {
        if(peek() === "-") { i++; return -parseFactor(); }
        if(peek() === "(") {
            i++;
            const v = parseExpr();
            if(peek() === ")") i++;
            return v;
        }
        const start = i;
        while(i < s.length && /[0-9.]/.test(s[i])) i++;
        if(start === i) throw new Error("Unexpected token");
        return parseFloat(s.slice(start, i));
    }

    const result = parseExpr();
    if(i !== s.length) throw new Error("Unexpected token");
    if(Number.isNaN(result)) throw new Error("Invalid expression");
    return result;
}

// ==========================
// Commands
// ==========================
let commandHistory = [];
let historyIndex = 0;

function buildHelpText() {
    const rows = Object.entries(COMMANDS)
        .filter(([, def]) => !def.hidden)
        .map(([name, def]) => `${name.padEnd(14)}${def.desc}`);
    return `Available Commands\n\n${rows.join("\n")}`;
}

async function runHack() {
    await typeLine("Connecting...", 15, "accent");
    const bars = ["████░░░░░░", "███████░░░", "██████████"];
    for(const bar of bars) {
        print(bar, "accent");
        await delay(500);
    }
    await delay(300);
    await typeLine("ACCESS DENIED", 20, "warn");
}

async function runReboot() {
    await typeLine("Rebooting Daiwik OS...", 15, "accent");
    await delay(500);
    output.innerHTML = "";
    input.disabled = true;
    await bootSequence();
}

async function runShutdown() {
    await typeLine("Saving session state...", 15, "accent");
    await delay(400);
    await typeLine("Shutting down Daiwik OS.", 15, "accent");
    await delay(600);
    output.innerHTML = "";
    print("System halted. Press any key to reboot.", "warn");
    input.disabled = true;
    input.blur();

    const wake = async () => {
        document.removeEventListener("keydown", wake);
        document.removeEventListener("click", wake);
        output.innerHTML = "";
        await bootSequence();
    };
    document.addEventListener("keydown", wake, { once: true });
    document.addEventListener("click", wake, { once: true });
}

async function runRedpill() {
    await typeLine("You take the red pill.", 20, "accent");
    await delay(300);
    await typeLine("You stay in Wonderland, and I show you how deep the rabbit hole goes.", 15, "ink");
    await delay(500);
    await typeLine("Remember: all I'm offering is the truth. Nothing more.", 15, "ink");
}

async function runBluepill() {
    await typeLine("You take the blue pill.", 20, "accent");
    await delay(300);
    await typeLine("The story ends. You wake up in your bed and believe whatever you want to believe.", 15, "ink");
    await delay(1200);
    output.innerHTML = "";
    input.disabled = true;
    await bootSequence();
}

const COMMANDS = {
    help: { desc: "Show all commands", run: () => buildHelpText() },
    about: { desc: "About me", run: () => `Hi! I'm Daiwik 👋\n\nInterests:\n🎮 Game Development\n🤖 Artificial Intelligence\n🔐 Cybersecurity\n💻 Web Development\n\nWelcome to Daiwik OS.` },
    projects: { desc: "View projects", run: () => `Projects\n\n✔ Matrix Terminal\n⏳ Password Strength Checker\n⏳ Snake Game\n⏳ AI Chatbot\n⏳ Portfolio Website\n\nRun "streak" to see today's quest.` },
    streak: { desc: "Coding streak, level & quests", run: () => buildStreakPanel() },
    github: { desc: "GitHub profile", run: () => PROFILE.github },
    resume: { desc: "Get my resume", run: () => PROFILE.resumeUrl ? `Resume: ${PROFILE.resumeUrl}` : "Resume coming soon — check back later." },
    contact: { desc: "Get in touch", run: () => {
        const lines = [];
        if(PROFILE.email) lines.push(`Email  : ${PROFILE.email}`);
        lines.push(`GitHub : ${PROFILE.github}`);
        if(!PROFILE.email) lines.push("", "(add PROFILE.email in the source to show it here)");
        return lines.join("\n");
    }},
    social: { desc: "Social links", run: () => {
        const items = [
            ["GitHub", PROFILE.github],
            ["LinkedIn", PROFILE.linkedin],
            ["Twitter/X", PROFILE.twitter]
        ].filter(([, url]) => url);
        if(!items.length) return "No social links configured yet.";
        return items.map(([label, url]) => `${label.padEnd(10)}${url}`).join("\n");
    }},
    whoami: { desc: "Current user", run: () => PROFILE.user },
    date: { desc: "Current date & time", run: () => new Date().toString() },
    time: { desc: "Current time", run: () => new Date().toLocaleTimeString() },
    ls: { desc: "List files (-a for hidden)", run: (args) => {
        const showHidden = args.includes("-a");
        const names = Object.keys(files).concat(showHidden ? Object.keys(hiddenFiles) : []);
        return names.join("\n");
    }},
    pwd: { desc: "Print working directory", run: () => `/home/${PROFILE.user}` },
    cat: { desc: "Read a file — cat <file>", run: (args) => {
        const name = (args[0] || "").toLowerCase();
        if(!name) return "Usage: cat <file>";
        return files[name] || hiddenFiles[name] || "File not found.";
    }},
    echo: { desc: "Echo text — echo <text>", run: (args) => args.join(" ") || "" },
    calc: { desc: "Quick math — calc 5+10", run: (args) => {
        const expr = args.join("");
        if(!expr) return "Usage: calc <expression>";
        try {
            return `${expr} = ${safeCalc(expr)}`;
        } catch(e) {
            return "Invalid expression.";
        }
    }},
    banner: { desc: "Print a banner — banner cyber / ai", run: (args) => {
        const key = (args[0] || "").toLowerCase();
        if(!key) return asciiArt;
        if(BANNERS[key]) return BANNERS[key];
        return boxText(args.join(" ").toUpperCase());
    }},
    fortune: { desc: "A random fortune", run: () => FORTUNES[Math.floor(Math.random() * FORTUNES.length)] },
    joke: { desc: "A random programming joke", run: () => JOKES[Math.floor(Math.random() * JOKES.length)] },
    quote: { desc: "A random quote", run: () => QUOTES[Math.floor(Math.random() * QUOTES.length)] },
    weather: { desc: "Local forecast", run: () => `SYSTEM WEATHER REPORT\n\n☀ 99% chance of shipping code\n🌧 Slight risk of merge conflicts\n💨 Winds: strong wifi signal\n🌡 Coffee levels: critically low` },
    theme: { desc: "Change color theme — theme <name>", run: (args) => {
        const name = (args[0] || "").toLowerCase();
        if(!name) return `Available themes:\n${Object.keys(THEMES).join("\n")}`;
        if(setAccent(name)) return `Theme changed to ${name}.`;
        return `Unknown theme "${name}". Available: ${Object.keys(THEMES).join(", ")}`;
    }},
    matrix: { desc: "Toggle background rain — matrix on/off", run: (args) => {
        const state = (args[0] || "").toLowerCase();
        if(state === "off") { rainPaused = true; clearRain(); return "Matrix rain paused."; }
        if(state === "on") { rainPaused = false; return "Matrix rain resumed."; }
        return "Usage: matrix on | matrix off";
    }},
    music: { desc: "Toggle ambient background hum", run: () => {
        musicEnabled = !musicEnabled;
        if(musicEnabled) { startMusic(); return "Ambient hum on 🎵"; }
        stopMusic();
        return "Ambient hum off.";
    }},
    neofetch: { desc: "System info", run: () => `██████╗
User  : ${PROFILE.user}
OS    : Daiwik OS 2.1
Shell : Daiwik Shell
CPU   : Human Brain
GPU   : Imagination RTX
RAM   : Coffee Powered ☕
Level : ${levelFromDays(daysSinceStart())}
Theme : ${currentThemeName}
Status: Coding...` },
    coffee: { desc: "+20 energy", run: () => `☕ Energy +20` },
    hello: { desc: "Say hello", run: () => `Hello ${PROFILE.user} 👋` },
    history: { desc: "Show command history", run: () => commandHistory.length
        ? commandHistory.map((c, idx) => `${idx + 1}  ${c}`).join("\n")
        : `No commands yet.` },
    sound: { desc: "Toggle keyboard sound", run: () => {
        soundEnabled = !soundEnabled;
        return `Keyboard sound ${soundEnabled ? "enabled 🔊" : "disabled 🔇"}.`;
    }},
    clear: { desc: "Clear terminal", custom: async () => { output.innerHTML = ""; } },
    hack: { desc: "Simulate a hack", custom: runHack },
    reboot: { desc: "Restart the terminal", custom: runReboot },
    shutdown: { desc: "Power down the terminal", custom: runShutdown },
    sudo: { hidden: true, custom: async () => { await typeLine("Nice try 😎", 12, "warn"); } },
    redpill: { hidden: true, custom: runRedpill },
    bluepill: { hidden: true, custom: runBluepill }
};

const VISIBLE_COMMANDS = Object.keys(COMMANDS).filter(name => !COMMANDS[name].hidden);

// ==========================
// Command dispatch
// ==========================
async function executeCommand(raw) {
    const command = raw.trim();
    if(command === "") return;

    const echo = document.createElement("div");
    echo.className = "output-line tone-accent";
    echo.innerHTML = `&gt; ${escapeHtml(command)}`;
    output.appendChild(echo);
    output.scrollTop = output.scrollHeight;

    commandHistory.push(command);
    historyIndex = commandHistory.length;

    const args = command.split(/\s+/).filter(Boolean);
    const cmd = args[0].toLowerCase();
    const rest = args.slice(1);

    const entry = COMMANDS[cmd];

    if(!entry) {
        await typeLine("Command not found.", 12, "warn");
        await typeLine('Type "help" to see available commands.', 12, "warn");
        return;
    }

    if(entry.custom) {
        await entry.custom(rest);
        return;
    }

    await typeLine(entry.run(rest), 10, "ink");
}

// ==========================
// Boot sequence
// ==========================
const asciiArt = `██████╗  █████╗ ██╗██╗    ██╗██╗██╗  ██╗
██╔══██╗██╔══██╗██║██║    ██║██║██║ ██╔╝
██║  ██║███████║██║██║ █╗ ██║██║█████╔╝
██║  ██║██╔══██║██║██║███╗██║██║██╔═██╗
██████╔╝██║  ██║██║╚███╔███╔╝██║██║  ██╗
╚═════╝ ╚═╝  ╚═╝╚═╝ ╚══╝╚══╝ ╚═╝╚═╝  ╚═╝`;

async function bootSequence() {
    const days = daysSinceStart();
    document.title = `Daiwik OS · Day ${days}`;

    await typeLine(asciiArt, 2, "accent");
    await typeLine("", 10);
    await typeLine("DAIWIK OS", 18, "accent");
    await typeLine("Version 2.1", 14, "ink");
    await typeLine("", 10);
    await typeLine(`User    : ${PROFILE.user}`, 12, "ink");
    await typeLine(`Mission : ${PROFILE.mission}`, 12, "ink");
    await typeLine("", 10);
    await typeLine(buildStreakPanel(), 8, "ink");
    await typeLine("", 10);
    await runSpinner("Booting system", 700);
    await runSpinner("Loading kernel modules", 800);
    await runSpinner("Authenticating user", 600);
    await typeLine("Access Granted.", 18, "accent");
    await typeLine("", 10);
    await typeLine('Type "help" to continue.', 18, "ink");

    input.disabled = false;
    input.focus();
}

// ==========================
// Suggestions (autocomplete)
// ==========================
function clearSuggestions() { suggestionsEl.innerHTML = ""; }

function updateSuggestions(forcedMatches) {
    const val = input.value.trim().toLowerCase();
    suggestionsEl.innerHTML = "";
    if(!val) return;

    const matches = forcedMatches || VISIBLE_COMMANDS.filter(c => c.startsWith(val));
    matches.slice(0, 5).forEach(cmd => {
        const chip = document.createElement("span");
        chip.className = "suggestion-chip";
        chip.textContent = cmd;
        chip.addEventListener("click", () => {
            input.value = cmd + " ";
            input.focus();
            clearSuggestions();
        });
        suggestionsEl.appendChild(chip);
    });
}

// ==========================
// Keyboard input
// ==========================
const SILENT_KEYS = ["Shift", "Control", "Alt", "Meta", "CapsLock"];

input.addEventListener("keydown", (e) => {
    if(soundEnabled && !SILENT_KEYS.includes(e.key)) playKeySound();

    if(e.key === "Enter") {
        const command = input.value;
        input.value = "";
        clearSuggestions();
        executeCommand(command);
        return;
    }

    if(e.key === "ArrowUp") {
        e.preventDefault();
        if(commandHistory.length === 0) return;
        historyIndex = Math.max(0, historyIndex - 1);
        input.value = commandHistory[historyIndex] || "";
        clearSuggestions();
        return;
    }

    if(e.key === "ArrowDown") {
        e.preventDefault();
        if(commandHistory.length === 0) return;
        historyIndex = Math.min(commandHistory.length, historyIndex + 1);
        input.value = commandHistory[historyIndex] || "";
        clearSuggestions();
        return;
    }

    if(e.key === "Tab") {
        e.preventDefault();
        const val = input.value.trim().toLowerCase();
        if(!val) return;
        const matches = VISIBLE_COMMANDS.filter(c => c.startsWith(val));
        if(matches.length === 1) {
            input.value = matches[0] + " ";
            clearSuggestions();
        } else if(matches.length > 1) {
            updateSuggestions(matches);
        }
        return;
    }

    if(e.key === "Escape") {
        clearSuggestions();
        return;
    }
});

input.addEventListener("input", () => updateSuggestions());

document.querySelector(".terminal").addEventListener("click", () => {
    const selection = window.getSelection();
    if(selection && selection.toString().length > 0) return;
    input.focus();
});

// ==========================
// Go
// ==========================
setAccent("matrix");
bootSequence();