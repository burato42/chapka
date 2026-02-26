import json
import random

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from ollama import Client, ChatResponse
import httpx

from log import logger

app = FastAPI(title="Chapka backend")

client = Client(
  host='http://localhost:11434',
)
sessions: dict[int, list[dict[str, str]]] = {}


class SimpleChatRequest(BaseModel):
    message: str


class ChatRequest(BaseModel):
    session_id: int = 0
    message: str


@app.post("/chat")
async def chat_with_model(request: ChatRequest):
    model = "llama3.2:3b"

    session_id = request.session_id
    if request.session_id == 0:
        session_id = random.randrange(1000)

    if session_id not in sessions:
        sessions[session_id] = []

    sessions[session_id].append({"role": "user", "content": request.message})
    
    logger.debug("Messages: {}", sessions[session_id])

    try:
        response: ChatResponse = client.chat(model=model, messages=sessions[session_id])       
        llm_message = response.message

        sessions[session_id].append(json.loads(llm_message.model_dump_json()))
        return {
            "response": llm_message.content, 
            "history_length": len(sessions[session_id]), 
            "session_id": session_id
        }
    except Exception as e:
        logger.error(e)
        raise HTTPException(status_code=500, detail=f"Ollama error: {e}")


@app.post("/simple-chat")
async def chat_with_model(request: ChatRequest):
    ollama_url = "http://localhost:11434/api/generate"
    model = "llama3.2:3b"
    
    payload = {
        "model": model,
        "prompt": request.message,
        "stream": False
    }

    try:
        response = httpx.post(ollama_url, json=payload)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ollama error: {str(e)}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)