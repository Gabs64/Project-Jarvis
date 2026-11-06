import time
import json
import inspect
from typing import Dict, Any, Callable, List, Optional
from app.security.permissions import get_tool_risk, requires_confirmation, format_confirmation_prompt
from app.database.session import async_session_factory
from app.database.models import ToolLog

# Tool imports
from app.tools.system_tools import (
    get_system_status, get_time_and_date, take_screenshot,
    lock_screen, volume_control, system_power
)
from app.tools.app_tools import (
    open_application, close_application, list_running_applications, media_control
)
from app.tools.file_tools import (
    list_directory, search_files, read_file, create_file,
    create_folder, delete_file, delete_folder
)
from app.tools.web_tools import (
    search_web, open_url
)
from app.tools.memory_tools import (
    store_memory, retrieve_memory, forget_memory
)
from app.tools.reminder_tools import (
    create_reminder, list_reminders, create_task, list_tasks
)
from app.tools.smarthome_tools import (
    list_devices, control_device
)

class ToolDefinition:
    def __init__(
        self,
        name: str,
        description: str,
        func: Callable,
        parameters: Dict[str, Any]
    ):
        self.name = name
        self.description = description
        self.func = func
        self.parameters = parameters
        self.risk_level = get_tool_risk(name)

    def to_openai_schema(self) -> dict:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters
            }
        }

