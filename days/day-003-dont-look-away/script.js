/* =========================================================
   DOM REFS
   ========================================================= */
const $ = id => document.getElementById(id);
const grid = $("grid"), staticCanvas = $("staticCanvas"), staticCtx = staticCanvas.getContext("2d");
const clockVal = $("clockVal"), shiftFill = $("shiftFill");
const stabilityVal = $("stabilityVal"), stabilityBar = $("stabilityBar");
const threatVal = $("threatVal"), threatFill = $("threatFill");
const scoreVal = $("scoreVal"), streakVal = $("streakVal");
const logFeed = $("logFeed");
const startScreen = $("startScreen"), endScreen = $("endScreen");
const startBtn = $("startBtn"), restartBtn = $("restartBtn");
const bestLine = $("bestLine"), badgeRow = $("badgeRow");
const endTitle = $("endTitle"), endText = $("endText"), tauntText = $("tauntText");
const endStats = $("endStats"), endBadges = $("endBadges"), attemptLine = $("attemptLine");
const manipOverlay = $("manipOverlay");
const jumpscareFlash = $("jumpscareFlash"), bigScare = $("bigScare");
const threatVignette = $("threatVignette"), flashlight = $("flashlight");
const app = $("app");
const pauseOverlay = $("pauseOverlay"), pauseBtn = $("pauseBtn"), resumeBtn = $("resumeBtn");
const toast = $("toast"), toastName = $("toastName"), toastDesc = $("toastDesc");

/* =========================================================
   CONFIG
   ========================================================= */
const SECONDS_PER_HOUR = 36;   // real seconds per in-game hour
const TOTAL_HOURS = 6;          // 12AM -> 6AM
const TOTAL_DURATION = SECONDS_PER_HOUR * TOTAL_HOURS;

const DIFFICULTIES = {
  rookie:    { name:"ROOKIE",    interval:8500, ramp:450, minInterval:5200, chance:.62, lifespan:5200, lifespanMin:3800, lifespanRamp:250, dmg:9,  mult:.8, doubleHour:99,
               decoyChance:.12, presenceGrace:15, presenceRamp:4,  presenceDamage:22 },
  standard:  { name:"STANDARD",  interval:6200, ramp:520, minInterval:3400, chance:.82, lifespan:4300, lifespanMin:2600, lifespanRamp:280, dmg:13, mult:1,  doubleHour:3,
               decoyChance:.25, presenceGrace:11, presenceRamp:6,  presenceDamage:32 },
  nightmare: { name:"NIGHTMARE", interval:4200, ramp:480, minInterval:2200, chance:1,   lifespan:3200, lifespanMin:1900, lifespanRamp:260, dmg:18, mult:1.5,doubleHour:1,
               decoyChance:.40, presenceGrace:8,  presenceRamp:8,  presenceDamage:42 },
  no_sleep:  { name:"NO SLEEP",  interval:3000, ramp:400, minInterval:1500, chance:1,   lifespan:2300, lifespanMin:1300, lifespanRamp:220, dmg:22, mult:2,  doubleHour:0,
               decoyChance:.55, presenceGrace:6,  presenceRamp:11, presenceDamage:50 }
};

const anomalyTypes = [
  { id:"entity",  name:"UNKNOWN PRESENCE",  cls:"anomaly-entity"  },
  { id:"missing", name:"OBJECT MISSING",    cls:"anomaly-missing" },
  { id:"moved",   name:"OBJECT MOVED",      cls:"anomaly-moved"   },
  { id:"shadow",  name:"ABNORMAL SHADOW",   cls:"anomaly-shadow"  },
  { id:"light",   name:"LIGHT ANOMALY",     cls:"anomaly-light"   },
  { id:"mirror",  name:"MIRROR DISTORTION", cls:"anomaly-mirror"  },
  { id:"glitch",  name:"SIGNAL DISTORTION", cls:"anomaly-glitch"  }
];

const cameras = [
  { id:1, name:"LIVING ROOM",  scene:"room-0", build:buildLivingRoom },
  { id:2, name:"HALLWAY",      scene:"room-1", build:buildHallway },
  { id:3, name:"BEDROOM",      scene:"room-2", build:buildBedroom },
  { id:4, name:"MIRROR ROOM",  scene:"room-3", build:buildMirrorRoom }
];

const ACHIEVEMENTS = [
  { id:"first_contact", name:"FIRST CONTACT",  desc:"Catch your first anomaly." },
  { id:"sharp_eye",     name:"SHARP EYE",      desc:"Reach a x3.0 observer streak." },
  { id:"nerves",        name:"NERVES OF STEEL",desc:"Recover from critical stability back above 50%." },
  { id:"flawless_hour", name:"FLAWLESS HOUR",  desc:"Complete an in-game hour without a single miss." },
  { id:"ghost_hunter",  name:"GHOST HUNTER",   desc:"Catch 15 anomalies in a single shift." },
  { id:"dawn",          name:"SAW THE DAWN",   desc:"Survive the full shift, 12AM to 6AM." },
  { id:"unblinking",    name:"UNBLINKING",     desc:"Survive the full shift on NIGHTMARE." },
  { id:"no_sleep",      name:"NO SLEEP TILL DAWN", desc:"Survive the full shift on NO SLEEP." }
];

const MANIP_PHRASES = ["DON'T LOOK AWAY","IT KNOWS YOU'RE WATCHING","BEHIND YOU","STOP WATCHING","WE SEE YOU TOO"];
const GLITCH_TEXTS = ["SIGNAL ERROR","NO CARRIER","REC STOPPED","### LOST ###","SYNC FAILED"];

