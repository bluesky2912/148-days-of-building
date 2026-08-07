/* ============ THEME ============ */
const themeToggle = document.getElementById("themeToggle");
const savedTheme = localStorage.getItem("cipher-theme") || "dark";
document.body.setAttribute("data-theme", savedTheme);
themeToggle.innerHTML = savedTheme === "dark" ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';

themeToggle.addEventListener("click", () => {
  const cur = document.body.getAttribute("data-theme");
  const next = cur === "dark" ? "light" : "dark";
  document.body.setAttribute("data-theme", next);
  localStorage.setItem("cipher-theme", next);
  themeToggle.innerHTML = next === "dark" ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
});

/* ============ TOAST ============ */
const toast = document.getElementById("toast");
const toastMsg = document.getElementById("toastMsg");
let toastTimer;
function showToast(msg, icon){
  toastMsg.textContent = msg;
  toast.querySelector("i").className = "fa-solid " + (icon || "fa-circle-check");
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> toast.classList.remove("show"), 2200);
}

/* ============ BACKGROUND PARTICLES ============ */
const bgCanvas = document.getElementById("bgCanvas");
const bgCtx = bgCanvas.getContext("2d");
let particles = [];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function resizeBg(){
  bgCanvas.width = window.innerWidth;
  bgCanvas.height = window.innerHeight;
}
resizeBg();
window.addEventListener("resize", resizeBg);

function initParticles(){
  particles = [];
  const count = Math.min(70, Math.floor((window.innerWidth * window.innerHeight) / 22000));
  for(let i=0;i<count;i++){
    particles.push({
      x: Math.random()*bgCanvas.width,
      y: Math.random()*bgCanvas.height,
      vx: (Math.random()-0.5)*0.25,
      vy: (Math.random()-0.5)*0.25,
      r: Math.random()*1.6+0.6
    });
  }
}
initParticles();
window.addEventListener("resize", initParticles);

function drawParticles(){
  bgCtx.clearRect(0,0,bgCanvas.width,bgCanvas.height);
  const isLight = document.body.getAttribute("data-theme") === "light";
  const dotColor = isLight ? "45,212,191" : "45,212,191";
  const lineColor = isLight ? "100,116,139" : "45,212,191";

  for(const p of particles){
    if(!reducedMotion){
      p.x += p.vx; p.y += p.vy;
      if(p.x < 0) p.x = bgCanvas.width;
      if(p.x > bgCanvas.width) p.x = 0;
      if(p.y < 0) p.y = bgCanvas.height;
      if(p.y > bgCanvas.height) p.y = 0;
    }
    bgCtx.beginPath();
    bgCtx.arc(p.x,p.y,p.r,0,Math.PI*2);
    bgCtx.fillStyle = `rgba(${dotColor},0.5)`;
    bgCtx.fill();
  }

  for(let i=0;i<particles.length;i++){
    for(let j=i+1;j<particles.length;j++){
      const a = particles[i], b = particles[j];
      const d = Math.hypot(a.x-b.x, a.y-b.y);
      if(d < 130){
        bgCtx.beginPath();
        bgCtx.moveTo(a.x,a.y);
        bgCtx.lineTo(b.x,b.y);
        bgCtx.strokeStyle = `rgba(${lineColor},${0.12*(1-d/130)})`;
        bgCtx.lineWidth = 1;
        bgCtx.stroke();
      }
    }
  }
  requestAnimationFrame(drawParticles);
}
drawParticles();

/* ============ DOM REFS ============ */
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const copyPassword = document.getElementById("copyPassword");
const generatePassword = document.getElementById("generatePassword");
const aiAnalysis = document.getElementById("aiAnalysis");
const badgeLabel = document.getElementById("badgeLabel");
const scoreNum = document.getElementById("scoreNum");

const lengthEl = document.getElementById("length");
const uppercaseEl = document.getElementById("uppercase");
const lowercaseEl = document.getElementById("lowercase");
const numbersEl = document.getElementById("numbers");
const symbolsEl = document.getElementById("symbols");

const entropyEl = document.getElementById("entropy");
const entropyBar = document.getElementById("entropyBar");
const entropySub = document.getElementById("entropySub");

