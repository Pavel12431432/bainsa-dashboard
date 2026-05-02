import HeaderShell from "@/components/HeaderShell";
import LogsView from "@/components/LogsView";
import { queryLogs } from "@/lib/logs";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const initial = await queryLogs({ limit: 100 });
  return (
    <div className="h-screen bg-brand-black flex flex-col overflow-hidden">
      <HeaderShell />
      <main className="p-5 flex-1 min-h-0 overflow-hidden">
        <LogsView initialEvents={initial.events} initialCursor={initial.nextCursor} />
      </main>
    </div>
  );
}
