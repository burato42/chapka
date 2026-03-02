import json
import os
import random

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ollama import AsyncClient, ChatResponse
from data_models import ChatRequest, InternalChatResponse, Session, SessionTitle
from log import logger

MODEL = "llama3.2:3b"


app = FastAPI(title="Chapka backend")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


client = AsyncClient(
  host=os.getenv("OLLAMA_HOST", "http://localhost:11434"),
)

sessions: dict[int, list[dict[str, str]]] = {}


@app.post("/chat",
    response_model=InternalChatResponse,
)
async def chat_with_model(request: ChatRequest):

    session_id = request.session_id
    if request.session_id == 0:
         # TODO: use uuid or other unique id, this approach is not correct,
         #       it's kept for demonstation purposes only
        session_id = random.randrange(1000)

    if session_id not in sessions:
        sessions[session_id] = []

    sessions[session_id].append({"role": "user", "content": request.message})
    
    logger.debug("Messages: {}", sessions[session_id])

    try:
        response: ChatResponse = await client.chat(model=MODEL, messages=sessions[session_id])       
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


@app.get("/sessions",
    response_model=list[Session],
)
async def get_sessions():
    history = []
    for session_id in sessions:
        history.append({
            "session_id": session_id,
            "prompt": sessions[session_id][0]["content"]
        })
    return history


@app.get(
    "/sessions/{session_id}", 
    response_model=SessionTitle
)
async def get_session(session_id: int):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    return sessions[session_id]   


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
