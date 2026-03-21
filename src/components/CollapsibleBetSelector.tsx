"use client";
import { useState } from "react";

export default function CollapsibleBetSelector({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bet-selector-wrap">
      <button
        className="bet-selector-toggle"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        type="button"
      >
        <span>Chips</span>
        <svg
          className={`bet-selector-chevron${open ? " open" : ""}`}
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
        >
          <path d="M2.5 5L7 9.5L11.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className={`bet-selector-body${open ? "" : " collapsed"}`}>
        {children}
      </div>
    </div>
  );
}
