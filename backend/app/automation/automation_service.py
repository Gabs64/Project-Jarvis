import asyncio
from typing import List, Dict, Any
from sqlalchemy import select
from app.database.session import async_session_factory
from app.database.models import Automation
from app.tools.registry import tool_registry

DEFAULT_AUTOMATIONS = [
    {
        "name": "Morning Briefing Routine",
        "trigger": {"type": "schedule", "time": "08:00"},
        "actions": [{"tool": "get_system_status"}, {"tool": "list_reminders"}],
        "enabled": True
    },
    {
        "name": "Evening Environment Dimmer",
        "trigger": {"type": "schedule", "time": "22:00"},
        "actions": [{"tool": "control_device", "arguments": {"device_id": "living room lights", "action": "off"}}],
        "enabled": True
    },
    {
        "name": "Low Battery Alert",
        "trigger": {"type": "battery", "threshold": 20},
        "actions": [{"tool": "get_system_status"}],
        "enabled": True
    }
]

class AutomationService:
    @staticmethod
    async def seed_defaults():
        async with async_session_factory() as session:
            stmt = select(Automation)
            existing = (await session.execute(stmt)).scalars().all()
            if not existing:
                for auto in DEFAULT_AUTOMATIONS:
                    item = Automation(
                        name=auto["name"],
                        trigger=auto["trigger"],
                        actions=auto["actions"],
                        enabled=auto["enabled"]
                    )
                    session.add(item)
                await session.commit()

    @staticmethod
    async def list_automations() -> List[dict]:
        async with async_session_factory() as session:
            stmt = select(Automation)
            result = await session.execute(stmt)
            items = result.scalars().all()
            return [
                {
                    "id": a.id,
                    "name": a.name,
                    "trigger": a.trigger,
                    "actions": a.actions,
                    "enabled": a.enabled,
                    "created_at": a.created_at.isoformat() if a.created_at else None
                }
                for a in items
            ]

    @staticmethod
    async def toggle_automation(automation_id: int, enabled: bool) -> dict:
        async with async_session_factory() as session:
            stmt = select(Automation).where(Automation.id == automation_id)
            res = await session.execute(stmt)
            auto = res.scalar_one_or_none()
            if auto:
                auto.enabled = enabled
                await session.commit()
                return {"success": True, "id": automation_id, "enabled": enabled}
            return {"success": False, "error": "Automation not found"}
