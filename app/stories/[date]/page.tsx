import { readFile } from "fs/promises";
import { notFound } from "next/navigation";
import { parseStories } from "@/lib/parseStories";
import { readApprovals } from "@/lib/approvals";
import { fileExists } from "@/lib/fs";
import { isValidDate } from "@/lib/date";
import { requireEnv } from "@/lib/env";
import StoryGrid from "@/components/StoryGrid";
import HeaderShell from "@/components/HeaderShell";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ date: string }>;
  searchParams: Promise<{ highlight?: string }>;
}

export default async function StoriesPage({ params, searchParams }: Props) {
  const { date } = await params;
  const { highlight } = await searchParams;
  if (!isValidDate(date)) notFound();
  const filePath = `${requireEnv("STORIES_PATH")}/${date}.md`;

  const exists = await fileExists(filePath);
  const [stories, approvals] = await Promise.all([
    exists ? readFile(filePath, "utf-8").then(parseStories) : Promise.resolve([]),
    readApprovals(date),
  ]);

  return (
    <div className="min-h-screen bg-brand-black">
      <HeaderShell date={date} />

      {/* Content */}
      <main className="p-5">
        <StoryGrid date={date} initialStories={stories} initialApprovals={approvals} highlightIndex={highlight ? Number(highlight) : undefined} />
      </main>
    </div>
  );
}
