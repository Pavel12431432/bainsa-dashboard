import { readFile } from "fs/promises";
import { requireEnv } from "@/lib/env";
import { readInstructionHistory } from "@/lib/instructionHistory";
import HeaderShell from "@/components/HeaderShell";
import TeachEditor from "@/components/TeachEditor";

export const dynamic = "force-dynamic";

export default async function TeachPage() {
  const base = requireEnv("SOFIA_INSTRUCTIONS_PATH");
  const [fixed, adaptive, history] = await Promise.all([
    readFile(`${base}/FIXED.md`, "utf-8"),
    readFile(`${base}/ADAPTIVE.md`, "utf-8"),
    readInstructionHistory(),
  ]);

  return (
    <div className="h-screen bg-brand-black flex flex-col overflow-hidden">
      <HeaderShell />
      <main className="p-5 flex-1 min-h-0">
        <TeachEditor fixed={fixed} adaptive={adaptive} initialHistory={history} />
      </main>
    </div>
  );
}
