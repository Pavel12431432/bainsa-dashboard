export const fetchHeaders = {
  "Content-Type": "application/json",
  "X-Requested-With": "fetch",
} as const;

export async function apiFetch(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: fetchHeaders,
    body: JSON.stringify(body),
  });
}
