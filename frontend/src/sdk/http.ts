import { config } from "@/config";
import type { AnyObject } from "@/utils/utils";

export class HttpError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: any
  ) {
    super(`HTTP ${status}: ${statusText}`);
    this.name = 'HttpError';
  }
}

export const http = {
  async get(url: string, options: RequestInit = {}) {
    const response = await fetch('.' + url, {
      method: 'GET',
      credentials: 'include', // Include cookies for authentication
      ...options
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: response.statusText }));
      throw new HttpError(response.status, response.statusText, body);
    }
    return response.json();
  },
  async post(url: string, body: any, options: RequestInit = {}) {
    const response = await fetch('.' + url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      credentials: 'include', // Include cookies for authentication
      body: JSON.stringify(body),
      ...options
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: response.statusText }));
      throw new HttpError(response.status, response.statusText, errorBody);
    }
    return response.json();
  }
}

export function toQueryString(anyobj: AnyObject): string {
  let r='?'
  for (const key in anyobj) {
    r += encodeURIComponent(key)+'='+encodeURIComponent(anyobj[key])
  }
  return r
}