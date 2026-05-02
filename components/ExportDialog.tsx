"use client";

import { useEffect, useState } from "react";
import { Story, PostedMap, PostRecord } from "@/types";
import { captureStories, captureStoryToBlob } from "@/lib/exportCards";
import { apiFetch } from "@/lib/fetch";

interface Props {
  stories: Story[];
  approvedIndices?: number[];
  posted?: PostedMap;
  date: string;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  onPosted?: (index: number, record: PostRecord) => void;
}

type Destination = "download" | "instagram";

interface Prefs {
  destination: Destination;
  format: "zip" | "individual";
}

const PREFS_KEY = "bainsa-export-prefs";
const DEFAULT_PREFS: Prefs = { destination: "instagram", format: "zip" };

function loadPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
}

export default function ExportDialog({ stories, approvedIndices = [], posted = {}, date, onClose, onSuccess, onPosted }: Props) {
  const hasPosted = (index: number) => (posted[index]?.length ?? 0) > 0;
  const [selected, setSelected] = useState<Set<number>>(() => {
    if (approvedIndices.length > 0) return new Set(approvedIndices);
    return new Set(stories.map((s) => s.index));
  });
  const [destination, setDestination] = useState<Destination>(() => loadPrefs().destination);
  const [format, setFormat] = useState<"zip" | "individual">(() => loadPrefs().format);
  const [igUsername, setIgUsername] = useState<string | null>(null);
  const [igUsernameError, setIgUsernameError] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [confirmingIg, setConfirmingIg] = useState(false);
  // progress.current is fractional (e.g. 1.4 = 1 done + 40% through 2nd)
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ destination, format }));
    } catch {}
    setConfirmingIg(false);
  }, [destination, format]);

  useEffect(() => {
    if (destination !== "instagram" || igUsername || igUsernameError) return;
    let cancelled = false;
    fetch("/api/instagram/account")
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((data) => { if (!cancelled && data.username) setIgUsername(data.username); })
      .catch(() => { if (!cancelled) setIgUsernameError(true); });
    return () => { cancelled = true; };
  }, [destination, igUsername, igUsernameError]);

  function toggle(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  }

  function selectAll() { setSelected(new Set(stories.map((s) => s.index))); }
  function deselectAll() { setSelected(new Set()); }

  async function handleDownload() {
    const toExport = stories.filter((s) => selected.has(s.index));
    if (toExport.length === 0) return;

    setExporting(true);
    setProgress({ current: 0, total: toExport.length });

    try {
      await captureStories(toExport, date, format, (current, total) => {
        setProgress({ current, total });
      });
      void apiFetch("/api/logs", {
        kind: "export",
        ok: true,
        summary: `Downloaded ${toExport.length} ${toExport.length === 1 ? "story" : "stories"} as ${format}`,
        meta: { date, format, count: toExport.length, indices: toExport.map((s) => s.index) },
      });
    } finally {
      setExporting(false);
      onClose();
    }
  }

  async function handleInstagram() {
    const toPost = stories.filter((s) => selected.has(s.index));
    if (toPost.length === 0) return;

    setConfirmingIg(false);
    setExporting(true);
    setErrorMsg("");
    setStatusMsg("");
    setProgress({ current: 0, total: toPost.length });

    for (let i = 0; i < toPost.length; i++) {
      const story = toPost[i];

      // Trickle the bar from i toward i+0.9 while the request is in flight.
      // Snap to i+1 when the request completes — bar always moving, never lying about being done.
      let sub = 0;
      const trickle = setInterval(() => {
        sub = Math.min(0.9, sub + (0.9 - sub) * 0.04);
        setProgress({ current: i + sub, total: toPost.length });
      }, 200);

      setStatusMsg(`Rendering story ${story.index}…`);
      try {
        const blob = await captureStoryToBlob(story, "image/jpeg", 8 / 3);
        setStatusMsg(`Posting story ${story.index} to Instagram…`);
        const res = await fetch(`/api/instagram/publish?date=${encodeURIComponent(date)}&index=${story.index}`, {
          method: "POST",
          headers: { "Content-Type": "image/jpeg", "X-Requested-With": "fetch" },
          body: blob,
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          let detail = text;
          try {
            const data = JSON.parse(text);
            if (data.error) detail = data.error;
          } catch {}
          throw new Error(`HTTP ${res.status} — ${detail.slice(0, 300) || "(empty body)"}`);
        }
        try {
          const data = await res.json();
          if (data.mediaId) {
            onPosted?.(story.index, {
              postedAt: new Date().toISOString(),
              mediaId: data.mediaId,
              containerId: data.containerId,
            });
          }
        } catch {}
        clearInterval(trickle);
        setProgress({ current: i + 1, total: toPost.length });
      } catch (err) {
        clearInterval(trickle);
        const message = err instanceof Error ? err.message : "Unknown error";
        setErrorMsg(`Story ${story.index}: ${message}`);
        setExporting(false);
        setStatusMsg("");
        return;
      }
    }

    setExporting(false);
    setStatusMsg("");
    onSuccess?.(`Posted ${toPost.length} ${toPost.length === 1 ? "story" : "stories"} to Instagram.`);
    onClose();
  }

  function handleAction() {
    if (destination === "download") return handleDownload();
    setConfirmingIg(true);
  }

  const tabBtn = (active: boolean) =>
    `flex-1 py-1.5 text-[0.7rem] font-semibold tracking-[0.04em] rounded border cursor-pointer transition-colors duration-150 ${
      active
        ? "border-brand-white bg-brand-white text-brand-black"
        : "border-border-mid bg-transparent text-brand-white opacity-40 hover:opacity-70"
    }`;

  const actionLabel =
    exporting
      ? destination === "instagram" ? "POSTING..." : "EXPORTING..."
      : destination === "instagram"
        ? `POST TO INSTAGRAM (${selected.size})`
        : `EXPORT (${selected.size})`;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-6"
      onClick={(e) => { if (e.target === e.currentTarget && !exporting) onClose(); }}
    >
      <div className="w-full max-w-[480px] bg-surface border border-border-mid rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <span className="text-xs font-semibold text-brand-white tracking-[0.08em]">EXPORT STORIES</span>
          <button
            onClick={onClose}
            disabled={exporting}
            className="bg-transparent border-none text-brand-white opacity-40 hover:opacity-80 cursor-pointer text-lg leading-none disabled:opacity-20 disabled:cursor-not-allowed"
          >
            ✕
          </button>
        </div>

        <div className="px-6 pt-4 pb-2 max-h-[40vh] overflow-y-auto">
          {stories.map((story) => (
            <label
              key={story.index}
              className="flex items-center gap-3 py-2.5 cursor-pointer group"
            >
              <span
                onClick={() => toggle(story.index)}
                className={`w-3.5 h-3.5 rounded-sm border shrink-0 cursor-pointer flex items-center justify-center ${
                  selected.has(story.index)
                    ? "bg-border-mid border-border-mid"
                    : "bg-transparent border-[#444]"
                }`}
              >
                {selected.has(story.index) && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                )}
              </span>
              <span className="flex-1 text-[0.8rem] text-brand-white opacity-60 group-hover:opacity-90 transition-opacity leading-tight">
                {story.index}. {story.headline}
              </span>
              {hasPosted(story.index) && (
                <span
                  className="text-[0.55rem] font-semibold tracking-[0.06em] px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-400 shrink-0"
                  title={`Posted ${posted[story.index]!.length}× to Instagram`}
                >
                  POSTED{posted[story.index]!.length > 1 ? ` ×${posted[story.index]!.length}` : ""}
                </span>
              )}
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: story.accentColor }}
              />
            </label>
          ))}
        </div>

        <div className="px-6 pb-3 flex gap-3">
          <button onClick={selectAll} className="bg-transparent border-none text-[0.65rem] text-brand-white opacity-35 hover:opacity-60 cursor-pointer p-0">
            Select all
          </button>
          <button onClick={deselectAll} className="bg-transparent border-none text-[0.65rem] text-brand-white opacity-35 hover:opacity-60 cursor-pointer p-0">
            Clear
          </button>
          {approvedIndices.length > 0 && (
            <button
              onClick={() => setSelected(new Set(approvedIndices))}
              className="bg-transparent border-none text-[0.65rem] text-success/70 hover:text-success cursor-pointer p-0"
            >
              Approved only
            </button>
          )}
        </div>

        <div className="px-6 pb-4">
          <p className="text-[0.65rem] text-brand-white opacity-35 mb-2 font-semibold tracking-[0.04em]">DESTINATION</p>
          <div className="flex gap-2">
            <button onClick={() => setDestination("instagram")} className={tabBtn(destination === "instagram")}>INSTAGRAM</button>
            <button onClick={() => setDestination("download")} className={tabBtn(destination === "download")}>DOWNLOAD</button>
          </div>
        </div>

        {destination === "download" && (
          <div className="px-6 pb-4 flex items-center gap-3">
            <span className="text-[0.65rem] text-brand-white opacity-35 font-semibold tracking-[0.04em]">FORMAT</span>
            <div className="inline-flex rounded-md border border-border-mid p-0.5">
              <button
                onClick={() => setFormat("zip")}
                className={`px-2.5 py-1 text-[0.65rem] font-semibold tracking-[0.04em] rounded-[4px] cursor-pointer border-none transition-colors ${
                  format === "zip"
                    ? "bg-border-mid text-brand-white"
                    : "bg-transparent text-brand-white opacity-50 hover:opacity-80"
                }`}
              >
                ZIP
              </button>
              <button
                onClick={() => setFormat("individual")}
                className={`px-2.5 py-1 text-[0.65rem] font-semibold tracking-[0.04em] rounded-[4px] cursor-pointer border-none transition-colors ${
                  format === "individual"
                    ? "bg-border-mid text-brand-white"
                    : "bg-transparent text-brand-white opacity-50 hover:opacity-80"
                }`}
              >
                INDIVIDUAL
              </button>
            </div>
          </div>
        )}

        {destination === "instagram" && (
          <div className="px-6 pb-4">
            <p className="text-[0.65rem] text-brand-white opacity-50 leading-snug mb-1">
              Posting as{" "}
              {igUsername ? (
                <span className="font-semibold text-brand-white opacity-100">@{igUsername}</span>
              ) : igUsernameError ? (
                <span className="text-amber-400">unknown (check IG_ACCESS_TOKEN)</span>
              ) : (
                <span className="opacity-60">…</span>
              )}
            </p>
            <p className="text-[0.6rem] text-brand-white opacity-35 leading-snug">
              Stories expire in 24h. Posts are sequential — keep this dialog open until done.
            </p>
          </div>
        )}

        {exporting && (
          <div className="px-6 pb-4">
            <div className="h-1 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-white transition-all duration-200 ease-out"
                style={{ width: `${(progress.current / Math.max(1, progress.total)) * 100}%` }}
              />
            </div>
            <p className="text-[0.65rem] text-brand-white opacity-50 mt-1.5">
              {statusMsg || `Processing ${Math.floor(progress.current)} of ${progress.total}…`}
            </p>
          </div>
        )}

        {errorMsg && (
          <div className="mx-6 mb-4 p-2.5 rounded border border-danger/40 bg-danger/10">
            <p className="text-[0.7rem] text-danger leading-snug">{errorMsg}</p>
          </div>
        )}

        <div className="flex gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            disabled={exporting}
            className="flex-1 py-2.5 rounded-lg border border-border-mid bg-transparent text-brand-white text-xs font-semibold tracking-[0.04em] cursor-pointer opacity-50 hover:opacity-80 transition-opacity disabled:opacity-25"
          >
            CANCEL
          </button>
          <button
            onClick={handleAction}
            disabled={exporting || selected.size === 0}
            className="flex-1 py-2.5 rounded-lg bg-brand-white text-brand-black text-xs font-semibold tracking-[0.04em] border-none cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-30"
          >
            {actionLabel}
          </button>
        </div>
      </div>

      {confirmingIg && !exporting && (
        <div
          className="fixed inset-0 z-[110] bg-black/70 flex items-center justify-center p-6"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmingIg(false); }}
        >
          <div className="w-full max-w-[380px] bg-surface-2 border border-border-mid rounded-xl overflow-hidden shadow-2xl">
            <div className="px-6 pt-6 pb-5">
              <h3 className="text-sm font-semibold text-brand-white m-0 mb-2 tracking-[0.02em]">Post to Instagram?</h3>
              <p className="text-[0.8rem] text-brand-white opacity-60 leading-relaxed m-0">
                {selected.size === 1 ? "1 story will be published" : `${selected.size} stories will be published`} as Instagram stories to{" "}
                {igUsername ? (
                  <span className="font-semibold text-brand-white opacity-100">@{igUsername}</span>
                ) : (
                  <span className="opacity-80">your linked account</span>
                )}.
              </p>
              {(() => {
                const dupes = stories.filter((s) => selected.has(s.index) && hasPosted(s.index));
                if (dupes.length === 0) return null;
                return (
                  <div className="mt-4 p-3 rounded-md border border-amber-500/30 bg-amber-500/10">
                    <p className="text-[0.7rem] font-semibold text-amber-400 m-0 mb-1.5 tracking-[0.04em]">
                      ALREADY POSTED
                    </p>
                    <p className="text-[0.7rem] text-amber-200/80 leading-snug m-0 mb-1.5">
                      {dupes.length === 1
                        ? "This story has already been posted to Instagram. Continue to post it again?"
                        : `${dupes.length} of these stories have already been posted. Continue to post them again?`}
                    </p>
                    <ul className="m-0 pl-4 text-[0.7rem] text-amber-200/70 leading-snug list-disc">
                      {dupes.map((s) => (
                        <li key={s.index}>
                          <span className="opacity-80">#{s.index}</span> {s.headline}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}
            </div>
            <div className="flex gap-2 px-6 pb-5">
              <button
                onClick={() => setConfirmingIg(false)}
                className="flex-1 py-2.5 rounded-lg border border-border-mid bg-transparent text-brand-white text-xs font-semibold tracking-[0.04em] cursor-pointer opacity-60 hover:opacity-90 transition-opacity"
              >
                CANCEL
              </button>
              <button
                onClick={handleInstagram}
                autoFocus
                className="flex-1 py-2.5 rounded-lg bg-brand-white text-brand-black text-xs font-semibold tracking-[0.04em] border-none cursor-pointer hover:opacity-90 transition-opacity"
              >
                POST
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
