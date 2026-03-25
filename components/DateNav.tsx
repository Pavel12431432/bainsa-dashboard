"use client";

import { useRouter } from "next/navigation";

interface Props {
  date: string; // "YYYY-MM-DD"
}

function stepDate(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const arrowStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#f4f3f3",
  opacity: 0.5,
  fontSize: "1rem",
  cursor: "pointer",
  padding: "4px 8px",
  fontFamily: "inherit",
  lineHeight: 1,
};

export default function DateNav({ date }: Props) {
  const router = useRouter();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
      <button style={arrowStyle} onClick={() => router.push(`/stories/${stepDate(date, -1)}`)}>
        ←
      </button>
      <span style={{ fontSize: "0.875rem", color: "#f4f3f3", opacity: 0.4, minWidth: "90px", textAlign: "center" }}>
        {date}
      </span>
      <button style={arrowStyle} onClick={() => router.push(`/stories/${stepDate(date, 1)}`)}>
        →
      </button>
    </div>
  );
}
