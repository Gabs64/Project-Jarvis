import os
import shutil
from pathlib import Path
from typing import Optional

PROTECTED_PATHS = [
    r"c:\windows",
    r"c:\program files",
    r"c:\program files (x86)",
    r"c:\system volume information",
    r"c:\recovery"
]

def _is_protected(path_str: str) -> bool:
    resolved = str(Path(path_str).resolve()).lower()
    for prot in PROTECTED_PATHS:
        if resolved == prot or resolved.startswith(prot + "\\"):
            return True
    return False

def list_directory(path: str = ".") -> dict:
    """Lists files and folders inside a given directory."""
    try:
        target = Path(path).expanduser().resolve()
        if not target.exists():
            return {"success": False, "error": f"Path '{path}' does not exist."}
        if not target.is_dir():
            return {"success": False, "error": f"Path '{path}' is not a directory."}
            
        entries = []
        for item in sorted(target.iterdir()):
            entries.append({
                "name": item.name,
                "is_dir": item.is_dir(),
                "size_bytes": item.stat().st_size if item.is_file() else None,
                "path": str(item)
            })
        return {
            "success": True,
            "path": str(target),
            "total_items": len(entries),
            "items": entries[:100]
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

def search_files(query: str, root_dir: str = ".") -> dict:
    """Searches for files matching query within directory tree."""
    try:
        base = Path(root_dir).expanduser().resolve()
        matches = []
        query_lower = query.lower()
        
        # Traverse with depth limit to avoid freezing
        for root, dirs, files in os.walk(base):
            # Limit depth
            depth = len(Path(root).relative_to(base).parts)
            if depth > 4:
                del dirs[:]
                continue
                
            for f in files:
                if query_lower in f.lower():
                    full_p = Path(root) / f
                    matches.append({
                        "name": f,
                        "path": str(full_p),
                        "size": full_p.stat().st_size
                    })
                    if len(matches) >= 50:
                        break
            if len(matches) >= 50:
                break
                
        return {"success": True, "query": query, "matches": matches, "count": len(matches)}
    except Exception as e:
        return {"success": False, "error": str(e)}

def read_file(path: str, max_lines: int = 100) -> dict:
    """Reads preview content of a text file."""
    try:
        p = Path(path).expanduser().resolve()
        if not p.exists():
            return {"success": False, "error": f"File '{path}' does not exist."}
        if p.is_dir():
            return {"success": False, "error": f"Path '{path}' is a directory, not a file."}
            
        with open(p, "r", encoding="utf-8", errors="replace") as f:
            lines = [f.readline() for _ in range(max_lines)]
            
        return {
            "success": True,
            "path": str(p),
            "lines_read": len(lines),
            "content": "".join(lines)
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

def create_file(path: str, content: str = "") -> dict:
    """Creates or updates a file safely."""
    try:
        if _is_protected(path):
            return {"success": False, "error": "Operation prohibited: protected system location."}
        p = Path(path).expanduser().resolve()
        p.parent.mkdir(parents=True, exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            f.write(content)
        return {"success": True, "path": str(p), "message": f"File created at '{p}'."}
    except Exception as e:
        return {"success": False, "error": str(e)}

def create_folder(path: str) -> dict:
    """Creates a directory folder."""
    try:
        if _is_protected(path):
            return {"success": False, "error": "Operation prohibited: protected system location."}
        p = Path(path).expanduser().resolve()
        p.mkdir(parents=True, exist_ok=True)
        return {"success": True, "path": str(p), "message": f"Folder created at '{p}'."}
    except Exception as e:
        return {"success": False, "error": str(e)}

def delete_file(path: str) -> dict:
    """Deletes a file permanently after confirmation."""
    try:
        if _is_protected(path):
            return {"success": False, "error": "Operation prohibited: protected system location."}
        p = Path(path).expanduser().resolve()
        if not p.exists():
            return {"success": False, "error": f"File '{path}' does not exist."}
        if p.is_dir():
            return {"success": False, "error": f"Path is a directory. Use delete_folder."}
        p.unlink()
        return {"success": True, "message": f"File '{path}' deleted."}
    except Exception as e:
        return {"success": False, "error": str(e)}

def delete_folder(path: str) -> dict:
    """Deletes a folder and all its contents after confirmation."""
    try:
        if _is_protected(path):
            return {"success": False, "error": "Operation prohibited: protected system location."}
        p = Path(path).expanduser().resolve()
        if not p.exists():
            return {"success": False, "error": f"Directory '{path}' does not exist."}
        shutil.rmtree(p)
        return {"success": True, "message": f"Folder '{path}' and all contents deleted."}
    except Exception as e:
        return {"success": False, "error": str(e)}
