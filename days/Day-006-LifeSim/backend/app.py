"""
app.py — LifeSim WebSocket server.

Deliberately NOT Flask-REST-per-frame (see the spec's own reasoning: HTTP +
JSON serialization overhead every tick is wasteful). One persistent
WebSocket per client, a broadcast loop paced to config.BROADCAST_HZ, and
detailed per-creature data only sent on request when a creature is clicked.
"""

from __future__ import annotations

import asyncio
import json
import time

import websockets
from websockets.exceptions import ConnectionClosed

import config
from simulation import Simulation

sim = Simulation()
CLIENTS: set = set()


async def handler(websocket):
    CLIENTS.add(websocket)
    print(f"[+] client connected ({len(CLIENTS)} total)")
    try:
        # Send an immediate snapshot so a new client isn't staring at a blank
        # canvas until the next scheduled broadcast frame.
        await websocket.send(json.dumps(sim.snapshot_for_broadcast()))
        async for raw in websocket:
            await handle_message(websocket, raw)
    except ConnectionClosed:
        pass
    finally:
        CLIENTS.discard(websocket)
        print(f"[-] client disconnected ({len(CLIENTS)} total)")


async def handle_message(websocket, raw: str) -> None:
    try:
        msg = json.loads(raw)
    except json.JSONDecodeError:
        return

    mtype = msg.get("type")
    if mtype == "start":
        sim.start()
    elif mtype == "pause":
        sim.pause()
    elif mtype == "reset":
        sim.reset()
    elif mtype == "set_speed":
        sim.set_speed(msg.get("value", 1))
    elif mtype == "get_creature":
        cid = msg.get("id")
        detail = sim.get_creature_detail(cid)
        await websocket.send(json.dumps({"type": "creature_detail", "id": cid, "data": detail}))


async def safe_send(ws, payload: str) -> None:
    try:
        await ws.send(payload)
    except ConnectionClosed:
        CLIENTS.discard(ws)


async def broadcast_loop() -> None:
    frame_interval = 1.0 / config.BROADCAST_HZ
    while True:
        frame_start = time.perf_counter()
        ticks_run, elapsed = sim.advance_frame()

        if CLIENTS:
            payload = json.dumps(sim.snapshot_for_broadcast(ticks_run, elapsed))
            await asyncio.gather(*(safe_send(ws, payload) for ws in list(CLIENTS)))

        sleep_time = frame_interval - (time.perf_counter() - frame_start)
        if sleep_time > 0:
            await asyncio.sleep(sleep_time)
        else:
            await asyncio.sleep(0)  # yield control even if we're running behind


async def main() -> None:
    async with websockets.serve(handler, config.WS_HOST, config.WS_PORT, max_size=2**22):
        print(f"LifeSim server listening on ws://{config.WS_HOST}:{config.WS_PORT}")
        await broadcast_loop()


if __name__ == "__main__":
    asyncio.run(main())
