/* controls.js — buttons only send intent; the server is the source of
 * truth for running/speed state, and syncState() below reconciles the UI
 * to whatever the last tick message actually reported. */

const Controls = (() => {
  let btnStart, btnPause, btnReset, speedButtons;

  function init() {
    btnStart = document.getElementById("btnStart");
    btnPause = document.getElementById("btnPause");
    btnReset = document.getElementById("btnReset");
    speedButtons = Array.from(document.querySelectorAll(".speed-btn"));

    btnStart.addEventListener("click", () => LifeSimSocket.send({ type: "start" }));
    btnPause.addEventListener("click", () => LifeSimSocket.send({ type: "pause" }));
    btnReset.addEventListener("click", () => LifeSimSocket.send({ type: "reset" }));

    speedButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        LifeSimSocket.send({ type: "set_speed", value: parseInt(btn.dataset.speed, 10) });
      });
    });
  }

  function syncState(running, speed) {
    btnStart.classList.toggle("btn-primary", !running);
    btnPause.classList.toggle("btn-primary", running);
    speedButtons.forEach((btn) => {
      btn.classList.toggle("active", parseInt(btn.dataset.speed, 10) === speed);
    });
  }

  return { init, syncState };
})();
