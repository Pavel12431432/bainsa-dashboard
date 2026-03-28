"use client";

import { useState } from "react";
import { Story, ApprovalState } from "@/types";
import { apiFetch } from "@/lib/fetch";
import { checkCompliance } from "@/lib/compliance";
import StoryCard from "./StoryCard";
import ComplianceBadge from "./ComplianceBadge";
import StoryEditor from "./StoryEditor";

interface Props {
  date: string;
  initialStories: Story[];
  initialApprovals: ApprovalState;
}

const actionBtn = "flex-1 py-[7px] rounded-[5px] text-xs font-semibold tracking-[0.04em] cursor-pointer";

export default function StoryGrid({ date, initialStories, initialApprovals }: Props) {
  const [stories, setStories] = useState<Story[]>(initialStories);
  const [approvals, setApprovals] = useState<ApprovalState>(initialApprovals);
  const [editing, setEditing] = useState<Story | null>(null);

  async function handleApprove(index: number, action: "approve" | "reject" | "clear") {
    const res = await apiFetch(`/api/stories/${date}/${index}/approve`, { action });
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
      <div className="text-left text-brand-white opacity-40 py-12">
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

      <div className="grid gap-8 grid-cols-4 max-lg:grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))]">
        {stories.map((story) => {
          const compliance = checkCompliance(story);
          const approved = approvals.approved.includes(story.index);
          const rejected = approvals.rejected.includes(story.index);

          return (
            <div key={story.index} className="flex flex-col gap-3">
              {/* Card */}
              <div className="relative w-full">
                <StoryCard story={story} />

                {approved && (
                  <div className="absolute inset-0 rounded-2xl border-2 border-success pointer-events-none" />
                )}
                {rejected && (
                  <div className="absolute inset-0 rounded-2xl border-2 border-danger bg-black/45 pointer-events-none flex items-center justify-center">
                    <span className="text-danger text-2xl font-bold">✕</span>
                  </div>
                )}
                {!compliance.pass && (
                  <div className="absolute bottom-2 left-2 right-2 pointer-events-none">
                    <ComplianceBadge result={compliance} />
                  </div>
                )}
              </div>

              {/* Title */}
              <p className="text-brand-white text-[0.8rem] opacity-50 m-0 leading-tight">
                {story.index}. {story.title}
              </p>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(story)}
                  className={`${actionBtn} border border-border-mid bg-transparent text-brand-white`}
                >
                  EDIT
                </button>
                <button
                  onClick={() => handleApprove(story.index, approved ? "clear" : "approve")}
                  className={`${actionBtn} border ${
                    approved
                      ? "border-success bg-success/10 text-success"
                      : "border-border-mid bg-transparent text-brand-white"
                  }`}
                >
                  {approved ? "✓ APPROVED" : "APPROVE"}
                </button>
                <button
                  onClick={() => handleApprove(story.index, rejected ? "clear" : "reject")}
                  className={`${actionBtn} border ${
                    rejected
                      ? "border-danger bg-danger/10 text-danger"
                      : "border-border-mid bg-transparent text-brand-white"
                  }`}
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
