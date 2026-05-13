"use client";

import { useEffect, useRef, useState } from "react";
import { Story } from "@/types";
import PhonePreview from "./PhonePreview";
import StoryCard from "./StoryCard";

interface Props {
  /** Chain name — shown in the header. */
  chain: string;
  /** Stories in chain order (hook → develop → closer). */
  stories: Story[];
  /** Story.index of the card that opened fullscreen — used on mobile to scroll
      that card into view. Desktop ignores it (all cards visible at once). */
  initialIndex?: number;
  onClose: () => void;
  /** Throw on failure — caller resolves on success, fullscreen surfaces errors
      inline in the footer. The parent should NOT show a global toast for these
      actions; the fullscreen owns the success feedback while it's open. */
  onApproveAll: () => Promise<void>;
  onRejectAll: () => Promise<void>;
}

type PreviewMode = "card" | "phone";
// No "success" state: on success the parent closes us (and shows the global
// toast), matching the ExportDialog pattern. We only track busy + error.
type Status =
  | { kind: "idle" }
  | { kind: "busy"; action: "approve" | "reject" }
  | { kind: "error"; message: string };

const CARD_W = 405;
const CARD_H = 720;
const PHONE_W = 405;
const PHONE_H = 880;
const GAP_DESKTOP = 24;
const HEADER_H = 64;
const TOGGLE_H = 44;
const FOOTER_H = 72;
const VIEWPORT_PAD = 40;
const MOBILE_BREAKPOINT = 640;

