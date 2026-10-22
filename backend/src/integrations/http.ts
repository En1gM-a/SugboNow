// Shared HTTP helpers for integrations. Error messages never include the
// request URL, because some URLs carry an API key.

export const BOT_USER_AGENT = "SugboNowBot/0.1 (+https://github.com/En1gM-a/SugboNow)";

export class IntegrationError extends Error {
  constructor(
    readonly source: string,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "IntegrationError";
  }
}

export interface FetchOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export async function fetchText(source: string, url: string, options: FetchOptions = {}): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 20_000);
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": BOT_USER_AGENT, ...options.headers },
      signal: controller.signal,
    });
    const body = await response.text();
    if (!response.ok) {
      const hint = response.status === 403 ? " (blocked, possibly by bot protection)" : "";
      throw new IntegrationError(source, `${source} responded with HTTP ${response.status}${hint}`, response.status);
    }
    return body;
  } catch (error) {
    if (error instanceof IntegrationError) throw error;
    const reason = error instanceof Error && error.name === "AbortError" ? "timed out" : "network error";
    throw new IntegrationError(source, `${source} request failed: ${reason}`);
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJson<T>(source: string, url: string, options: FetchOptions = {}): Promise<T> {
  const body = await fetchText(source, url, { ...options, headers: { Accept: "application/json", ...options.headers } });
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new IntegrationError(source, `${source} returned invalid JSON`);
  }
}
