import os
import re
import subprocess
import psutil

# Friendly aliases mapping to executable names or URI protocols
APP_MAP = {
    "chrome": "chrome.exe",
    "google chrome": "chrome.exe",
    "edge": "msedge.exe",
    "microsoft edge": "msedge.exe",
    "firefox": "firefox.exe",
    "spotify": "spotify.exe",
    "spotify music": "spotify.exe",
    "spotify app": "spotify.exe",
    "spotify application": "spotify.exe",
    "discord": "discord.exe",
    "vscode": "code.cmd",
    "code": "code.cmd",
    "vs code": "code.cmd",
    "visual studio code": "code.cmd",
    "antigravity": "Google.AntigravityIDE",
    "antigravity ide": "Google.AntigravityIDE",
    "notepad": "notepad.exe",
    "calculator": "calc.exe",
    "calc": "calc.exe",
    "camera": "microsoft.windows.camera:",
    "clock": "ms-clock:",
    "calendar": "outlookcal:",
    "terminal": "wt.exe",
    "windows terminal": "wt.exe",
    "powershell": "powershell.exe",
    "cmd": "cmd.exe",
    "explorer": "explorer.exe",
    "file explorer": "explorer.exe",
    "settings": "ms-settings:",
    "task manager": "taskmgr.exe",
    "taskmgr": "taskmgr.exe",
    "canva": "com.canva.CanvaDesktop",
    "capcut": "capcut.exe",
    "steam": "steam://open/main",
    "word": "winword.exe",
    "excel": "excel.exe",
    "powerpoint": "powerpnt.exe"
}

_START_APPS_CACHE: dict[str, str] = {}
_LAST_CACHE_TIME: float = 0

def get_installed_start_apps() -> dict[str, str]:
    """Retrieves installed Windows Start Apps and maps lowercase name to AppID."""
    global _START_APPS_CACHE, _LAST_CACHE_TIME
    import time
    import json
    if _START_APPS_CACHE and (time.time() - _LAST_CACHE_TIME < 300):
        return _START_APPS_CACHE
    try:
        p = subprocess.run(
            ['powershell.exe', '-NoProfile', '-WindowStyle', 'Hidden', '-Command', 'Get-StartApps | ConvertTo-Json'],
            capture_output=True,
            text=True,
            creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0)
        )
        if p.stdout.strip():
            data = json.loads(p.stdout)
            if isinstance(data, list):
                _START_APPS_CACHE = {
                    item['Name'].lower().strip(): item['AppID']
                    for item in data if 'Name' in item and 'AppID' in item
                }
            elif isinstance(data, dict) and 'Name' in data and 'AppID' in data:
                _START_APPS_CACHE = {data['Name'].lower().strip(): data['AppID']}
            _LAST_CACHE_TIME = time.time()
    except Exception:
        pass
    return _START_APPS_CACHE

def clean_app_name(application: str) -> str:
    """Strips common conversational prefixes and suffixes from application names."""
    cleaned = application.lower().strip()
    # Strip leading filler words: "up", "the", "a", "an", "to"
    cleaned = re.sub(r'^(?:up\s+|the\s+|a\s+|an\s+|to\s+)+', '', cleaned)
    # Strip trailing polite or clarifying words
    cleaned = re.sub(r'\s+(?:please|for me|now|app|application|program|software)$', '', cleaned)
    return cleaned.strip().rstrip(".!?")

