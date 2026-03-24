"use client";

import Link from "next/link";
import { useCallback, useEffect, useReducer } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBalance } from "@/context/BalanceContext";
import { useUser } from "@/context/UserContext";
import { logFeedEvent } from "@/lib/feed";
import { fmtMoney } from "@/lib/format";
import { CasinoChip } from "@/components/CasinoChip";
import CollapsibleBetSelector from "@/components/CollapsibleBetSelector";
import PlayingCard from "@/components/PlayingCard";
import {
  buildDeck, shuffleDeck, handTotal, handLabel, isBlackjack,
  dealerShouldHit, canDouble, canSplit, cardString, evaluateHand,
  payoutMultiplier,
  type Card, type GamePhase, type Hand, type HandResult,
} from "@/lib/blackjack";
import {
  playCardDeal, playWin, playLose, playBlackjack,
} from "@/lib/sound";

// ── State ──────────────────────────────────────────────────────────────────

interface State {
  phase: GamePhase;
  deck: Card[];
  playerHands: Hand[];
  activeHandIndex: number;
  dealerHand: Card[];
  currentBet: number;
  insuranceBet: number;
  insuranceResult?: "win" | "lose";
  lastBet: number;
}

type Action =
  | { type: "ADD_BET"; amount: number }
  | { type: "SET_BET"; amount: number }
  | { type: "CLEAR_BET" }
  | { type: "DEAL"; balance: number }
  | { type: "TAKE_INSURANCE" }
  | { type: "DECLINE_INSURANCE" }
  | { type: "HIT" }
  | { type: "STAND" }
  | { type: "DOUBLE"; balance: number }
  | { type: "SPLIT"; balance: number }
  | { type: "DEALER_HIT" }
  | { type: "NEW_HAND" };

function initialState(): State {
  return {
    phase: "betting",
    deck: shuffleDeck(buildDeck(6)),
    playerHands: [],
    activeHandIndex: 0,
    dealerHand: [],
    currentBet: 0,
    insuranceBet: 0,
    lastBet: 0,
  };
}

function drawCard(deck: Card[], faceDown = false): [Card, Card[]] {
  const [card, ...rest] = deck;
  return [{ ...card, faceDown }, rest];
}

function resolveAllHands(
  playerHands: Hand[],
  dealerHand: Card[]
): Hand[] {
  return playerHands.map(hand => {
    const result = evaluateHand(hand, dealerHand);
    return { ...hand, result };
  });
}

function needsDealerPlay(playerHands: Hand[]): boolean {
  // Dealer plays unless all hands are bust
  return playerHands.some(h => {
    const { total } = handTotal(h.cards);
    return total <= 21;
  });
}

