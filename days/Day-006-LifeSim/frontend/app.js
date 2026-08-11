/* app.js — entry point. */

document.addEventListener("DOMContentLoaded", () => {
  const statusEl = document.getElementById("connectionStatus");
  const hudEl = document.getElementById("canvasHud");

  const statGeneration = document.getElementById("statGeneration");
  const statPopulation = document.getElementById("statPopulation");
  const statFood = document.getElementById("statFood");
  const statBirths = document.getElementById("statBirths");
  const statDeaths = document.getElementById("statDeaths");
  const statMutations = document.getElementById("statMutations");
  const statTickRate = document.getElementById("statTickRate");

  Controls.init();
  Charts.init();
  Inspector.init(document.getElementById("inspector"));

  WorldCanvas.init(document.getElementById("worldCanvas"), (creatureId) => {
    LifeSimSocket.send({ type: "get_creature", id: creatureId });
  });

  LifeSimSocket.on("statuschange", (state) => {
    statusEl.dataset.state = state;
  });

  LifeSimSocket.on("tick", (msg) => {
    WorldCanvas.render(msg);
    Controls.syncState(msg.running, msg.speed);
    Charts.update(msg.history, msg.stats);

    const s = msg.stats;
    hudEl.textContent = `GEN ${s.max_generation} · POP ${s.population} · TICK ${s.tick.toLocaleString()}`;

    statGeneration.textContent = s.max_generation;
    statPopulation.textContent = s.population;
    statFood.textContent = s.food;
    statBirths.textContent = s.births_total.toLocaleString();
    statDeaths.textContent = s.deaths_total.toLocaleString();
    statMutations.textContent = s.mutations_total.toLocaleString();
    statTickRate.textContent = `${s.ticks_per_sec_actual.toLocaleString()} ticks/sec (${msg.speed}×)`;
  });

  LifeSimSocket.on("creature_detail", (msg) => Inspector.show(msg));

  LifeSimSocket.connect();
});
