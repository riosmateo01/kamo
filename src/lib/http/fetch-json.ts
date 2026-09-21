/**
 * Thin fetch helpers shared by Harvest + QBO HTTP clients.
 * No SDK — plain fetch with JSON + basic 429 retry.
 */

export class HttpApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: string
  ) {
    super(message);
    this.name = "HttpApiError";
  }
}

export type FetchJsonOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: string | URLSearchParams;
  /** Max retries on 429 / 5xx (default 2) */
  retries?: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchJson<T>(
  url: string,
  opts: FetchJsonOptions = {}
): Promise<T> {
  const retries = opts.retries ?? 2;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, {
      method: opts.method ?? "GET",
      headers: opts.headers,
      body: opts.body,
    });

    if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
      const retryAfter = Number(res.headers.get("Retry-After") || "0");
      const waitMs =
        retryAfter > 0
          ? retryAfter * 1000
          : Math.min(2000, 250 * 2 ** attempt);
      lastErr = new HttpApiError(
        `HTTP ${res.status} from ${url}`,
        res.status,
        await res.text().catch(() => "")
      );
      if (attempt < retries) {
        await sleep(waitMs);
        continue;
      }
      throw lastErr;
    }

    const text = await res.text();
    if (!res.ok) {
      throw new HttpApiError(
        `HTTP ${res.status} from ${url}: ${text.slice(0, 400)}`,
        res.status,
        text
      );
    }

    if (!text) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new HttpApiError(
        `Invalid JSON from ${url}`,
        res.status,
        text.slice(0, 400)
      );
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error("fetchJson failed");
}
