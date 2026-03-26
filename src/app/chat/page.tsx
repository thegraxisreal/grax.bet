"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useUser } from "@/context/UserContext";
import { sendChatMessage, subscribeChat, type ChatMessage } from "@/lib/chat";

const COLORS = [
  "#f0b429", "#00e676", "#40c4ff", "#ea80fc",
  "#ff6d6d", "#69f0ae", "#ffab40", "#80d8ff",
];

const GAME_ICONS: Record<string, string> = {
  Blackjack: "🃏",
  Crash: "🚀",
  Roulette: "🎡",
  Mines: "💣",
  Plinko: "🔵",
};

function usernameColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

function formatTime(ts: { toDate: () => Date } | null): string {
  if (!ts) return "";
  const d = ts.toDate();
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " +
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatPage() {
  const { username } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    const unsub = subscribeChat((msgs) => {
      setMessages(msgs);
      if (isFirstLoad.current) {
        isFirstLoad.current = false;
        setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
      } else {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    });
    return unsub;
  }, []);

  const handleSend = useCallback(async () => {
    if (!username || !input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    try {
      await sendChatMessage(username, text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, sending, username]);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }, [handleSend]);

  // Group consecutive messages from the same user
  const grouped = messages.map((msg, i) => ({
    ...msg,
    isGrouped: i > 0 && messages[i - 1].username === msg.username,
  }));

  return (
    <div style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      background: "var(--bg-primary)",
    }}>
      {/* Header */}
      <div style={{
        padding: "20px 28px 16px",
        borderBottom: "1px solid var(--border-color)",
        flexShrink: 0,
        background: "var(--bg-secondary)",
      }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--accent-gold)", fontWeight: 700, fontSize: "0.82rem" }}>
          grax.bet
        </div>
        <h1 style={{ margin: "4px 0 4px", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "clamp(1.6rem, 4vw, 2.4rem)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Site Chat
        </h1>
        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          {messages.length > 0 ? `${messages.length} messages` : "Be the first to say something"}
          {username && <span style={{ color: "var(--text-muted)" }}> • chatting as <span style={{ color: usernameColor(username) }}>{username}</span></span>}
        </p>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px 28px",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}>
        {messages.length === 0 && (
          <div style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 12,
            color: "var(--text-muted)",
          }}>
            <span style={{ fontSize: "3rem" }}>💬</span>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              No messages yet — say hi!
            </span>
          </div>
        )}

        {grouped.map((msg) => {
          const isMe = msg.username === username;

          // Win announcement card
          if (msg.type === "win") {
            const icon = GAME_ICONS[msg.game ?? ""] ?? "🎰";
            const amountStr = msg.amount != null
              ? `$${msg.amount % 1 === 0 ? msg.amount : msg.amount.toFixed(2)}`
              : "";
            return (
              <div key={msg.id} style={{ display: "flex", justifyContent: "center", marginTop: 18, marginBottom: 6 }}>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 20px",
                  borderRadius: 14,
                  background: "linear-gradient(135deg, rgba(240,180,41,0.18), rgba(240,180,41,0.06))",
                  border: "1px solid rgba(240,180,41,0.4)",
                  boxShadow: "0 0 24px rgba(240,180,41,0.15)",
                  maxWidth: 420,
                }}>
                  <span style={{ fontSize: "1.8rem", lineHeight: 1 }}>🏆</span>
                  <div>
                    <div style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 700,
                      fontSize: "1.1rem",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}>
                      <span style={{ color: usernameColor(msg.username) }}>{isMe ? "You" : msg.username}</span>
                      <span style={{ color: "var(--text-secondary)" }}> won </span>
                      <span style={{ color: "var(--accent-gold)" }}>{amountStr}</span>
                      <span style={{ color: "var(--text-secondary)" }}> on </span>
                      <span style={{ color: "var(--text-primary)" }}>{icon} {msg.game}</span>
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // Regular message
          return (
            <div key={msg.id} style={{
              display: "flex",
              flexDirection: "column",
              alignItems: isMe ? "flex-end" : "flex-start",
              marginTop: msg.isGrouped ? 2 : 14,
            }}>
              {!msg.isGrouped && (
                <div style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                  marginBottom: 4,
                  flexDirection: isMe ? "row-reverse" : "row",
                }}>
                  <span style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: usernameColor(msg.username),
                  }}>
                    {isMe ? "you" : msg.username}
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              )}
              <div style={{
                maxWidth: "min(520px, 75%)",
                padding: "9px 14px",
                borderRadius: msg.isGrouped
                  ? (isMe ? "12px 4px 4px 12px" : "4px 12px 12px 4px")
                  : (isMe ? "12px 4px 12px 12px" : "4px 12px 12px 12px"),
                background: isMe
                  ? "rgba(240,180,41,0.14)"
                  : "rgba(255,255,255,0.06)",
                border: isMe
                  ? "1px solid rgba(240,180,41,0.25)"
                  : "1px solid rgba(255,255,255,0.07)",
                color: "var(--text-primary)",
                fontSize: "0.95rem",
                lineHeight: 1.5,
                wordBreak: "break-word",
              }}>
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{
        padding: "14px 28px",
        borderTop: "1px solid var(--border-color)",
        background: "var(--bg-secondary)",
        flexShrink: 0,
        display: "flex",
        gap: 10,
        alignItems: "center",
      }}>
        <input
          ref={inputRef}
          type="text"
          placeholder={username ? `Message as ${username}...` : "Set a username to chat"}
          disabled={!username || sending}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          maxLength={300}
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            padding: "11px 16px",
            color: "var(--text-primary)",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "1rem",
            outline: "none",
          }}
        />
        <button
          onClick={() => void handleSend()}
          disabled={!username || !input.trim() || sending}
          style={{
            padding: "11px 22px",
            borderRadius: 10,
            background: input.trim() && username ? "rgba(240,180,41,0.2)" : "rgba(255,255,255,0.04)",
            border: "1px solid rgba(240,180,41,0.35)",
            color: input.trim() && username ? "var(--accent-gold)" : "var(--text-muted)",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700,
            fontSize: "1rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: input.trim() && username ? "pointer" : "default",
            transition: "all 0.15s",
            flexShrink: 0,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
