"use client";

import SlidePanel from "./SlidePanel";

type Agent = "MARCO" | "SOFIA";

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenAgentOutput: (agent: Agent) => void;
}

export default function HamburgerMenu({ open, onClose, onOpenAgentOutput }: Props) {
  return (
    <SlidePanel side="left" open={open} title="MENU" onClose={onClose}>
      <div className="py-3 overflow-y-auto h-full">
        {/* Agent outputs section */}
        <p className="px-6 py-2 text-[0.65rem] font-semibold text-brand-white opacity-25 tracking-[0.08em] uppercase">
          Agent Outputs
        </p>
        <button
          onClick={() => onOpenAgentOutput("MARCO")}
          className="w-full text-left px-6 py-3 text-[0.75rem] font-semibold text-brand-white opacity-55 hover:opacity-90 hover:bg-[#1a1a1a] transition-opacity duration-150 bg-transparent border-none cursor-pointer"
        >
          Marco Output
        </button>
        <button
          onClick={() => onOpenAgentOutput("SOFIA")}
          className="w-full text-left px-6 py-3 text-[0.75rem] font-semibold text-brand-white opacity-55 hover:opacity-90 hover:bg-[#1a1a1a] transition-opacity duration-150 bg-transparent border-none cursor-pointer"
        >
          Sofia Output
        </button>

        <hr className="border-none border-t border-[#1f1f1f] my-3 mx-6" />

        {/* Logout */}
        <a
          href="/api/auth/logout"
          className="block w-full text-left px-6 py-3 text-[0.75rem] font-semibold text-brand-white opacity-55 hover:opacity-90 hover:bg-[#1a1a1a] transition-opacity duration-150 no-underline"
        >
          Logout
        </a>
      </div>
    </SlidePanel>
  );
}
