import { redirect } from "next/navigation";
import { todayRome } from "@/lib/date";

export const dynamic = "force-dynamic";

export default function Home() {
  redirect(`/stories/${todayRome()}`);
}