const patternList = document.getElementById("patternList");
const suggestionsEl = document.getElementById("suggestions");
const legend = document.getElementById("legend");

const t1 = document.getElementById("t1"), t2 = document.getElementById("t2"),
      t3 = document.getElementById("t3"), t4 = document.getElementById("t4");
const attemptCounter = document.getElementById("attemptCounter");

const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistory");

/* ============ COMMON WORD / PATTERN DATA ============ */
const COMMON_PASSWORDS = ["password","123456","12345678","123456789","qwerty","admin","welcome",
  "letmein","monkey","dragon","football","baseball","iloveyou","princess","sunshine","master",
  "shadow","superman","trustno1","abc123","password1","login","starwars","freedom","whatever",
  "qazwsx","michael","jennifer","jordan","hunter","ranger","buster","soccer","hockey","killer",
  "george","andrew","charlie","thomas","hannah","amanda","121212","000000","111111","1q2w3e4r"];

const KEYBOARD_ROWS = ["qwertyuiop","asdfghjkl","zxcvbnm","1234567890","!@#$%^&*()"];

function hasSequential(str){
  const s = str.toLowerCase();
  for(let i=0;i<s.length-3;i++){
    const a = s.charCodeAt(i), b = s.charCodeAt(i+1), c = s.charCodeAt(i+2), d = s.charCodeAt(i+3);
    if((b-a===1 && c-b===1 && d-c===1) || (a-b===1 && b-c===1 && c-d===1)) return true;
  }
  return false;
}

function hasKeyboardWalk(str){
  const s = str.toLowerCase();
  for(const row of KEYBOARD_ROWS){
    for(let i=0;i<=row.length-4;i++){
      const chunk = row.slice(i,i+4);
      const rev = chunk.split("").reverse().join("");
      if(s.includes(chunk) || s.includes(rev)) return true;
    }
  }
  return false;
}

function hasRepeated(str){
  return /(.)\1{2,}/.test(str);
}

function hasDatePattern(str){
  return /(19|20)\d{2}/.test(str) || /\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b/.test(str);
}

function isCommonPassword(str){
  return COMMON_PASSWORDS.includes(str.toLowerCase());
}

function containsCommonWord(str){
  const low = str.toLowerCase();
  return COMMON_PASSWORDS.some(w => w.length > 3 && low.includes(w));
}

/* ============ CORE ANALYSIS ============ */
let debounceTimer;
let displayedScore = 0;
let counterAnim;

passwordInput.addEventListener("input", () => {
  analyzePassword();
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(logToHistory, 900);
});

function analyzePassword(){
  const password = passwordInput.value;

  const upper = (password.match(/[A-Z]/g) || []).length;
  const lower = (password.match(/[a-z]/g) || []).length;
  const numbers = (password.match(/[0-9]/g) || []).length;
  const symbols = (password.match(/[^A-Za-z0-9]/g) || []).length;

  lengthEl.textContent = password.length;
  uppercaseEl.textContent = upper;
  lowercaseEl.textContent = lower;
  numbersEl.textContent = numbers;
  symbolsEl.textContent = symbols;

  drawDonut(upper, lower, numbers, symbols);

  // ---- charset & raw entropy ----
  let charset = 0;
  if(lower) charset += 26;
  if(upper) charset += 26;
  if(numbers) charset += 10;
  if(symbols) charset += 33;

  let entropyBits = password.length === 0 ? 0 : password.length * Math.log2(charset || 1);

  // ---- pattern detection ----
  const issues = [];
  if(password.length > 0){
    if(isCommonPassword(password)){
      issues.push({text:"This is one of the most common passwords in the world.", severe:true});
    }
    if(hasRepeated(password)) issues.push({text:"Contains repeated characters (e.g. aaa, 1111).", severe:true});
    if(hasSequential(password)) issues.push({text:"Contains a sequential run (e.g. 1234, abcd).", severe:true});
    if(hasKeyboardWalk(password)) issues.push({text:"Contains a keyboard walk pattern (e.g. qwerty, asdf).", severe:true});
    if(hasDatePattern(password)) issues.push({text:"Looks like it contains a year or date.", severe:false});
    if(!isCommonPassword(password) && containsCommonWord(password)) issues.push({text:"Contains a common dictionary word.", severe:false});
  }

  // penalty
  let penaltyMultiplier = 1;
  issues.forEach(iss => { penaltyMultiplier *= iss.severe ? 0.45 : 0.7; });
  if(isCommonPassword(password)) entropyBits = Math.min(entropyBits, 4);
  entropyBits = Math.max(0, entropyBits * penaltyMultiplier);

  entropyEl.innerHTML = (password.length ? Math.round(entropyBits) : 0) + ' <span style="font-size:1rem;color:var(--text-muted);">bits</span>';
  entropyBar.style.width = Math.min(100, (entropyBits/100)*100) + "%";
  entropySub.textContent = password.length === 0
    ? "Higher entropy = exponentially more guesses required."
    : entropyBits < 28 ? "Very low — trivially guessable."
    : entropyBits < 45 ? "Low — vulnerable to targeted attacks."
    : entropyBits < 65 ? "Moderate — reasonable for low-stakes accounts."
    : entropyBits < 90 ? "High — solid for most accounts."
    : "Very high — resistant to large-scale attacks.";

  // ---- score out of 100 ----
  let score = password.length === 0 ? 0 : Math.round(Math.min(100, (entropyBits/75)*100));
  score = Math.max(password.length ? 2 : 0, score);

  updateGauge(score);
  updateBadge(score, password.length);
  updatePatterns(issues, password);
  updateCrackTimes(entropyBits, password.length);
  updateSuggestions(password, upper, lower, numbers, symbols, issues);
}

