import { readFileSync, existsSync } from "fs";
import { parseStories } from "@/lib/parseStories";
import { readApprovals } from "@/lib/approvals";
import StoryGrid from "@/components/StoryGrid";
import DateNav from "@/components/DateNav";
import AgentDrawer from "@/components/AgentDrawer";

interface Props {
  params: Promise<{ date: string }>;
}

export default async function StoriesPage({ params }: Props) {
  const { date } = await params;
  const storiesPath = process.env.STORIES_PATH ?? "";
  const filePath = `${storiesPath}/${date}.md`;

  const stories = existsSync(filePath)
    ? parseStories(readFileSync(filePath, "utf-8"))
    : [];

  const approvals = readApprovals(date);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", padding: "0" }}>
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 40px",
          borderBottom: "1px solid #1a1a1a",
          position: "sticky",
          top: 0,
          background: "#0a0a0a",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "1rem", fontWeight: 600, color: "#f4f3f3", letterSpacing: "0.08em" }}>
            BAINSA
          </span>
          <a
            href="/api/auth/logout"
            style={{
              color: "#f4f3f3", opacity: 0.25, fontSize: "0.7rem", fontWeight: 600,
              fontFamily: "inherit", letterSpacing: "0.06em", textDecoration: "none",
            }}
          >
            LOGOUT
          </a>
        </div>

        <DateNav date={date} />

        <AgentDrawer date={date} />
      </header>

      {/* Content */}
      <main style={{ padding: "40px" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#f4f3f3", margin: 0 }}>
            Stories
          </h1>
          <p style={{ fontSize: "0.8rem", color: "#f4f3f3", opacity: 0.35, margin: "4px 0 0" }}>
            {stories.length} {stories.length === 1 ? "story" : "stories"} ·{" "}
            {approvals.approved.length} approved · {approvals.rejected.length} rejected
          </p>
        </div>

        <StoryGrid date={date} initialStories={stories} initialApprovals={approvals} />
      </main>
    </div>
  );
}
