import json
import random

from fastapi import APIRouter, HTTPException
from ollama import ChatResponse

from app.client import client
from app.data_models import ChatRequest, InternalChatResponse, Sessions, SessionTitle
from app.log import logger
from app.storage import sessions

MODEL = "llama3.2:3b"

router = APIRouter()


@router.post(
    "/chat",
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
        # TODO: It's wrong in general: We should not use synchronous call in async function
        #       We need it while the issue with Docker and AsyncClient is not resolved
        response: ChatResponse = client.chat(model=MODEL, messages=sessions[session_id])
        llm_message = response.message

        sessions[session_id].append(json.loads(llm_message.model_dump_json()))
        return {
            "response": llm_message.content,
            "history_length": len(sessions[session_id]),
            "session_id": session_id,
        }
    except Exception as e:
        logger.error(e)
        raise HTTPException(status_code=500, detail=f"Ollama error: {e}")


@router.get(
    "/sessions",
    response_model=list[SessionTitle],
)
async def get_sessions():
    history = []
    for session_id in sessions:
        history.append(
            {"session_id": session_id, "prompt": sessions[session_id][0]["content"]}
        )
    return history


@router.get("/sessions/{session_id}", response_model=Sessions)
async def get_session(session_id: int):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"session_id": session_id, "messages": sessions[session_id]}
