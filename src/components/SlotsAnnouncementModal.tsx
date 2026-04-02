"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  castNextGameVote,
<<<<<<< codex/add-more-fun-game-ideas-edf2vp
=======
  listRecentCustomSuggestions,
  type CustomSuggestionDoc,
>>>>>>> claude/build-casino-app-BkTON
  type NextGamePollDoc,
  type NextGameVoteOption,
  subscribeToNextGamePoll,
} from "@/lib/firestore";
import { useUser } from "@/context/UserContext";

<<<<<<< codex/add-more-fun-game-ideas-edf2vp
const OPTION_CONFIG: Array<{ key: NextGameVoteOption; label: string; description: string; accent: string }> = [
  { key: "tower_climb", label: "Tower Climb", description: "Pick paths, dodge traps.", accent: "#22d3ee" },
  { key: "treasure_chests", label: "Treasure Chests", description: "Choose chests, avoid bust.", accent: "#fb7185" },
  { key: "lucky_wheel", label: "Lucky Wheel", description: "Spin for random multipliers.", accent: "#fbbf24" },
  { key: "custom", label: "Write-in", description: "Type your own idea.", accent: "#a78bfa" },
=======
const VOTED_STORAGE_KEY = "grax_next_game_vote_seen";

const OPTION_CONFIG: Array<{ key: NextGameVoteOption; label: string; accent: string }> = [
  { key: "tower_climb", label: "Tower Climb", accent: "#22d3ee" },
  { key: "treasure_chests", label: "Treasure Chests", accent: "#fb7185" },
  { key: "lucky_wheel", label: "Lucky Wheel", accent: "#fbbf24" },
  { key: "custom", label: "Write-in", accent: "#a78bfa" },
>>>>>>> claude/build-casino-app-BkTON
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
<<<<<<< codex/add-more-fun-game-ideas-edf2vp
  const [showResults, setShowResults] = useState(false);
  const [resultSnapshot, setResultSnapshot] = useState<NextGamePollDoc | null>(null);
=======
  const [customSuggestions, setCustomSuggestions] = useState<CustomSuggestionDoc[]>([]);
  const [featuredSuggestion, setFeaturedSuggestion] = useState<CustomSuggestionDoc | null>(null);
  const [hasVotedBefore, setHasVotedBefore] = useState(false);
>>>>>>> claude/build-casino-app-BkTON

  const { username } = useUser();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") {
      setVisible(false);
      setShowResults(false);
      return;
    }
    const t = setTimeout(() => setVisible(true), 350);
    return () => clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
<<<<<<< codex/add-more-fun-game-ideas-edf2vp
=======
    const seenVoteFlag = localStorage.getItem(VOTED_STORAGE_KEY) === "1";
    setHasVotedBefore(seenVoteFlag);
  }, []);

  useEffect(() => {
>>>>>>> claude/build-casino-app-BkTON
    const unsub = subscribeToNextGamePoll(
      (nextPoll) => setPoll(nextPoll),
      () => setStatusMessage("Live vote sync is unavailable right now."),
    );

    return () => unsub();
  }, []);

<<<<<<< codex/add-more-fun-game-ideas-edf2vp
  const optionMetrics = useMemo(() => {
    const sourcePoll = resultSnapshot ?? poll;
    return OPTION_CONFIG.map((option) => {
      const votes = sourcePoll.votesByOption?.[option.key] ?? 0;
      const pct = sourcePoll.totalVotes > 0 ? (votes / sourcePoll.totalVotes) * 100 : 0;
      return { ...option, votes, pct };
    });
  }, [poll, resultSnapshot]);
