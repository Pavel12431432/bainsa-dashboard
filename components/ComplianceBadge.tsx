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
  if (failures.length === 0) return null;

  return (
    <div className="flex gap-[5px] flex-wrap">
      {failures.map(({ key, label }) => (
        <span
          key={key}
          className="text-[0.62rem] font-semibold tracking-[0.03em] px-1.5 py-0.5 rounded-sm bg-transparent text-muted border border-border-mid"
        >
          ✕ {label}
        </span>
      ))}
    </div>
  );
}
