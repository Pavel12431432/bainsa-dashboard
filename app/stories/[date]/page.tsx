import { readFile } from "fs/promises";
import { notFound } from "next/navigation";
import { parseStories } from "@/lib/parseStories";
import { readApprovals } from "@/lib/approvals";
import { fileExists } from "@/lib/fs";
import { isValidDate } from "@/lib/date";
import { requireEnv } from "@/lib/env";
import StoryGrid from "@/components/StoryGrid";
import DateNav from "@/components/DateNav";
import AgentDrawer from "@/components/AgentDrawer";

interface Props {
  params: Promise<{ date: string }>;
}

export default async function StoriesPage({ params }: Props) {
  const { date } = await params;
  if (!isValidDate(date)) notFound();
  const filePath = `${requireEnv("STORIES_PATH")}/${date}.md`;

  const exists = await fileExists(filePath);
  const [stories, approvals] = await Promise.all([
    exists ? readFile(filePath, "utf-8").then(parseStories) : Promise.resolve([]),
    readApprovals(date),
  ]);

  return (
    <div className="min-h-screen bg-brand-black">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border sticky top-0 bg-brand-black z-10 max-sm:grid max-sm:grid-cols-[auto_1fr] max-sm:gap-y-2 max-sm:gap-x-0 max-sm:px-4 max-sm:py-3">
        <div className="flex items-center gap-4 max-sm:col-start-1 max-sm:row-start-1">
          <span className="text-base font-semibold text-brand-white tracking-[0.08em]">
            BAINSA
          </span>
          <a
            href="/api/auth/logout"
            className="text-brand-white opacity-25 text-[0.7rem] font-semibold tracking-[0.06em] no-underline"
          >
            LOGOUT
          </a>
        </div>

        <DateNav date={date} className="max-sm:col-start-2 max-sm:row-start-1 max-sm:justify-self-end" />

        <AgentDrawer date={date} className="max-sm:col-span-full max-sm:row-start-2" />
      </header>

      {/* Content */}
      <main className="p-5">
        <StoryGrid date={date} initialStories={stories} initialApprovals={approvals} />
      </main>
    </div>
  );
}
