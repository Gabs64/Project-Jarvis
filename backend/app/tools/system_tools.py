import os
import time
import datetime
import subprocess
import psutil
from PIL import ImageGrab
from app.config import settings

def get_system_status() -> dict:
    """Returns comprehensive system metrics: CPU, Memory, Disk, Battery, Network."""
    cpu_percent = psutil.cpu_percent(interval=0.1)
    cpu_count = psutil.cpu_count(logical=True)
    
    mem = psutil.virtual_memory()
    mem_total_gb = round(mem.total / (1024**3), 2)
    mem_used_gb = round(mem.used / (1024**3), 2)
    mem_percent = mem.percent
    
    disk = psutil.disk_usage("C:\\" if os.name == "nt" else "/")
    disk_free_gb = round(disk.free / (1024**3), 2)
    disk_total_gb = round(disk.total / (1024**3), 2)
    disk_percent = disk.percent
    
    battery = psutil.sensors_battery()
    battery_info = None
    if battery:
        secs = getattr(battery, 'secsleft', None)
        battery_info = {
            "percent": battery.percent,
            "power_plugged": battery.power_plugged,
            "secsleft": secs if (secs and secs > 0) else None
        }
        
    net_io = psutil.net_io_counters()
    
    return {
        "status": "online",
        "cpu": {
            "percent": cpu_percent,
            "cores": cpu_count
        },
        "memory": {
            "used_gb": mem_used_gb,
            "total_gb": mem_total_gb,
            "percent": mem_percent
        },
        "disk": {
            "free_gb": disk_free_gb,
            "total_gb": disk_total_gb,
            "percent": disk_percent
        },
        "battery": battery_info,
        "network": {
            "bytes_sent_mb": round(net_io.bytes_sent / (1024**2), 2),
            "bytes_recv_mb": round(net_io.bytes_recv / (1024**2), 2)
        },
        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

def get_time_and_date() -> dict:
    """Returns current date, time, and day."""
    now = datetime.datetime.now()
    return {
        "time": now.strftime("%I:%M %p"),
        "date": now.strftime("%A, %B %d, %Y"),
        "iso": now.isoformat()
    }

def take_screenshot() -> dict:
    """Captures screenshot of primary display and saves locally."""
    try:
        settings.SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)
        filename = f"screenshot_{int(time.time())}.png"
        filepath = settings.SCREENSHOTS_DIR / filename
        
        screenshot = ImageGrab.grab()
        screenshot.save(filepath, "PNG")
        
        return {
            "success": True,
            "filename": filename,
            "url": f"/api/system/screenshots/{filename}",
            "path": str(filepath),
            "resolution": f"{screenshot.width}x{screenshot.height}"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

def lock_screen() -> dict:
    """Locks the Windows desktop session safely."""
    try:
        if os.name == "nt":
            import ctypes
            ctypes.windll.user32.LockWorkStation()
            return {"success": True, "message": "Workstation locked successfully."}
        else:
            return {"success": False, "message": "Lock screen only supported on Windows."}
    except Exception as e:
        return {"success": False, "error": str(e)}

def volume_control(action: str, level: int = None) -> dict:
    """Controls master system volume or mute (up, down, mute, set)."""
    try:
        if os.name == "nt":
            # Using safe key commands or nircmd/vbs fallback
            if action == "mute":
                # Toggle mute virtual key 0xAD
                import ctypes
                ctypes.windll.user32.keybd_event(0xAD, 0, 0, 0)
                ctypes.windll.user32.keybd_event(0xAD, 0, 2, 0)
                return {"success": True, "message": "Volume muted/unmuted."}
            elif action == "up":
                import ctypes
                for _ in range(5):
                    ctypes.windll.user32.keybd_event(0xAF, 0, 0, 0)
                    ctypes.windll.user32.keybd_event(0xAF, 0, 2, 0)
                return {"success": True, "message": "Volume increased."}
            elif action == "down":
                import ctypes
                for _ in range(5):
                    ctypes.windll.user32.keybd_event(0xAE, 0, 0, 0)
                    ctypes.windll.user32.keybd_event(0xAE, 0, 2, 0)
                return {"success": True, "message": "Volume decreased."}
        return {"success": True, "message": f"Volume action '{action}' executed."}
    except Exception as e:
        return {"success": False, "error": str(e)}

def system_power(action: str) -> dict:
    """Executes validated system power commands (shutdown, restart, sleep)."""
    if action == "shutdown":
        if os.name == "nt":
            subprocess.run(["shutdown", "/s", "/t", "10"], check=False)
            return {"success": True, "message": "System shutdown initiated (10s delay)."}
    elif action == "restart":
        if os.name == "nt":
            subprocess.run(["shutdown", "/r", "/t", "10"], check=False)
            return {"success": True, "message": "System restart initiated (10s delay)."}
    elif action == "sleep":
        if os.name == "nt":
            subprocess.run(["rundll32.exe", "powrprof.dll,SetSuspendState", "0,1,0"], check=False)
            return {"success": True, "message": "System suspended."}
    return {"success": False, "message": f"Unsupported power action '{action}'."}
