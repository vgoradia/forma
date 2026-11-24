import { beforeEach, describe, expect, it, vi } from "vitest";

const updateUserById = vi.hoisted(() => vi.fn());
const createClient = vi.hoisted(() => vi.fn());

vi.mock("@supabase/supabase-js", () => ({
  createClient,
}));

vi.mock("@/lib/supabase/config", () => ({
  getSupabaseUrl: () => "https://example.supabase.co",
}));

import { setUserPlan } from "./admin";

beforeEach(() => {
  updateUserById.mockReset();
  createClient.mockReset();
  createClient.mockReturnValue({
    auth: { admin: { updateUserById } },
  });
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

describe("setUserPlan", () => {
  it("does nothing without the service role key", async () => {
    await expect(setUserPlan("user-1", "plus")).resolves.toBe(false);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("writes the plan to app_metadata and clears the client-writable copy", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
    updateUserById.mockResolvedValue({ data: { user: {} }, error: null });

    await expect(setUserPlan("user-1", "plus")).resolves.toBe(true);

    expect(createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "service-role-secret",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    expect(updateUserById).toHaveBeenCalledWith("user-1", {
      app_metadata: { plan: "plus" },
      user_metadata: { plan: null },
    });
  });

  it("returns false when the admin update fails", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
    updateUserById.mockResolvedValue({
      data: { user: null },
      error: { message: "update failed" },
    });

    await expect(setUserPlan("user-1", "free")).resolves.toBe(false);
    expect(updateUserById).toHaveBeenCalledWith("user-1", {
      app_metadata: { plan: "free" },
      user_metadata: { plan: null },
    });
  });
});