class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, ToolDefinition] = {}
        self._register_all_tools()

    def register(self, name: str, description: str, func: Callable, parameters: dict):
        self._tools[name] = ToolDefinition(name, description, func, parameters)

    def get_tool(self, name: str) -> Optional[ToolDefinition]:
        return self._tools.get(name)

    def get_all_schemas(self) -> List[dict]:
        return [tool.to_openai_schema() for tool in self._tools.values()]

    async def execute_tool(
        self,
        name: str,
        arguments: Dict[str, Any],
        user_confirmed: bool = False,
        user_command: str = None
    ) -> dict:
        start_time = time.time()
        tool = self.get_tool(name)
        
        if not tool:
            return {
                "success": False,
                "error": f"Tool '{name}' is not recognized.",
                "requires_confirmation": False
            }

        # Check safety & confirmation requirements
        if requires_confirmation(name, arguments) and not user_confirmed:
            prompt_text = format_confirmation_prompt(name, arguments)
            return {
                "success": False,
                "requires_confirmation": True,
                "confirmation_prompt": prompt_text,
                "tool": name,
                "arguments": arguments,
                "risk_level": tool.risk_level.value
            }

        status = "SUCCESS"
        result_data = None
        error_msg = None

        try:
            # Unpack nested parameter wrappers (e.g. from local LLMs)
            unpacked_args = dict(arguments) if isinstance(arguments, dict) else {}
            if "parameters" in unpacked_args and isinstance(unpacked_args["parameters"], dict):
                unpacked_args = unpacked_args["parameters"]
            elif "arguments" in unpacked_args and isinstance(unpacked_args["arguments"], dict):
                unpacked_args = unpacked_args["arguments"]

            # Execute Python function with validated kwargs
            sig = inspect.signature(tool.func)
            valid_args = {k: v for k, v in unpacked_args.items() if k in sig.parameters}
            
            if inspect.iscoroutinefunction(tool.func):
                result_data = await tool.func(**valid_args)
            else:
                result_data = tool.func(**valid_args)
        except Exception as e:
            status = "ERROR"
            error_msg = str(e)
            result_data = {"success": False, "error": error_msg}

        elapsed = round(time.time() - start_time, 3)

        # Record in database tool logs asynchronously
        try:
            async with async_session_factory() as session:
                log_entry = ToolLog(
                    user_command=user_command,
                    tool=name,
                    arguments=arguments,
                    result=json.dumps(result_data)[:2000] if result_data else error_msg,
                    status=status,
                    execution_time=elapsed
                )
                session.add(log_entry)
                await session.commit()
        except Exception:
            pass

        # Broadcast real-time execution event to connected HUD console
        try:
            from app.api.websocket import manager
            import datetime
            asyncio.create_task(manager.broadcast({
                "event": "tool.complete",
                "data": {
                    "tool": name,
                    "arguments": arguments,
                    "result": result_data,
                    "status": status,
                    "execution_time": elapsed,
                    "user_command": user_command,
                    "timestamp": datetime.datetime.now().strftime("%H:%M:%S")
                }
            }))
        except Exception:
            pass

        return {
            "success": status == "SUCCESS",
            "tool": name,
            "result": result_data,
            "execution_time_seconds": elapsed,
            "risk_level": tool.risk_level.value
        }

    def _register_all_tools(self):
        # 1. System Tools
        self.register(
            "get_system_status",
            "Retrieves live computer metrics including CPU percentage, RAM usage, available disk storage, and battery level.",
            get_system_status,
            {"type": "object", "properties": {}, "required": []}
        )
        self.register(
            "get_time_and_date",
            "Gets the current system time, day of the week, and date.",
            get_time_and_date,
            {"type": "object", "properties": {}, "required": []}
        )
        self.register(
            "take_screenshot",
            "Captures a screenshot of the user's desktop display and returns the image reference.",
            take_screenshot,
            {"type": "object", "properties": {}, "required": []}
        )
        self.register(
            "lock_screen",
            "Locks the user's computer workstation session.",
            lock_screen,
            {"type": "object", "properties": {}, "required": []}
        )
        self.register(
            "volume_control",
            "Adjusts or mutes the system audio volume. Options: up, down, mute.",
            volume_control,
            {
                "type": "object",
                "properties": {
                    "action": {"type": "string", "enum": ["up", "down", "mute"]}
                },
                "required": ["action"]
            }
        )
        self.register(
            "system_shutdown",
            "Shuts down the user's computer (High risk: requires confirmation).",
            lambda: system_power("shutdown"),
            {"type": "object", "properties": {}, "required": []}
        )
        self.register(
            "system_restart",
            "Restarts the user's computer (High risk: requires confirmation).",
            lambda: system_power("restart"),
            {"type": "object", "properties": {}, "required": []}
        )

        # 2. Application & Media Tools
        self.register(
            "open_application",
            "Launches an application installed on the computer (e.g. Chrome, Spotify, Discord, VS Code, Notepad, Calculator, Terminal).",
            open_application,
            {
                "type": "object",
                "properties": {
                    "application": {"type": "string", "description": "The name or executable of the application to open."}
                },
                "required": ["application"]
            }
        )
        self.register(
            "close_application",
            "Terminates an open application by name.",
            close_application,
            {
                "type": "object",
                "properties": {
                    "application": {"type": "string", "description": "The application process to close."}
                },
                "required": ["application"]
            }
        )
        self.register(
            "list_running_applications",
            "Returns a list of currently active applications and processes with their memory usage.",
            list_running_applications,
            {"type": "object", "properties": {}, "required": []}
        )
        self.register(
            "media_control",
            "Controls media playback: play, pause, next, previous.",
            media_control,
            {
                "type": "object",
                "properties": {
                    "action": {"type": "string", "enum": ["play", "pause", "play_pause", "next", "previous", "stop"]}
                },
                "required": ["action"]
            }
        )

        # 3. File System Tools
        self.register(
            "list_directory",
            "Lists all files and subdirectories inside a directory path.",
            list_directory,
            {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Folder path to list (defaults to current project)."}
                }
            }
        )
        self.register(
            "search_files",
            "Searches for files matching a keyword name or pattern.",
            search_files,
            {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Filename keyword to find."},
                    "root_dir": {"type": "string", "description": "Root folder to search within."}
                },
                "required": ["query"]
            }
        )
        self.register(
            "read_file",
            "Reads and previews text content from a file.",
            read_file,
            {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Path of the file to inspect."}
                },
                "required": ["path"]
            }
        )
        self.register(
            "create_folder",
            "Creates a new directory folder.",
            create_folder,
            {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Path or folder name to create."}
                },
                "required": ["path"]
            }
        )
        self.register(
            "create_file",
            "Creates a new text file with provided contents.",
            create_file,
            {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Path to create file at."},
                    "content": {"type": "string", "description": "Content of the file."}
                },
                "required": ["path"]
            }
        )
        self.register(
            "delete_file",
            "Permanently deletes a file (Requires confirmation).",
            delete_file,
            {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Path of file to delete."}
                },
                "required": ["path"]
            }
        )

        # 4. Web Tools
        self.register(
            "search_web",
            "Searches the web for latest news, facts, technical articles, or documentation.",
            search_web,
            {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query terms."}
                },
                "required": ["query"]
            }
        )
        self.register(
            "open_url",
            "Opens a website URL in the user's browser.",
            open_url,
            {
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "URL link to open."}
                },
                "required": ["url"]
            }
        )

        # 5. Memory Tools
        self.register(
            "store_memory",
            "Remembers a user preference, important project detail, favorite app, or personal fact.",
            store_memory,
            {
                "type": "object",
                "properties": {
                    "key": {"type": "string", "description": "Short memory identifier or category key."},
                    "value": {"type": "string", "description": "Detail or preference to store."},
                    "category": {"type": "string", "description": "Category (e.g. project, preference, routine)."}
                },
                "required": ["key", "value"]
            }
        )
        self.register(
            "retrieve_memory",
            "Recalls stored memories or preferences about the user.",
            retrieve_memory,
            {
                "type": "object",
                "properties": {
                    "search": {"type": "string", "description": "Keyword to look up in memory."}
                }
            }
        )
        self.register(
            "forget_memory",
            "Deletes a remembered fact or preference from JARVIS memory.",
            forget_memory,
            {
                "type": "object",
                "properties": {
                    "key": {"type": "string", "description": "Memory key to delete."}
                },
                "required": ["key"]
            }
        )

        # 6. Reminders & Productivity
        self.register(
            "create_reminder",
            "Sets a reminder for the user at a specified time.",
            create_reminder,
            {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Reminder title or task to remember."},
                    "time": {"type": "string", "description": "Scheduled time (e.g. '7 PM', '19:00', 'tomorrow 9:00 AM')."}
                },
                "required": ["title", "time"]
            }
        )
        self.register(
            "list_reminders",
            "Lists upcoming and pending reminders.",
            list_reminders,
            {"type": "object", "properties": {}}
        )
        self.register(
            "create_task",
            "Creates a to-do list task.",
            create_task,
            {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Task description."},
                    "priority": {"type": "string", "enum": ["low", "normal", "high", "urgent"]}
                },
                "required": ["title"]
            }
        )
        self.register(
            "list_tasks",
            "Lists current to-do tasks.",
            list_tasks,
            {"type": "object", "properties": {}}
        )

        # 7. Smart Home
        self.register(
            "list_devices",
            "Lists all connected smart home devices, lights, cameras, and thermostats.",
            list_devices,
            {"type": "object", "properties": {}}
        )
        self.register(
            "control_device",
            "Controls smart home devices such as lights, switches, thermostat, or cameras.",
            control_device,
            {
                "type": "object",
                "properties": {
                    "device_id": {"type": "string", "description": "Device name or identifier (e.g. 'living room lights')."},
                    "action": {"type": "string", "description": "Action (e.g. 'on', 'off', 'toggle')."},
                    "brightness": {"type": "integer", "description": "Brightness percentage (0-100)."},
                    "temperature": {"type": "number", "description": "Target temperature in Celsius."}
                },
                "required": ["device_id", "action"]
            }
        )

tool_registry = ToolRegistry()
