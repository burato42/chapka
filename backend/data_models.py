from pydantic import BaseModel


class ChatRequest(BaseModel):
    session_id: int = 0
    message: str


class InternalChatResponse(BaseModel):
    response: str
    history_length: int
    session_id: int


class ChatMessage(BaseModel):
    role: str
    content: str


class Sessions(BaseModel):
    session_id: int
    messages: list[ChatMessage]


class SessionTitle(BaseModel):
    session_id: int
    prompt: str
