import asyncio
import json
from fastapi import WebSocket, WebSocketDisconnect
from app.ai.brain import jarvis_brain
from app.tools.system_tools import get_system_status

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except Exception:
                pass

manager = ConnectionManager()

async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    telemetry_task = None
    
    # Background telemetry broadcaster
    async def push_telemetry():
        while True:
            try:
                metrics = get_system_status()
                await websocket.send_text(json.dumps({
                    "event": "system.telemetry",
                    "data": metrics
                }))
                await asyncio.sleep(1.0)
            except Exception:
                break
                
    telemetry_task = asyncio.create_task(push_telemetry())

    try:
        # Welcome event
        await websocket.send_text(json.dumps({
            "event": "assistant.ready",
            "data": {"message": "JARVIS Core Online. All telemetry nominal."}
        }))

        while True:
            raw_data = await websocket.receive_text()
            payload = json.loads(raw_data)
            event_type = payload.get("event")
            data = payload.get("data", {})

            if event_type == "ping":
                await websocket.send_text(json.dumps({
                    "event": "pong",
                    "data": {"ts": data.get("ts")}
                }))

            elif event_type == "voice.start":
                # Microphone active
                await websocket.send_text(json.dumps({
                    "event": "assistant.state",
                    "data": {"state": "LISTENING"}
                }))

            elif event_type in ("voice.final", "user.message"):
                user_text = data.get("text", "")
                if not user_text.strip():
                    continue

                # Notify thinking
                await websocket.send_text(json.dumps({
                    "event": "assistant.thinking",
                    "data": {"text": user_text}
                }))

                # Brain processing
                confirmed = data.get("confirmed", False)
                pending_tool = data.get("pending_tool")
                pending_args = data.get("pending_args")

                res = await jarvis_brain.process_user_input(
                    user_text=user_text,
                    user_confirmed=confirmed,
                    pending_tool=pending_tool,
                    pending_args=pending_args
                )

                # Send tool execution info if any
                for tc in res.get("tool_calls", []):
                    await websocket.send_text(json.dumps({
                        "event": "tool.complete",
                        "data": tc
                    }))

                # Send response speech & text
                await websocket.send_text(json.dumps({
                    "event": "assistant.text",
                    "data": {
                        "text": res.get("text", ""),
                        "requires_confirmation": res.get("requires_confirmation", False),
                        "pending_tool": res.get("pending_tool"),
                        "pending_args": res.get("pending_args")
                    }
                }))

            elif event_type == "user.interrupt":
                # User interrupted speech
                await websocket.send_text(json.dumps({
                    "event": "assistant.interrupted",
                    "data": {"message": "Playback halted."}
                }))

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        if telemetry_task:
            telemetry_task.cancel()
    except Exception as e:
        manager.disconnect(websocket)
        if telemetry_task:
            telemetry_task.cancel()
