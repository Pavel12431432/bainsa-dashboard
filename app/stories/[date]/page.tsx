import { readFile } from "fs/promises";
import { notFound } from "next/navigation";
import { parseStories } from "@/lib/parseStories";
import { readApprovals } from "@/lib/approvals";
import { fileExists } from "@/lib/fs";
import { isValidDate } from "@/lib/date";
import { requireEnv } from "@/lib/env";
import StoryGrid from "@/components/StoryGrid";
import HeaderShell from "@/components/HeaderShell";

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
      <HeaderShell date={date} />

      {/* Content */}
      <main className="p-5">
        <StoryGrid date={date} initialStories={stories} initialApprovals={approvals} />
      </main>
    </div>
  );
}
