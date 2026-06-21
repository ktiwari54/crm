const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export async function publicApiFetch<T>(
  path: string,
  options: RequestInit = {},
  portalToken?: string,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (portalToken) {
    headers.set('X-Portal-Token', portalToken);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text || `Request failed (${response.status})`;
    try {
      const json = JSON.parse(text) as { message?: string | string[] };
      if (json.message) {
        message = Array.isArray(json.message) ? json.message.join(', ') : json.message;
      }
    } catch {
      // keep raw text
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}