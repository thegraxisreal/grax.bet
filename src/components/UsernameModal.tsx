"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/context/UserContext";

export default function UsernameModal() {
  const { needsUsername, saveUsername } = useUser();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await saveUsername(value.trim());
      if (!result.success) {
        setError(result.error ?? "Something went wrong.");
      }
    } catch (err) {
      console.error("handleSubmit error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {needsUsername && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <motion.div
            key="card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              background: "#0f1923",
              border: "1px solid rgba(240,180,41,0.4)",
              borderRadius: 12,
              padding: 40,
              width: "100%",
              maxWidth: 420,
              margin: "0 16px",
            }}
          >
            <h1
              style={{
                color: "#f0b429",
                fontSize: "2rem",
                fontWeight: 800,
                letterSpacing: "0.1em",
                margin: "0 0 8px",
                textAlign: "center",
              }}
            >
              WELCOME TO GRAX.BET
            </h1>
            <p
              style={{
                color: "#8899aa",
                textAlign: "center",
                margin: "0 0 24px",
              }}
            >
              Enter your player name to begin
            </p>

            <form onSubmit={handleSubmit}>
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="PlayerName"
                disabled={loading}
                style={{
                  width: "100%",
                  background: "#1a2535",
                  border: `1px solid ${error ? "#ff4d4d" : "#2a3545"}`,
                  color: "white",
                  borderRadius: 8,
                  padding: "12px 16px",
                  fontSize: "1rem",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => {
                  if (!error) e.currentTarget.style.borderColor = "#00e676";
                }}
                onBlur={(e) => {
                  if (!error) e.currentTarget.style.borderColor = "#2a3545";
                }}
              />
              <p
                style={{
                  color: "#8899aa",
                  fontSize: "0.75rem",
                  margin: "6px 0 16px",
                }}
              >
                3–16 characters, letters, numbers, and underscores only
              </p>

              <button
                type="submit"
                disabled={loading || value.trim().length === 0}
                style={{
                  width: "100%",
                  background: "#00e676",
                  color: "black",
                  fontWeight: 700,
                  fontSize: "1rem",
                  border: "none",
                  borderRadius: 8,
                  padding: "12px 0",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                {loading ? "Checking..." : "Let's Play"}
              </button>

              {error && (
                <p
                  style={{
                    color: "#ff4d4d",
                    margin: "12px 0 0",
                    fontSize: "0.875rem",
                    textAlign: "center",
                  }}
                >
                  {error}
                </p>
              )}
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
