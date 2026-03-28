"use client";

type Agent = "MARCO" | "SOFIA";

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenAgentOutput: (agent: Agent) => void;
}

export default function HamburgerMenu({ open, onClose, onOpenAgentOutput }: Props) {
  function openAgent(agent: Agent) {
    onClose();
    onOpenAgentOutput(agent);
  }

  return (
    <div
      className="fixed top-0 left-0 bottom-0 w-[min(300px,85vw)] bg-surface border-r border-[#1f1f1f] z-50 flex flex-col transition-transform duration-[220ms] ease-out"
      style={{ transform: open ? "translateX(0)" : "translateX(-100%)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-[#1f1f1f] shrink-0">
        <span className="text-xs font-semibold text-brand-white tracking-[0.08em]">
          MENU
        </span>
        <button
          onClick={onClose}
          className="bg-transparent border-none text-brand-white opacity-40 cursor-pointer text-base p-1"
        >
          ✕
        </button>
      </div>

      {/* Menu items */}
      <div className="flex-1 overflow-y-auto py-3">
        {/* Agent outputs section */}
        <p className="px-6 py-2 text-[0.65rem] font-semibold text-brand-white opacity-25 tracking-[0.08em] uppercase">
          Agent Outputs
        </p>
        <button
          onClick={() => openAgent("MARCO")}
          className="w-full text-left px-6 py-3 text-[0.75rem] font-semibold text-brand-white opacity-55 hover:opacity-90 hover:bg-[#1a1a1a] transition-opacity duration-150 bg-transparent border-none cursor-pointer"
        >
          Marco Output
        </button>
        <button
          onClick={() => openAgent("SOFIA")}
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
    </div>
  );
}
