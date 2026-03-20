"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const TRACKS = [
  { file: "/music/all-in.mp3",         label: "All In" },
  { file: "/music/felt-table.mp3",     label: "Felt Table" },
  { file: "/music/midnight-casino.mp3", label: "Midnight Casino" },
];

// Fisher-Yates shuffle
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [queue, setQueue] = useState<typeof TRACKS>(() => shuffled(TRACKS));
  const [trackIdx, setTrackIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const current = queue[trackIdx];

  // Create audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.volume = 0.35;
    audioRef.current = audio;
    return () => { audio.pause(); };
  }, []);

  // Load new track whenever queue/index changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = current.file;
    audio.load();
    if (playing) audio.play().catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackIdx, queue]);

  // Auto-advance to next track
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnd = () => {
      setTrackIdx(prev => {
        const next = prev + 1;
        if (next >= queue.length) {
          // Re-shuffle for next cycle, avoid same first song
          setQueue(shuffled(TRACKS));
          return 0;
        }
        return next;
      });
    };
    audio.addEventListener("ended", onEnd);
    return () => audio.removeEventListener("ended", onEnd);
  }, [queue]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setHasInteracted(true);
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
  }, [playing]);

  const skip = useCallback(() => {
    setHasInteracted(true);
    setTrackIdx(prev => {
      const next = prev + 1;
      if (next >= queue.length) {
        setQueue(shuffled(TRACKS));
        return 0;
      }
      return next;
    });
    // Keep playing if it was playing
    if (playing) {
      // small delay so src updates first
      setTimeout(() => {
        audioRef.current?.play().catch(() => {});
      }, 50);
    }
  }, [queue, playing]);

  // Dim label animation — scroll if long
  const shortLabel = current.label.length > 16
    ? current.label.slice(0, 14) + "…"
    : current.label;

  return (
    <div style={{
      padding: "12px 14px",
      borderTop: "1px solid var(--border-color)",
      background: "rgba(0,0,0,0.2)",
    }}>
      {/* Header row */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        marginBottom: "8px",
      }}>
        {/* Music note icon */}
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ flexShrink: 0 }}>
          <path d="M4 8.5V2.5l5-1v6" stroke="var(--accent-gold)" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="2.5" cy="8.5" r="1.5" fill="var(--accent-gold)" />
          <circle cx="7.5" cy="7.5" r="1.5" fill="var(--accent-gold)" />
        </svg>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 700,
          fontSize: "0.6rem",
          letterSpacing: "0.2em",
          color: "var(--accent-gold)",
          textTransform: "uppercase",
        }}>
          Casino Vibes
        </span>
        {/* Equalizer bars when playing */}
        {playing && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "flex-end", gap: "2px", height: "10px" }}>
            {[0, 1, 2].map(i => (
              <div
                key={i}
                style={{
                  width: "2px",
                  background: "var(--accent-gold)",
                  borderRadius: "1px",
                  animation: `eqBar ${0.5 + i * 0.15}s ease-in-out infinite alternate`,
                  height: `${4 + i * 3}px`,
                  opacity: 0.8,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Track name */}
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: "0.78rem",
        fontWeight: 600,
        color: playing ? "var(--text-primary)" : "var(--text-muted)",
        letterSpacing: "0.04em",
        marginBottom: "8px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        transition: "color 0.2s",
      }}>
        {shortLabel}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          title={playing ? "Pause" : "Play"}
          style={{
            background: playing ? "rgba(0,230,118,0.12)" : "rgba(255,255,255,0.07)",
            border: playing ? "1px solid rgba(0,230,118,0.3)" : "1px solid rgba(255,255,255,0.1)",
            borderRadius: "6px",
            width: "30px",
            height: "30px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: playing ? "var(--accent-green)" : "var(--text-secondary)",
            flexShrink: 0,
            transition: "all 0.15s",
          }}
        >
          {playing ? (
            /* Pause icon */
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <rect x="1.5" y="1" width="2.5" height="8" rx="0.8" />
              <rect x="6" y="1" width="2.5" height="8" rx="0.8" />
            </svg>
          ) : (
            /* Play icon */
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M2 1.5 L9 5 L2 8.5 Z" />
            </svg>
          )}
        </button>

        {/* Skip */}
        <button
          onClick={skip}
          title="Next track"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "6px",
            width: "30px",
            height: "30px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--text-muted)",
            flexShrink: 0,
            transition: "all 0.15s",
          }}
        >
          <svg width="11" height="10" viewBox="0 0 11 10" fill="currentColor">
            <path d="M1 1.5 L7 5 L1 8.5 Z" />
            <rect x="8" y="1" width="2" height="8" rx="0.8" />
          </svg>
        </button>

        {/* Hint for first interaction */}
        {!hasInteracted && (
          <span style={{
            fontSize: "0.58rem",
            fontFamily: "'Barlow Condensed', sans-serif",
            color: "var(--text-muted)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}>
            tap ▶ to play
          </span>
        )}
      </div>

      <style>{`
        @keyframes eqBar {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1.4); }
        }
      `}</style>
    </div>
  );
}
