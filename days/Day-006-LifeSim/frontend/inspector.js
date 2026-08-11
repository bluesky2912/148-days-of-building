/* inspector.js — renders the detail payload the server sends only on
 * request (see the spec's "don't send the whole world every frame" rule).
 * Styled as a specimen placard rather than a generic modal. */

const Inspector = (() => {
  let root = null;

  function init(rootEl) {
    root = rootEl;
  }

  function show(msg) {
    if (!root) return;
    if (!msg.data) {
      hide();
      return;
    }
    const d = msg.data;
    const parents = d.parents || [null, null];
    const lineage = parents[0] == null
      ? "founder — no recorded parents"
      : `Parents: #${parents[0]}${parents[1] != null ? " & #" + parents[1] : ""}`;

    root.innerHTML = `
      <div class="placard">
        <button class="placard-close" id="inspectorClose" aria-label="Close specimen card" type="button">×</button>
        <div class="placard-eyebrow">Specimen No. ${d.id}</div>
        <div class="placard-title">Generation ${d.generation}</div>
        <div class="placard-state">State: ${d.state} · Age ${d.age} ticks</div>
        <dl class="placard-stats">
          <div><dt>Health</dt><dd>${d.health}</dd></div>
          <div><dt>Energy</dt><dd>${d.energy} / ${d.max_energy}</dd></div>
          <div><dt>Speed</dt><dd>${d.speed}</dd></div>
          <div><dt>Vision</dt><dd>${d.vision}</dd></div>
          <div><dt>Size</dt><dd>${d.size}</dd></div>
          <div><dt>Metabolism</dt><dd>${d.metabolism}</dd></div>
          <div><dt>Lifespan</dt><dd>${d.lifespan} ticks</dd></div>
          <div><dt>Offspring</dt><dd>${d.children}</dd></div>
        </dl>
        <div class="placard-lineage">${lineage}</div>
      </div>
    `;
    root.hidden = false;
    document.getElementById("inspectorClose").addEventListener("click", hide);
  }

  function hide() {
    if (!root) return;
    root.hidden = true;
    root.innerHTML = "";
  }

  return { init, show, hide };
})();
