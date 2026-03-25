import { ComplianceResult } from "@/types";

interface Props {
  result: ComplianceResult;
}

const checks: { key: keyof Omit<ComplianceResult, "pass">; label: string }[] = [
  { key: "colorValid",    label: "Color"    },
  { key: "headlineOk",    label: "Headline" },
  { key: "bodyOk",        label: "Body"     },
  { key: "sourcePresent", label: "Source"   },
];

export default function ComplianceBadge({ result }: Props) {
  const failures = checks.filter(({ key }) => !(result[key] as boolean));

  // All pass — show nothing
  if (failures.length === 0) return null;

  return (
    <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
      {failures.map(({ key, label }) => (
        <span
          key={key}
          style={{
            fontSize: "0.62rem",
            fontWeight: 600,
            letterSpacing: "0.03em",
            padding: "2px 6px",
            borderRadius: "3px",
            background: "transparent",
            color: "#888",
            border: "1px solid #333",
          }}
        >
          ✕ {label}
        </span>
      ))}
    </div>
  );
}
