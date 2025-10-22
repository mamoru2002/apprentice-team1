type JsonRequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
};

export const isBrowser = typeof window !== 'undefined';

export async function requestJson<T>(url: string, options: JsonRequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = options;
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    signal,
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  const response = await fetch(url, init);
  let payload: any = null;

  if (response.status !== 204) {
    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }
  }

  if (!response.ok) {
    const message = payload?.error || payload?.message || `HTTP ${response.status}`;
    const details = Array.isArray(payload?.details) ? payload.details.join(' ') : undefined;
    throw new Error(details ? `${message} ${details}` : message);
  }

  return payload as T;
}

const SKETCH_URL_CANDIDATES = [
  'before_sketch_url',
  'beforeSketchUrl',
  'before_sketch_image_url',
  'beforeSketchImageUrl',
  'before_sketch_data_url',
  'beforeSketchDataUrl',
  'sketch_image_url',
  'sketchImageUrl',
];

export const extractSketchUrl = (workItem: Record<string, unknown> | undefined | null): string | null => {
  if (!workItem) return null;

  for (const key of SKETCH_URL_CANDIDATES) {
    const value = workItem[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  return null;
};
