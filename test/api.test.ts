import { afterEach, expect, it, vi } from "vitest";
import { api, ApiError } from "../services/api";

afterEach(() => vi.unstubAllGlobals());

it("explains an unreachable API instead of exposing the browser fetch error", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
  await expect(api.post("/auth/signup", {})).rejects.toMatchObject({
    status: 503,
    message: expect.stringContaining("Cannot reach the API at"),
  });
});

it("distinguishes a request timeout from an unreachable API", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("Timed out", "TimeoutError")));
  await expect(api.get("/health")).rejects.toMatchObject({ status: 504 });
});

it("retains the API's validation errors", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
    JSON.stringify({ error: "Invitation expired" }),
    { status: 400, headers: { "Content-Type": "application/json" } },
  )));
  await expect(api.post("/auth/signup", {})).rejects.toEqual(
    new ApiError("Invitation expired", 400),
  );
});
