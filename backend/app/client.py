import os

from ollama import Client

# FIXME: Here should be AsyncClient but it doesn't work in Docker
client = Client(
    host=os.getenv("OLLAMA_HOST", "http://localhost:11434"),
)
