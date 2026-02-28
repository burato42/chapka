import json
import random

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ollama import Client, ChatResponse

from log import logger

app = FastAPI(title="Chapka backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# TODO: Use async client
client = Client(
  host='http://localhost:11434',
)
sessions: dict[int, list[dict[str, str]]] = {}


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


@app.get("/sessions")
async def get_sessions():
    history = []
    for session_id in sessions:
        history.append({
            "session_id": session_id,
            "prompt": sessions[session_id][0]["content"]
        })
    return history


@app.get("/sessions/{session_id}")
async def get_session(session_id: int):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    return sessions[session_id]   


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)