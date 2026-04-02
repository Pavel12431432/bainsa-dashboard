"use client";

import { useState, useCallback, useRef } from "react";
import DateNav from "./DateNav";
import HamburgerMenu from "./HamburgerMenu";
import AgentChat from "./AgentChat";

type Agent = "MARCO" | "SOFIA";
type OpenPanel = null | "menu" | "agent-marco" | "agent-sofia";

export default function HeaderShell({ date }: { date: string }) {
  const [panel, setPanel] = useState<OpenPanel>(null);
  const [outputExpanded, setOutputExpanded] = useState(false);
  const [agentLoading, setAgentLoading] = useState<Record<Agent, boolean>>({ MARCO: false, SOFIA: false });
  const [agentUnread, setAgentUnread] = useState<Record<Agent, boolean>>({ MARCO: false, SOFIA: false });
  const panelRef = useRef<OpenPanel>(null);
  panelRef.current = panel;

  const close = () => setPanel(null);
  const activeAgent: Agent | null =
    panel === "agent-marco" ? "MARCO" :
    panel === "agent-sofia" ? "SOFIA" : null;

  function openAgent(a: Agent, expanded: boolean) {
    setOutputExpanded(expanded);
    setAgentUnread((prev) => ({ ...prev, [a]: false }));
    const key = `agent-${a.toLowerCase()}` as OpenPanel;
    setPanel(panelRef.current === key ? null : key);
  }

  const handleLoadingChange = useCallback((a: Agent, isLoading: boolean) => {
    setAgentLoading((prev) => ({ ...prev, [a]: isLoading }));
    // Agent finished — mark unread if drawer isn't showing that agent
    if (!isLoading) {
      const currentPanel = panelRef.current;
      const agentPanel = `agent-${a.toLowerCase()}`;
      if (currentPanel !== agentPanel) {
        setAgentUnread((prev) => ({ ...prev, [a]: true }));
      }
    }
  }, []);

  return (
    <>
      <header className="relative flex items-center gap-3 px-5 py-4 border-b border-border sticky top-0 bg-brand-black z-10 max-sm:gap-2 max-sm:px-4 max-sm:py-3">
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

        {/* Date nav — centered overlay on desktop, inline on mobile */}
        <div className="absolute inset-x-0 flex justify-center pointer-events-none max-sm:contents">
          <DateNav date={date} className="pointer-events-auto max-sm:ml-auto" />
        </div>

        {/* Spacer (pushes agent buttons right on desktop) */}
        <div className="flex-1 max-sm:hidden" />

        {/* Agent buttons */}
        <div className="flex gap-2.5 max-sm:hidden">
          {(["MARCO", "SOFIA"] as Agent[]).map((a) => (
            <button
              key={a}
              onClick={() => openAgent(a, false)}
              className={`relative px-4 py-[7px] rounded-[5px] border border-border-mid bg-transparent text-brand-white text-xs font-semibold tracking-[0.04em] cursor-pointer transition-opacity duration-150 hover:opacity-90 ${
                agentLoading[a] ? "opacity-90" : "opacity-55"
              }`}
            >
              {agentLoading[a] ? (
                <svg className="animate-spin inline mr-1.5 h-2.5 w-2.5 -ml-0.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              ) : "▸ "}
              {a}
              {agentUnread[a] && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-brand-white" />
              )}
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
        onSwitchAgent={(a) => openAgent(a, false)}
        onLoadingChange={handleLoadingChange}
        agentLoading={agentLoading}
      />
    </>
  );
}
