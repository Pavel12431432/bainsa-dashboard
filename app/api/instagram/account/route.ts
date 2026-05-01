import { NextResponse } from "next/server";
import { getAccountUsername } from "@/lib/instagram";

export async function GET() {
  try {
    const username = await getAccountUsername();
    return NextResponse.json({ username });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