/** Reveal hole card and start dealer turn, or skip straight to result if all bust */
function startDealerTurn(state: State, hands: Hand[], deck: Card[]): State {
  const revealed = state.dealerHand.map(c => ({ ...c, faceDown: false }));
  if (needsDealerPlay(hands)) {
    return { ...state, deck, playerHands: hands, dealerHand: revealed, phase: "dealer" };
  }
  // All bust — no dealer play, resolve immediately
  const resolved = resolveAllHands(hands, revealed);
  return { ...state, deck, playerHands: resolved, dealerHand: revealed, phase: "result" };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD_BET": {
      const next = Math.round((state.currentBet + action.amount) * 100) / 100;
      return { ...state, currentBet: next };
    }
    case "SET_BET":
      return { ...state, currentBet: Math.round(action.amount * 100) / 100 };
    case "CLEAR_BET":
      return { ...state, currentBet: 0 };

    case "DEAL": {
      if (state.currentBet <= 0 || state.currentBet > action.balance) return state;
      let deck = state.deck;
      if (deck.length < 52) deck = shuffleDeck(buildDeck(6));

      const [p1, deck2] = drawCard(deck);
      const [dc1, deck3] = drawCard(deck2);
      const [p2, deck4] = drawCard(deck3);
      const [dc2, deck5] = drawCard(deck4, true); // hole card face down
      deck = deck5;

      const playerHand: Hand = { cards: [p1, p2], bet: state.currentBet };
      const dealerHand = [dc1, dc2];

      // Check insurance
      const phase: GamePhase = dc1.rank === "A" ? "insurance" : "player";

      return {
        ...state,
        deck,
        playerHands: [playerHand],
        activeHandIndex: 0,
        dealerHand,
        currentBet: 0,
        lastBet: state.currentBet,
        insuranceBet: 0,
        insuranceResult: undefined,
        phase,
      };
    }

    case "TAKE_INSURANCE": {
      const insAmt = Math.round((state.lastBet / 2) * 100) / 100;
      return { ...state, insuranceBet: insAmt, phase: "player" };
    }
    case "DECLINE_INSURANCE":
      return { ...state, insuranceBet: 0, phase: "player" };

    case "HIT": {
      if (state.phase !== "player") return state;
      const hands = [...state.playerHands];
      const hand = hands[state.activeHandIndex];
      const [card, deck] = drawCard(state.deck);
      const newHand: Hand = { ...hand, cards: [...hand.cards, card] };
      hands[state.activeHandIndex] = newHand;

      const { total } = handTotal(newHand.cards);

      if (total >= 21) {
        // Auto-advance or go to dealer
        const nextIdx = state.activeHandIndex + 1;
        if (nextIdx < hands.length) {
          return { ...state, deck, playerHands: hands, activeHandIndex: nextIdx };
        }
        return startDealerTurn(state, hands, deck);
      }

      return { ...state, deck, playerHands: hands };
    }

    case "STAND": {
      if (state.phase !== "player") return state;
      const hands = [...state.playerHands];
      const nextIdx = state.activeHandIndex + 1;
      if (nextIdx < hands.length) {
        return { ...state, activeHandIndex: nextIdx };
      }
      return startDealerTurn(state, hands, state.deck);
    }

    case "DOUBLE": {
      if (state.phase !== "player") return state;
      const hands = [...state.playerHands];
      const hand = hands[state.activeHandIndex];
      if (!canDouble(hand)) return state;

      const [card, deck] = drawCard(state.deck);
      const newHand: Hand = { ...hand, cards: [...hand.cards, card], doubled: true };
      hands[state.activeHandIndex] = newHand;

      // Auto-stand after double
      const nextIdx = state.activeHandIndex + 1;
      if (nextIdx < hands.length) {
        return { ...state, deck, playerHands: hands, activeHandIndex: nextIdx };
      }
      return startDealerTurn(state, hands, deck);
    }

    case "SPLIT": {
      if (state.phase !== "player") return state;
      const hands = [...state.playerHands];
      const hand = hands[state.activeHandIndex];
      if (!canSplit(hand, hands)) return state;

      const [card1, d1] = drawCard(state.deck);
      const [card2, deck] = drawCard(d1);

      const hand1: Hand = { cards: [hand.cards[0], card1], bet: hand.bet, split: true };
      const hand2: Hand = { cards: [hand.cards[1], card2], bet: hand.bet, split: true };

      hands.splice(state.activeHandIndex, 1, hand1, hand2);
      return { ...state, deck, playerHands: hands };
    }

    case "DEALER_HIT": {
      if (state.phase !== "dealer") return state;
      if (dealerShouldHit(state.dealerHand)) {
        const [card, deck] = drawCard(state.deck);
        return { ...state, deck, dealerHand: [...state.dealerHand, card] };
      }
      // Dealer stands — resolve all hands
      const resolved = resolveAllHands(state.playerHands, state.dealerHand);
      return { ...state, playerHands: resolved, phase: "result" };
    }

    case "NEW_HAND":
      return {
        ...initialState(),
        deck: state.deck.length > 52 ? state.deck : shuffleDeck(buildDeck(6)),
        lastBet: state.lastBet,
        currentBet: state.lastBet, // Pre-fill last bet
      };

    default:
      return state;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function resultLabel(result: HandResult, doubled = false): string {
  const d = doubled ? " (DOUBLED)" : "";
  switch (result) {
    case "blackjack": return "BLACKJACK!";
    case "win":       return `WIN${d}`;
    case "lose":      return `LOSE${d}`;
    case "push":      return "PUSH";
    case "bust":      return "BUST";
    default: return "";
  }
}

