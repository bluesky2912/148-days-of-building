/* charts.js — minimal canvas sparklines, no charting library. The backend
 * already samples one point per broadcast frame and caps history length
 * (see statistics.py), so this just has to draw whatever array it's given. */

const Charts = (() => {
  const targets = {
    population: { canvas: null, valueEl: null, color: "#7FE6C4" },
    avg_speed:  { canvas: null, valueEl: null, color: "#F2B84B" },
    avg_vision: { canvas: null, valueEl: null, color: "#7FE6C4" },
    avg_size:   { canvas: null, valueEl: null, color: "#F2B84B" },
  };

  function init() {
    targets.population.canvas = document.getElementById("chartPopulation");
    targets.population.valueEl = document.getElementById("vPopulation");
    targets.avg_speed.canvas = document.getElementById("chartSpeed");
    targets.avg_speed.valueEl = document.getElementById("vSpeed");
    targets.avg_vision.canvas = document.getElementById("chartVision");
    targets.avg_vision.valueEl = document.getElementById("vVision");
    targets.avg_size.canvas = document.getElementById("chartSize");
    targets.avg_size.valueEl = document.getElementById("vSize");
  }

  function drawSparkline(canvas, data, color) {
    if (!canvas || !data || data.length < 2) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = max - min || 1;
    const pad = 4;

    ctx.beginPath();
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - pad - ((v - min) / span) * (h - pad * 2);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // soft fill under the line for a bit of depth without extra colour
    const last = data[data.length - 1];
    const lastY = h - pad - ((last - min) / span) * (h - pad * 2);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = color + "1a"; // ~10% alpha
    ctx.fill();
  }

  function update(history, stats) {
    if (!history) return;
    drawSparkline(targets.population.canvas, history.population, targets.population.color);
    drawSparkline(targets.avg_speed.canvas, history.avg_speed, targets.avg_speed.color);
    drawSparkline(targets.avg_vision.canvas, history.avg_vision, targets.avg_vision.color);
    drawSparkline(targets.avg_size.canvas, history.avg_size, targets.avg_size.color);

    if (targets.population.valueEl) targets.population.valueEl.textContent = stats.population;
    if (targets.avg_speed.valueEl) targets.avg_speed.valueEl.textContent = stats.avg_speed;
    if (targets.avg_vision.valueEl) targets.avg_vision.valueEl.textContent = stats.avg_vision;
    if (targets.avg_size.valueEl) targets.avg_size.valueEl.textContent = stats.avg_size;
  }

  return { init, update };
})();
