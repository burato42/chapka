"use client";

import React, { useState, useRef, useEffect } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatApp() {
  const [sessionId, setSessionId] = useState<number>(0);
  const [inputSessionId, setInputSessionId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<{ session_id: number; prompt: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/sessions`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (e) {
      console.error("Failed to fetch sessions", e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [sessionId, messages.length]); // refetch when session or messages change

  const fetchSessionMessages = async (id: number) => {
    try {
      const res = await fetch(`${BACKEND_URL}/sessions/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
      } else {
        setMessages([]);
      }
    } catch (e) {
      console.error("Failed to fetch session messages", e);
      setMessages([]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleJoinSession = (e: React.SubmitEvent) => {
    e.preventDefault();
    setSessionId(0);
    setMessages([]);
  };

  const handleSendMessage = async (e?: React.SubmitEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }


    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: userMessage,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();

      if (sessionId === 0 && data.session_id) {
        setSessionId(data.session_id);
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error: Unable to reach the server. Make sure FastAPI and Ollama are running." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };


  const [height, setHeight] = useState(100);
  const isResizing = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight >= 80 && newHeight <= 600) {
        setHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = "default";
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = "ns-resize";
  };

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      {/* Sidebar for History */}
      <aside className="w-64 bg-zinc-100 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-full overflow-hidden">
        <header className="header-container bg-zinc-100">
          <div className="flex h-8 items-center gap-3">
            <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
              Existing Sessions
            </h2>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-2">
          {history.length === 0 ? (
            <div className="p-4 text-center text-sm text-zinc-500">No sessions yet</div>
          ) : (
            history.map((hItem) => (
              <button
                key={hItem.session_id}
                onClick={() => {
                  setSessionId(hItem.session_id);
                  setInputSessionId(hItem.session_id.toString());
                  fetchSessionMessages(hItem.session_id);
                }}
                className={`w-full text-left p-3 mb-1 rounded-xl text-sm transition-colors ${sessionId === hItem.session_id
                  ? "bg-blue-100 text-blue-900 outline-none ring-2 ring-blue-500"
                  : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                  }`}
              >
                <div className="font-semibold text-xs mb-1 opacity-70">
                  ID: {hItem.session_id}
                </div>
                <div className="truncate opacity-90">
                  {hItem.prompt}
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      <div className="flex flex-col flex-1 h-screen">
        {/* Header */}
        <header className="header-container">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
              C
            </div>
            <h1 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">
              Chapka Chat
            </h1>
          </div>

          <form onSubmit={handleJoinSession} className="flex items-center gap-2">
            <button
              type="submit"
              className="btn-primary-sm"
            >
              New Chat
            </button>
          </form>
        </header>
        {/* Main Chat Area */}
        <main className="main-container">
          <div className="chat-content">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 text-center space-y-4">
                <h2 className="text-2xl font-semibold text-zinc-700 dark:text-zinc-300">
                  Welcome to Chapka
                </h2>
                <p className="text-zinc-500 dark:text-zinc-400 max-w-sm">
                  Send a message to start a new session, or continue an existing one chosing from the history.
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={msg.role === "user" ? "message-bubble-user" : "message-bubble-assistant"}>
                    <div className="message-content prose prose-sm md:prose-base dark:prose-invert">
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex w-full justify-start">
                <div className="typing-bubble">
                  <div className="typing-dot" style={{ animationDelay: "0ms" }}></div>
                  <div className="typing-dot" style={{ animationDelay: "150ms" }}></div>
                  <div className="typing-dot" style={{ animationDelay: "300ms" }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Input Area */}
        <footer
          className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 relative flex flex-col"
          style={{ height: `${height}px` }}
        >
          {/* Resize Handle */}
          <div
            onMouseDown={startResizing}
            className="absolute top-0 left-0 right-0 h-2 -translate-y-1 cursor-ns-resize z-10"
          />
          <div className="max-w-4xl w-full mx-auto flex items-stretch gap-2 flex-1 py-4">
            <form
              id="chat-form"
              onSubmit={handleSendMessage}
              className="chat-input-form"
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!isLoading && input.trim()) {
                      handleSendMessage();
                    }
                  }
                }}
                placeholder="Type your message..."
                disabled={isLoading}
                className="chat-textarea"
              />
            </form>
            <button
              type="submit"
              form="chat-form"
              disabled={!input.trim() || isLoading}
              className="btn-send"
            >
              Send
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
