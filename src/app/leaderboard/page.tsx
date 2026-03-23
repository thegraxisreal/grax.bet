"use client";

import { useEffect, useRef, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { getDb } from "@/lib/firebase";
import { useUser } from "@/context/UserContext";

interface UserEntry {
  username: string;
  balance: number;
}

function TrophyIcon({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M6 2h8v6a4 4 0 01-8 0V2z" stroke="#f0b429" strokeWidth="1.4" fill="rgba(240,180,41,0.15)" strokeLinejoin="round"/>
        <path d="M6 4H3.5a1.5 1.5 0 000 3H6" stroke="#f0b429" strokeWidth="1.1" fill="none" strokeLinecap="round"/>
        <path d="M14 4h2.5a1.5 1.5 0 010 3H14" stroke="#f0b429" strokeWidth="1.1" fill="none" strokeLinecap="round"/>
        <line x1="10" y1="11" x2="10" y2="15" stroke="#f0b429" strokeWidth="1.3" strokeLinecap="round"/>
        <line x1="6.5" y1="15" x2="13.5" y2="15" stroke="#f0b429" strokeWidth="1.3" strokeLinecap="round"/>
        <circle cx="10" cy="2" r="1.2" fill="#f0b429"/>
      </svg>
    );
  }
  if (rank === 2) {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M6 2h8v6a4 4 0 01-8 0V2z" stroke="#c0c0c0" strokeWidth="1.4" fill="rgba(192,192,192,0.15)" strokeLinejoin="round"/>
        <path d="M6 4H3.5a1.5 1.5 0 000 3H6" stroke="#c0c0c0" strokeWidth="1.1" fill="none" strokeLinecap="round"/>
        <path d="M14 4h2.5a1.5 1.5 0 010 3H14" stroke="#c0c0c0" strokeWidth="1.1" fill="none" strokeLinecap="round"/>
        <line x1="10" y1="11" x2="10" y2="15" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round"/>
        <line x1="6.5" y1="15" x2="13.5" y2="15" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M6 2h8v6a4 4 0 01-8 0V2z" stroke="#cd7f32" strokeWidth="1.4" fill="rgba(205,127,50,0.15)" strokeLinejoin="round"/>
      <path d="M6 4H3.5a1.5 1.5 0 000 3H6" stroke="#cd7f32" strokeWidth="1.1" fill="none" strokeLinecap="round"/>
      <path d="M14 4h2.5a1.5 1.5 0 010 3H14" stroke="#cd7f32" strokeWidth="1.1" fill="none" strokeLinecap="round"/>
      <line x1="10" y1="11" x2="10" y2="15" stroke="#cd7f32" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="6.5" y1="15" x2="13.5" y2="15" stroke="#cd7f32" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

const MEDAL_COLORS = ["#f0b429", "#c0c0c0", "#cd7f32"];
const MEDAL_BG = ["rgba(240,180,41,0.08)", "rgba(192,192,192,0.06)", "rgba(205,127,50,0.06)"];
const MEDAL_BORDER = ["rgba(240,180,41,0.3)", "rgba(192,192,192,0.2)", "rgba(205,127,50,0.2)"];

export default function LeaderboardPage() {
  const { username: currentUser } = useUser();
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [pulse, setPulse] = useState(false);
  const currentUserRowRef = useRef<HTMLDivElement>(null);
  const hasScrolled = useRef(false);

  useEffect(() => {
    const db = getDb();
    const unsub = onSnapshot(collection(db, "users"), (snapshot) => {
      const entries: UserEntry[] = snapshot.docs.map((doc) => ({
        username: doc.id,
        balance: typeof doc.data().balance === "number" ? doc.data().balance : 0,
      }));
      entries.sort((a, b) => b.balance - a.balance);
      setUsers(entries);
      setLoading(false);
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    });
    return () => unsub();
  }, []);

  // Scroll to current user's row once after initial load
  useEffect(() => {
    if (!loading && currentUser && currentUserRowRef.current && !hasScrolled.current) {
      hasScrolled.current = true;
      setTimeout(() => {
        currentUserRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 600);
    }
  }, [loading, currentUser]);

  const totalMoney = users.reduce((sum, u) => sum + u.balance, 0);
  const currentUserRank = users.findIndex((u) => u.username === currentUser) + 1;
  const currentUserBalance = users.find((u) => u.username === currentUser)?.balance ?? 0;

  return (
    <main style={{
      minHeight: "100vh",
      background: "var(--bg-primary)",
      padding: "24px 20px 40px",
      fontFamily: "'Barlow Condensed', sans-serif",
    }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ marginBottom: 28 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <h1 style={{
              fontSize: "2.2rem",
              fontWeight: 800,
              letterSpacing: "0.05em",
              color: "var(--text-primary)",
              textTransform: "uppercase",
              margin: 0,
            }}>
              Leaderboard
            </h1>
            {/* Pulsing LIVE badge */}
            <span style={{
              background: "linear-gradient(135deg, #00e676, #00c853)",
              borderRadius: 10,
              padding: "3px 10px",
              fontSize: "0.6rem",
              letterSpacing: "0.12em",
              color: "#0f1923",
              fontWeight: 800,
              textTransform: "uppercase",
              boxShadow: pulse
                ? "0 0 16px rgba(0,230,118,0.9), 0 0 32px rgba(0,230,118,0.5)"
                : "0 0 8px rgba(0,230,118,0.5)",
              transition: "box-shadow 0.3s ease",
              animation: "glow-pulse 2s ease-in-out infinite",
            }}>
              Live
            </span>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", margin: 0 }}>
            Real-time rankings — updates instantly
          </p>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: 10,
            padding: "14px 18px",
          }}>
            <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
              Total Players
            </div>
            <div style={{ color: "var(--text-primary)", fontSize: "1.6rem", fontWeight: 700 }}>
              {users.length}
            </div>
          </div>
          <div style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: 10,
            padding: "14px 18px",
          }}>
            <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
              Money in Circulation
            </div>
            <div style={{ color: "var(--accent-gold)", fontSize: "1.6rem", fontWeight: 700 }}>
              ${totalMoney.toLocaleString()}
            </div>
          </div>
        </motion.div>

        {/* Your rank banner (always visible) */}
        <AnimatePresence>
          {!loading && currentUser && currentUserRank > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35 }}
              style={{ marginBottom: 16, overflow: "hidden" }}
            >
              <div style={{
                background: "linear-gradient(135deg, rgba(0,230,118,0.08), rgba(0,200,83,0.04))",
                border: "1px solid rgba(0,230,118,0.25)",
                borderRadius: 10,
                padding: "10px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}>
                <span style={{ color: "var(--accent-green)", fontSize: "0.8rem", letterSpacing: "0.08em", fontWeight: 600 }}>
                  YOUR RANK
                </span>
                <span style={{ color: "var(--text-primary)", fontSize: "1rem", fontWeight: 700 }}>
                  #{currentUserRank} · {currentUser}
                </span>
                <span style={{ color: "var(--accent-gold)", fontSize: "1rem", fontWeight: 700 }}>
                  ${currentUserBalance.toLocaleString()}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.18 }}
          style={{
            display: "grid",
            gridTemplateColumns: "52px 1fr auto",
            padding: "6px 16px 6px 12px",
            marginBottom: 4,
          }}
        >
          <span style={{ color: "var(--text-muted)", fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>Rank</span>
          <span style={{ color: "var(--text-muted)", fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>Player</span>
          <span style={{ color: "var(--text-muted)", fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>Balance</span>
        </motion.div>

        {/* Leaderboard rows */}
        {loading ? (
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 54,
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 10,
                  opacity: 0.4 + i * 0.05,
                  animation: "shimmer 1.4s ease-in-out infinite",
                }}
              />
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <AnimatePresence>
              {users.map((user, i) => {
                const rank = i + 1;
                const isTop3 = rank <= 3;
                const isCurrentUser = user.username === currentUser;
                const medalColor = isTop3 ? MEDAL_COLORS[i] : undefined;
                const medalBg = isTop3 ? MEDAL_BG[i] : undefined;
                const medalBorder = isTop3 ? MEDAL_BORDER[i] : undefined;

                return (
                  <motion.div
                    key={user.username}
                    ref={isCurrentUser ? currentUserRowRef : undefined}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.6) }}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "52px 1fr auto",
                      alignItems: "center",
                      padding: "12px 16px 12px 12px",
                      borderRadius: 10,
                      border: isCurrentUser
                        ? "1px solid rgba(0,230,118,0.35)"
                        : isTop3
                        ? `1px solid ${medalBorder}`
                        : "1px solid var(--border-color)",
                      background: isCurrentUser
                        ? "linear-gradient(135deg, rgba(0,230,118,0.07), rgba(0,200,83,0.03))"
                        : isTop3
                        ? medalBg
                        : "var(--bg-secondary)",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {/* Shimmer strip for top 3 */}
                    {isTop3 && (
                      <div style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 3,
                        background: medalColor,
                        borderRadius: "10px 0 0 10px",
                        opacity: 0.8,
                      }} />
                    )}

                    {/* Rank cell */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: isTop3 ? 4 : 0 }}>
                      {isTop3 ? (
                        <TrophyIcon rank={rank} />
                      ) : (
                        <span style={{
                          color: isCurrentUser ? "var(--accent-green)" : "var(--text-muted)",
                          fontSize: "1rem",
                          fontWeight: 700,
                          minWidth: 28,
                          textAlign: "center",
                        }}>
                          #{rank}
                        </span>
                      )}
                    </div>

                    {/* Username cell */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        color: isTop3
                          ? medalColor
                          : isCurrentUser
                          ? "var(--accent-green)"
                          : "var(--text-primary)",
                        fontSize: "1.05rem",
                        fontWeight: isTop3 || isCurrentUser ? 700 : 500,
                        letterSpacing: "0.02em",
                      }}>
                        {user.username}
                      </span>
                      {isCurrentUser && (
                        <span style={{
                          background: "rgba(0,230,118,0.15)",
                          border: "1px solid rgba(0,230,118,0.3)",
                          borderRadius: 6,
                          padding: "1px 6px",
                          fontSize: "0.6rem",
                          letterSpacing: "0.1em",
                          color: "var(--accent-green)",
                          fontWeight: 700,
                          textTransform: "uppercase",
                        }}>
                          You
                        </span>
                      )}
                    </div>

                    {/* Balance cell */}
                    <div style={{
                      color: isTop3
                        ? medalColor
                        : isCurrentUser
                        ? "var(--accent-green)"
                        : "var(--text-primary)",
                      fontSize: "1.05rem",
                      fontWeight: 700,
                      letterSpacing: "0.02em",
                      textAlign: "right",
                    }}>
                      ${user.balance.toLocaleString()}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Empty state */}
        {!loading && users.length === 0 && (
          <div style={{
            textAlign: "center",
            color: "var(--text-muted)",
            padding: "60px 0",
            fontSize: "1rem",
          }}>
            No players yet. Be the first!
          </div>
        )}

        {/* Footer note */}
        {!loading && users.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            style={{
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: "0.7rem",
              letterSpacing: "0.08em",
              marginTop: 20,
            }}
          >
            Updates in real-time via Firestore
          </motion.div>
        )}
      </div>
    </main>
  );
}
