import httpx
from typing import Optional
from app.config import settings

class FishAudioService:
    API_URL = "https://api.fish.audio/v1/tts"

    @classmethod
    async def synthesize(
        cls,
        text: str,
        api_key: Optional[str] = None,
        voice_id: Optional[str] = None,
        model: Optional[str] = None
    ) -> bytes:
        key = api_key or settings.FISH_AUDIO_API_KEY
        v_id = voice_id or settings.FISH_AUDIO_VOICE_ID or "9a9cf47702da476aa4629e2506d4a857"
        m = model or settings.FISH_AUDIO_MODEL or "s2.1-pro-free"

        if not key:
            raise ValueError("Fish Audio API Key is required. Please set it in Settings or .env file.")

        headers = {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "model": m
        }

        body = {
            "text": text,
            "reference_id": v_id,
            "format": "mp3"
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(cls.API_URL, headers=headers, json=body)
            if response.status_code != 200:
                error_detail = response.text
                raise RuntimeError(f"Fish Audio TTS failed ({response.status_code}): {error_detail}")
            return response.content
