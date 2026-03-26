"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useUser } from "@/context/UserContext";
import { sendChatMessage, subscribeChat, type ChatMessage } from "@/lib/chat";

function formatTime(ts: { toDate: () => Date } | null): string {
  if (!ts) return "";
  const d = ts.toDate();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const COLORS = [
  "#f0b429", "#00e676", "#40c4ff", "#ea80fc",
  "#ff6d6d", "#69f0ae", "#ffab40", "#80d8ff",
];

function usernameColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function GlobalChat() {
  const { username } = useUser();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastSeenCount = useRef(0);
  const initialized = useRef(false);

  useEffect(() => {
    const unsub = subscribeChat((msgs) => {
      setMessages(msgs);
      if (!initialized.current) {
        lastSeenCount.current = msgs.length;
        initialized.current = true;
        return;
      }
      if (!open) {
        const newCount = msgs.length - lastSeenCount.current;
        if (newCount > 0) setUnread((u) => u + newCount);
      }
      lastSeenCount.current = msgs.length;
    });
    return unsub;
  }, [open]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      lastSeenCount.current = messages.length;
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  }, [open, messages.length]);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const handleSend = useCallback(async () => {
    if (!username || !input.trim() || sending) return;
    setSending(true);
    try {
      await sendChatMessage(username, input.trim());
      setInput("");
    } finally {
      setSending(false);
    }
  }, [input, sending, username]);

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    },
    [handleSend]
  );

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div style={{
          position: "fixed",
          bottom: 80,
          left: 20,
          width: 300,
          height: 420,
          zIndex: 1050,
          borderRadius: 16,
          background: "var(--bg-secondary)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            padding: "12px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "rgba(255,255,255,0.03)",
            flexShrink: 0,
          }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, color: "var(--accent-gold)" }}>
              💬 Site Chat
            </span>
            <button
              onClick={() => setOpen(false)}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.1rem", lineHeight: 1 }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "10px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}>
            {messages.length === 0 && (
              <div style={{ color: "var(--text-muted)", textAlign: "center", marginTop: 40, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.08em" }}>
                No messages yet. Say hi!
              </div>
            )}
            {messages.map((msg) => {
              const isMe = msg.username === username;
              return (
                <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                  {!isMe && (
                    <span style={{
                      fontSize: "0.72rem",
                      fontFamily: "'Barlow Condensed', sans-serif",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: usernameColor(msg.username),
                      marginBottom: 2,
                      marginLeft: 4,
                    }}>
                      {msg.username}
                    </span>
                  )}
                  <div style={{
                    maxWidth: "85%",
                    padding: "7px 11px",
                    borderRadius: isMe ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                    background: isMe ? "rgba(240,180,41,0.18)" : "rgba(255,255,255,0.07)",
                    border: isMe ? "1px solid rgba(240,180,41,0.3)" : "1px solid rgba(255,255,255,0.08)",
                    color: "var(--text-primary)",
                    fontSize: "0.9rem",
                    lineHeight: 1.4,
                    wordBreak: "break-word",
                  }}>
                    {msg.text}
                  </div>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: 2, marginLeft: 4, marginRight: 4 }}>
                    {isMe ? "you • " : ""}{formatTime(msg.timestamp)}
                  </span>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: "10px 12px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            gap: 8,
            flexShrink: 0,
            background: "rgba(255,255,255,0.02)",
          }}>
            <input
              type="text"
              placeholder={username ? "Say something..." : "Set a username first"}
              disabled={!username || sending}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              maxLength={300}
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                padding: "8px 10px",
                color: "var(--text-primary)",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "0.95rem",
                outline: "none",
              }}
            />
            <button
              onClick={() => void handleSend()}
              disabled={!username || !input.trim() || sending}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                background: input.trim() && username ? "rgba(240,180,41,0.2)" : "rgba(255,255,255,0.05)",
                border: "1px solid rgba(240,180,41,0.3)",
                color: input.trim() && username ? "var(--accent-gold)" : "var(--text-muted)",
                cursor: input.trim() && username ? "pointer" : "default",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "1rem",
                transition: "all 0.15s",
              }}
            >
              ↑
            </button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "fixed",
          bottom: 20,
          left: 20,
          zIndex: 1051,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: open ? "rgba(240,180,41,0.25)" : "var(--bg-secondary)",
          border: "2px solid rgba(240,180,41,0.4)",
          color: "var(--accent-gold)",
          fontSize: "1.4rem",
          cursor: "pointer",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s",
        }}
      >
        💬
        {unread > 0 && !open && (
          <span style={{
            position: "absolute",
            top: -4,
            right: -4,
            background: "#f44336",
            color: "#fff",
            borderRadius: "50%",
            width: 20,
            height: 20,
            fontSize: "0.7rem",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Barlow Condensed', sans-serif",
          }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
    </>
  );
}
