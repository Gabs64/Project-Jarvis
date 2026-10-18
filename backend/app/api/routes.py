import os
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.voice.fish_audio import FishAudioService
from app.voice.local_neural import LocalNeuralVoiceService

from app.config import settings
from app.ai.brain import jarvis_brain
from app.tools.registry import tool_registry
from app.memory.memory_service import MemoryService
from app.services.briefing_service import BriefingService
from app.automation.automation_service import AutomationService
from app.tools.system_tools import get_system_status
from app.tools.reminder_tools import (
    _create_reminder_async, _list_reminders_async,
    _create_task_async, _list_tasks_async
)
from app.tools.smarthome_tools import list_devices, control_device
from app.database.session import async_session_factory
from app.database.models import ToolLog, Reminder
from sqlalchemy import select, desc, delete

api_router = APIRouter(prefix="/api")

# Models
class ChatRequest(BaseModel):
    text: str
    confirmed: bool = False
    pending_tool: Optional[str] = None
    pending_args: Optional[Dict[str, Any]] = None

class ToolExecuteRequest(BaseModel):
    tool: str
    arguments: Dict[str, Any] = {}
    confirmed: bool = False

class MemoryCreateRequest(BaseModel):
    key: str
    value: str
    category: str = "general"

class ReminderCreateRequest(BaseModel):
    title: str
    time: str
    description: str = ""

class TaskCreateRequest(BaseModel):
    title: str
    priority: str = "normal"

class DeviceControlRequest(BaseModel):
    device_id: str
    action: str
    brightness: Optional[int] = None
    temperature: Optional[float] = None

# 1. Chat & AI Brain
@api_router.post("/chat")
async def chat(req: ChatRequest):
    result = await jarvis_brain.process_user_input(
        user_text=req.text,
        user_confirmed=req.confirmed,
        pending_tool=req.pending_tool,
        pending_args=req.pending_args
    )
    return result

# 2. System Status & Briefing
@api_router.get("/system/status")
async def get_system_metrics():
    return get_system_status()

@api_router.get("/system/briefing")
async def get_briefing():
    return await BriefingService.generate_morning_briefing()

@api_router.get("/system/screenshots/{filename}")
async def get_screenshot(filename: str):
    file_path = settings.SCREENSHOTS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Screenshot not found")
    return FileResponse(file_path)

# 3. Tools
@api_router.get("/tools")
async def list_tools():
    schemas = tool_registry.get_all_schemas()
    return {"tools": schemas}

@api_router.post("/tools/execute")
async def execute_tool(req: ToolExecuteRequest):
    res = await tool_registry.execute_tool(
        name=req.tool,
        arguments=req.arguments,
        user_confirmed=req.confirmed,
        user_command=f"Manual API Call: {req.tool}"
    )
    return res

# 4. Memories
@api_router.get("/memory")
async def get_memories(category: Optional[str] = None, q: Optional[str] = None):
    return await MemoryService.get_memories(category=category, search_query=q)

@api_router.post("/memory")
async def create_memory(req: MemoryCreateRequest):
    return await MemoryService.store_memory(key=req.key, value=req.value, category=req.category)

@api_router.delete("/memory/{key}")
async def delete_memory(key: str):
    return await MemoryService.forget_memory(key=key)

# 5. Reminders
@api_router.get("/reminders")
async def get_reminders(status: str = "pending"):
    return await _list_reminders_async(status=status)

@api_router.post("/reminders")
async def create_reminder_route(req: ReminderCreateRequest):
    return await _create_reminder_async(title=req.title, scheduled_time_str=req.time, description=req.description)

@api_router.delete("/reminders/{reminder_id}")
async def delete_reminder_route(reminder_id: int):
    async with async_session_factory() as session:
        stmt = delete(Reminder).where(Reminder.id == reminder_id)
        await session.execute(stmt)
        await session.commit()
    return {"success": True, "deleted_id": reminder_id}

# 6. Tasks
@api_router.get("/tasks")
async def get_tasks(status: str = "todo"):
    return await _list_tasks_async(status=status)

@api_router.post("/tasks")
async def create_task_route(req: TaskCreateRequest):
    return await _create_task_async(title=req.title, priority=req.priority)

# 7. Smart Devices
@api_router.get("/devices")
async def get_smart_devices():
    return list_devices()

@api_router.post("/devices/control")
async def control_smart_device(req: DeviceControlRequest):
    return control_device(
        device_id=req.device_id,
        action=req.action,
        brightness=req.brightness,
        temperature=req.temperature
    )

# 8. Automations
@api_router.get("/automations")
async def get_automations():
    return await AutomationService.list_automations()

@api_router.post("/automations/{automation_id}/toggle")
async def toggle_auto(automation_id: int, enabled: bool = Query(...)):
    return await AutomationService.toggle_automation(automation_id, enabled)

# 9. Logs
@api_router.get("/logs")
async def get_logs(limit: int = 50):
    async with async_session_factory() as session:
        stmt = select(ToolLog).order_by(desc(ToolLog.timestamp)).limit(limit)
        results = (await session.execute(stmt)).scalars().all()
        return [
            {
                "id": log.id,
                "timestamp": log.timestamp.strftime("%Y-%m-%d %H:%M:%S") if log.timestamp else "",
                "user_command": log.user_command,
                "tool": log.tool,
                "arguments": log.arguments,
                "result": log.result,
                "status": log.status,
                "execution_time": log.execution_time
            }
            for log in results
        ]

class AIConfigUpdate(BaseModel):
    api_key: Optional[str] = None
    model: Optional[str] = None
    provider: Optional[str] = None
    base_url: Optional[str] = None