/* taunts scale with how far into the shift a run ended — the entity gets the last word */
function pickTaunt(progressPct){
  if (progressPct < 20) return "IT BARELY HAD TO TRY.";
  if (progressPct < 45) return "IT WAS THERE THE WHOLE TIME.";
  if (progressPct < 70) return "SO CLOSE. NOT CLOSE ENOUGH.";
  if (progressPct < 92) return "YOU COULD ALMOST TASTE THE SUNRISE.";
  return "ONE MORE MINUTE. THAT'S ALL IT NEEDED.";
}

/* =========================================================
   STATE
   ========================================================= */
let state = null;
let uidCounter = 0;
let clockTimer = null, schedulerTimer = null, heartbeatTimer = null, ambientNodes = null;
let toastQueue = [], toastBusy = false;

function freshState(){
  return {
    running:false, paused:false, difficulty:"standard",
    score:0, stability:100, streak:1,
    anomaliesFound:0, anomaliesMissed:0, camerasChecked:0,
    gameSeconds:0, hourLastChecked:0, hourMissSnapshot:0,
    activeAnomalies:[], activeDecoys:[], wasCritical:false, unlockedThisRun:[],
    presenceRoom:0, presenceLevel:0, lastPresenceWatch:0
  };
}

/* =========================================================
   INIT
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  setupDifficulty();
  buildCameras();
  setupCanvas();
  refreshMetaUI();
  updateClockDisplay(0);
  state = freshState();
  startTitleGlitch();
});

function startTitleGlitch(){
  const title = document.querySelector(".start-content h1");
  if (!title) return;
  setInterval(() => {
    if (startScreen.classList.contains("hidden")) return;
    title.classList.remove("h1-glitch");
    void title.offsetWidth;
    title.classList.add("h1-glitch");
  }, 3500 + Math.random() * 3000);
}

function setupDifficulty(){
  const buttons = document.querySelectorAll(".diff-btn");
  buttons.forEach(button => {
    button.addEventListener("click", () => {
      buttons.forEach(btn => btn.classList.remove("selected"));
      button.classList.add("selected");
      state.difficulty = button.dataset.diff;
    });
  });
}

/* =========================================================
   BUILD CAMERAS (static DOM, rebuilt art per room)
   ========================================================= */
function buildCameras(){
  grid.innerHTML = "";
  cameras.forEach(camera => {
    const cam = document.createElement("article");
    cam.className = "cam";
    cam.dataset.camera = camera.id;
    cam.innerHTML = `
      <div class="cam-topbar">
        <span><span class="rec-dot"></span>CAM-${String(camera.id).padStart(2,"0")}</span>
        <span class="id">${camera.name}</span>
        <span class="ts">LIVE</span>
      </div>
      <div class="scene ${camera.scene}"><div class="room-noise"></div></div>
      <div class="cam-bottombar"><span>SEC-7</span><span class="watch-tag">MONITOR</span></div>
    `;
    camera.build(cam.querySelector(".scene"));
    cam.addEventListener("click", () => watchCamera(camera.id));
    grid.appendChild(cam);
  });
}

function buildLivingRoom(scene){
  scene.innerHTML += `
    <div class="room-wall room-0"></div>
    <div class="window"></div>
    <div class="painting"></div>
    <div class="sofa"><div class="sofa-back"></div><div class="sofa-seat"></div><div class="sofa-arm left"></div><div class="sofa-arm right"></div></div>
    <div class="coffee-table"><div class="table-top"></div><div class="table-leg one"></div><div class="table-leg two"></div></div>
    <div class="lamp"><div class="lamp-shade"></div><div class="lamp-stand"></div><div class="lamp-glow"></div></div>
    <div class="door"><div class="door-handle"></div></div>
    <div class="floor"></div>
    <div class="room-shadow"></div>
  `;
}
function buildHallway(scene){
  scene.innerHTML += `
    <div class="room-wall room-1"></div>
    <div class="hall-floor"></div>
    <div class="hall-door door-left"><span>01</span></div>
    <div class="hall-door door-right"><span>02</span></div>
    <div class="hall-end-door"><span>EXIT</span></div>
    <div class="hall-light light-one"></div>
    <div class="hall-light light-two"></div>
    <div class="hall-light light-three"></div>
    <div class="hall-shadow"></div>
  `;
}
function buildBedroom(scene){
  scene.innerHTML += `
    <div class="room-wall room-2"></div>
    <div class="bedroom-window"></div>
    <div class="bed"><div class="bed-head"></div><div class="mattress"></div><div class="pillow"></div><div class="blanket"></div><div class="bed-leg"></div></div>
    <div class="bedside-table"></div>
    <div class="bedside-lamp"><div class="lamp-glow"></div></div>
    <div class="bedroom-door"></div>
    <div class="floor"></div>
  `;
}
function buildMirrorRoom(scene){
  scene.innerHTML += `
    <div class="room-wall room-3"></div>
    <div class="mirror-frame"><div class="mirror-glass"><div class="mirror-reflection"></div></div></div>
    <div class="mirror-chair"></div>
    <div class="mirror-table"></div>
    <div class="mirror-shadow"></div>
    <div class="floor"></div>
  `;
}

/* =========================================================
   WATCH CAMERA
   ========================================================= */