/* ============ GAUGE ============ */
const gaugeCanvas = document.getElementById("gaugeCanvas");
const gctx = gaugeCanvas.getContext("2d");
const DPR = window.devicePixelRatio || 1;
gaugeCanvas.width = 150*DPR; gaugeCanvas.height = 150*DPR;
gctx.scale(DPR,DPR);

function scoreColor(score){
  if(score < 25) return "#f43f5e";
  if(score < 50) return "#f97316";
  if(score < 75) return "#f5a524";
  if(score < 92) return "#22c55e";
  return "#2dd4bf";
}

function updateGauge(target){
  cancelAnimationFrame(updateGauge._raf);
  const start = displayedScore;
  const startTime = performance.now();
  const duration = 500;

  function step(now){
    const p = Math.min(1, (now-startTime)/duration);
    const eased = 1 - Math.pow(1-p, 3);
    displayedScore = start + (target-start)*eased;
    drawGauge(displayedScore);
    scoreNum.textContent = Math.round(displayedScore);
    if(p < 1) updateGauge._raf = requestAnimationFrame(step);
  }
  updateGauge._raf = requestAnimationFrame(step);
}

function drawGauge(score){
  gctx.clearRect(0,0,150,150);
  const cx=75, cy=75, r=58;
  const startAngle = 0.75*Math.PI, fullSweep = 1.5*Math.PI;

  // tick marks
  for(let i=0;i<=20;i++){
    const a = startAngle + fullSweep*(i/20);
    const inner = i%5===0 ? r+9 : r+9;
    const outer = i%5===0 ? r+16 : r+13;
    gctx.beginPath();
    gctx.moveTo(cx+Math.cos(a)*inner, cy+Math.sin(a)*inner);
    gctx.lineTo(cx+Math.cos(a)*outer, cy+Math.sin(a)*outer);
    gctx.strokeStyle = i*5 <= score ? scoreColor(score) : "rgba(255,255,255,.14)";
    gctx.lineWidth = i%5===0 ? 2 : 1;
    gctx.stroke();
  }

  gctx.beginPath();
  gctx.arc(cx,cy,r,startAngle,startAngle+fullSweep);
  gctx.strokeStyle = "rgba(255,255,255,.08)";
  gctx.lineWidth = 10;
  gctx.lineCap = "round";
  gctx.stroke();

  const sweep = fullSweep * (score/100);
  gctx.save();
  gctx.shadowColor = scoreColor(score);
  gctx.shadowBlur = 14;
  gctx.beginPath();
  gctx.arc(cx,cy,r,startAngle,startAngle+sweep);
  gctx.strokeStyle = scoreColor(score);
  gctx.lineWidth = 10;
  gctx.lineCap = "round";
  gctx.stroke();
  gctx.restore();

  // needle tip dot
  if(score > 0){
    const tipA = startAngle+sweep;
    gctx.beginPath();
    gctx.arc(cx+Math.cos(tipA)*r, cy+Math.sin(tipA)*r, 4.5, 0, Math.PI*2);
    gctx.fillStyle = "#fff";
    gctx.fill();
  }
}
drawGauge(0);

