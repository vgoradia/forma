import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  init: vi.fn(),
  capture: vi.fn(),
  loaded: false,
  vercelTrack: vi.fn(),
}));

vi.mock("posthog-js", () => ({
  default: {
    init: mocks.init,
    capture: mocks.capture,
    get __loaded() {
      return mocks.loaded;
    },
  },
}));

vi.mock("@vercel/analytics", () => ({
  track: mocks.vercelTrack,
}));

import { trackEvent } from "./analytics";

function browserWithoutTracking() {
  vi.stubGlobal("window", {});
  vi.stubGlobal("navigator", { doNotTrack: null });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  mocks.init.mockClear();
  mocks.capture.mockClear();
  mocks.vercelTrack.mockClear();
  mocks.loaded = false;
});

describe("trackEvent", () => {
  it("does not call PostHog when the key is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    browserWithoutTracking();

    expect(() => trackEvent("scan_started", { source: "upload" })).not.toThrow();

    expect(mocks.init).not.toHaveBeenCalled();
    expect(mocks.capture).not.toHaveBeenCalled();
    expect(mocks.vercelTrack).toHaveBeenCalledWith("scan_started", { source: "upload" });
  });

  it("does not call PostHog when Do Not Track is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    vi.stubGlobal("window", {});
    vi.stubGlobal("navigator", { doNotTrack: "1" });

    trackEvent("verdict_viewed", { source: "scan" });
    await Promise.resolve();

    expect(mocks.init).not.toHaveBeenCalled();
    expect(mocks.capture).not.toHaveBeenCalled();
  });

  it("sends the event to PostHog when a key is set and Do Not Track is off", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://us.i.posthog.com");
    browserWithoutTracking();

    trackEvent("affiliate_click", { retailer: "nordstrom.com" });

    await vi.waitFor(() => {
      expect(mocks.capture).toHaveBeenCalledWith("affiliate_click", { retailer: "nordstrom.com" });
    });
    expect(mocks.init).toHaveBeenCalledWith(
      "phc_test",
      expect.objectContaining({
        api_host: "https://us.i.posthog.com",
        disable_session_recording: true,
        respect_dnt: true,
        autocapture: false,
      })
    );
  });
});
