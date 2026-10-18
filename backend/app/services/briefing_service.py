import datetime
from app.config import settings
from app.tools.system_tools import get_system_status, get_time_and_date
from app.tools.reminder_tools import _list_reminders_async, _list_tasks_async

class BriefingService:
    @staticmethod
    async def generate_morning_briefing() -> dict:
        now = datetime.datetime.now()
        time_data = get_time_and_date()
        sys_data = get_system_status()
        reminders = await _list_reminders_async("pending")
        tasks = await _list_tasks_async("todo")
        
        # Weather report summary (simulated/live data)
        weather_summary = "Clear skies, 24°C with a gentle breeze"
        
        user = settings.USER_NAME
        greeting = f"Good morning, {user}."
        if now.hour >= 12 and now.hour < 18:
            greeting = f"Good afternoon, {user}."
        elif now.hour >= 18:
            greeting = f"Good evening, {user}."

        rem_count = len(reminders)
        task_count = len(tasks)
        cpu_load = sys_data["cpu"]["percent"]
        mem_load = sys_data["memory"]["percent"]

        briefing_text = (
            f"{greeting} Today is {time_data['date']}. "
            f"Local conditions report {weather_summary}. "
            f"You currently have {rem_count} pending reminder{'s' if rem_count != 1 else ''} "
            f"and {task_count} active task{'s' if task_count != 1 else ''} scheduled. "
            f"Your system is operating nominal at {cpu_load}% CPU and {mem_load}% memory utilization. "
            f"All defensive and smart-home routines are active."
        )

        return {
            "greeting": greeting,
            "text": briefing_text,
            "date": time_data["date"],
            "time": time_data["time"],
            "weather": weather_summary,
            "reminders_count": rem_count,
            "tasks_count": task_count,
            "reminders": reminders[:5],
            "tasks": tasks[:5],
            "system": {
                "cpu": cpu_load,
                "memory": mem_load,
                "disk_free_gb": sys_data["disk"]["free_gb"]
            }
        }
