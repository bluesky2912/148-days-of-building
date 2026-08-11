/* websocket.js — one persistent connection to the Python simulation server.
 * No REST/JSON-per-frame here on purpose (see backend/app.py) — this stays
 * open and the server pushes compact state at its own broadcast rate. */

const LifeSimSocket = (() => {
  let ws = null;
  let reconnectDelay = 1000;
  const handlers = { tick: [], creature_detail: [], statuschange: [] };

  function resolveUrl() {
    const host = location.hostname || "localhost";
    const scheme = location.protocol === "https:" ? "wss://" : "ws://";
    return `${scheme}${host}:8765`;
  }

  function connect(url) {
    const target = url || resolveUrl();
    ws = new WebSocket(target);

    ws.addEventListener("open", () => {
      reconnectDelay = 1000;
      emit("statuschange", "connected");
    });

    ws.addEventListener("close", () => {
      emit("statuschange", "disconnected");
      setTimeout(() => connect(target), reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 1.5, 8000);
    });

    ws.addEventListener("error", () => {
      try { ws.close(); } catch (e) { /* already closing */ }
    });

    ws.addEventListener("message", (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }
      if (msg.type === "tick") emit("tick", msg);
      else if (msg.type === "creature_detail") emit("creature_detail", msg);
    });
  }

  function send(obj) {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
  }

  function on(event, fn) {
    if (!handlers[event]) handlers[event] = [];
    handlers[event].push(fn);
  }

  function emit(event, payload) {
    (handlers[event] || []).forEach((fn) => fn(payload));
  }

  return { connect, send, on };
})();