function resultClass(result: HandResult): string {
  switch (result) {
    case "blackjack": return "blackjack";
    case "win":       return "win";
    case "lose":
    case "bust":      return "lose";
    case "push":      return "push";
    default: return "";
  }
}

function computePayout(hand: Hand): number {
  if (!hand.result) return 0;
  return Math.round(hand.bet * payoutMultiplier(hand.result, hand.doubled) * 100) / 100;
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function BlackjackPage() {
  const { balance, addBalance, subtractBalance, registerBet, unregisterBet } = useBalance();
  const { username } = useUser();
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  const { phase, playerHands, activeHandIndex, dealerHand, currentBet, lastBet, insuranceBet } = state;

  // Apply payouts when result phase
  useEffect(() => {
    if (phase !== "result") return;
    // Sounds only — payouts are applied in handleNewHand
    const hasBlackjack = playerHands.some(h => h.result === "blackjack");
    const hasWin = playerHands.some(h => h.result === "win" || h.result === "blackjack");
    const allLose = playerHands.every(h => h.result === "lose" || h.result === "bust");

    if (hasBlackjack) playBlackjack();
    else if (hasWin) playWin();
    else if (allLose) playLose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Dealer turn: one card at a time, 750ms apart
  useEffect(() => {
    if (phase !== "dealer") return;
    const timer = setTimeout(() => {
      if (dealerShouldHit(dealerHand)) playCardDeal();
      dispatch({ type: "DEALER_HIT" });
    }, 750);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, dealerHand.length]);

  // Deduct bet when dealing
  const handleDeal = useCallback(() => {
    if (currentBet <= 0 || currentBet > balance) return;
    subtractBalance(currentBet);
    registerBet();
    dispatch({ type: "DEAL", balance });
    playCardDeal();
  }, [currentBet, balance, subtractBalance, registerBet]);

  // Add bet (chip click)
  const handleAddBet = useCallback((amount: number) => {
    if (phase !== "betting") return;
    const maxAdd = balance - currentBet;
    const safeAdd = Math.min(amount, maxAdd);
    if (safeAdd <= 0) return;
    dispatch({ type: "ADD_BET", amount: safeAdd });
  }, [phase, balance, currentBet]);

  const handleHit = useCallback(() => {
    dispatch({ type: "HIT" });
    playCardDeal();
  }, []);

  const handleStand = useCallback(() => dispatch({ type: "STAND" }), []);

  const handleDouble = useCallback(() => {
    const hand = playerHands[activeHandIndex];
    if (!hand || !canDouble(hand)) return;
    if (balance < hand.bet) return;
    subtractBalance(hand.bet);
    dispatch({ type: "DOUBLE", balance });
    playCardDeal();
  }, [playerHands, activeHandIndex, balance, subtractBalance]);

  const handleSplit = useCallback(() => {
    const hand = playerHands[activeHandIndex];
    if (!hand || !canSplit(hand, playerHands)) return;
    if (balance < hand.bet) return;
    subtractBalance(hand.bet);
    dispatch({ type: "SPLIT", balance });
    playCardDeal();
  }, [playerHands, activeHandIndex, balance, subtractBalance]);

  const handleNewHand = useCallback(() => {
    if (phase !== "result") return;
    // Return payout amounts
    let totalPayout = 0;
    const totalBet = playerHands.reduce((sum, h) => sum + h.bet, 0);
    for (const hand of playerHands) {
      const payout = computePayout(hand);
      if (payout > 0) { addBalance(payout); totalPayout += payout; }
    }
    // Insurance
    const dealerBJ = isBlackjack(dealerHand);
    if (insuranceBet > 0) {
      if (dealerBJ) { addBalance(insuranceBet * 3); totalPayout += insuranceBet * 3; }
    }
    const net = Math.round((totalPayout - totalBet) * 100) / 100;
    if (username) {
      if (net > 0) logFeedEvent(username, "Blackjack", net, "win");
      else if (net < 0) logFeedEvent(username, "Blackjack", Math.abs(net), "loss");
    }
    unregisterBet();
    dispatch({ type: "NEW_HAND" });
  }, [phase, playerHands, dealerHand, insuranceBet, addBalance, unregisterBet, username]);

  const handleTakeInsurance = useCallback(() => {
    const insAmt = Math.round((lastBet / 2) * 100) / 100;
    if (balance < insAmt) return;
    subtractBalance(insAmt);
    dispatch({ type: "TAKE_INSURANCE" });
  }, [lastBet, balance, subtractBalance]);

  const handleDeclineInsurance = useCallback(() => {
    dispatch({ type: "DECLINE_INSURANCE" });
  }, []);

  // ── Derived state ────────────────────────────────────────────────────────
  const activeHand = playerHands[activeHandIndex];
  const { total: activeTotal } = activeHand ? handTotal(activeHand.cards) : { total: 0 };
  const { total: dealerTotal } = handTotal(dealerHand);
  const dealerShowAll = phase === "result" || phase === "dealer";

  const canHitAction    = phase === "player" && activeTotal < 21;
  const canStandAction  = phase === "player";
  const canDoubleAction = phase === "player" && activeHand && canDouble(activeHand) && balance >= (activeHand?.bet ?? 0);
  const canSplitAction  = phase === "player" && activeHand && canSplit(activeHand, playerHands) && balance >= (activeHand?.bet ?? 0);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* SVG filter for felt texture */}
      <svg style={{ position: "absolute", width: 0, height: 0 }}>
        <defs>
          <filter id="felt-filter" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.65"
              numOctaves="3"
              stitchTiles="stitch"
              result="noise"
            />
            <feColorMatrix
              type="saturate"
              values="0"
              in="noise"
              result="grayNoise"
            />
            <feBlend in="SourceGraphic" in2="grayNoise" mode="multiply" result="blended" />
            <feComposite in="blended" in2="SourceGraphic" operator="in" />
          </filter>
        </defs>
      </svg>

      {/* Table area */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        minHeight: 0,
      }}>
        {/* Felt table */}
        <div className="bj-felt-table" style={{
          flex: 1,
          margin: "16px 16px 0",
          borderRadius: "160px 160px 0 0",
          background: "radial-gradient(ellipse at 50% 20%, #236b3b 0%, #1a5230 40%, #0e3b1c 100%)",
          border: "2px solid rgba(240,180,41,0.3)",
          borderBottom: "none",
          boxShadow: "0 0 60px rgba(0,0,0,0.8) inset, 0 0 30px rgba(0,0,0,0.6)",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
          minHeight: 0,
        }}>
          <div style={{ position: "absolute", top: 18, right: 18, zIndex: 5 }}>
            <Link
              href="/blackjack-mp"
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid rgba(240,180,41,0.35)",
                background: "rgba(240,180,41,0.08)",
                color: "var(--accent-gold)",
                textDecoration: "none",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontSize: "0.82rem",
              }}
            >
              Multiplayer →
            </Link>
          </div>

        {/* Felt grain overlay */}
          <div style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`,
            backgroundSize: "200px 200px",
            pointerEvents: "none",
            borderRadius: "inherit",
            mixBlendMode: "overlay",
          }} />

          {/* Table arc text */}
          <svg
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "80px", pointerEvents: "none" }}
            viewBox="0 0 800 80"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <path id="leftArc" d="M 100,70 Q 250,10 400,5" />
              <path id="rightArc" d="M 400,5 Q 550,10 700,70" />
            </defs>
            <text className="table-label" fill="rgba(255,255,255,0.4)" fontSize="11" letterSpacing="3">
              <textPath href="#leftArc">BLACKJACK PAYS 3 TO 2</textPath>
            </text>
            <text className="table-label" fill="rgba(255,255,255,0.4)" fontSize="11" letterSpacing="3">
              <textPath href="#rightArc">DEALER MUST HIT SOFT 17</textPath>
            </text>
          </svg>

          {/* Golden border trim inner arc */}
          <div style={{
            position: "absolute",
            inset: "6px",
            borderRadius: "154px 154px 0 0",
            border: "1px solid rgba(240,180,41,0.15)",
            pointerEvents: "none",
          }} />

          {/* DEALER ZONE */}
          <div className="bj-dealer-zone" style={{
            flex: "0 0 auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: "50px",
            gap: "10px",
            minHeight: "170px",
          }}>
            <div style={{
              fontSize: "0.65rem",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 600,
              letterSpacing: "0.2em",
              color: "rgba(255,255,255,0.3)",
              textTransform: "uppercase",
            }}>
              Dealer
            </div>

            {/* Dealer hand */}
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
              {dealerHand.length === 0 ? (
                // Placeholder card outlines
                <>{[0,1].map(i => (
                  <div key={i} style={{
                    width: "80px",
                    height: "120px",
                    borderRadius: "8px",
                    border: "2px dashed rgba(255,255,255,0.12)",
                    background: "rgba(0,0,0,0.15)",
                  }} />
                ))}</>
              ) : (
                dealerHand.map((card, i) => (
                  <PlayingCard
                    key={`${cardString(card)}-${i}`}
                    card={card}
                    index={i}
                    faceDown={!dealerShowAll && i === 1}
                  />
                ))
              )}
            </div>

            {/* Dealer hand value */}
            {dealerHand.length > 0 && (
              <div className={`hand-value ${dealerTotal > 21 ? "bust" : ""}`}>
                {dealerShowAll ? handLabel(dealerHand) : handLabel([dealerHand[0]])}
              </div>
            )}
          </div>

          {/* DIVIDER LINE */}
          <div style={{
            margin: "8px 60px",
            height: "1px",
            background: "linear-gradient(90deg, transparent, rgba(240,180,41,0.2), transparent)",
          }} />

          {/* PLAYER ZONE */}
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingBottom: "16px",
            gap: "10px",
            minHeight: 0,
          }}>
            <div style={{
              fontSize: "0.65rem",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 600,
              letterSpacing: "0.2em",
              color: "rgba(255,255,255,0.3)",
              textTransform: "uppercase",
            }}>
              Player
            </div>

            {/* Player hands (supports split) */}
            <div style={{ display: "flex", gap: "24px", justifyContent: "center", flexWrap: "wrap" }}>
              {playerHands.length === 0 ? (
                <>{[0,1].map(i => (
                  <div key={i} style={{
                    width: "80px",
                    height: "120px",
                    borderRadius: "8px",
                    border: "2px dashed rgba(255,255,255,0.12)",
                    background: "rgba(0,0,0,0.15)",
                  }} />
                ))}</>
              ) : (
                playerHands.map((hand, handIdx) => {
                  const isActive = handIdx === activeHandIndex && phase === "player";
                  const { total } = handTotal(hand.cards);
                  return (
                    <div key={handIdx} style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "8px",
                      border: isActive ? "2px solid rgba(0,230,118,0.4)" : "2px solid transparent",
                      borderRadius: "12px",
                      padding: "6px 10px",
                      background: isActive ? "rgba(0,230,118,0.05)" : "transparent",
                      transition: "all 0.2s",
                    }}>
                      {/* Cards */}
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "center" }}>
                        {hand.cards.map((card, ci) => (
                          <PlayingCard
                            key={`${cardString(card)}-${handIdx}-${ci}`}
                            card={card}
                            index={ci}
                          />
                        ))}
                      </div>

                      {/* Hand value + result */}
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <div className={`hand-value ${total > 21 ? "bust" : ""}`}>
                          {handLabel(hand.cards)}
                        </div>
                        {hand.doubled && (
                          <span style={{
                            fontSize: "0.6rem",
                            color: "var(--accent-gold)",
                            fontFamily: "'Barlow Condensed', sans-serif",
                            fontWeight: 700,
                            letterSpacing: "0.1em",
                            background: "rgba(240,180,41,0.1)",
                            padding: "1px 6px",
                            borderRadius: "4px",
                          }}>2x</span>
                        )}
                      </div>

                      {/* Bet display */}
                      <div style={{
                        fontSize: "0.75rem",
                        color: "var(--text-secondary)",
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 600,
                        letterSpacing: "0.05em",
                      }}>
                        Bet: ${fmtMoney(hand.doubled ? hand.bet * 2 : hand.bet)}
                      </div>

                      {/* Result banner */}
                      <AnimatePresence>
                        {hand.result && (
                          <motion.div
                            className={`result-banner ${resultClass(hand.result)}`}
                            initial={{ opacity: 0, scale: 0.7, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            style={{ fontSize: "1.3rem", padding: "8px 16px" }}
                          >
                            {resultLabel(hand.result, hand.doubled)}
                            {hand.result !== "push" && hand.result !== "bust" && (
                              <div style={{ fontSize: "0.9rem", marginTop: "2px", opacity: 0.85 }}>
                                {hand.result === "blackjack" || hand.result === "win"
                                  ? `+$${fmtMoney(computePayout(hand) - (hand.doubled ? hand.bet * 2 : hand.bet))}`
                                  : `-$${fmtMoney(hand.doubled ? hand.bet * 2 : hand.bet)}`
                                }
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Insurance modal */}
        <AnimatePresence>
          {phase === "insurance" && (
            <motion.div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 20,
                borderRadius: "160px 160px 0 0",
                margin: "16px 16px 0",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "12px",
                  padding: "28px 32px",
                  textAlign: "center",
                  maxWidth: "320px",
                }}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
              >
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: "1.4rem",
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  color: "var(--accent-gold)",
                  marginBottom: "8px",
                }}>
                  INSURANCE?
                </div>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "20px" }}>
                  Dealer shows Ace. Insurance pays 2:1.<br />
                  Cost: ${fmtMoney(lastBet / 2)}
                </p>
                <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                  <button
                    className="btn-primary"
                    onClick={handleTakeInsurance}
                    disabled={balance < lastBet / 2}
                  >
                    Take
                  </button>
                  <button className="btn-action" onClick={handleDeclineInsurance}>
                    Decline
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="bj-controls" style={{
        background: "var(--bg-secondary)",
        borderTop: "1px solid var(--border-color)",
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        flexShrink: 0,
      }}>
        {phase === "betting" && (
          <>
            {/* Chips row + Half/All-In */}
            <CollapsibleBetSelector>
              <div className="bj-chips" style={{ display: "flex", gap: "16px", alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
                {[1, 5, 10, 25].map(val => (
                  <CasinoChip
                    key={val}
                    value={val}
                    onClick={handleAddBet}
                    disabled={currentBet >= balance || val > balance - currentBet}
                  />
                ))}
              </div>
              <div className="bj-halfall" style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <button onClick={() => dispatch({ type: "SET_BET", amount: Math.round(balance / 2 * 100) / 100 })}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="13" r="6" fill="var(--text-muted)"/><circle cx="10" cy="13" r="4.5" fill="var(--bg-secondary)"/><circle cx="10" cy="9" r="6" fill="var(--text-secondary)"/><circle cx="10" cy="9" r="4.5" fill="var(--bg-secondary)"/><text x="10" y="10" textAnchor="middle" dominantBaseline="middle" fontSize="5" fill="var(--text-secondary)" fontWeight="800">½</text></svg>
                  Half
                </button>
                <button onClick={() => dispatch({ type: "SET_BET", amount: balance })}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 6, border: "1px solid rgba(240,180,41,0.3)", background: "rgba(240,180,41,0.08)", color: "var(--accent-gold)", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}>
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="15" r="5" fill="#8b6914"/><circle cx="10" cy="15" r="3.5" fill="#0f1923"/><circle cx="10" cy="11" r="5" fill="#b8960c"/><circle cx="10" cy="11" r="3.5" fill="#0f1923"/><circle cx="10" cy="7" r="5" fill="#d4af37"/><circle cx="10" cy="7" r="3.5" fill="#0f1923"/><text x="10" y="8" textAnchor="middle" dominantBaseline="middle" fontSize="4.5" fill="#d4af37" fontWeight="800">MAX</text></svg>
                  All In
                </button>
              </div>
            </CollapsibleBetSelector>

            {/* Bet display + deal */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
              {/* Current bet input */}
              <div style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "8px 14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                minWidth: "140px",
              }}>
                <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.1em" }}>$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={currentBet || ""}
                  onChange={e => {
                    const v = parseFloat(e.target.value);
                    dispatch({ type: "SET_BET", amount: isNaN(v) ? 0 : Math.min(Math.max(0, v), balance) });
                  }}
                  placeholder="0.00"
                  style={{
                    flex: 1, background: "none", border: "none", outline: "none",
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                    fontSize: "1.1rem", color: "var(--text-primary)", width: 60,
                  }}
                />
                {currentBet > 0 && (
                  <button
                    onClick={() => dispatch({ type: "CLEAR_BET" })}
                    style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1rem", lineHeight: 1, padding: "0" }}
                    title="Clear bet"
                  >×</button>
                )}
              </div>

              {/* Deal button */}
              <motion.button
                className="btn-primary"
                onClick={handleDeal}
                disabled={currentBet <= 0 || currentBet > balance}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                style={{ fontSize: "1.1rem", padding: "12px 36px", minWidth: "120px" }}
              >
                DEAL
              </motion.button>

              {/* Re-bet last */}
              {lastBet > 0 && lastBet <= balance && (
                <button
                  className="btn-action"
                  onClick={() => dispatch({ type: "SET_BET", amount: Math.min(lastBet, balance) })}
                  style={{ fontSize: "0.8rem" }}
                >
                  Rebet ${fmtMoney(lastBet)}
                </button>
              )}
            </div>
          </>
        )}

        {phase === "player" && (
          <div className="bj-action-btns" style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <motion.button
              className="btn-action"
              onClick={handleHit}
              disabled={!canHitAction}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ minWidth: "100px", fontSize: "1rem" }}
            >
              HIT
            </motion.button>
            <motion.button
              className="btn-primary"
              onClick={handleStand}
              disabled={!canStandAction}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ minWidth: "100px", fontSize: "1rem" }}
            >
              STAND
            </motion.button>
            <motion.button
              className="btn-action"
              onClick={handleDouble}
              disabled={!canDoubleAction}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ minWidth: "100px", fontSize: "1rem", borderColor: canDoubleAction ? "rgba(240,180,41,0.4)" : undefined }}
            >
              DOUBLE
            </motion.button>
            <motion.button
              className="btn-action"
              onClick={handleSplit}
              disabled={!canSplitAction}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ minWidth: "100px", fontSize: "1rem" }}
            >
              SPLIT
            </motion.button>
          </div>
        )}

        {phase === "dealer" && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", padding: "4px 0" }}>
            <div style={{
              display: "flex",
              gap: "5px",
              alignItems: "center",
            }}>
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "var(--accent-gold)",
                  }}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "0.9rem",
              fontWeight: 600,
              letterSpacing: "0.12em",
              color: "var(--accent-gold)",
              textTransform: "uppercase",
            }}>
              Dealer&apos;s Turn
            </span>
          </div>
        )}

        {phase === "result" && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <motion.button
              className="btn-primary"
              onClick={handleNewHand}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              style={{ fontSize: "1.1rem", padding: "12px 48px" }}
            >
              NEW HAND
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}
