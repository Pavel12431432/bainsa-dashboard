"use client";

import { useState } from "react";
import { Story, ApprovalState } from "@/types";
import { checkCompliance } from "@/lib/compliance";
import StoryCard from "./StoryCard";
import ComplianceBadge from "./ComplianceBadge";
import StoryEditor from "./StoryEditor";

interface Props {
  date: string;
  initialStories: Story[];
  initialApprovals: ApprovalState;
}

export default function StoryGrid({ date, initialStories, initialApprovals }: Props) {
  const [stories, setStories] = useState<Story[]>(initialStories);
  const [approvals, setApprovals] = useState<ApprovalState>(initialApprovals);
  const [editing, setEditing] = useState<Story | null>(null);

  async function handleApprove(index: number, action: "approve" | "reject" | "clear") {
    const res = await fetch(`/api/stories/${date}/${index}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Requested-With": "fetch" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      const data = await res.json();
      setApprovals(data.approvals);
    }
  }

  function handleSaved(updated: Story) {
    setStories((prev) => prev.map((s) => s.index === updated.index ? updated : s));
  }

  if (stories.length === 0) {
    return (
      <div style={{ textAlign: "left", color: "#f4f3f3", opacity: 0.4, padding: "48px 0" }}>
        No stories for this date — run Sofia to generate.
      </div>
    );
  }

  return (
    <>
      {editing && (
        <StoryEditor
          story={editing}
          date={date}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "32px",
        }}
      >
        {stories.map((story) => {
          const compliance = checkCompliance(story);
          const approved = approvals.approved.includes(story.index);
          const rejected = approvals.rejected.includes(story.index);

          return (
            <div key={story.index} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Card */}
              <div style={{ position: "relative", display: "inline-block" }}>
                <StoryCard story={story} scale={0.72} />

                {/* Approval overlay */}
                {approved && (
                  <div style={{
                    position: "absolute", inset: 0, borderRadius: "16px",
                    border: "2px solid #22c55e", pointerEvents: "none",
                  }} />
                )}
                {rejected && (
                  <div style={{
                    position: "absolute", inset: 0, borderRadius: "16px",
                    border: "2px solid #ef4444",
                    background: "rgba(0,0,0,0.45)", pointerEvents: "none",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{ color: "#ef4444", fontSize: "1.5rem", fontWeight: 700 }}>✕</span>
                  </div>
                )}
              </div>

              {/* Story title */}
              <p style={{ color: "#f4f3f3", fontSize: "0.8rem", opacity: 0.5, margin: 0, lineHeight: 1.3 }}>
                {story.index}. {story.title}
              </p>

              {/* Compliance */}
              <div style={{ minHeight: "22px" }}>
                <ComplianceBadge result={compliance} />
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => setEditing(story)}
                  style={{
                    flex: 1, padding: "7px 0", borderRadius: "5px",
                    border: "1px solid #333", background: "transparent",
                    color: "#f4f3f3", fontSize: "0.75rem", fontWeight: 600,
                    fontFamily: "inherit", cursor: "pointer", letterSpacing: "0.04em",
                  }}
                >
                  EDIT
                </button>
                <button
                  onClick={() => handleApprove(story.index, approved ? "clear" : "approve")}
                  style={{
                    flex: 1, padding: "7px 0", borderRadius: "5px",
                    border: approved ? "1px solid #22c55e" : "1px solid #333",
                    background: approved ? "#22c55e18" : "transparent",
                    color: approved ? "#22c55e" : "#f4f3f3",
                    fontSize: "0.75rem", fontWeight: 600, fontFamily: "inherit",
                    cursor: "pointer", letterSpacing: "0.04em",
                  }}
                >
                  {approved ? "✓ APPROVED" : "APPROVE"}
                </button>
                <button
                  onClick={() => handleApprove(story.index, rejected ? "clear" : "reject")}
                  style={{
                    flex: 1, padding: "7px 0", borderRadius: "5px",
                    border: rejected ? "1px solid #ef4444" : "1px solid #333",
                    background: rejected ? "#ef444418" : "transparent",
                    color: rejected ? "#ef4444" : "#f4f3f3",
                    fontSize: "0.75rem", fontWeight: 600, fontFamily: "inherit",
                    cursor: "pointer", letterSpacing: "0.04em",
                  }}
                >
                  {rejected ? "✕ REJECTED" : "REJECT"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </>
  );
}
