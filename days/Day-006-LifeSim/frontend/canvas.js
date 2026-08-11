/* canvas.js — draws the world every time a tick message arrives. Python
 * never decides how anything looks (see the spec) — it hands over x/y/
 * rotation/energy/size and this file makes all the drawing decisions. */

const WorldCanvas = (() => {
  const WORLD_W = 1600;
  const WORLD_H = 1000;

  let canvas, ctx;
  let scale = 1;
  let latest = null; // last tick message, kept so resize can redraw immediately
  let onCreatureClick = null;

  function init(canvasEl, clickCallback) {
    canvas = canvasEl;
    ctx = canvas.getContext("2d");
    onCreatureClick = clickCallback;

    window.addEventListener("resize", resize);
    resize();

    canvas.addEventListener("click", handleClick);
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    scale = canvas.width / WORLD_W;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(scale, scale);
    if (latest) render(latest);
  }

  // Fast creature colour, cheap to compute per-frame: cool teal at low
  // speed shading toward warm amber at high speed, so the trait spread is
  // visible at a glance without opening every specimen card.
  function speedColor(speed) {
    const t = Math.max(0, Math.min(1, (speed - 0.5) / 7.5));
    const r = Math.round(127 + t * (242 - 127));
    const g = Math.round(230 + t * (184 - 230));
    const b = Math.round(196 + t * (75 - 196));
    return `rgb(${r},${g},${b})`;
  }

  function render(msg) {
    latest = msg;
    if (!ctx) return;

    ctx.clearRect(0, 0, WORLD_W, WORLD_H);

    // food
    ctx.fillStyle = "rgba(127,230,196,0.55)";
    for (const f of msg.food) {
      ctx.beginPath();
      ctx.arc(f.x, f.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // creatures
    for (const c of msg.creatures) {
      const r = 2.2 + c.sz * 1.15;
      ctx.fillStyle = speedColor(c.spd !== undefined ? c.spd : 3);
      ctx.beginPath();
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
      ctx.fill();

      // heading tick
      ctx.strokeStyle = "rgba(6,11,9,0.55)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(c.x + Math.cos(c.rot) * (r + 3), c.y + Math.sin(c.rot) * (r + 3));
      ctx.stroke();
    }
  }

  function handleClick(ev) {
    if (!latest || !latest.creatures.length) return;
    const rect = canvas.getBoundingClientRect();
    const wx = ((ev.clientX - rect.left) / rect.width) * WORLD_W;
    const wy = ((ev.clientY - rect.top) / rect.height) * WORLD_H;

    let nearest = null;
    let nearestD2 = Infinity;
    for (const c of latest.creatures) {
      const d2 = (c.x - wx) ** 2 + (c.y - wy) ** 2;
      if (d2 < nearestD2) { nearestD2 = d2; nearest = c; }
    }
    // require a reasonably close click (18 world units) so misses don't
    // silently grab whatever's nearest across the whole map
    if (nearest && nearestD2 <= 18 * 18 && onCreatureClick) {
      onCreatureClick(nearest.id);
    }
  }

  return { init, render, resize };
})();