=======
  useEffect(() => {
    listRecentCustomSuggestions()
      .then((rows) => {
        setCustomSuggestions(rows.filter((row) => row.suggestion.trim().length > 0));
      })
      .catch(() => {
        // Non-fatal; poll still works even if suggestion pull fails.
      });
  }, [visible]);

  useEffect(() => {
    if (!customSuggestions.length) {
      setFeaturedSuggestion(null);
      return;
    }
    const randomIndex = Math.floor(Math.random() * customSuggestions.length);
    setFeaturedSuggestion(customSuggestions[randomIndex]);
  }, [customSuggestions, visible]);

  const optionMetrics = useMemo(() => {
    return OPTION_CONFIG.map((option) => {
      const votes = poll.votesByOption?.[option.key] ?? 0;
      const pct = poll.totalVotes > 0 ? (votes / poll.totalVotes) * 100 : 0;
      return { ...option, votes, pct };
    });
  }, [poll]);
>>>>>>> claude/build-casino-app-BkTON

  function dismiss() {
    setVisible(false);
    setStatusMessage(null);
<<<<<<< codex/add-more-fun-game-ideas-edf2vp
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
=======
>>>>>>> claude/build-casino-app-BkTON
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
<<<<<<< codex/add-more-fun-game-ideas-edf2vp
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
=======
      await castNextGameVote({
        option: selectedOption,
        voterName: username ?? "Anonymous",
        customSuggestion: selectedOption === "custom" ? customSuggestion.trim().slice(0, 80) : undefined,
      });

      setStatusMessage("Vote sent. Thanks for helping pick the next game!");
      localStorage.setItem(VOTED_STORAGE_KEY, "1");
      setHasVotedBefore(true);
      setCustomSuggestion("");

      const latestSuggestions = await listRecentCustomSuggestions();
      const validSuggestions = latestSuggestions.filter((row) => row.suggestion.trim().length > 0);
      setCustomSuggestions(validSuggestions);
      if (validSuggestions.length) {
        const randomIndex = Math.floor(Math.random() * validSuggestions.length);
        setFeaturedSuggestion(validSuggestions[randomIndex]);
      }
>>>>>>> claude/build-casino-app-BkTON
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
        background: "rgba(2,6,23,0.84)",
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
          background: "linear-gradient(160deg, #0f172a 0%, #111827 50%, #1f2937 100%)",
          border: "1px solid rgba(148,163,184,0.35)",
          borderRadius: 22,
<<<<<<< codex/add-more-fun-game-ideas-edf2vp
          padding: "30px 24px 24px",
          maxWidth: 500,
=======
          padding: "26px 22px 20px",
          maxWidth: 620,
>>>>>>> claude/build-casino-app-BkTON
          width: "100%",
          position: "relative",
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
        }}
      >
        <button
          onClick={dismiss}
          style={{
            position: "absolute",
            top: 11,
            right: 11,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.14)",
            color: "rgba(255,255,255,0.8)",
            width: 30,
            height: 30,
            borderRadius: 999,
            fontSize: "1rem",
            cursor: "pointer",
          }}
          aria-label="Close"
        >
          ✕
        </button>

<<<<<<< codex/add-more-fun-game-ideas-edf2vp
        <div
=======
        <p
>>>>>>> claude/build-casino-app-BkTON
          style={{
            margin: 0,
            marginBottom: 8,
            fontFamily: "'Barlow Condensed', sans-serif",
<<<<<<< codex/add-more-fun-game-ideas-edf2vp
            fontWeight: 900,
            fontSize: "2rem",
=======
>>>>>>> claude/build-casino-app-BkTON
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#93c5fd",
            fontWeight: 700,
            fontSize: ".8rem",
          }}
        >
<<<<<<< codex/add-more-fun-game-ideas-edf2vp
          Vote On The Next Game
        </div>
=======
          Community Poll
        </p>
>>>>>>> claude/build-casino-app-BkTON

        <h2
          style={{
            margin: 0,
            color: "#f8fafc",
            fontFamily: "'Barlow Condensed', sans-serif",
<<<<<<< codex/add-more-fun-game-ideas-edf2vp
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
=======
            textTransform: "uppercase",
            letterSpacing: ".07em",
            fontSize: "1.75rem",
            marginBottom: 14,
          }}
        >
          Vote on the next game
        </h2>

        <form onSubmit={handleVoteSubmit} style={{ display: "grid", gap: 10, marginBottom: 18 }}>
