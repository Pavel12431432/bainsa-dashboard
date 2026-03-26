import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function Home() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  redirect(`/stories/${today}`);
}
