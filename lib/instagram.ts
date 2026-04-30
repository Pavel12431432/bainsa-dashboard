import { requireEnv } from "@/lib/env";

const GRAPH = "https://graph.facebook.com/v23.0";

export interface PublishResult {
  mediaId: string;
  containerId: string;
}

interface MetaError {
  error?: {
    message?: string;
    code?: number;
    error_subcode?: number;
    type?: string;
    error_user_title?: string;
    error_user_msg?: string;
    fbtrace_id?: string;
  };
}

interface IgCreds {
  igUserId: string;
  token: string;
}

async function metaCall<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  let json: T & MetaError;
  try {
    json = JSON.parse(text) as T & MetaError;
  } catch {
    throw new Error(`Meta API non-JSON response (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok || json.error) {
    const e = json.error ?? {};
    console.error("[meta-api] error response:", JSON.stringify(json.error ?? json, null, 2));
    const parts = [
      e.message ?? `HTTP ${res.status}`,
      e.error_user_msg ? `(${e.error_user_msg})` : null,
      e.code != null ? `code=${e.code}` : null,
      e.error_subcode != null ? `subcode=${e.error_subcode}` : null,
    ].filter(Boolean);
    throw new Error(`Meta API: ${parts.join(" ")}`);
  }
  return json;
}

async function createContainer({ igUserId, token }: IgCreds, imageUrl: string): Promise<string> {
  const body = new URLSearchParams({
    image_url: imageUrl,
    media_type: "STORIES",
    access_token: token,
  });
  const data = await metaCall<{ id: string }>(`${GRAPH}/${igUserId}/media`, { method: "POST", body });
  return data.id;
}

async function pollContainer({ token }: IgCreds, containerId: string, maxAttempts = 10, delayMs = 1500): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const data = await metaCall<{ status_code: string }>(
      `${GRAPH}/${containerId}?fields=status_code&access_token=${encodeURIComponent(token)}`,
      { method: "GET" },
    );
    if (data.status_code === "FINISHED") return;
    if (data.status_code === "ERROR" || data.status_code === "EXPIRED") {
      throw new Error(`Container ${data.status_code}`);
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error("Container did not finish in time");
}

async function publishContainer({ igUserId, token }: IgCreds, containerId: string): Promise<string> {
  const body = new URLSearchParams({ creation_id: containerId, access_token: token });
  const data = await metaCall<{ id: string }>(`${GRAPH}/${igUserId}/media_publish`, { method: "POST", body });
  return data.id;
}

export async function publishStory(imageUrl: string): Promise<PublishResult> {
  const creds: IgCreds = { igUserId: requireEnv("IG_USER_ID"), token: requireEnv("IG_ACCESS_TOKEN") };
  const containerId = await createContainer(creds, imageUrl);
  await pollContainer(creds, containerId);
  const mediaId = await publishContainer(creds, containerId);
  return { mediaId, containerId };
}
