import httpx
from typing import Dict, Any, List
from app.config import settings

# In-memory default smart environment state
SMART_ENVIRONMENT: Dict[str, Dict[str, Any]] = {
    "light.living_room": {
        "id": "light.living_room",
        "name": "Living Room Lights",
        "type": "light",
        "state": "on",
        "brightness": 85,
        "room": "Living Room"
    },
    "light.bedroom": {
        "id": "light.bedroom",
        "name": "Bedroom Ceiling Light",
        "type": "light",
        "state": "off",
        "brightness": 50,
        "room": "Bedroom"
    },
    "climate.thermostat": {
        "id": "climate.thermostat",
        "name": "Nest Thermostat",
        "type": "climate",
        "state": "cool",
        "temperature": 22.5,
        "target_temperature": 21.0,
        "room": "Hallway"
    },
    "switch.office_fan": {
        "id": "switch.office_fan",
        "name": "Office Air Purifier",
        "type": "switch",
        "state": "on",
        "room": "Office"
    },
    "camera.backyard": {
        "id": "camera.backyard",
        "name": "Backyard Surveillance",
        "type": "camera",
        "state": "streaming",
        "motion_detected": False,
        "room": "Backyard"
    }
}

async def _call_home_assistant(service: str, domain: str, service_data: dict) -> dict:
    if not settings.HOME_ASSISTANT_TOKEN or not settings.HOME_ASSISTANT_URL:
        return {"success": False, "message": "Home Assistant not configured"}
    headers = {
        "Authorization": f"Bearer {settings.HOME_ASSISTANT_TOKEN}",
        "Content-Type": "application/json"
    }
    url = f"{settings.HOME_ASSISTANT_URL}/api/services/{domain}/{service}"
    async with httpx.AsyncClient() as client:
        res = await client.post(url, headers=headers, json=service_data, timeout=5.0)
        return {"success": res.status_code == 200, "status_code": res.status_code}

def list_devices() -> dict:
    """Lists all available smart home IoT devices and current statuses."""
    devices = list(SMART_ENVIRONMENT.values())
    return {
        "success": True,
        "count": len(devices),
        "devices": devices,
        "integration": "Home Assistant" if settings.HOME_ASSISTANT_TOKEN else "Local Smart Hub Simulator"
    }

def control_device(device_id: str, action: str, brightness: int = None, temperature: float = None) -> dict:
    """Controls a smart home device (on, off, toggle, brightness, temperature)."""
    # Fuzzy match device if human name given (e.g. "bedroom light")
    target = None
    dev_id_lower = device_id.lower()
    for key, val in SMART_ENVIRONMENT.items():
        if key.lower() == dev_id_lower or val["name"].lower() == dev_id_lower:
            target = val
            break
        if any(word in val["name"].lower() for word in dev_id_lower.split()):
            target = val
            break
            
    if not target:
        return {"success": False, "error": f"Device '{device_id}' was not found in smart home system."}
        
    act = action.lower()
    if act in ("turn_on", "on"):
        target["state"] = "on"
    elif act in ("turn_off", "off"):
        target["state"] = "off"
    elif act == "toggle":
        target["state"] = "off" if target.get("state") == "on" else "on"
        
    if brightness is not None and "brightness" in target:
        target["brightness"] = max(0, min(100, int(brightness)))
        target["state"] = "on"
        
    if temperature is not None and "target_temperature" in target:
        target["target_temperature"] = float(temperature)

    return {
        "success": True,
        "device": target["name"],
        "id": target["id"],
        "state": target["state"],
        "attributes": target,
        "message": f"{target['name']} is now {target['state']}."
    }
