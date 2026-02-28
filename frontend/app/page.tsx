"use client";

import { useState, useRef, useEffect } from "react";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleJoinSession = (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(inputSessionId);
    if (!isNaN(id) && id > 0) {
      setSessionId(id);
      setMessages([]); // Clear local messages, since we re-join
    } else {
      setSessionId(0);
      setMessages([]);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");

    // Add user message to UI
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:8000/chat", {
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

      // Update session ID if it was newly created
      if (sessionId === 0 && data.session_id) {
        setSessionId(data.session_id);
      }

      // Add assistant response
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

  return (
    <div className="flex flex-col h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
            C
          </div>
          <h1 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">
            Chapka Chat
          </h1>
        </div>

        <form onSubmit={handleJoinSession} className="flex items-center gap-2">
          <div className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
            {sessionId === 0 ? "New Session" : `Session ID: ${sessionId}`}
          </div>
          <input
            type="text"
            placeholder="Enter ID to join..."
            value={inputSessionId}
            onChange={(e) => setInputSessionId(e.target.value)}
            className="px-3 py-1.5 text-sm bg-zinc-100 dark:bg-zinc-800 border-none rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-zinc-800 dark:text-zinc-200 w-32"
          />
          <button
            type="submit"
            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition"
          >
            {inputSessionId ? "Join" : "Reset"}
          </button>
        </form>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-3xl">
              👋
            </div>
            <h2 className="text-2xl font-semibold text-zinc-700 dark:text-zinc-300">
              Welcome to Chapka
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-sm">
              Send a message to start a new session, or enter an existing Session ID in the top right to continue.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"
                }`}
            >
              <div
                className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-5 py-3.5 ${msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-sm shadow-md"
                    : "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-bl-sm border border-zinc-200 dark:border-zinc-700 shadow-sm"
                  }`}
              >
                <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                </div>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex w-full justify-start">
            <div className="bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-2xl rounded-bl-sm border border-zinc-200 dark:border-zinc-700 px-5 py-4 shadow-sm flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "0ms" }}></div>
              <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "150ms" }}></div>
              <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "300ms" }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <footer className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 p-4">
        <div className="max-w-4xl mx-auto flex items-end gap-2">
          <form
            onSubmit={handleSendMessage}
            className="flex-1 flex gap-2 border border-zinc-300 dark:border-zinc-700 rounded-2xl bg-zinc-50 dark:bg-zinc-950 p-1 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 bg-transparent px-4 py-3 outline-none text-zinc-800 dark:text-zinc-200 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-4 py-2 m-1 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition flex items-center justify-center font-medium shadow-sm font-sans"
            >
              Send
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}