function watchCamera(id){
  if (!state.running || state.paused) return;
  state.camerasChecked++;

  if (id === state.presenceRoom){
    state.lastPresenceWatch = Date.now();
    state.presenceLevel = 0;
    clearPresenceWarn();
  }

  document.querySelectorAll(".cam").forEach(c => c.classList.remove("watching"));
  const cam = document.querySelector(`.cam[data-camera="${id}"]`);
  if (cam) cam.classList.add("watching");

  const anomaly = state.activeAnomalies.find(a => a.camera === id);
  const decoy = state.activeDecoys.find(d => d.camera === id);

  if (anomaly){
    resolveAnomaly(anomaly, cam);
  } else if (decoy){
    handleFalseAlarm(decoy, cam);
  } else {
    addLog(`CAM-${String(id).padStart(2,"0")} CLEAR.`, "normal");
    if (cam){ cam.classList.remove("wrong-flash"); void cam.offsetWidth; cam.classList.add("wrong-flash"); }
  }
  playClick();
}

/* =========================================================
   START GAME
   ========================================================= */
startBtn.addEventListener("click", startGame);

function startGame(){
  state = freshState();
  state.running = true;
  state.presenceRoom = cameras[Math.floor(Math.random() * cameras.length)].id;
  state.lastPresenceWatch = Date.now();

  startScreen.classList.add("hidden");
  endScreen.classList.add("hidden");
  pauseOverlay.classList.remove("show");

  document.querySelectorAll(".cam").forEach(c => {
    c.classList.remove("watching", "wrong-flash", "right-flash", "presence-warn");
    c.querySelectorAll(".entity-figure,.glitch-veil,.manifest-flash").forEach(e => e.remove());
    c.classList.remove(...anomalyTypes.map(t => t.cls));
    const scene = c.querySelector(".scene");
    if (scene) scene.classList.remove("decoy-flicker");
  });

  logFeed.innerHTML = "";
  addLog("NIGHT SHIFT STARTED.", "good");
  addLog(`DIFFICULTY: ${DIFFICULTIES[state.difficulty].name}.`, "good");

  updateHUD();
  updateClockDisplay(0);
  refreshThreatMeter();

  bumpStat("dlaShiftsPlayed");

  startClock();
  scheduleLoop();
  startStatic();
  startHeartbeat();
  startAmbient();

  playStartSound();
}

/* =========================================================
   CLOCK / SHIFT PROGRESS
   ========================================================= */
function startClock(){
  clearInterval(clockTimer);
  clockTimer = setInterval(() => {
    if (!state.running || state.paused) return;
    state.gameSeconds++;

    const hourFloat = state.gameSeconds / SECONDS_PER_HOUR;
    const hourIndex = Math.floor(hourFloat);
    updateClockDisplay(hourFloat);

    if (hourIndex > state.hourLastChecked){
      checkHourBoundary(hourIndex);
      state.hourLastChecked = hourIndex;
    }

    updatePresence();

    if (state.gameSeconds >= TOTAL_DURATION){
      endGame("DAWN");
    }
  }, 1000);
}

function updateClockDisplay(hourFloat){
  const hour = 12 + Math.floor(hourFloat);
  const minutes = Math.floor((hourFloat % 1) * 60);
  const displayHour = hour > 12 ? hour - 12 : hour;
  clockVal.textContent = `${String(displayHour).padStart(2,"0")}:${String(minutes).padStart(2,"0")}AM`;
  shiftFill.style.width = `${Math.min(100, (hourFloat / TOTAL_HOURS) * 100)}%`;
}

function checkHourBoundary(hourIndex){
  if (state.anomaliesMissed === state.hourMissSnapshot){
    unlock("flawless_hour");
  }
  state.hourMissSnapshot = state.anomaliesMissed;
  addLog(`${String(11 + hourIndex).padStart(2,"0")}:59AM PASSED. STAY ALERT.`, "normal");
}

function currentHourIndex(){
  return Math.floor(state.gameSeconds / SECONDS_PER_HOUR);
}

/* =========================================================
   SCHEDULER
   ========================================================= */
function scheduleLoop(){
  clearTimeout(schedulerTimer);
  if (!state.running) return;

  const cfg = DIFFICULTIES[state.difficulty];
  const hourIndex = currentHourIndex();
  const interval = Math.max(cfg.minInterval, cfg.interval - hourIndex * cfg.ramp);

  schedulerTimer = setTimeout(() => {
    if (!state.running){ return; }
    if (!state.paused){
      const cfg2 = DIFFICULTIES[state.difficulty];
      const hi = currentHourIndex();
      if (Math.random() <= cfg2.chance){
        spawnAnomaly();
        if (hi >= cfg2.doubleHour && Math.random() < 0.35){
          spawnAnomaly();
        }
      }
      if (Math.random() < cfg2.decoyChance){
        spawnDecoy();
      }
    }
    scheduleLoop();
  }, interval);
}

/* =========================================================
   ANOMALY LIFECYCLE
   ========================================================= */
function availableCameraIds(){
  const occupied = new Set(state.activeAnomalies.map(a => a.camera));
  return cameras.map(c => c.id).filter(id => !occupied.has(id) && id !== 0);
}

function computeLifespan(){
  const cfg = DIFFICULTIES[state.difficulty];
  const hourIndex = currentHourIndex();
  return Math.max(cfg.lifespanMin, cfg.lifespan - hourIndex * cfg.lifespanRamp);
}

