import asyncio
from app.memory.memory_service import MemoryService

def store_memory(key: str, value: str, category: str = "general") -> dict:
    """Saves a permanent fact or user preference."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import nest_asyncio
            # In case nested loop is needed or run via thread
            # Or direct async runner
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                res = executor.submit(lambda: asyncio.run(MemoryService.store_memory(key, value, category))).result()
                return res
        else:
            return asyncio.run(MemoryService.store_memory(key, value, category))
    except Exception as e:
        return {"success": False, "error": str(e)}

def retrieve_memory(category: str = None, search: str = None) -> dict:
    """Retrieves remembered user preferences, contacts, projects."""
    try:
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as executor:
            mems = executor.submit(lambda: asyncio.run(MemoryService.get_memories(category, search))).result()
        return {"success": True, "count": len(mems), "memories": mems}
    except Exception as e:
        return {"success": False, "error": str(e)}

def forget_memory(key: str) -> dict:
    """Removes a stored memory by key."""
    try:
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as executor:
            res = executor.submit(lambda: asyncio.run(MemoryService.forget_memory(key))).result()
        return res
    except Exception as e:
        return {"success": False, "error": str(e)}
