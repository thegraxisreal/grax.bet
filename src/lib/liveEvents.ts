"use client";

export type LiveEventStatus = "upcoming" | "live" | "ended" | "off_hours";

export interface LiveEventReward {
  place: 1 | 2 | 3;
  amount: number;
  label: string;
}

export interface LiveEventDefinition {
  id: string;
  title: string;
  status: LiveEventStatus;
  startAtMs: number;
  endAtMs: number;
  targetGames: string[];
  eventKey: "plinko" | "mines" | "crash" | "slots";
  scoringRule: string;
  rewardMetadata: LiveEventReward[];
  ctaText: string;
  displayText?: string;
}

export interface ResolvedLiveEventState {
  currentEvent: LiveEventDefinition | null;
  nextEvent: LiveEventDefinition | null;
  upcomingEvents: LiveEventDefinition[];
  recentlyEndedEvent: LiveEventDefinition | null;
  status: LiveEventStatus;
  nowMs: number;
}

export const LIVE_EVENT_START_HOUR = 8;
export const LIVE_EVENT_SLOT_COUNT = 8;
export const LIVE_EVENT_DURATION_MS = 60 * 60 * 1000;
export const LIVE_EVENT_END_HOUR = LIVE_EVENT_START_HOUR + LIVE_EVENT_SLOT_COUNT;

const EVENT_TEMPLATES: Array<{
  key: LiveEventDefinition["eventKey"];
  title: string;
  targetGames: string[];
  scoringRule: string;
  ctaText: string;
  displayText: string;
}> = [
  {
    key: "plinko",
    title: "Plinko Frenzy",
    targetGames: ["Plinko"],
    scoringRule: "Every bucket payout is doubled for the live hour.",
    ctaText: "Play Plinko",
    displayText: "Every bottom bucket is paying 2x right now.",
  },
  {
    key: "mines",
    title: "Mines Meltdown",
    targetGames: ["Mines"],
    scoringRule: "Every cashout and clear payout is doubled for the live hour.",
    ctaText: "Play Mines",
    displayText: "Cashouts are juiced to 2x during the event hour.",
  },
  {
    key: "crash",
    title: "Crash Surge",
    targetGames: ["Crash"],
    scoringRule: "Every successful cashout pays 2x for the live hour.",
    ctaText: "Play Crash",
    displayText: "Cash out before the bust and your payout gets doubled.",
  },
  {
    key: "slots",
    title: "Slots Storm",
    targetGames: ["Slots"],
    scoringRule: "Every line hit pays 2x for the live hour.",
    ctaText: "Play Slots",
    displayText: "Normal slot payouts are doubled for this hour.",
  },
];

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function eventIdFor(day: Date, slotIndex: number, key: LiveEventDefinition["eventKey"]): string {
  return `${key}-${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}-${pad(LIVE_EVENT_START_HOUR + slotIndex)}`;
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const clone = [...items];
  let state = seed >>> 0;

  function next() {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  }

  for (let index = clone.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(next() * (index + 1));
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }

  return clone;
}

function getDailyEventOrder(day: Date) {
  const seed = Number(`${day.getFullYear()}${pad(day.getMonth() + 1)}${pad(day.getDate())}`);
  const shuffled = seededShuffle(EVENT_TEMPLATES, seed);
  return [...shuffled, ...shuffled];
}

export function createHourlyEvent(day: Date, slotIndex: number, status: LiveEventStatus): LiveEventDefinition {
  const template = getDailyEventOrder(day)[slotIndex % LIVE_EVENT_SLOT_COUNT];
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), LIVE_EVENT_START_HOUR + slotIndex, 0, 0, 0);
  const end = new Date(start.getTime() + LIVE_EVENT_DURATION_MS);

  return {
    id: eventIdFor(day, slotIndex, template.key),
    title: template.title,
    status,
    startAtMs: start.getTime(),
    endAtMs: end.getTime(),
    targetGames: template.targetGames,
    eventKey: template.key,
    scoringRule: template.scoringRule,
    rewardMetadata: [],
    ctaText: template.ctaText,
    displayText: template.displayText,
  };
}

export function formatCountdown(targetMs: number, nowMs: number): string {
  const remainingMs = Math.max(0, targetMs - nowMs);
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
}

export function isGameParticipating(event: LiveEventDefinition | null, gameName: string): boolean {
  if (!event) return false;
  return event.targetGames.some((target) => target.toLowerCase() === gameName.toLowerCase());
}

export function getResolvedLiveEventState(now = new Date()): ResolvedLiveEventState {
  const nowMs = now.getTime();
  const today = startOfLocalDay(now);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), LIVE_EVENT_START_HOUR, 0, 0, 0).getTime();
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), LIVE_EVENT_END_HOUR, 0, 0, 0).getTime();

  if (nowMs < todayStart) {
    return {
      currentEvent: null,
      nextEvent: createHourlyEvent(today, 0, "upcoming"),
      upcomingEvents: [
        createHourlyEvent(today, 0, "upcoming"),
        createHourlyEvent(today, 1, "upcoming"),
      ],
      recentlyEndedEvent: null,
      status: "off_hours",
      nowMs,
    };
  }

  if (nowMs >= todayEnd) {
    const lastEvent = createHourlyEvent(today, LIVE_EVENT_SLOT_COUNT - 1, "ended");
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 0, 0, 0, 0);
    return {
      currentEvent: null,
      nextEvent: createHourlyEvent(tomorrow, 0, "upcoming"),
      upcomingEvents: [
        createHourlyEvent(tomorrow, 0, "upcoming"),
        createHourlyEvent(tomorrow, 1, "upcoming"),
      ],
      recentlyEndedEvent: lastEvent,
      status: "off_hours",
      nowMs,
    };
  }

  const slotIndex = Math.floor((nowMs - todayStart) / LIVE_EVENT_DURATION_MS);
  const currentEvent = createHourlyEvent(today, slotIndex, "live");
  const nextEvent = slotIndex + 1 < LIVE_EVENT_SLOT_COUNT
    ? createHourlyEvent(today, slotIndex + 1, "upcoming")
    : createHourlyEvent(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 0, 0, 0, 0), 0, "upcoming");
  const upcomingEvents = Array.from({ length: 2 }, (_, index) => {
    const upcomingSlot = slotIndex + index + 1;
    if (upcomingSlot < LIVE_EVENT_SLOT_COUNT) {
      return createHourlyEvent(today, upcomingSlot, "upcoming");
    }
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 0, 0, 0, 0);
    return createHourlyEvent(tomorrow, upcomingSlot - LIVE_EVENT_SLOT_COUNT, "upcoming");
  });
  const recentlyEndedEvent = slotIndex > 0 ? createHourlyEvent(today, slotIndex - 1, "ended") : null;

  return {
    currentEvent,
    nextEvent,
    upcomingEvents,
    recentlyEndedEvent,
    status: "live",
    nowMs,
  };
}