function spawnAnomaly(){
  if (state.activeAnomalies.length >= 2) return null;
  const available = availableCameraIds();
  if (available.length === 0) return null;

  const camId = available[Math.floor(Math.random() * available.length)];
  const type = anomalyTypes[Math.floor(Math.random() * anomalyTypes.length)];
  const lifespan = computeLifespan();

  const anomaly = { uid: ++uidCounter, camera: camId, typeId: type.id, cls: type.cls, name: type.name, spawnTime: Date.now(), lifespan };
  state.activeAnomalies.push(anomaly);
  applyAnomalyVisual(anomaly);
  anomaly.timeoutId = setTimeout(() => handleMiss(anomaly), lifespan);

  addLog("ENVIRONMENTAL CHANGE DETECTED.", "alert");
  playAnomalySound();
  refreshThreatMeter();
  return anomaly;
}

function applyAnomalyVisual(anomaly){
  const cam = document.querySelector(`.cam[data-camera="${anomaly.camera}"]`);
  if (!cam) return;
  cam.classList.add(anomaly.cls);
  const scene = cam.querySelector(".scene");

  if (anomaly.typeId === "entity"){
    const entity = document.createElement("div");
    entity.className = "entity-figure slot";
    entity.style.left = `${25 + Math.random() * 50}%`;
    entity.style.top = `${20 + Math.random() * 40}%`;
    entity.innerHTML = `<div class="head"></div><div class="body"></div><div class="eyes"><span></span><span></span></div>`;
    scene.appendChild(entity);
  }
  if (anomaly.typeId === "glitch"){
    const veil = document.createElement("div");
    veil.className = "glitch-veil";
    veil.textContent = GLITCH_TEXTS[Math.floor(Math.random() * GLITCH_TEXTS.length)];
    scene.appendChild(veil);
  }
}

function clearAnomalyVisual(anomaly){
  const cam = document.querySelector(`.cam[data-camera="${anomaly.camera}"]`);
  if (!cam) return;
  cam.classList.remove(anomaly.cls);
  cam.querySelectorAll(".entity-figure,.glitch-veil").forEach(e => e.remove());
}

function removeFromActive(anomaly){
  clearTimeout(anomaly.timeoutId);
  state.activeAnomalies = state.activeAnomalies.filter(a => a.uid !== anomaly.uid);
  refreshThreatMeter();
}

/* =========================================================
   DECOYS — false signal spikes with no real change behind them.
   Punishes trigger-happy clicking; rewards a careful, verifying eye.
   ========================================================= */
function spawnDecoy(){
  const occupied = new Set([...state.activeAnomalies.map(a => a.camera), ...state.activeDecoys.map(d => d.camera)]);
  const available = cameras.map(c => c.id).filter(id => !occupied.has(id));
  if (available.length === 0) return null;

  const camId = available[Math.floor(Math.random() * available.length)];
  const duration = 500 + Math.random() * 180;
  const decoy = { uid: ++uidCounter, camera: camId, duration, spawnTime: Date.now() };
  state.activeDecoys.push(decoy);

  const cam = document.querySelector(`.cam[data-camera="${camId}"]`);
  if (cam){
    const scene = cam.querySelector(".scene");
    if (scene) scene.classList.add("decoy-flicker");
  }
  decoy.timeoutId = setTimeout(() => clearDecoy(decoy), duration);
  playDecoySound();
  return decoy;
}

function clearDecoyVisual(decoy){
  const cam = document.querySelector(`.cam[data-camera="${decoy.camera}"]`);
  if (!cam) return;
  const scene = cam.querySelector(".scene");
  if (scene) scene.classList.remove("decoy-flicker");
}

function clearDecoy(decoy){
  clearDecoyVisual(decoy);
  state.activeDecoys = state.activeDecoys.filter(d => d.uid !== decoy.uid);
}

function handleFalseAlarm(decoy, camEl){
  clearTimeout(decoy.timeoutId);
  clearDecoyVisual(decoy);
  state.activeDecoys = state.activeDecoys.filter(d => d.uid !== decoy.uid);

  const cfg = DIFFICULTIES[state.difficulty];
  const damage = Math.round(cfg.dmg * 0.5);
  state.stability = Math.max(0, state.stability - damage);
  state.streak = 1;

  addLog("FALSE ALARM — SIGNAL NOISE, NOT A THREAT.", "alert");
  addLog(`SYSTEM STABILITY -${damage}%.`, "alert");
  updateHUD();
  playFalseAlarmSound();
  if (camEl){ camEl.classList.remove("wrong-flash"); void camEl.offsetWidth; camEl.classList.add("wrong-flash"); }
  spawnFloater(camEl, "FALSE ALARM", true);

  if (state.stability <= 0) endGame("STABILITY COLLAPSED");
}

/* =========================================================
   PRESENCE — a hidden dread meter tied to one un-named room.
   Ignore it too long and it manifests, hard, and picks a new room.
   ========================================================= */
function updatePresence(){
  const cfg = DIFFICULTIES[state.difficulty];
  const idleSec = (Date.now() - state.lastPresenceWatch) / 1000;

  if (idleSec <= cfg.presenceGrace){
    clearPresenceWarn();
    return;
  }

  const over = idleSec - cfg.presenceGrace;
  state.presenceLevel = Math.min(100, over * cfg.presenceRamp);

  if (state.presenceLevel >= 70) setPresenceWarn();
  if (state.presenceLevel >= 100) manifestPresence();
}