/* ============ DONUT ============ */
const donutCanvas = document.getElementById("donutCanvas");
const dctx = donutCanvas.getContext("2d");
donutCanvas.width = 110*DPR; donutCanvas.height = 110*DPR;
dctx.scale(DPR,DPR);

const COMP_COLORS = {upper:"#2dd4bf", lower:"#38bdf8", num:"#f5a524", sym:"#f43f5e"};

function drawDonut(u,l,n,s){
  dctx.clearRect(0,0,110,110);
  const cx=55, cy=55, r=42;
  const total = u+l+n+s;

  if(total === 0){
    dctx.beginPath();
    dctx.arc(cx,cy,r,0,Math.PI*2);
    dctx.strokeStyle = "rgba(255,255,255,.1)";
    dctx.lineWidth = 16;
    dctx.stroke();
    legend.innerHTML = '<span style="color:var(--text-muted);font-family:var(--mono);font-size:.78rem;">No data yet</span>';
    return;
  }

  const segments = [
    {v:u,c:COMP_COLORS.upper,label:"Uppercase"},
    {v:l,c:COMP_COLORS.lower,label:"Lowercase"},
    {v:n,c:COMP_COLORS.num,label:"Numbers"},
    {v:s,c:COMP_COLORS.sym,label:"Symbols"}
  ];

  let angle = -Math.PI/2;
  segments.forEach(seg => {
    if(seg.v === 0) return;
    const slice = (seg.v/total) * Math.PI*2;
    dctx.beginPath();
    dctx.arc(cx,cy,r,angle,angle+slice-0.04);
    dctx.strokeStyle = seg.c;
    dctx.lineWidth = 16;
    dctx.lineCap = "round";
    dctx.stroke();
    angle += slice;
  });

  dctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--text").trim() || "#eef2f8";
  dctx.font = "700 18px 'JetBrains Mono', monospace";
  dctx.textAlign = "center";
  dctx.textBaseline = "middle";
  dctx.fillText(total, cx, cy-4);
  dctx.font = "500 8px 'Inter', sans-serif";
  dctx.fillStyle = "rgba(139,151,171,.8)";
  dctx.fillText("CHARS", cx, cy+11);

  legend.innerHTML = segments.map(seg => `
    <div class="item">
      <span class="swatch" style="background:${seg.c}"></span>
      ${seg.label}
      <span class="val">${seg.v}</span>
    </div>`).join("");
}
drawDonut(0,0,0,0);

/* ============ BADGE ============ */
function updateBadge(score, len){
  let label, color, icon;
  if(len === 0){ label="Waiting"; color="var(--text-muted)"; icon="⬤"; }
  else if(score < 25){ label="Weak"; color="var(--red)"; icon="🔴"; aiAnalysis.textContent="This password can be guessed very quickly. It needs more length and variety."; }
  else if(score < 50){ label="Fair"; color="var(--amber)"; icon="🟠"; aiAnalysis.textContent="Better than most simple passwords, but still vulnerable to common attacks."; }
  else if(score < 75){ label="Good"; color="#f5a524"; icon="🟡"; aiAnalysis.textContent="Reasonably secure. A few tweaks could make it much stronger."; }
  else if(score < 92){ label="Strong"; color="var(--green)"; icon="🟢"; aiAnalysis.textContent="Great password — it combines multiple character types and is hard to guess."; }
  else { label="Excellent"; color="var(--cyan)"; icon="🏆"; aiAnalysis.textContent="Excellent choice. This password would resist even large-scale brute-force attacks."; }

  if(len === 0) aiAnalysis.textContent = "Start typing to receive intelligent feedback…";

  badgeLabel.innerHTML = `<span>${icon}</span> ${label}`;
  badgeLabel.style.color = color;
}

