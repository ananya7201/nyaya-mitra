from dotenv import load_dotenv
load_dotenv()  # Automatically reads keys from .env file 
import os
import json
import base64
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from memory import QdrantLegalMemory
from rime_tts import RimeVoiceEngine
from orchestrator import VoiceAgentOrchestrator

app = FastAPI(title="Nyaya-Mitra Voice Orchestrator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

memory = QdrantLegalMemory()
tts = RimeVoiceEngine()
orchestrator = VoiceAgentOrchestrator(memory)

@app.websocket("/ws/voice/{user_id}")
async def voice_endpoint(websocket: WebSocket, user_id: str):
    await websocket.accept()
    print(f"Client connected: {user_id}")

    try:
        while True:
            raw_data = await websocket.receive_text()
            payload = json.loads(raw_data)

            if payload.get("type") == "interrupt":
                await websocket.send_json({"type": "interrupted"})
                continue

            if payload.get("type") == "text_prompt":
                user_text = payload.get("text", "").strip()
                if not user_text:
                    continue

                # 1. Generate text response using Qdrant Context + LLM + Tools
                response_text = await orchestrator.generate_response(user_id, user_text)

                # 2. Send text back to client immediately so UI updates dynamically
                await websocket.send_json({
                    "type": "text_response",
                    "text": response_text
                })

                # 3. Generate Audio using Rime TTS API
                try:
                    audio_bytes = await tts.generate_speech(response_text)
                    b64_audio = base64.b64encode(audio_bytes).decode("utf-8")

                    await websocket.send_json({
                        "type": "audio_chunk",
                        "data": b64_audio
                    })
                except Exception as tts_err:
                    print(f"Rime TTS Fallback Notice: {tts_err}")
                    await websocket.send_json({"type": "audio_fallback_required"})

                await websocket.send_json({"type": "audio_end"})

    except WebSocketDisconnect:
        print(f"Client disconnected: {user_id}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)