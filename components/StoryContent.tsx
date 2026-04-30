"use client";

import { useEffect, useState } from "react";
import { Story } from "@/types";
import { getTintedDataUrlSync, tintedDataUrl } from "@/lib/tintedAccent";

const CORNER_SIZE = { small: 28, medium: 44 } as const;

const HEADLINE_SIZE = {
  large: "2.5rem",
  default: "2rem",
  compact: "1.5rem",
} as const;

function accentSrc(type: ">" | "+"): string {
  return type === "+" ? "/accent-plus-2.png" : "/accent-chevron-2.png";
}

/**
 * Render an accent PNG tinted to `color`. Tints offscreen via canvas and
 * outputs a plain `<img>` — html2canvas-pro can't apply CSS `mask-image`,
 * which leaves the underlying box solid in the export.
 */
function TintedAccent({ src, color, style }: { src: string; color: string; style?: React.CSSProperties }) {
  const [url, setUrl] = useState<string | undefined>(() => getTintedDataUrlSync(src, color));
  useEffect(() => {
    if (url) return;
    let cancelled = false;
    tintedDataUrl(src, color).then((u) => { if (!cancelled) setUrl(u); });
    return () => { cancelled = true; };
  }, [src, color, url]);
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url ?? src} alt="" draggable={false} style={{ objectFit: "contain", visibility: url ? "visible" : "hidden", ...style }} />;
}

function CornerIcon({ type, color, size }: { type: ">" | "+"; color: string; size: number }) {
  return <TintedAccent src={accentSrc(type)} color={color} style={{ width: size, height: size }} />;
}

function GhostAccentElement({ type, color, position }: { type: ">" | "+"; color: string; position: "bottom-right" | "center" | "top-left" }) {
  const isChevron = type === ">";

  const positionStyles: Record<string, React.CSSProperties> = {
    "bottom-right": {
      bottom: isChevron ? -20 : -30,
      right: isChevron ? -10 : -30,
      width: isChevron ? 180 : 200,
      height: isChevron ? 320 : 200,
    },
    "center": {
      top: "50%",
      left: "50%",
      width: isChevron ? 140 : 250,
      height: isChevron ? 250 : 250,
      transform: "translate(-50%, -50%)",
    },
    "top-left": {
      top: 20,
      left: 20,
      width: isChevron ? 60 : 70,
      height: isChevron ? 106 : 70,
    },
  };

  return (
    <TintedAccent
      src={accentSrc(type)}
      color={color}
      style={{
        position: "absolute",
        zIndex: 1,
        pointerEvents: "none",
        opacity: position === "center" ? 0.06 : 0.1,
        ...positionStyles[position],
      }}
    />
  );
}

function SourceIcon({ type, color }: { type: ">" | "+"; color: string }) {
  return (
    <TintedAccent
      src={accentSrc(type)}
      color={color}
      style={{ width: 10, height: 10, marginRight: 6, display: "inline-block", verticalAlign: "middle" }}
    />
  );
}

function BodyContent({ story }: { story: Story }) {
  const { body, contentType, accentColor, bodyWeight, textAlign } = story;
  const weight = bodyWeight === "semibold" ? 600 : 400;
  const align = textAlign === "justify" ? ("justify" as const) : ("left" as const);

  if (contentType === "bullets") {
    const lines = body.split(/\n/).map((l) => l.replace(/^>\s*/, "").trim()).filter(Boolean);
    return (
      <ul className="list-none p-0 mt-4 flex flex-col gap-2.5">
        {lines.map((line, i) => (
          <li key={i} className="flex items-start gap-2.5 text-brand-white opacity-70">
            <TintedAccent
              src="/accent-chevron-2.png"
              color={accentColor}
              style={{ width: 14, height: 14, marginTop: 4, flexShrink: 0 }}
            />
            <span
              className="text-[length:var(--text-body)] leading-[1.55] flex-1"
              style={{ fontWeight: weight, textAlign: align }}
            >
              {line}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  if (contentType === "quote") {
    return (
      <div className="mt-4 flex gap-3">
        <div className="w-[3px] shrink-0 rounded-full" style={{ background: accentColor }} />
        <p
          className="text-[length:var(--text-body)] text-brand-white opacity-70 leading-[1.55] m-0 italic"
          style={{ fontWeight: weight, textAlign: align }}
        >
          {body}
        </p>
      </div>
    );
  }

  return (
    <p
      className="text-[length:var(--text-body)] text-brand-white opacity-70 leading-[1.55] mt-4 m-0"
      style={{ fontWeight: weight, textAlign: align }}
    >
      {body}
    </p>
  );
}

export default function StoryContent({ story }: { story: Story }) {
  const { accentColor, headline, sourceTag, cornerAccent, layout, headlineSize, cornerSize, accentBar, ghostAccent } = story;

  const headlineFontSize = HEADLINE_SIZE[headlineSize] || HEADLINE_SIZE.default;
  const iconSize = CORNER_SIZE[cornerSize] || CORNER_SIZE.small;

  const isCenter = layout === "center";
  const isBottom = layout === "bottom";

  return (
    <div className="story-content">
      {/* Accent bar */}
      {accentBar === "bottom" && (
        <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: accentColor }} />
      )}
      {accentBar === "top" && (
        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: accentColor }} />
      )}

      {/* Ghost accent */}
      {ghostAccent !== "none" && (
        <GhostAccentElement type={cornerAccent} color={accentColor} position={ghostAccent} />
      )}

      {/* Header row — pushed down to clear IG chrome overlay */}
      <div className="flex items-center justify-between pt-5" style={{ position: "relative", zIndex: 2 }}>
        <img src="/bainsa-logo.png" alt="BAINSA" className="block" style={{ height: "1.5rem" }} draggable={false} />
        <CornerIcon type={cornerAccent} color={accentColor} size={iconSize} />
      </div>

      {/* Top spacer */}
      <div className={isBottom ? "flex-1" : isCenter ? "flex-1" : "grow-0 shrink basis-[60px] flex-[1_0_60px]"} />

      {/* Source tag at top for bottom layout */}
      {isBottom && (
        <p
          className="text-[length:var(--text-source)] font-semibold m-0 text-left tracking-[0.04em] uppercase mb-4"
          style={{ color: accentColor }}
        >
          <SourceIcon type={cornerAccent} color={accentColor} />{sourceTag}
        </p>
      )}

      {/* Headline */}
      <p
        className="story-headline font-semibold text-brand-white leading-[1.15] m-0 text-left"
        style={{ fontSize: headlineFontSize, position: "relative", zIndex: 2 }}
      >
        {headline}
      </p>

      {/* Body */}
      <div style={{ position: "relative", zIndex: 2 }}>
        <BodyContent story={story} />
      </div>

      {/* Bottom spacer */}
      <div className={isCenter ? "flex-1" : isBottom ? "grow-0 shrink basis-[20px]" : "flex-1"} />

      {/* Source tag at bottom for top/center layouts */}
      {!isBottom && (
        <p
          className="text-[length:var(--text-source)] font-semibold m-0 text-left tracking-[0.04em] uppercase"
          style={{ color: accentColor, position: "relative", zIndex: 2 }}
        >
          <SourceIcon type={cornerAccent} color={accentColor} />{sourceTag}
        </p>
      )}
    </div>
  );
}
