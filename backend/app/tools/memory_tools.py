from app.memory.memory_service import MemoryService

async def store_memory(key: str, value: str, category: str = "general") -> dict:
    """Saves a permanent fact or user preference."""
    try:
        return await MemoryService.store_memory(key, value, category)
    except Exception as e:
        return {"success": False, "error": str(e)}

async def retrieve_memory(category: str = None, search: str = None) -> dict:
    """Retrieves remembered user preferences, contacts, projects."""
    try:
        mems = await MemoryService.get_memories(category, search)
        return {"success": True, "count": len(mems), "memories": mems}
    except Exception as e:
        return {"success": False, "error": str(e)}

async def forget_memory(key: str) -> dict:
    """Removes a stored memory by key."""
    try:
        return await MemoryService.forget_memory(key)
    except Exception as e:
        return {"success": False, "error": str(e)}
