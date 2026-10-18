import os
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")

class Settings(BaseModel):
    PROJECT_NAME: str = "JARVIS AI"
    VERSION: str = "1.0.0"
    USER_NAME: str = os.getenv("JARVIS_USER_NAME", "sir")
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    
    # Paths
    BASE_DIR: Path = BASE_DIR
    DATA_DIR: Path = BASE_DIR / "data"
    SCREENSHOTS_DIR: Path = BASE_DIR / "data" / "screenshots"
    LOGS_DIR: Path = BASE_DIR / "data" / "logs"
    DATABASE_URL: str = f"sqlite+aiosqlite:///{BASE_DIR / 'data' / 'jarvis.db'}"
    
    # AI / LLM
    AI_API_KEY: str = os.getenv("AI_API_KEY", "")
    AI_MODEL: str = os.getenv("AI_MODEL", "gemini-2.0-flash")
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "gemini")
    AI_BASE_URL: str = os.getenv("AI_BASE_URL", "")
    
    # Voice & Wake word
    WAKE_WORD: str = os.getenv("JARVIS_WAKE_WORD", "jarvis")
    VOICE_PITCH: float = 1.0
    VOICE_RATE: float = 1.05
    VOICE_ACCENT: str = "en-GB"
    
    # Fish Audio S2.1 Pro
    FISH_AUDIO_API_KEY: str = os.getenv("FISH_AUDIO_API_KEY", "")
    FISH_AUDIO_MODEL: str = os.getenv("FISH_AUDIO_MODEL", "s2.1-pro-free")
    FISH_AUDIO_VOICE_ID: str = os.getenv("FISH_AUDIO_VOICE_ID", "9a9cf47702da476aa4629e2506d4a857")
    VOICE_PROVIDER: str = os.getenv("VOICE_PROVIDER", "browser") # fish_audio or browser
    
    # Smart Home / Home Assistant
    HOME_ASSISTANT_URL: str = os.getenv("HOME_ASSISTANT_URL", "http://homeassistant.local:8123")
    HOME_ASSISTANT_TOKEN: str = os.getenv("HOME_ASSISTANT_TOKEN", "")
    
    # Security
    ALLOW_DANGEROUS_COMMANDS: bool = False
    CONFIRMATION_REQUIRED_RISKS: list[str] = ["HIGH", "CRITICAL"]

settings = Settings()

# Ensure directories exist
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)
settings.LOGS_DIR.mkdir(parents=True, exist_ok=True)