export default function ChainFullscreen({
  chain,
  stories,
  initialIndex,
  onClose,
  onApproveAll,
  onRejectAll,
}: Props) {
  const total = stories.length;
  const [preview, setPreview] = useState<PreviewMode>("card");
  const [scale, setScale] = useState(0.7);
  const [isMobile, setIsMobile] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const containerRef = useRef<HTMLDivElement>(null);

  // Open/close fade. `mounted` flips to true on first paint to let the
  // entrance transition run; `closing` is set just before unmount so the
  // exit transition can play before the parent removes us.
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  const ANIM_OUT_MS = 180;
  const initiateClose = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, ANIM_OUT_MS);
  };

  const itemW = preview === "phone" ? PHONE_W : CARD_W;
  const itemH = preview === "phone" ? PHONE_H : CARD_H;

  // Compute scale to fit all items in the viewport (side-by-side on desktop,
  // one per row on mobile). Re-runs when item dimensions change (CARD/PHONE)
  // so the layout snaps to the new aspect ratio.
  useEffect(() => {
    const update = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (mobile) {
        const w = window.innerWidth - VIEWPORT_PAD;
        setScale(Math.min(w / itemW, 1));
        return;
      }
      const usableW = window.innerWidth - VIEWPORT_PAD;
      const usableH = window.innerHeight - HEADER_H - TOGGLE_H - FOOTER_H - VIEWPORT_PAD;
      const totalWidthAt1 = total * itemW + (total - 1) * GAP_DESKTOP;
      const scaleW = usableW / totalWidthAt1;
      const scaleH = usableH / itemH;
      setScale(Math.min(scaleW, scaleH, 1));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [total, itemW, itemH]);

  // ESC closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") initiateClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mobile: scroll the initially-clicked card into view
  useEffect(() => {
    if (!isMobile || !initialIndex || !containerRef.current) return;
    const idx = stories.findIndex((s) => s.index === initialIndex);
    if (idx < 0) return;
    const node = containerRef.current.querySelector(`[data-fs-card-idx="${idx}"]`);
    node?.scrollIntoView({ behavior: "auto", block: "center" });
  }, [isMobile, initialIndex, stories]);

  async function runAction(
    action: "approve" | "reject",
    fn: () => Promise<void>,
  ) {
    if (status.kind === "busy") return;
    setStatus({ kind: "busy", action });
    try {
      await fn();
      // Success: trigger the exit fade. Parent will set state to null in its
      // callback, but we delay the unmount via initiateClose so the
      // animation plays first.
      initiateClose();
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Action failed" });
    }
  }

  // Backdrop click: close only when the click did NOT originate inside any
  // [data-fs-content] subtree. Lets clicks on header, toggle, cards, and
  // footer pass through to their handlers while clicks on the empty backdrop
  // area dismiss the modal.
  function handleBackdropClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest("[data-fs-content]")) return;
    initiateClose();
  }

  function renderItem(story: Story) {
    const position = stories.findIndex((s) => s.index === story.index) + 1;
    // Both mounted, inactive hidden via display:none — keeps PhonePreview's
    // IG chrome images cached so toggling doesn't trigger a load-pop.
    return (
      <>
        <div style={{ display: preview === "card" ? "block" : "none" }}>
          <StoryCard
            story={story}
            scale={scale}
            chainPosition={position}
            chainTotal={total}
          />
        </div>
        <div style={{ display: preview === "phone" ? "block" : "none" }}>
          <PhonePreview
            story={story}
            scale={scale}
            chainPosition={position}
            chainTotal={total}
          />
        </div>
      </>
    );
  }

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/85 flex flex-col transition-opacity duration-200 ease-out ${
        mounted && !closing ? "opacity-100" : "opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={`Chain preview: ${chain}`}
      onClick={handleBackdropClick}
    >
      {/* Header — only the chain-name group and the close button are
          no-close zones; the rest of the row passes through to backdrop. */}
      <div
        className="flex items-center justify-between px-6 text-brand-white shrink-0"
        style={{ height: HEADER_H }}
      >
        <div data-fs-content className="flex items-baseline gap-3 px-1 py-1">
          <span className="text-xs uppercase tracking-[0.12em] font-semibold opacity-90">{chain}</span>
          <span className="text-[0.65rem] tabular-nums opacity-50">{total} cards</span>
        </div>
        <button
          type="button"
          data-fs-content
          onClick={initiateClose}
          className="p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Close fullscreen"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="6" y1="18" x2="18" y2="6" />
          </svg>
        </button>
      </div>

      {/* Items — side by side on desktop, vertical scroll on mobile. The outer
          flex-1 wrapper deliberately has NO data-fs-content so its empty
          gutters around the cards close the modal on click. */}
      <div
        ref={containerRef}
        className={
          isMobile
            ? "flex-1 overflow-y-auto flex flex-col items-center py-4"
            : "flex-1 flex items-center justify-center"
        }
        style={{ gap: isMobile ? 24 : GAP_DESKTOP * scale }}
      >
        {isMobile
          ? stories.map((story, i) => (
              <div key={story.index} data-fs-card-idx={i} data-fs-content className="p-1.5">
                {renderItem(story)}
              </div>
            ))
          : (
            <div
              className="flex items-center"
              style={{ gap: GAP_DESKTOP * scale }}
            >
              {stories.map((story) => (
                <div key={story.index} data-fs-content className="p-1.5">
                  {renderItem(story)}
                </div>
              ))}
            </div>
          )}
      </div>

      {/* CARD / PHONE toggle — under the items, above the action footer.
          Only the pill itself is no-close; clicks on either side of it close. */}
      <div
        className="flex items-center justify-center shrink-0"
        style={{ height: TOGGLE_H }}
      >
        <div data-fs-content className="flex gap-1 bg-surface rounded-lg p-1">
          <button
            type="button"
            onClick={() => setPreview("card")}
            className={`px-3 py-1 rounded-md text-[0.6rem] font-semibold tracking-[0.06em] border-none cursor-pointer transition-colors duration-150 ${
              preview === "card" ? "bg-border-mid text-brand-white" : "bg-transparent text-muted hover:text-brand-white"
            }`}
          >
            CARD
          </button>
          <button
            type="button"
            onClick={() => setPreview("phone")}
            className={`px-3 py-1 rounded-md text-[0.6rem] font-semibold tracking-[0.06em] border-none cursor-pointer transition-colors duration-150 ${
              preview === "phone" ? "bg-border-mid text-brand-white" : "bg-transparent text-muted hover:text-brand-white"
            }`}
          >
            PHONE
          </button>
        </div>
      </div>

      {/* Footer — APPROVE ALL / REJECT ALL with inline status to the left.
          Only the buttons and error text are no-close zones; empty areas of
          the footer row close. */}
      <div
        className="flex items-center justify-center gap-4 px-6 shrink-0 relative"
        style={{ height: FOOTER_H }}
      >
        {/* Inline error — sits to the left of the buttons, doesn't push them.
            Success path closes the modal and surfaces the global toast in the
            grid below, matching ExportDialog. */}
        {status.kind === "error" && (
          <div className="absolute left-6 right-6 flex items-center justify-start pointer-events-none">
            <span data-fs-content className="text-xs font-semibold tracking-[0.06em] text-danger pointer-events-auto">
              {status.message}
            </span>
          </div>
        )}

        <button
          type="button"
          data-fs-content
          onClick={() => runAction("approve", onApproveAll)}
          disabled={status.kind === "busy"}
          className="px-6 py-2.5 rounded-[5px] border border-success bg-success/20 text-success text-xs font-semibold tracking-[0.06em] backdrop-blur-sm cursor-pointer hover:bg-success/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status.kind === "busy" && status.action === "approve" ? "APPROVING…" : "APPROVE ALL"}
        </button>
        <button
          type="button"
          data-fs-content
          onClick={() => runAction("reject", onRejectAll)}
          disabled={status.kind === "busy"}
          className="px-6 py-2.5 rounded-[5px] border border-danger/40 bg-danger/15 text-danger text-xs font-semibold tracking-[0.06em] backdrop-blur-sm cursor-pointer hover:bg-danger/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status.kind === "busy" && status.action === "reject" ? "REJECTING…" : "REJECT ALL"}
        </button>
      </div>
    </div>
  );
}
