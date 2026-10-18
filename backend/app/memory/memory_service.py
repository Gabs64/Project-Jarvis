from typing import List, Optional
from sqlalchemy import select, delete
from app.database.session import async_session_factory
from app.database.models import Memory

class MemoryService:
    @staticmethod
    async def store_memory(key: str, value: str, category: str = "general") -> dict:
        async with async_session_factory() as session:
            # Check if key exists
            stmt = select(Memory).where(Memory.key == key)
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()
            
            if existing:
                existing.value = value
                existing.category = category
            else:
                mem = Memory(key=key, value=value, category=category)
                session.add(mem)
                
            await session.commit()
            return {"success": True, "key": key, "value": value, "category": category}

    @staticmethod
    async def get_memories(category: Optional[str] = None, search_query: Optional[str] = None) -> List[dict]:
        async with async_session_factory() as session:
            stmt = select(Memory)
            if category:
                stmt = stmt.where(Memory.category == category)
            result = await session.execute(stmt)
            memories = result.scalars().all()
            
            output = []
            for m in memories:
                if search_query:
                    sq = search_query.lower()
                    if sq not in m.key.lower() and sq not in m.value.lower():
                        continue
                output.append({
                    "id": m.id,
                    "key": m.key,
                    "value": m.value,
                    "category": m.category,
                    "created_at": m.created_at.isoformat() if m.created_at else None,
                    "updated_at": m.updated_at.isoformat() if m.updated_at else None
                })
            return output

    @staticmethod
    async def forget_memory(key: str) -> dict:
        async with async_session_factory() as session:
            stmt = delete(Memory).where(Memory.key == key)
            result = await session.execute(stmt)
            await session.commit()
            return {"success": True, "key": key, "deleted_rows": result.rowcount}

    @staticmethod
    async def clear_all_memories() -> dict:
        async with async_session_factory() as session:
            stmt = delete(Memory)
            result = await session.execute(stmt)
            await session.commit()
            return {"success": True, "message": "All memories cleared."}
