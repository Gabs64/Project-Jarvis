import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))

import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.config import settings
from app.database.session import init_db
from app.automation.automation_service import AutomationService
from app.api.routes import api_router
from app.api.websocket import websocket_endpoint

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Database & Defaults
    await init_db()
    await AutomationService.seed_defaults()
    print("=" * 60)
    print(">>> JARVIS Core Neural Engine Online <<<")
    print(f"Host: http://{settings.HOST}:{settings.PORT}")
    print(f"WebSocket: ws://{settings.HOST}:{settings.PORT}/ws/jarvis")
    print("=" * 60)
    yield
    # Shutdown

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach routes
app.include_router(api_router)
app.add_api_websocket_route("/ws/jarvis", websocket_endpoint)

@app.get("/health")
def health():
    return {"status": "ONLINE", "version": settings.VERSION, "project": settings.PROJECT_NAME}

if __name__ == "__main__":
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