function setPresenceWarn(){
  const cam = document.querySelector(`.cam[data-camera="${state.presenceRoom}"]`);
  if (cam) cam.classList.add("presence-warn");
}
function clearPresenceWarn(){
  const cam = document.querySelector(`.cam[data-camera="${state.presenceRoom}"]`);
  if (cam) cam.classList.remove("presence-warn");
}

function manifestPresence(){
  const camId = state.presenceRoom;
  clearPresenceWarn();

  const cfg = DIFFICULTIES[state.difficulty];
  state.stability = Math.max(0, state.stability - cfg.presenceDamage);
  state.streak = 1;
  updateHUD();

  triggerManifestation(camId);
  playManifestSound();

  state.presenceRoom = cameras[Math.floor(Math.random() * cameras.length)].id;
  state.presenceLevel = 0;
  state.lastPresenceWatch = Date.now();

  if (state.stability <= 0) endGame("STABILITY COLLAPSED");
}

function triggerManifestation(camId){
  document.querySelectorAll(".cam .scene").forEach(scene => {
    const flash = document.createElement("div");
    flash.className = "manifest-flash";
    scene.appendChild(flash);
    setTimeout(() => flash.remove(), 280);
  });
  triggerChromaBurst();
  triggerThreat();
  addLog(`SOMETHING WAS WAITING ON CAM-${String(camId).padStart(2,"0")}.`, "alert");
}

function triggerChromaBurst(){
  app.classList.remove("chroma-burst");
  void app.offsetWidth;
  app.classList.add("chroma-burst");
  setTimeout(() => app.classList.remove("chroma-burst"), 420);
}

/* =========================================================
   RESOLVE / MISS
   ========================================================= */
function resolveAnomaly(anomaly, camEl){
  clearAnomalyVisual(anomaly);
  removeFromActive(anomaly);

  state.anomaliesFound++;
  state.streak = Math.round((state.streak + 0.25) * 10) / 10;

  const elapsed = Date.now() - anomaly.spawnTime;
  const speedRatio = 1 - (elapsed / anomaly.lifespan);
  const speedBonus = speedRatio > 0.6 ? 1.5 : (speedRatio > 0.3 ? 1.2 : 1);
  const cfg = DIFFICULTIES[state.difficulty];
  const points = Math.round(100 * state.streak * cfg.mult * speedBonus);
  state.score += points;
  state.stability = Math.min(100, state.stability + (speedBonus > 1 ? 3 : 1.5));

  addLog(`ANOMALY CONFIRMED: ${anomaly.name}.`, "good");
  addLog(speedBonus > 1 ? `QUICK EYE! +${points} PTS.` : `+${points} POINTS.`, "good");

  updateHUD();
  streakVal.classList.remove("pop"); void streakVal.offsetWidth; streakVal.classList.add("pop");
  playSuccessSound();
  flashScreen("rgba(140,255,140,0.08)");
  if (camEl){ camEl.classList.remove("right-flash"); void camEl.offsetWidth; camEl.classList.add("right-flash"); }
  spawnFloater(camEl, `+${points}`, false);

  if (state.anomaliesFound === 1) unlock("first_contact");
  if (state.streak >= 3) unlock("sharp_eye");
  if (state.anomaliesFound >= 15) unlock("ghost_hunter");
  if (state.wasCritical && state.stability >= 50){ unlock("nerves"); state.wasCritical = false; }
}

function handleMiss(anomaly){
  if (!state.activeAnomalies.some(a => a.uid === anomaly.uid)) return;
  clearAnomalyVisual(anomaly);
  removeFromActive(anomaly);

  state.anomaliesMissed++;
  const cfg = DIFFICULTIES[state.difficulty];
  const hourIndex = currentHourIndex();
  const damage = Math.round(cfg.dmg + hourIndex);
  state.stability = Math.max(0, state.stability - damage);
  state.streak = 1;

  addLog(`ANOMALY MISSED: ${anomaly.name}.`, "alert");
  addLog(`SYSTEM STABILITY -${damage}%.`, "alert");

  updateHUD();
  triggerThreat();

  if (state.stability <= 25 && !state.wasCritical){
    state.wasCritical = true;
    triggerChromaBurst();
  }
  if (state.stability > 0 && Math.random() < 0.25 && state.stability < 45){
    triggerManipulation();
  }

  if (state.stability <= 0){
    endGame("STABILITY COLLAPSED");
  }
}

/* =========================================================
   FLOATING POPUP
   ========================================================= */
function spawnFloater(camEl, text, bad){
  if (!camEl) return;
  const f = document.createElement("div");
  f.className = "floater" + (bad ? " bad" : "");
  f.textContent = text;
  f.style.left = `${35 + Math.random() * 30}%`;
  f.style.top = `${45 + Math.random() * 15}%`;
  camEl.appendChild(f);
  setTimeout(() => f.remove(), 950);
}

/* =========================================================
   HUD
   ========================================================= */
function updateHUD(){
  scoreVal.textContent = state.score.toLocaleString();
  streakVal.textContent = `x${state.streak.toFixed(1)}`;
  streakVal.classList.toggle("hot", state.streak >= 3);

  stabilityVal.textContent = `${Math.round(state.stability)}%`;
  stabilityBar.style.width = `${state.stability}%`;
  stabilityBar.style.background = getStabilityColor();

  stabilityVal.classList.remove("warn","crit");
  if (state.stability <= 50) stabilityVal.classList.add("warn");
  if (state.stability <= 25){ stabilityVal.classList.remove("warn"); stabilityVal.classList.add("crit"); }
}

