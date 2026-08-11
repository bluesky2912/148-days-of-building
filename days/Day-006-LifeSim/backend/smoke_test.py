"""smoke_test.py — quick manual check that a running server speaks the
protocol correctly: connects, reads a broadcast frame, exercises
set_speed/get_creature/pause/reset, and prints what came back.

Usage: start the server (python3 app.py) in one terminal, then run this in
another: python3 smoke_test.py
"""

import asyncio
import json
import websockets


async def main():
    async with websockets.connect("ws://localhost:8765") as ws:
        msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=3))
        print("type:", msg["type"], "running:", msg["running"], "speed:", msg["speed"])
        print("num creatures:", len(msg["creatures"]), "num food:", len(msg["food"]))
        print("sample creature:", msg["creatures"][0])
        print("stats:", msg["stats"])

        msg2 = json.loads(await asyncio.wait_for(ws.recv(), timeout=3))
        print("second frame tick:", msg2["stats"]["tick"], "vs first tick:", msg["stats"]["tick"])

        await ws.send(json.dumps({"type": "set_speed", "value": 50}))
        cid = msg["creatures"][0]["id"]
        await ws.send(json.dumps({"type": "get_creature", "id": cid}))

        got_detail = False
        for _ in range(6):
            m = json.loads(await asyncio.wait_for(ws.recv(), timeout=3))
            if m.get("type") == "creature_detail":
                print("creature_detail:", m)
                got_detail = True
                break
            else:
                print(
                    "broadcast frame, speed now:", m["speed"],
                    "ticks/sec actual:", m["stats"]["ticks_per_sec_actual"],
                )
        print("got_detail:", got_detail)

        await ws.send(json.dumps({"type": "pause"}))
        await asyncio.sleep(0.3)
        m = json.loads(await asyncio.wait_for(ws.recv(), timeout=3))
        print("after pause, running:", m["running"])

        await ws.send(json.dumps({"type": "reset"}))
        await asyncio.sleep(0.3)
        m = json.loads(await asyncio.wait_for(ws.recv(), timeout=3))
        print("after reset, tick:", m["stats"]["tick"], "population:", m["stats"]["population"])


asyncio.run(main())
