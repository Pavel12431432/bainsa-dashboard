interface AgentStatus {
  ranToday: boolean;
  lastRun: string | null;
  count: number | null;
}

interface Props {
  agent: string;
  status: AgentStatus | undefined;
  loading?: boolean;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome",
  });
}

export default function AgentStatusBadge({ agent, status, loading }: Props) {
  const label = agent === "MARCO" ? "articles" : "stories";

  return (
    <>
      {agent}
      {!loading && status && (
        <div className="flex items-center gap-1.5">
          <div
            className="w-[5px] h-[5px] rounded-full"
            style={{ background: status.ranToday ? "#22c55e" : "#555" }}
          />
          <span className="text-[0.65rem] text-brand-white opacity-35 font-semibold">
            {status.ranToday
              ? `${status.count} ${label} · ${formatTime(status.lastRun!)}`
              : "not run today"}
          </span>
        </div>
      )}
    </>
  );
}