@api_router.get("/ai/config")
async def get_ai_config():
    key = settings.AI_API_KEY
    masked = f"{key[:4]}...{key[-4:]}" if len(key) > 8 else ("***" if key else "")
    return {
        "has_api_key": bool(settings.AI_API_KEY),
        "masked_key": masked,
        "model": settings.AI_MODEL,
        "provider": settings.LLM_PROVIDER,
        "base_url": settings.AI_BASE_URL
    }

@api_router.post("/ai/config")
async def update_ai_config(req: AIConfigUpdate):
    if req.api_key is not None:
        settings.AI_API_KEY = req.api_key.strip()
    if req.model is not None:
        settings.AI_MODEL = req.model.strip()
    if req.provider is not None:
        settings.LLM_PROVIDER = req.provider.strip()
    if req.base_url is not None:
        settings.AI_BASE_URL = req.base_url.strip()

    # Persist to .env file
    try:
        env_path = settings.BASE_DIR / ".env"
        lines = []
        if env_path.exists():
            existing = env_path.read_text(encoding="utf-8").splitlines()
            keys_handled = set()
            for line in existing:
                if line.startswith("AI_API_KEY="):
                    lines.append(f"AI_API_KEY={settings.AI_API_KEY}")
                    keys_handled.add("AI_API_KEY")
                elif line.startswith("AI_MODEL="):
                    lines.append(f"AI_MODEL={settings.AI_MODEL}")
                    keys_handled.add("AI_MODEL")
                elif line.startswith("LLM_PROVIDER="):
                    lines.append(f"LLM_PROVIDER={settings.LLM_PROVIDER}")
                    keys_handled.add("LLM_PROVIDER")
                elif line.startswith("AI_BASE_URL="):
                    lines.append(f"AI_BASE_URL={settings.AI_BASE_URL}")
                    keys_handled.add("AI_BASE_URL")
                else:
                    lines.append(line)
            if "AI_API_KEY" not in keys_handled:
                lines.append(f"AI_API_KEY={settings.AI_API_KEY}")
            if "AI_MODEL" not in keys_handled:
                lines.append(f"AI_MODEL={settings.AI_MODEL}")
            if "LLM_PROVIDER" not in keys_handled:
                lines.append(f"LLM_PROVIDER={settings.LLM_PROVIDER}")
            if "AI_BASE_URL" not in keys_handled:
                lines.append(f"AI_BASE_URL={settings.AI_BASE_URL}")
        else:
            lines = [
                f"AI_API_KEY={settings.AI_API_KEY}",
                f"AI_MODEL={settings.AI_MODEL}",
                f"LLM_PROVIDER={settings.LLM_PROVIDER}",
                f"AI_BASE_URL={settings.AI_BASE_URL}",
                f"JARVIS_WAKE_WORD={settings.WAKE_WORD}"
            ]
        env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    except Exception as e:
        print(f"[JARVIS] Notice saving .env: {e}")

    return {
        "success": True,
        "message": f"AI Engine configured with model '{settings.AI_MODEL}' ({settings.LLM_PROVIDER})."
    }

# 10. Voice & Fish Audio S2.1 Pro TTS
class TTSRequest(BaseModel):
    text: str
    provider: Optional[str] = "fish_audio"
    api_key: Optional[str] = None
    voice_id: Optional[str] = None
    model: Optional[str] = "s2.1-pro-free"

class VoiceConfigUpdate(BaseModel):
    provider: Optional[str] = None
    fish_audio_api_key: Optional[str] = None
    fish_audio_voice_id: Optional[str] = None
    fish_audio_model: Optional[str] = None

@api_router.get("/voice/config")
async def get_voice_config():
    return {
        "provider": settings.VOICE_PROVIDER,
        "has_fish_key": bool(settings.FISH_AUDIO_API_KEY),
        "fish_audio_model": settings.FISH_AUDIO_MODEL,
        "fish_audio_voice_id": settings.FISH_AUDIO_VOICE_ID,
        "free_api_url": "https://fish.audio/blog/s2-1-pro-free-api/"
    }

@api_router.post("/voice/config")
async def update_voice_config(req: VoiceConfigUpdate):
    if req.provider:
        settings.VOICE_PROVIDER = req.provider
    if req.fish_audio_api_key is not None:
        settings.FISH_AUDIO_API_KEY = req.fish_audio_api_key
    if req.fish_audio_voice_id is not None:
        settings.FISH_AUDIO_VOICE_ID = req.fish_audio_voice_id
    if req.fish_audio_model is not None:
        settings.FISH_AUDIO_MODEL = req.fish_audio_model
    return {"success": True, "message": "Voice configuration updated successfully."}

@api_router.post("/voice/tts")
async def generate_tts(req: TTSRequest):
    try:
        audio_bytes = await FishAudioService.synthesize(
            text=req.text,
            api_key=req.api_key or settings.FISH_AUDIO_API_KEY,
            voice_id=req.voice_id or settings.FISH_AUDIO_VOICE_ID,
            model=req.model or settings.FISH_AUDIO_MODEL
        )
        return Response(content=audio_bytes, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class LocalTTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "en-GB-RyanNeural"
    rate: Optional[str] = "+5%"
    pitch: Optional[str] = "-4Hz"

@api_router.post("/voice/local-tts")
async def generate_local_tts(req: LocalTTSRequest):
    try:
        audio_bytes = await LocalNeuralVoiceService.synthesize(
            text=req.text,
            voice=req.voice,
            rate=req.rate or "+5%",
            pitch=req.pitch or "-4Hz"
        )
        return Response(content=audio_bytes, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/voice/local-voices")
async def get_local_voices():
    return {"voices": LocalNeuralVoiceService.get_available_voices()}