function getStabilityColor(){
  if (state.stability <= 25) return "#ff3030";
  if (state.stability <= 50) return "#d6a84f";
  return "#8cff8c";
}

/* threat window meter tracks the soonest-expiring active anomaly, without revealing which camera */
function refreshThreatMeter(){
  if (state.activeAnomalies.length === 0){
    threatVal.textContent = "—";
    threatFill.style.transition = "none";
    threatFill.style.width = "0%";
    threatFill.style.background = "#2c352f";
    return;
  }
  const soonest = state.activeAnomalies.reduce((min, a) => {
    const remaining = a.lifespan - (Date.now() - a.spawnTime);
    return remaining < min.remaining ? { anomaly: a, remaining } : min;
  }, { anomaly: null, remaining: Infinity });

  threatVal.textContent = state.activeAnomalies.length > 1 ? "MULTIPLE" : "ACTIVE";
  threatFill.style.transition = "none";
  threatFill.style.width = `${Math.max(0, (soonest.remaining / soonest.anomaly.lifespan) * 100)}%`;
  threatFill.style.background = "var(--alert)";
  void threatFill.offsetWidth;
  threatFill.style.transition = `width ${Math.max(0, soonest.remaining)}ms linear`;
  threatFill.style.width = "0%";
}

/* =========================================================
   LOG
   ========================================================= */
function addLog(message, type = "normal"){
  const entry = document.createElement("div");
  entry.className = "log-entry new";
  if (type === "good") entry.classList.add("sys-good");
  if (type === "alert") entry.classList.add("sys-alert");
  if (type === "gold") entry.classList.add("sys-gold");
  entry.textContent = `[${getLogTime()}] ${message}`;
  logFeed.prepend(entry);
  while (logFeed.children.length > 12) logFeed.lastElementChild.remove();
}

function getLogTime(){
  const now = new Date();
  return [now.getHours(), now.getMinutes(), now.getSeconds()].map(n => String(n).padStart(2,"0")).join(":");
}

/* =========================================================
   THREAT FX (shake / vignette / manipulation)
   ========================================================= */
function triggerThreat(){
  app.classList.remove("shake");
  void app.offsetWidth;
  app.classList.add("shake");
  threatVignette.style.boxShadow = "inset 0 0 150px rgba(255,0,0,0.75)";
  setTimeout(() => { threatVignette.style.boxShadow = ""; }, 700);
  if (navigator.vibrate) navigator.vibrate(80);
}

function triggerManipulation(){
  const line = manipOverlay.querySelector(".line");
  line.textContent = MANIP_PHRASES[Math.floor(Math.random() * MANIP_PHRASES.length)];
  manipOverlay.classList.add("show");
  setTimeout(() => manipOverlay.classList.remove("show"), 420);
}

function flashScreen(color){
  jumpscareFlash.style.background = color;
  jumpscareFlash.style.opacity = "1";
  setTimeout(() => { jumpscareFlash.style.opacity = "0"; }, 120);
}

/* =========================================================
   ACHIEVEMENTS
   ========================================================= */
function getUnlocked(){
  try { return new Set(JSON.parse(localStorage.getItem("dlaAchievements") || "[]")); }
  catch(e){ return new Set(); }
}
function saveUnlocked(set){
  localStorage.setItem("dlaAchievements", JSON.stringify([...set]));
}
function unlock(id){
  const set = getUnlocked();
  if (set.has(id)) return;
  set.add(id);
  saveUnlocked(set);
  state.unlockedThisRun.push(id);
  const def = ACHIEVEMENTS.find(a => a.id === id);
  addLog(`BADGE UNLOCKED: ${def.name}.`, "gold");
  queueToast(def);
}
function queueToast(def){
  toastQueue.push(def);
  if (!toastBusy) showNextToast();
}
function showNextToast(){
  if (toastQueue.length === 0){ toastBusy = false; return; }
  toastBusy = true;
  const def = toastQueue.shift();
  toastName.textContent = def.name;
  toastDesc.textContent = def.desc;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(showNextToast, 400);
  }, 3000);
}

/* =========================================================
   END GAME
   ========================================================= */
