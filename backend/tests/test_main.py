"""
Unit tests for main.py endpoints.
Ollama's AsyncClient is mocked so tests run without a live LLM.
"""

import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

from app.storage import sessions
from app.client import client as chat_client
from app.main import chat_app


@pytest.fixture(autouse=True)
def reset_sessions():
    """Ensure the in-memory sessions dict is empty before every test."""
    sessions.clear()
    yield
    sessions.clear()


@pytest.fixture()
def client():
    return TestClient(chat_app)


def _make_ollama_response(content: str):
    """Build a minimal mock that looks like an ``ollama.ChatResponse``."""
    message = MagicMock()
    message.content = content
    message.model_dump_json.return_value = (
        f'{{"role": "assistant", "content": "{content}"}}'
    )
    response = MagicMock()
    response.message = message
    return response


class TestChat:
    def test_chat_creates_new_session(self, client, monkeypatch):
        """A new session is created when session_id == 0."""
        mock_response = _make_ollama_response("Hello!")
        monkeypatch.setattr(
            chat_client,
            "chat",
            MagicMock(return_value=mock_response),
        )

        resp = client.post("/chat", json={"session_id": 0, "message": "Hi"})

        assert resp.status_code == 200
        data = resp.json()
        assert data["response"] == "Hello!"
        assert data["history_length"] == 2
        assert data["session_id"] != 0

    def test_chat_reuses_existing_session(self, client, monkeypatch):
        """Sending to an existing session_id appends to its history."""
        mock_response = _make_ollama_response("Sure!")
        monkeypatch.setattr(
            chat_client,
            "chat",
            MagicMock(return_value=mock_response),
        )

        sessions[42] = [{"role": "user", "content": "first"}]

        resp = client.post("/chat", json={"session_id": 42, "message": "second"})

        assert resp.status_code == 200
        data = resp.json()
        assert data["session_id"] == 42
        assert data["history_length"] == 3

    def test_chat_ollama_error_returns_500(self, client, monkeypatch):
        """If the Ollama client raises, the endpoint returns HTTP 500."""
        monkeypatch.setattr(
            chat_client,
            "chat",
            MagicMock(side_effect=RuntimeError("connection refused")),
        )

        resp = client.post("/chat", json={"session_id": 0, "message": "Hello"})

        assert resp.status_code == 500
        assert "Ollama error" in resp.json()["detail"]


class TestGetSessions:
    def test_empty_sessions_returns_empty_list(self, client):
        resp = client.get("/sessions")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_sessions_returns_first_prompt_as_title(self, client):
        sessions[7] = [
            {"role": "user", "content": "What is AI?"},
            {"role": "assistant", "content": "AI stands for…"},
        ]

        resp = client.get("/sessions")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["session_id"] == 7
        assert data[0]["prompt"] == "What is AI?"

    def test_sessions_lists_multiple_sessions(self, client):
        sessions[1] = [{"role": "user", "content": "msg1"}]
        sessions[2] = [{"role": "user", "content": "msg2"}]

        resp = client.get("/sessions")
        assert resp.status_code == 200
        assert len(resp.json()) == 2


class TestGetSession:
    def test_returns_session_messages(self, client):
        sessions[99] = [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there"},
        ]

        resp = client.get("/sessions/99")
        assert resp.status_code == 200
        data = resp.json()
        assert data["session_id"] == 99
        assert len(data["messages"]) == 2
        assert data["messages"][0]["role"] == "user"
        assert data["messages"][0]["content"] == "Hello"

    def test_returns_404_for_unknown_session(self, client):
        resp = client.get("/sessions/9999")
        assert resp.status_code == 404
        assert resp.json()["detail"] == "Session not found"
