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
  const failures = checks.filter(({ key }) => !result[key].pass);
  if (failures.length === 0) return null;

  return (
    <div className="flex gap-1 flex-wrap justify-end">
      {failures.map(({ key, label }) => (
        <span
          key={key}
          className="group relative text-[0.55rem] font-semibold tracking-[0.03em] px-1.5 py-0.5 rounded-sm bg-black/70 text-danger backdrop-blur-sm cursor-default hover:bg-danger/20 transition-colors"
        >
          ✕ {label.toUpperCase()}
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded bg-[#1a1a1a] border border-border-mid text-[0.6rem] text-brand-white font-normal tracking-normal whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            {result[key].detail}
          </span>
        </span>
      ))}
    </div>
  );
}
