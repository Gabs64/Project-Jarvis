import os
import time
import datetime
import subprocess
import psutil
from PIL import ImageGrab
from app.config import settings

# Prime psutil CPU counter so non-blocking calls return accurate deltas immediately
psutil.cpu_percent(interval=None)

def get_system_status() -> dict:
    """Returns comprehensive system metrics: CPU, Memory, Disk, Battery, Network."""
    cpu_percent = psutil.cpu_percent(interval=None)
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

def get_clipboard() -> dict:
    """Reads and returns the current text stored in the system clipboard."""
    try:
        if os.name == "nt":
            res = subprocess.run(
                ["powershell.exe", "-NoProfile", "-Command", "Get-Clipboard"],
                capture_output=True,
                text=True,
                timeout=4.0
            )
            content = res.stdout.strip()
            return {"success": True, "clipboard": content, "empty": not bool(content)}
        return {"success": False, "error": "Clipboard only supported on Windows."}
    except Exception as e:
        return {"success": False, "error": str(e)}

def set_clipboard(text: str) -> dict:
    """Copies the provided text to the system clipboard."""
    try:
        if os.name == "nt":
            p = subprocess.Popen(
                ["powershell.exe", "-NoProfile", "-Command", "$input | Set-Clipboard"],
                stdin=subprocess.PIPE,
                text=True
            )
            p.communicate(input=text, timeout=4.0)
            return {"success": True, "message": "Text copied to clipboard successfully."}
        return {"success": False, "error": "Clipboard only supported on Windows."}
    except Exception as e:
        return {"success": False, "error": str(e)}

def minimize_all_windows() -> dict:
    """Minimizes all active application windows to show the clean desktop."""
    try:
        if os.name == "nt":
            subprocess.run(
                ["powershell.exe", "-NoProfile", "-Command", "(New-Object -ComObject Shell.Application).MinimizeAll()"],
                check=False,
                timeout=4.0
            )
            return {"success": True, "message": "All windows minimized. Desktop visible."}
        return {"success": False, "error": "Only supported on Windows."}
    except Exception as e:
        return {"success": False, "error": str(e)}

def empty_recycle_bin() -> dict:
    """Permanently purges and empties the Windows Recycle Bin."""
    try:
        if os.name == "nt":
            subprocess.run(
                ["powershell.exe", "-NoProfile", "-Command", "Clear-RecycleBin -Force -ErrorAction SilentlyContinue"],
                check=False,
                timeout=5.0
            )
            return {"success": True, "message": "Recycle Bin emptied successfully."}
        return {"success": False, "error": "Only supported on Windows."}
    except Exception as e:
        return {"success": False, "error": str(e)}

def get_network_info() -> dict:
    """Retrieves network connection status, local IP, gateway, and internet ping latency."""
    try:
        import socket
        hostname = socket.gethostname()
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
        except Exception:
            local_ip = "127.0.0.1"
        finally:
            s.close()

        # Ping test to cloudflare DNS 1.1.1.1
        ping_latency = "N/A"
        try:
            res = subprocess.run(["ping", "-n", "1", "-w", "1000", "1.1.1.1"], capture_output=True, text=True, timeout=3.0)
            if "time=" in res.stdout.lower() or "time<" in res.stdout.lower():
                import re
                m = re.search(r'time[=<]([0-9]+ms)', res.stdout, re.IGNORECASE)
                if m:
                    ping_latency = m.group(1)
        except Exception:
            pass

        return {
            "success": True,
            "hostname": hostname,
            "local_ip": local_ip,
            "latency": ping_latency,
            "online": ping_latency != "N/A"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

def run_terminal_command(command: str) -> dict:
    """Executes a validated command in PowerShell and returns the output text."""
    # Safety block for destructive disk format or sys drive deletion
    blocked = ["format ", "del /f /s /q c:", "rmdir /s /q c:", "reg delete hklm"]
    if any(b in command.lower() for b in blocked):
        return {"success": False, "error": "Command blocked by JARVIS system security protocol."}

    try:
        proc = subprocess.run(
            ["powershell.exe", "-NoProfile", "-Command", command],
            capture_output=True,
            text=True,
            timeout=15.0
        )
        out = (proc.stdout or "").strip()
        err = (proc.stderr or "").strip()
        return {
            "success": proc.returncode == 0,
            "exit_code": proc.returncode,
            "output": out if out else (f"Error: {err}" if err else "Command executed with no output.")
        }
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Command execution timed out after 15 seconds."}
    except Exception as e:
        return {"success": False, "error": str(e)}
