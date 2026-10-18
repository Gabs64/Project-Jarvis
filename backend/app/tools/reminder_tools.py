import datetime
import asyncio
from typing import Optional
from sqlalchemy import select, update, delete
from app.database.session import async_session_factory
from app.database.models import Reminder, Task

async def _create_reminder_async(title: str, scheduled_time_str: str, description: str = "") -> dict:
    # Try parsing time
    dt = None
    formats = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M",
        "%H:%M",
        "%I:%M %p"
    ]
    for fmt in formats:
        try:
            parsed = datetime.datetime.strptime(scheduled_time_str, fmt)
            if fmt in ("%H:%M", "%I:%M %p"):
                today = datetime.date.today()
                dt = datetime.datetime.combine(today, parsed.time())
                # If time already passed today, assume tomorrow
                if dt < datetime.datetime.now():
                    dt += datetime.timedelta(days=1)
            else:
                dt = parsed
            break
        except ValueError:
            continue
            
    if not dt:
        # Default to 1 hour from now if ambiguous
        dt = datetime.datetime.now() + datetime.timedelta(hours=1)
        
    async with async_session_factory() as session:
        rem = Reminder(title=title, description=description, scheduled_time=dt, status="pending")
        session.add(rem)
        await session.commit()
        await session.refresh(rem)
        return {
            "success": True,
            "id": rem.id,
            "title": rem.title,
            "scheduled_time": rem.scheduled_time.strftime("%Y-%m-%d %I:%M %p"),
            "status": rem.status
        }

async def _list_reminders_async(status: str = "pending") -> list:
    async with async_session_factory() as session:
        stmt = select(Reminder)
        if status != "all":
            stmt = stmt.where(Reminder.status == status)
        stmt = stmt.order_by(Reminder.scheduled_time.asc())
        result = await session.execute(stmt)
        items = result.scalars().all()
        return [{
            "id": r.id,
            "title": r.title,
            "description": r.description,
            "scheduled_time": r.scheduled_time.strftime("%Y-%m-%d %I:%M %p"),
            "status": r.status
        } for r in items]

async def _create_task_async(title: str, priority: str = "normal", due_date: str = None) -> dict:
    async with async_session_factory() as session:
        t = Task(title=title, priority=priority, status="todo")
        session.add(t)
        await session.commit()
        await session.refresh(t)
        return {
            "success": True,
            "id": t.id,
            "title": t.title,
            "priority": t.priority,
            "status": t.status
        }

async def _list_tasks_async(status: str = "todo") -> list:
    async with async_session_factory() as session:
        stmt = select(Task)
        if status != "all":
            stmt = stmt.where(Task.status == status)
        result = await session.execute(stmt)
        items = result.scalars().all()
        return [{
            "id": t.id,
            "title": t.title,
            "priority": t.priority,
            "status": t.status
        } for t in items]

def create_reminder(title: str, time: str, description: str = "") -> dict:
    """Schedules a new reminder at the specified time."""
    import concurrent.futures
    with concurrent.futures.ThreadPoolExecutor() as executor:
        return executor.submit(lambda: asyncio.run(_create_reminder_async(title, time, description))).result()

def list_reminders(status: str = "pending") -> dict:
    """Lists scheduled reminders."""
    import concurrent.futures
    with concurrent.futures.ThreadPoolExecutor() as executor:
        rems = executor.submit(lambda: asyncio.run(_list_reminders_async(status))).result()
    return {"reminders": rems, "count": len(rems)}

def create_task(title: str, priority: str = "normal") -> dict:
    """Creates a to-do task item."""
    import concurrent.futures
    with concurrent.futures.ThreadPoolExecutor() as executor:
        return executor.submit(lambda: asyncio.run(_create_task_async(title, priority))).result()

def list_tasks(status: str = "todo") -> dict:
    """Lists current to-do tasks."""
    import concurrent.futures
    with concurrent.futures.ThreadPoolExecutor() as executor:
        tasks = executor.submit(lambda: asyncio.run(_list_tasks_async(status))).result()
    return {"tasks": tasks, "count": len(tasks)}
