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
    <div className="flex gap-1 flex-wrap justify-end">
      {failures.map(({ key, label }) => (
        <span
          key={key}
          className="text-[0.55rem] font-semibold tracking-[0.03em] px-1.5 py-0.5 rounded-sm bg-black/70 text-danger backdrop-blur-sm"
        >
          ✕ {label.toUpperCase()}
        </span>
      ))}
    </div>
  );
}
