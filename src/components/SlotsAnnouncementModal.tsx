"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  castNextGameVote,
  type NextGamePollDoc,
  type NextGameVoteOption,
  subscribeToNextGamePoll,
} from "@/lib/firestore";
import { useUser } from "@/context/UserContext";

const OPTION_CONFIG: Array<{ key: NextGameVoteOption; label: string; accent: string }> = [
  { key: "tower_climb", label: "Tower Climb", accent: "#22d3ee" },
  { key: "treasure_chests", label: "Treasure Chests", accent: "#fb7185" },
  { key: "lucky_wheel", label: "Lucky Wheel", accent: "#fbbf24" },
  { key: "custom", label: "Write-in", accent: "#a78bfa" },
];

const EMPTY_POLL: NextGamePollDoc = {
  totalVotes: 0,
  votesByOption: {
    tower_climb: 0,
    treasure_chests: 0,
    lucky_wheel: 0,
    custom: 0,
  },
};

export default function SlotsAnnouncementModal() {
  const [visible, setVisible] = useState(false);
  const [selectedOption, setSelectedOption] = useState<NextGameVoteOption>("tower_climb");
  const [customSuggestion, setCustomSuggestion] = useState("");
  const [poll, setPoll] = useState<NextGamePollDoc>(EMPTY_POLL);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [resultSnapshot, setResultSnapshot] = useState<NextGamePollDoc | null>(null);

  const { username } = useUser();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") {
      setVisible(false);
      setShowResults(false);
      return;
    }
    const t = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    const unsub = subscribeToNextGamePoll(
      (nextPoll) => setPoll(nextPoll),
      () => setStatusMessage("Live vote sync is unavailable right now."),
    );

    return () => unsub();
  }, []);

  const optionMetrics = useMemo(() => {
    const sourcePoll = resultSnapshot ?? poll;
    return OPTION_CONFIG.map((option) => {
      const votes = sourcePoll.votesByOption?.[option.key] ?? 0;
      const pct = sourcePoll.totalVotes > 0 ? (votes / sourcePoll.totalVotes) * 100 : 0;
      return { ...option, votes, pct };
    });
  }, [poll, resultSnapshot]);

  function dismiss() {
    setVisible(false);
    setStatusMessage(null);
    setShowResults(false);
    setResultSnapshot(null);
  }

  function buildOptimisticResult(option: NextGameVoteOption): NextGamePollDoc {
    const totalVotes = (poll.totalVotes ?? 0) + 1;
    return {
      totalVotes,
      votesByOption: {
        tower_climb: (poll.votesByOption?.tower_climb ?? 0) + (option === "tower_climb" ? 1 : 0),
        treasure_chests: (poll.votesByOption?.treasure_chests ?? 0) + (option === "treasure_chests" ? 1 : 0),
        lucky_wheel: (poll.votesByOption?.lucky_wheel ?? 0) + (option === "lucky_wheel" ? 1 : 0),
        custom: (poll.votesByOption?.custom ?? 0) + (option === "custom" ? 1 : 0),
      },
    };
  }

  async function handleVoteSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (selectedOption === "custom" && !customSuggestion.trim()) {
      setStatusMessage("Please type your custom game idea first.");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const submittedOption = selectedOption;
      await castNextGameVote({
        option: submittedOption,
        voterName: username ?? "Anonymous",
        customSuggestion: submittedOption === "custom" ? customSuggestion.trim().slice(0, 80) : undefined,
      });

      setCustomSuggestion("");
      setResultSnapshot(buildOptimisticResult(submittedOption));
      setStatusMessage("Vote sent.");
      setShowResults(true);

      setTimeout(() => {
        dismiss();
      }, 2000);
    } catch {
      setStatusMessage("Could not submit vote. Try again in a few seconds.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!visible) return null;

  return (
    <div
      onClick={dismiss}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.82)",
        backdropFilter: "blur(8px)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(160deg, #0d1e2e 0%, #0a1520 60%, #0f1923 100%)",
          border: "2px solid rgba(34,197,94,0.45)",
          borderRadius: 22,
          padding: "30px 24px 24px",
          maxWidth: 500,
          width: "100%",
          textAlign: "center",
          position: "relative",
          boxShadow: "0 0 28px rgba(34,197,94,0.26)",
        }}
      >
        <button
          onClick={dismiss}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.5)",
            fontSize: "1.2rem",
            cursor: "pointer",
          }}
          aria-label="Close"
        >
          ✕
        </button>

        <div
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: "2rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            lineHeight: 1,
            marginBottom: 10,
            color: "#86efac",
          }}
        >
          Vote On The Next Game
        </div>

        <p
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "0.95rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "var(--text-secondary)",
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          Pick one option below
        </p>

        <form onSubmit={handleVoteSubmit} style={{ display: "grid", gap: 9, marginBottom: showResults ? 14 : 0, textAlign: "left" }}>
          {OPTION_CONFIG.map((option) => {
            const isSelected = option.key === selectedOption;
            return (
              <label
                key={option.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  border: `1px solid ${isSelected ? "rgba(52,211,153,0.5)" : "rgba(148,163,184,0.28)"}`,
                  background: isSelected ? "rgba(52,211,153,0.1)" : "rgba(15,23,42,0.55)",
                  borderRadius: 12,
                  padding: "10px 12px",
                  color: "#e2e8f0",
                  cursor: "pointer",
                  fontFamily: "'Barlow Condensed', sans-serif",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                <input
                  type="radio"
                  name="vote-option"
                  value={option.key}
                  checked={isSelected}
                  onChange={() => setSelectedOption(option.key)}
                />
                <span style={{ fontWeight: 700 }}>{option.label}</span>
              </label>
            );
          })}

          {selectedOption === "custom" && (
            <input
              value={customSuggestion}
              onChange={(e) => setCustomSuggestion(e.target.value.slice(0, 80))}
              placeholder="Type your custom game idea..."
              style={{
                width: "100%",
                borderRadius: 10,
                border: "1px solid rgba(52,211,153,0.45)",
                background: "rgba(2,6,23,0.6)",
                color: "#f8fafc",
                padding: "10px 12px",
                fontSize: ".95rem",
              }}
            />
          )}

          <button
            type="submit"
            disabled={isSubmitting || showResults}
            style={{
              marginTop: 4,
              width: "100%",
              padding: "14px 20px",
              borderRadius: 10,
              border: "none",
              background: "linear-gradient(135deg, #22c55e, #16a34a)",
              color: "#062315",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900,
              fontSize: "1.05rem",
              letterSpacing: "0.13em",
              textTransform: "uppercase",
              cursor: isSubmitting || showResults ? "wait" : "pointer",
              opacity: isSubmitting || showResults ? 0.8 : 1,
            }}
          >
            {isSubmitting ? "Submitting..." : "Vote"}
          </button>
        </form>

        {showResults && (
          <div style={{ display: "grid", gap: 7, textAlign: "left" }}>
            {optionMetrics.map((option) => (
              <div key={option.key}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, color: "#cbd5e1", fontSize: ".8rem" }}>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", textTransform: "uppercase", letterSpacing: ".05em" }}>{option.label}</span>
                  <span>{option.pct.toFixed(0)}%</span>
                </div>
                <div style={{ background: "rgba(148,163,184,0.2)", borderRadius: 999, overflow: "hidden", height: 8 }}>
                  <div
                    style={{
                      width: `${option.pct}%`,
                      background: `linear-gradient(90deg, ${option.accent}, rgba(255,255,255,0.85))`,
                      height: "100%",
                      transition: "width 220ms ease",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {statusMessage && (
          <p style={{ marginTop: 10, marginBottom: 0, color: statusMessage.startsWith("Vote sent") ? "#86efac" : "#fca5a5", fontSize: ".85rem" }}>
            {statusMessage}
          </p>
        )}
      </div>
    </div>
  );
}
