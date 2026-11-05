import io
import asyncio
from typing import Optional
import edge_tts

class LocalNeuralVoiceService:
    DEFAULT_VOICE = "en-GB-RyanNeural"  # Iconic JARVIS British accent
    _AUDIO_CACHE: dict[tuple[str, str, str, str], bytes] = {}

    @classmethod
    async def synthesize(
        cls,
        text: str,
        voice: Optional[str] = None,
        rate: str = "+5%",
        pitch: str = "-4Hz"
    ) -> bytes:
        """
        Synthesize speech using free, high-definition local neural TTS.
        No cloud API key required.
        """
        chosen_voice = voice or cls.DEFAULT_VOICE
        cache_key = (text.strip(), chosen_voice, rate, pitch)
        if cache_key in cls._AUDIO_CACHE:
            return cls._AUDIO_CACHE[cache_key]

        communicate = edge_tts.Communicate(
            text=text,
            voice=chosen_voice,
            rate=rate,
            pitch=pitch
        )
        
        audio_stream = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_stream.write(chunk["data"])
                
        audio_bytes = audio_stream.getvalue()
        if audio_bytes and len(cls._AUDIO_CACHE) < 128:
            cls._AUDIO_CACHE[cache_key] = audio_bytes
        return audio_bytes

    @classmethod
    def get_available_voices(cls):
        return [
            {"id": "en-GB-RyanNeural", "name": "JARVIS British Male (Ryan)", "lang": "en-GB", "recommended": True},
            {"id": "en-GB-ThomasNeural", "name": "British Male (Thomas)", "lang": "en-GB", "recommended": False},
            {"id": "en-GB-SoniaNeural", "name": "British Female (Sonia)", "lang": "en-GB", "recommended": False},
            {"id": "en-US-GuyNeural", "name": "US Male (Guy)", "lang": "en-US", "recommended": False}
        ]