function endGame(reason){
  if (!state.running) return;
  state.running = false;

  clearTimeout(schedulerTimer);
  clearInterval(clockTimer);
  stopHeartbeat();
  stopAmbient();

  state.activeAnomalies.forEach(a => { clearTimeout(a.timeoutId); clearAnomalyVisual(a); });
  state.activeAnomalies = [];
  state.activeDecoys.forEach(d => { clearTimeout(d.timeoutId); clearDecoyVisual(d); });
  state.activeDecoys = [];

  const won = reason === "DAWN";

  const progressPct = Math.min(100, Math.round((state.gameSeconds / TOTAL_DURATION) * 100));

  if (won){
    unlock("dawn");
    if (state.difficulty === "nightmare") unlock("unblinking");
    if (state.difficulty === "no_sleep") unlock("no_sleep");
    bumpStat("dlaShiftsSurvived");
  }

  if (reason === "STABILITY COLLAPSED"){
    endTitle.textContent = "CONNECTION LOST";
    endTitle.classList.add("danger");
    endText.textContent = "You stopped watching.";
    tauntText.textContent = pickTaunt(progressPct);
    tauntText.classList.remove("hidden");
    triggerJumpscare();
  } else {
    endTitle.textContent = "SHIFT COMPLETE";
    endTitle.classList.remove("danger");
    endText.textContent = "Sunrise. You survived the night.";
    tauntText.classList.add("hidden");
  }

  const accuracy = (state.anomaliesFound + state.anomaliesMissed) > 0
    ? Math.round((state.anomaliesFound / (state.anomaliesFound + state.anomaliesMissed)) * 100)
    : 100;
  const played = getStat("dlaShiftsPlayed"), survived = getStat("dlaShiftsSurvived");

  attemptLine.textContent = `ATTEMPT #${played} · NIGHT PROGRESS: ${progressPct}%`;

  endStats.innerHTML = `
    SCORE: <strong>${state.score.toLocaleString()}</strong><br>
    ANOMALIES FOUND: <strong>${state.anomaliesFound}</strong><br>
    ANOMALIES MISSED: <strong>${state.anomaliesMissed}</strong><br>
    ACCURACY: <strong>${accuracy}%</strong><br>
    FINAL STABILITY: <strong>${Math.round(state.stability)}%</strong><br>
    SHIFTS SURVIVED: <strong>${survived} / ${played}</strong>
  `;

  endBadges.innerHTML = "";
  state.unlockedThisRun.forEach(id => {
    const def = ACHIEVEMENTS.find(a => a.id === id);
    const chip = document.createElement("span");
    chip.className = "badge-chip";
    chip.textContent = def.name;
    chip.title = def.desc;
    endBadges.appendChild(chip);
  });

  saveBestScore();

  setTimeout(() => { endScreen.classList.remove("hidden"); }, won ? 200 : 700);
}

function triggerJumpscare(){
  flashScreen("#ffffff");
  setTimeout(() => {
    bigScare.classList.add("show");
    playScareSound();
    setTimeout(() => bigScare.classList.remove("show"), 600);
  }, 100);
}

/* =========================================================
   RESTART
   ========================================================= */
restartBtn.addEventListener("click", () => {
  endScreen.classList.add("hidden");
  startScreen.classList.remove("hidden");
  refreshMetaUI();
});

/* =========================================================
   PERSISTENCE: best score, run stats, badges UI
   ========================================================= */
function getStat(key){ return Number(localStorage.getItem(key)) || 0; }
function bumpStat(key){ localStorage.setItem(key, getStat(key) + 1); }

function saveBestScore(){
  const best = getStat("dlaBest");
  if (state.score > best){
    localStorage.setItem("dlaBest", state.score);
    bestLine.textContent = `NEW BEST: ${state.score.toLocaleString()}`;
  }
}

function refreshMetaUI(){
  const best = getStat("dlaBest");
  const played = getStat("dlaShiftsPlayed");
  bestLine.textContent = best > 0
    ? `BEST SCORE: ${best.toLocaleString()}${played ? ` · ${played} SHIFT${played === 1 ? "" : "S"} WORKED` : ""}`
    : "NO PREVIOUS SHIFT RECORDED.";

  const unlocked = getUnlocked();
  badgeRow.innerHTML = "";
  ACHIEVEMENTS.forEach(def => {
    const chip = document.createElement("span");
    chip.className = "badge-chip" + (unlocked.has(def.id) ? " unlocked" : "");
    chip.textContent = unlocked.has(def.id) ? def.name : "???";
    chip.title = unlocked.has(def.id) ? def.desc : "Locked";
    badgeRow.appendChild(chip);
  });
}

/* =========================================================
   PAUSE
   ========================================================= */
function pauseGame(){
  if (!state || !state.running || state.paused) return;
  state.paused = true;
  state.pauseStartedAt = Date.now();
  pauseOverlay.classList.add("show");
  stopHeartbeat();
  suspendAmbient();
  state.activeAnomalies.forEach(a => {
    clearTimeout(a.timeoutId);
    a.remaining = a.lifespan - (Date.now() - a.spawnTime);
  });
  state.activeDecoys.forEach(d => {
    clearTimeout(d.timeoutId);
    d.remaining = d.duration - (Date.now() - d.spawnTime);
  });
  clearTimeout(schedulerTimer);
  addLog("OPERATOR STEPPED AWAY.", "alert");
}

function resumeGame(){
  if (!state || !state.running || !state.paused) return;
  state.paused = false;

  const pausedDuration = Date.now() - state.pauseStartedAt;
  state.lastPresenceWatch += pausedDuration; // pause time shouldn't count as neglect

  pauseOverlay.classList.remove("show");
  state.activeAnomalies.forEach(a => {
    a.spawnTime = Date.now() - (a.lifespan - a.remaining);
    a.timeoutId = setTimeout(() => handleMiss(a), a.remaining);
  });
  state.activeDecoys.forEach(d => {
    d.timeoutId = setTimeout(() => clearDecoy(d), Math.max(50, d.remaining));
  });
  refreshThreatMeter();
  scheduleLoop();
  startHeartbeat();
  resumeAmbient();
  addLog("OPERATOR RETURNED TO DESK.", "good");
}

pauseBtn.addEventListener("click", () => { state.paused ? resumeGame() : pauseGame(); });
resumeBtn.addEventListener("click", resumeGame);

document.addEventListener("visibilitychange", () => {
  if (document.hidden && state && state.running && !state.paused) pauseGame();
});

/* =========================================================
   CRT STATIC
   ========================================================= */