>>>>>>> claude/build-casino-app-BkTON
          {OPTION_CONFIG.map((option) => {
            const isSelected = option.key === selectedOption;
            return (
              <label
                key={option.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
<<<<<<< codex/add-more-fun-game-ideas-edf2vp
                  border: `1px solid ${isSelected ? "rgba(52,211,153,0.5)" : "rgba(148,163,184,0.28)"}`,
                  background: isSelected ? "rgba(52,211,153,0.1)" : "rgba(15,23,42,0.55)",
=======
                  border: `1px solid ${isSelected ? option.accent : "rgba(148,163,184,0.28)"}`,
                  background: isSelected ? "rgba(148,163,184,0.12)" : "rgba(15,23,42,0.55)",
>>>>>>> claude/build-casino-app-BkTON
                  borderRadius: 12,
                  padding: "10px 12px",
                  color: "#e2e8f0",
                  cursor: "pointer",
<<<<<<< codex/add-more-fun-game-ideas-edf2vp
                  fontFamily: "'Barlow Condensed', sans-serif",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
=======
>>>>>>> claude/build-casino-app-BkTON
                }}
              >
                <input
                  type="radio"
                  name="vote-option"
                  value={option.key}
                  checked={isSelected}
                  onChange={() => setSelectedOption(option.key)}
                />
<<<<<<< codex/add-more-fun-game-ideas-edf2vp
                <div style={{ display: "grid", gap: 1 }}>
                  <span style={{ fontWeight: 700 }}>{option.label}</span>
                  <span style={{ fontSize: ".72rem", color: "#94a3b8", textTransform: "none", letterSpacing: 0 }}>
                    {option.description}
                  </span>
                </div>
=======
                <span style={{ fontWeight: 700 }}>{option.label}</span>
>>>>>>> claude/build-casino-app-BkTON
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
<<<<<<< codex/add-more-fun-game-ideas-edf2vp
                border: "1px solid rgba(52,211,153,0.45)",
                background: "rgba(2,6,23,0.6)",
=======
                border: "1px solid rgba(167,139,250,0.5)",
                background: "rgba(30,41,59,0.72)",
>>>>>>> claude/build-casino-app-BkTON
                color: "#f8fafc",
                padding: "10px 12px",
                fontSize: ".95rem",
              }}
            />
          )}
<<<<<<< codex/add-more-fun-game-ideas-edf2vp

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
=======

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              marginTop: 4,
              width: "100%",
              border: "none",
              borderRadius: 11,
              padding: "12px 16px",
              background: "linear-gradient(120deg, #22c55e, #3b82f6)",
              color: "white",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: ".08em",
              cursor: isSubmitting ? "wait" : "pointer",
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? "Submitting..." : "Vote now"}
          </button>
        </form>

        <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
          {optionMetrics.map((option) => (
            <div key={option.key}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, color: "#cbd5e1", fontSize: ".86rem" }}>
                <span>{option.label}</span>
                <span>{option.pct.toFixed(0)}%</span>
              </div>
              <div style={{ background: "rgba(148,163,184,0.2)", borderRadius: 999, overflow: "hidden", height: 9 }}>
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

        <p style={{ margin: 0, color: "#94a3b8", fontSize: ".84rem" }}>
          Total votes: <strong style={{ color: "#e2e8f0" }}>{poll.totalVotes}</strong>
        </p>

        {(hasVotedBefore || statusMessage?.startsWith("Vote sent")) && featuredSuggestion && (
          <div
            style={{
              marginTop: 14,
              borderRadius: 12,
              border: "1px solid rgba(167,139,250,0.4)",
              background: "rgba(109,40,217,0.12)",
              padding: "12px 13px",
              color: "#e9d5ff",
              fontSize: ".88rem",
            }}
          >
            <strong>{featuredSuggestion.voterName}</strong> said <em>“{featuredSuggestion.suggestion}”</em>
>>>>>>> claude/build-casino-app-BkTON
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
