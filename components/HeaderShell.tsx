"use client";

import { useState } from "react";
import DateNav from "./DateNav";
import HamburgerMenu from "./HamburgerMenu";
import AgentChat from "./AgentChat";

type Agent = "MARCO" | "SOFIA";
type OpenPanel = null | "menu" | "agent-marco" | "agent-sofia";

export default function HeaderShell({ date }: { date: string }) {
  const [panel, setPanel] = useState<OpenPanel>(null);
  const [outputExpanded, setOutputExpanded] = useState(false);

  const close = () => setPanel(null);
  const activeAgent: Agent | null =
    panel === "agent-marco" ? "MARCO" :
    panel === "agent-sofia" ? "SOFIA" : null;

  function openAgent(a: Agent, expanded: boolean) {
    setOutputExpanded(expanded);
    const key = `agent-${a.toLowerCase()}` as OpenPanel;
    setPanel(panel === key ? null : key);
  }

  return (
    <>
      <header className="flex items-center gap-3 px-5 py-4 border-b border-border sticky top-0 bg-brand-black z-10 max-sm:gap-2 max-sm:px-4 max-sm:py-3">
        {/* Hamburger */}
        <button
          onClick={() => setPanel(panel === "menu" ? null : "menu")}
          className="bg-transparent border-none text-brand-white opacity-55 cursor-pointer p-2 -ml-2 hover:opacity-90 transition-opacity duration-150"
        >
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
            <path d="M0 1h18M0 7h18M0 13h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Logo */}
        <span className="text-base font-semibold text-brand-white tracking-[0.08em]">
          BAINSA
        </span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Date nav */}
        <DateNav date={date} />

        {/* Agent buttons */}
        <div className="flex gap-2.5 max-sm:hidden">
          {(["MARCO", "SOFIA"] as Agent[]).map((a) => (
            <button
              key={a}
              onClick={() => openAgent(a, false)}
              className="px-4 py-[7px] rounded-[5px] border border-border-mid bg-transparent text-brand-white opacity-55 text-xs font-semibold tracking-[0.04em] cursor-pointer transition-opacity duration-150 hover:opacity-90"
            >
              ▸ {a}
            </button>
          ))}
        </div>
      </header>

      {/* Shared backdrop */}
      {panel && (
        <div
          onClick={close}
          className="fixed inset-0 bg-black/40 z-40"
        />
      )}

      {/* Panels */}
      <HamburgerMenu
        open={panel === "menu"}
        onClose={close}
        onOpenAgentOutput={(a) => openAgent(a, true)}
      />
      <AgentChat
        date={date}
        open={!!activeAgent}
        agent={activeAgent}
        outputExpanded={outputExpanded}
        onClose={close}
      />
    </>
  );
}