function setupCanvas(){
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
}
function resizeCanvas(){
  const dpr = window.devicePixelRatio || 1;
  staticCanvas.width = window.innerWidth * dpr;
  staticCanvas.height = window.innerHeight * dpr;
  staticCanvas.style.width = `${window.innerWidth}px`;
  staticCanvas.style.height = `${window.innerHeight}px`;
  staticCtx.setTransform(dpr,0,0,dpr,0,0);
}
function startStatic(){
  let frame;
  function draw(){
    if (!state.running){ staticCtx.clearRect(0,0,window.innerWidth,window.innerHeight); return; }
    const w = window.innerWidth, h = window.innerHeight;
    const image = staticCtx.createImageData(w,h);
    const data = image.data;
    const noiseAmount = state.stability < 40 ? 0.06 : 0.035;
    for (let i=0;i<data.length;i+=4){
      const v = Math.random()*255;
      data[i]=v; data[i+1]=v; data[i+2]=v;
      data[i+3] = Math.random() < noiseAmount ? 50 : 0;
    }
    staticCtx.putImageData(image,0,0);
    frame = requestAnimationFrame(draw);
  }
  cancelAnimationFrame(frame);
  draw();
}

/* =========================================================
   AUDIO
   ========================================================= */
let audioContext = null, audioStarted = false;
function initAudio(){
  if (audioStarted) return;
  try{
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioStarted = true;
  } catch(e){ console.warn("Audio unavailable."); }
}
function createTone(freq, duration, volume=0.04, type="sine"){
  if (!audioContext) return;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = type; osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  osc.connect(gain); gain.connect(audioContext.destination);
  osc.start(); osc.stop(audioContext.currentTime + duration);
}
function playClick(){ initAudio(); createTone(600,.035,.025,"square"); }
function playStartSound(){ initAudio(); createTone(220,.12,.035,"sine"); setTimeout(()=>createTone(440,.15,.025,"sine"),100); }
function playSuccessSound(){ initAudio(); createTone(520,.08,.035,"square"); setTimeout(()=>createTone(780,.1,.025,"square"),80); }
function playAnomalySound(){ initAudio(); createTone(70,.25,.04,"sawtooth"); setTimeout(()=>createTone(45,.35,.03,"sawtooth"),120); }
function playScareSound(){ initAudio(); createTone(80,.7,.09,"sawtooth"); setTimeout(()=>createTone(35,.9,.08,"square"),100); }
function playDecoySound(){ initAudio(); createTone(900,.05,.015,"triangle"); }
function playFalseAlarmSound(){ initAudio(); createTone(140,.18,.05,"square"); setTimeout(()=>createTone(90,.2,.04,"square"),90); }
function playManifestSound(){ initAudio(); createTone(50,.9,.11,"sawtooth"); setTimeout(()=>createTone(30,1.1,.09,"square"),150); setTimeout(()=>createTone(65,.4,.05,"sawtooth"),300); }

/* low ambient drone while a shift is active */
function startAmbient(){
  initAudio();
  if (!audioContext) return;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = "sine"; osc.frequency.value = 48;
  gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gain.gain.linearRampToValueAtTime(0.015, audioContext.currentTime + 2);
  osc.connect(gain); gain.connect(audioContext.destination);
  osc.start();
  ambientNodes = { osc, gain };
}
function suspendAmbient(){
  if (ambientNodes) ambientNodes.gain.gain.linearRampToValueAtTime(0.0001, audioContext.currentTime + 0.4);
}
function resumeAmbient(){
  if (ambientNodes) ambientNodes.gain.gain.linearRampToValueAtTime(0.015, audioContext.currentTime + 0.6);
}
function stopAmbient(){
  if (ambientNodes){
    try{
      ambientNodes.gain.gain.linearRampToValueAtTime(0.0001, audioContext.currentTime + 0.5);
      ambientNodes.osc.stop(audioContext.currentTime + 0.6);
    } catch(e){}
    ambientNodes = null;
  }
}

/* heartbeat intensifies as stability drops — re-evaluates its own rate on every beat */
function startHeartbeat(){
  stopHeartbeat();
  function beat(){
    if (!state.running) return;
    const delay = state.stability <= 15 ? 750 : 1200;
    heartbeatTimer = setTimeout(() => {
      if (state.running && !state.paused && state.stability <= 35){
        initAudio();
        createTone(55,.08,.025,"sine");
        setTimeout(() => createTone(45,.08,.02,"sine"), state.stability <= 15 ? 95 : 130);
      }
      beat();
    }, delay);
  }
  beat();
}
function stopHeartbeat(){ clearTimeout(heartbeatTimer); heartbeatTimer = null; }

/* =========================================================
   KEYBOARD / MOUSE
   ========================================================= */
document.addEventListener("keydown", event => {
  if (!state || !state.running) return;
  if (["1","2","3","4"].includes(event.key)) watchCamera(Number(event.key));
  if (event.key.toLowerCase() === "p") { state.paused ? resumeGame() : pauseGame(); }
});

document.addEventListener("mousemove", event => {
  const x = (event.clientX / window.innerWidth) * 100;
  const y = (event.clientY / window.innerHeight) * 100;
  flashlight.style.setProperty("--mx", `${x}%`);
  flashlight.style.setProperty("--my", `${y}%`);
});

/* =========================================================
   CLEANUP
   ========================================================= */
window.addEventListener("beforeunload", () => {
  clearTimeout(schedulerTimer);
  clearInterval(clockTimer);
  stopHeartbeat();
});