def open_application(application: str) -> dict:
    """Launches an installed application by friendly name, URI protocol, or path."""
    app_query = clean_app_name(application)
    target = APP_MAP.get(app_query, app_query)
    
    try:
        if os.name == "nt":
            # 1. Check dynamic Windows Start Apps (UWP, Desktop, Store apps)
            start_apps = get_installed_start_apps()
            matched_appid = None
            if app_query in start_apps:
                matched_appid = start_apps[app_query]
            else:
                for s_name, s_id in start_apps.items():
                    if app_query == s_name or app_query in s_name or s_name in app_query:
                        matched_appid = s_id
                        break

            if matched_appid:
                try:
                    subprocess.Popen(
                        ['powershell.exe', '-NoProfile', '-WindowStyle', 'Hidden', '-Command', f'Start-Process "shell:AppsFolder\\{matched_appid}"'],
                        creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0)
                    )
                    return {"success": True, "message": f"Opened {application}."}
                except Exception:
                    pass
            # Special resilient case for Spotify (Windows Store AppX, Standalone, or URI Protocol)
            if "spotify" in app_query:
                local_appdata = os.environ.get("LOCALAPPDATA", "")
                appdata = os.environ.get("APPDATA", "")
                
                # 1. Direct AppX Shell Execution (Microsoft Store App)
                try:
                    subprocess.Popen(['explorer.exe', r'shell:AppsFolder\SpotifyAB.SpotifyMusic_zpdnekdrzrea0!Spotify'])
                    return {"success": True, "message": "Opened Spotify."}
                except Exception:
                    pass

                # 2. Check known executable paths (Store execution alias, AppData, Programs)
                paths = [
                    os.path.join(local_appdata, r"Microsoft\WindowsApps\Spotify.exe"),
                    os.path.join(appdata, r"Spotify\Spotify.exe"),
                    os.path.join(local_appdata, r"Programs\Spotify\Spotify.exe"),
                ]
                
                for p in paths:
                    if os.path.exists(p):
                        try:
                            subprocess.Popen([p])
                            return {"success": True, "message": "Opened Spotify."}
                        except Exception:
                            try:
                                os.startfile(p)
                                return {"success": True, "message": "Opened Spotify."}
                            except Exception:
                                pass

                # 3. PowerShell Start-Process (Silent, native Windows dispatch without warning sound)
                try:
                    subprocess.Popen(
                        ['powershell.exe', '-NoProfile', '-WindowStyle', 'Hidden', '-Command', 'Start-Process', 'spotify:'],
                        creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0)
                    )
                    return {"success": True, "message": "Dispatched launch command for Spotify."}
                except Exception:
                    pass

            if target.endswith(":") or target.startswith("http"):
                # Protocol URI (e.g. ms-settings:, spotify:)
                try:
                    subprocess.Popen(
                        ['powershell.exe', '-NoProfile', '-WindowStyle', 'Hidden', '-Command', 'Start-Process', target],
                        creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0)
                    )
                    return {"success": True, "message": f"Opened {application}."}
                except Exception:
                    os.startfile(target)
                    return {"success": True, "message": f"Opened {application}."}
            else:
                # Check if it's a common Store app or executable
                try:
                    # Try direct execution
                    subprocess.Popen(
                        ['powershell.exe', '-NoProfile', '-WindowStyle', 'Hidden', '-Command', f'Start-Process "{target}"'],
                        creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0)
                    )
                    return {"success": True, "message": f"Opened {application} successfully."}
                except Exception:
                    os.startfile(target)
                    return {"success": True, "message": f"Opened {application} successfully."}
        else:
            subprocess.Popen([target])
            return {"success": True, "message": f"Started {application}."}
    except Exception as e:
        return {"success": False, "error": f"Could not launch '{application}': {str(e)}"}

def close_application(application: str) -> dict:
    """Closes running processes matching the requested name."""
    app_query = application.lower().strip().replace(".exe", "")
    closed_count = 0
    
    for proc in psutil.process_iter(['pid', 'name']):
        try:
            pname = proc.info['name'].lower() if proc.info['name'] else ''
            if app_query in pname or pname.startswith(app_query):
                proc.terminate()
                closed_count += 1
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
            
    if closed_count > 0:
        return {"success": True, "message": f"Closed {closed_count} instance(s) of '{application}'."}
    else:
        return {"success": False, "message": f"No active process found matching '{application}'."}

def list_running_applications() -> dict:
    """Returns a curated list of user-facing running applications."""
    apps = []
    seen = set()
    
    for proc in psutil.process_iter(['pid', 'name', 'memory_percent']):
        try:
            name = proc.info['name']
            if not name:
                continue
            name_lower = name.lower()
            # Filter out common background system daemons
            if any(sys_proc in name_lower for sys_proc in [
                'svchost', 'system', 'registry', 'smss', 'csrss', 'wininit',
                'services', 'lsass', 'fontdrvhost', 'runtimebroker', 'dwm',
                'sihost', 'taskhostw', 'shellexperiencehost', 'searchhost',
                'startmenuexperiencehost', 'ctfmon', 'conhost'
            ]):
                continue
                
            if name not in seen:
                seen.add(name)
                apps.append({
                    "name": name,
                    "pid": proc.info['pid'],
                    "memory_percent": round(proc.info['memory_percent'] or 0, 1)
                })
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
            
    # Sort by memory usage descending
    apps.sort(key=lambda x: x['memory_percent'], reverse=True)
    return {"applications": apps[:25], "total_tracked": len(apps)}

def media_control(action: str) -> dict:
    """Controls media playback: play, pause, next, previous."""
    # Virtual key codes on Windows:
    # 0xB3: Play/Pause
    # 0xB2: Stop
    # 0xB0: Next Track
    # 0xB1: Previous Track
    action = action.lower().strip()
    try:
        if os.name == "nt":
            import ctypes
            key_map = {
                "play": 0xB3,
                "pause": 0xB3,
                "play_pause": 0xB3,
                "stop": 0xB2,
                "next": 0xB0,
                "previous": 0xB1,
                "prev": 0xB1
            }
            code = key_map.get(action, 0xB3)
            ctypes.windll.user32.keybd_event(code, 0, 0, 0)
            ctypes.windll.user32.keybd_event(code, 0, 2, 0)
            return {"success": True, "message": f"Media command '{action}' triggered."}
        return {"success": True, "message": f"Simulated media '{action}'."}
    except Exception as e:
        return {"success": False, "error": str(e)}
