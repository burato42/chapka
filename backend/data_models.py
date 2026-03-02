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


class Session(BaseModel):
    session_id: int
    prompt: ChatMessage


class SessionTitle(BaseModel):
    session_id: int
    prompt: str
