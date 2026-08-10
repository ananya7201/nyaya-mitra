import os
import httpx

class RimeVoiceEngine:
    def __init__(self):
        self.api_key = os.getenv("RIME_API_KEY", "")
        self.endpoint = "https://users.rime.ai/v1/rime_tts"
        self.speaker = "allison"  # High performance low-latency speaker

    async def generate_speech(self, text: str) -> bytes:
        if not self.api_key:
            raise ValueError("RIME_API_KEY environment variable is missing.")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "audio/mp3"
        }
        payload = {
            "speaker": self.speaker,
            "text": text,
            "modelId": "mist",
            "samplingRate": 22050
        }

        async with httpx.AsyncClient() as client:
            res = await client.post(self.endpoint, json=payload, headers=headers, timeout=12.0)
            if res.status_code != 200:
                raise RuntimeError(f"Rime API Error {res.status_code}: {res.text}")
            return res.content