/* ============ PATTERNS UI ============ */
function updatePatterns(issues, password){
  patternList.innerHTML = "";
  if(password.length === 0){
    patternList.innerHTML = '<div class="pattern-item"><i class="fa-solid fa-circle-info"></i> Nothing to scan yet.</div>';
    return;
  }
  if(issues.length === 0){
    patternList.innerHTML = '<div class="pattern-item ok"><i class="fa-solid fa-circle-check"></i> No common weak patterns detected.</div>';
    return;
  }
  issues.forEach(iss => {
    const div = document.createElement("div");
    div.className = "pattern-item warn";
    div.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${iss.text}`;
    patternList.appendChild(div);
  });
}

/* ============ CRACK TIME ============ */
function formatTime(seconds){
  if(!isFinite(seconds)) return "Longer than the universe has existed";
  if(seconds < 1) return "Instantly";
  if(seconds < 60) return Math.round(seconds) + " sec";
  if(seconds < 3600) return Math.round(seconds/60) + " min";
  if(seconds < 86400) return Math.round(seconds/3600) + " hours";
  if(seconds < 2592000) return Math.round(seconds/86400) + " days";
  if(seconds < 31536000) return Math.round(seconds/2592000) + " months";
  if(seconds < 3153600000) return Math.round(seconds/31536000) + " years";
  if(seconds < 3153600000000) return Math.round(seconds/31536000000).toLocaleString() + " thousand years";
  const centuries = seconds/31536000/100;
  if(centuries < 1e9) return Math.round(centuries).toLocaleString() + " centuries";
  return "Effectively uncrackable (age-of-universe scale)";
}

function crackSeconds(entropyBits, guessesPerSec){
  if(entropyBits <= 0) return 0;
  const combos = Math.pow(2, entropyBits);
  return combos / (2*guessesPerSec);
}

function updateCrackTimes(entropyBits, len){
  if(len === 0){
    t1.textContent = t2.textContent = t3.textContent = t4.textContent = "Instant";
    animateCounter(0);
    return;
  }
  const online_throttled = crackSeconds(entropyBits, 100/3600);
  const online_unthrottled = crackSeconds(entropyBits, 10);
  const offline_slow = crackSeconds(entropyBits, 10000);
  const offline_fast = crackSeconds(entropyBits, 1e10);

  t1.textContent = formatTime(online_throttled);
  t2.textContent = formatTime(online_unthrottled);
  t3.textContent = formatTime(offline_slow);
  t4.textContent = formatTime(offline_fast);

  [t1,t2,t3,t4].forEach(el => {
    el.style.color = el.textContent.includes("Instant") || el.textContent.includes("sec") || el.textContent.includes("min")
      ? "var(--red)" : (el.textContent.includes("centuries") || el.textContent.includes("universe")) ? "var(--cyan)" : "var(--amber)";
  });

  animateCounter(Math.min(1e9, Math.pow(2, Math.min(entropyBits,40))));
}

function animateCounter(target){
  cancelAnimationFrame(counterAnim);
  let current = 0;
  const startTime = performance.now();
  const duration = 1400;
  function step(now){
    const p = Math.min(1,(now-startTime)/duration);
    current = target * (1 - Math.pow(1-p,2));
    attemptCounter.textContent = Math.round(current).toLocaleString();
    if(p < 1) counterAnim = requestAnimationFrame(step);
  }
  counterAnim = requestAnimationFrame(step);
}

/* ============ SUGGESTIONS ============ */
function updateSuggestions(password, upper, lower, numbers, symbols, issues){
  suggestionsEl.innerHTML = "";
  const tips = [];

  if(password.length === 0){
    tips.push({text:"Start typing a password to get tailored suggestions.", good:false});
  } else {
    if(password.length < 12) tips.push({text:"Use at least 12 characters — longer is exponentially stronger.", good:false});
    if(!upper) tips.push({text:"Add uppercase letters.", good:false});
    if(!lower) tips.push({text:"Add lowercase letters.", good:false});
    if(!numbers) tips.push({text:"Include numbers.", good:false});
    if(!symbols) tips.push({text:"Add special symbols (!@#$…).", good:false});
    if(issues.some(i=>i.text.includes("common"))) tips.push({text:"Avoid dictionary words and common passwords.", good:false});
    if(issues.some(i=>i.text.includes("repeated"))) tips.push({text:"Avoid repeating the same character multiple times.", good:false});
    if(issues.some(i=>i.text.includes("Sequential")||i.text.includes("sequential"))) tips.push({text:"Avoid sequential runs like 1234 or abcd.", good:false});
    if(issues.some(i=>i.text.includes("keyboard"))) tips.push({text:"Avoid keyboard walks like qwerty or asdf.", good:false});
    if(issues.some(i=>i.text.includes("date"))) tips.push({text:"Avoid using birth years or dates — these are easy to guess.", good:false});

    if(tips.length === 0) tips.push({text:"Excellent password — no further improvements needed.", good:true});
  }

  tips.forEach(tip => {
    const li = document.createElement("li");
    if(tip.good) li.classList.add("good");
    li.innerHTML = `<i class="fa-solid ${tip.good ? "fa-circle-check" : "fa-circle-exclamation"}"></i> ${tip.text}`;
    suggestionsEl.appendChild(li);
  });
}

/* ============ TOGGLE / COPY / GENERATE ============ */
togglePassword.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
  togglePassword.innerHTML = isHidden ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
});

copyPassword.addEventListener("click", async () => {
  if(!passwordInput.value){ showToast("Nothing to copy", "fa-circle-exclamation"); return; }
  try{
    await navigator.clipboard.writeText(passwordInput.value);
    showToast("Password copied to clipboard", "fa-circle-check");
  }catch(e){
    showToast("Copy failed — select manually", "fa-circle-exclamation");
  }
});

generatePassword.addEventListener("click", () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+?><";
  let password = "";
  const arr = new Uint32Array(18);
  (window.crypto || window.msCrypto).getRandomValues(arr);
  for(let i=0;i<18;i++){
    password += chars[arr[i] % chars.length];
  }
  passwordInput.value = password;
  analyzePassword();
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(logToHistory, 900);
  showToast("Strong password generated", "fa-wand-magic-sparkles");
});

/* ============ HISTORY (hash only, never plaintext) ============ */
const HISTORY_KEY = "cipher-history";

async function sha256Hex(str){
  try{
    const enc = new TextEncoder().encode(str);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
  }catch(e){
    // fallback non-cryptographic hash if subtle crypto unavailable
    let h = 0;
    for(let i=0;i<str.length;i++){ h = (Math.imul(31,h) + str.charCodeAt(i))|0; }
    return "fallback" + Math.abs(h).toString(16);
  }
}

function loadHistory(){
  try{ return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
  catch(e){ return []; }
}

function saveHistory(list){
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0,8)));
}

async function logToHistory(){
  const pw = passwordInput.value;
  if(!pw) return;
  const hash = await sha256Hex(pw);
  const list = loadHistory();
  if(list[0] && list[0].hash === hash) return; // avoid duplicate consecutive entries
  const score = Math.round(displayedScore);
  list.unshift({hash: hash.slice(0,16)+"…", score, time: Date.now()});
  saveHistory(list);
  renderHistory();
}

function renderHistory(){
  const list = loadHistory();
  if(list.length === 0){
    historyList.innerHTML = '<div class="history-empty">No scans yet — analyses are logged automatically as you type (only a hash is stored, never the password itself).</div>';
    return;
  }
  historyList.innerHTML = list.map(item => `
    <div class="history-row">
      <span class="hbadge" style="background:${scoreColor(item.score)}"></span>
      <span class="hash">${item.hash}</span>
      <span>Score ${item.score}/100</span>
      <span class="time">${new Date(item.time).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>
    </div>`).join("");
}

clearHistoryBtn.addEventListener("click", () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
  showToast("History cleared", "fa-trash");
});

renderHistory();

/* ============ PWA install prompt (works only when hosted on a real origin) ============ */
let deferredPrompt;
const installBtn = document.getElementById("installBtn");
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.style.display = "flex";
});
installBtn.addEventListener("click", async () => {
  if(!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.style.display = "none";
});
if("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")){
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(()=>{ /* no sw hosted alongside this preview */ });
  });
}

/* init */
analyzePassword();