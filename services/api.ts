const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:4000" : "");
let authToken: string | null = null;
let sessionVersion = 0;
export const getSessionVersion = () => sessionVersion;
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export const setAuthToken = (token: string | null) => {
  if (token !== authToken) sessionVersion++;
  authToken = token;
};
const request = async (path: string, options: RequestInit = {}) => {
  if (!API_URL)
    throw new ApiError(
      "The API address is not configured for this deployment.",
      503,
    );
  const generation = sessionVersion;
  let res: Response;
  try {
    res = await fetch(`${API_URL.replace(/\/$/, "")}${path}`, {
      ...options,
      signal: options.signal || AbortSignal.timeout(30000),
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    if (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "TimeoutError"
    )
      throw new ApiError(
        "The server took too long to respond. Please try again.",
        504,
      );
    throw new ApiError(
      import.meta.env.DEV
        ? `Cannot reach the API at ${API_URL}. Check VITE_API_URL and that the API is running and allows this site's origin.`
        : "Cannot connect to the server. Check your connection and try again.",
      503,
    );
  }
  if (generation !== sessionVersion)
    throw new ApiError(
      "The session changed. Retry in your current workspace.",
      409,
    );
  const raw = await res.text();
  const isJson = (res.headers.get("content-type") || "").includes(
    "application/json",
  );
  let data;
  try {
    data = raw ? (isJson ? JSON.parse(raw) : { message: raw }) : null;
  } catch {
    throw new ApiError("Invalid API response", 502);
  }
  if (!res.ok)
    throw new ApiError(
      data?.error || data?.message || res.statusText,
      res.status,
    );
  return data;
};
export const api = {
  download: async (path: string) => {
    if (!API_URL) throw new ApiError("API address is not configured", 503);
    const generation = sessionVersion;
    const response = await fetch(`${API_URL.replace(/\/$/, "")}${path}`, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      signal: AbortSignal.timeout(30000),
    });
    if (generation !== sessionVersion)
      throw new ApiError(
        "Session changed. Retry in your current workspace.",
        409,
      );
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new ApiError(data.error || "Download failed", response.status);
    }
    return response.blob();
  },
  get: (path: string) => request(path),
  post: (path: string, body?: unknown) =>
    request(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
  put: (path: string, body?: unknown) =>
    request(path, { method: "PUT", body: JSON.stringify(body ?? {}) }),
  del: (path: string, body?: unknown) =>
    request(path, { method: "DELETE", body: JSON.stringify(body ?? {}) }),
};
