from enum import Enum
from typing import Dict, Any

class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

# Default tool risk matrix
TOOL_RISK_MAP: Dict[str, RiskLevel] = {
    # System info & safe queries
    "get_system_status": RiskLevel.LOW,
    "get_time_and_date": RiskLevel.LOW,
    "get_weather": RiskLevel.LOW,
    "get_morning_briefing": RiskLevel.LOW,
    "take_screenshot": RiskLevel.LOW,
    
    # Application & Window control
    "open_application": RiskLevel.LOW,
    "close_application": RiskLevel.MEDIUM,
    "list_running_applications": RiskLevel.LOW,
    "media_control": RiskLevel.LOW,
    
    # Safe file system tools
    "list_directory": RiskLevel.LOW,
    "search_files": RiskLevel.LOW,
    "read_file": RiskLevel.LOW,
    "create_file": RiskLevel.LOW,
    "create_folder": RiskLevel.LOW,
    "move_file": RiskLevel.MEDIUM,
    "copy_file": RiskLevel.LOW,
    "rename_file": RiskLevel.MEDIUM,
    "delete_file": RiskLevel.HIGH,
    "delete_folder": RiskLevel.HIGH,
    
    # Web & Browser
    "search_web": RiskLevel.LOW,
    "open_url": RiskLevel.LOW,
    
    # Memory
    "store_memory": RiskLevel.LOW,
    "retrieve_memory": RiskLevel.LOW,
    "forget_memory": RiskLevel.MEDIUM,
    
    # Productivity
    "create_reminder": RiskLevel.LOW,
    "list_reminders": RiskLevel.LOW,
    "delete_reminder": RiskLevel.LOW,
    "create_task": RiskLevel.LOW,
    "list_tasks": RiskLevel.LOW,
    
    # Smart home
    "control_device": RiskLevel.LOW,
    "list_devices": RiskLevel.LOW,
    
    # Critical system operations
    "lock_screen": RiskLevel.LOW,
    "volume_control": RiskLevel.LOW,
    "system_shutdown": RiskLevel.HIGH,
    "system_restart": RiskLevel.HIGH,
    "system_sleep": RiskLevel.HIGH,
    "execute_arbitrary_command": RiskLevel.CRITICAL
}

def get_tool_risk(tool_name: str) -> RiskLevel:
    return TOOL_RISK_MAP.get(tool_name, RiskLevel.MEDIUM)

def requires_confirmation(tool_name: str, arguments: Dict[str, Any] = None) -> bool:
    risk = get_tool_risk(tool_name)
    if risk in (RiskLevel.HIGH, RiskLevel.CRITICAL):
        return True
    # Extra check for mass file deletion or dangerous paths
    if tool_name in ("delete_file", "delete_folder"):
        return True
    return False

def format_confirmation_prompt(tool_name: str, arguments: Dict[str, Any]) -> str:
    if tool_name == "system_shutdown":
        return "The computer will shut down immediately. Do you want me to proceed?"
    elif tool_name == "system_restart":
        return "The computer will restart now. Are you ready to proceed?"
    elif tool_name == "system_sleep":
        return "Put the computer to sleep now?"
    elif tool_name == "delete_file":
        path = arguments.get("path", "the specified file")
        return f"Permanently delete '{path}'? This cannot be undone."
    elif tool_name == "delete_folder":
        path = arguments.get("path", "the specified folder")
        return f"Permanently delete folder '{path}' and all contents? Please confirm."
    elif tool_name == "close_application":
        app = arguments.get("application", "the application")
        return f"Terminate process '{app}'? Unsaved work might be lost."
    return f"Execute dangerous action '{tool_name}' with parameters {arguments}?"
