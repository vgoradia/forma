import { beforeEach, describe, expect, it, vi } from "vitest";

const updateUserById = vi.hoisted(() => vi.fn());
const listUsers = vi.hoisted(() => vi.fn());
const createClient = vi.hoisted(() => vi.fn());

vi.mock("@supabase/supabase-js", () => ({
  createClient,
}));

vi.mock("@/lib/supabase/config", () => ({
  getSupabaseUrl: () => "https://example.supabase.co",
}));

import { findUserIdByEmail, setUserPlan } from "./admin";

beforeEach(() => {
  updateUserById.mockReset();
  listUsers.mockReset();
  createClient.mockReset();
  createClient.mockReturnValue({
    auth: { admin: { updateUserById, listUsers } },
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

  it("stores the Stripe customer id in the same app_metadata write", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
    updateUserById.mockResolvedValue({ data: { user: {} }, error: null });

    await expect(setUserPlan("user-1", "plus", { stripeCustomerId: " cus_123 " })).resolves.toBe(true);

    expect(updateUserById).toHaveBeenCalledWith("user-1", {
      app_metadata: { plan: "plus", stripe_customer_id: "cus_123" },
      user_metadata: { plan: null },
    });
  });

  it("omits a blank Stripe customer id so a plan update does not clear it", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
    updateUserById.mockResolvedValue({ data: { user: {} }, error: null });

    await setUserPlan("user-1", "free", { stripeCustomerId: "  " });

    expect(updateUserById).toHaveBeenCalledWith("user-1", {
      app_metadata: { plan: "free" },
      user_metadata: { plan: null },
    });
  });
});

describe("findUserIdByEmail", () => {
  it("throws when the service role key is missing", async () => {
    await expect(findUserIdByEmail("buyer@example.com")).rejects.toThrow(
      "Supabase admin is not configured"
    );
    expect(createClient).not.toHaveBeenCalled();
  });

  it("returns the user id for a matching email", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
    listUsers.mockResolvedValue({
      data: {
        users: [{ id: "user-2", email: "Buyer@Example.com" }],
        aud: "authenticated",
        nextPage: null,
        lastPage: 1,
        total: 1,
      },
      error: null,
    });

    await expect(findUserIdByEmail("buyer@example.com")).resolves.toBe("user-2");
    expect(listUsers).toHaveBeenCalledWith({ page: 1, perPage: 1000 });
  });

  it("walks pages until the email matches", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
    listUsers
      .mockResolvedValueOnce({
        data: {
          users: [{ id: "other", email: "other@example.com" }],
          aud: "authenticated",
          nextPage: 2,
          lastPage: 2,
          total: 2,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          users: [{ id: "user-9", email: "buyer@example.com" }],
          aud: "authenticated",
          nextPage: null,
          lastPage: 2,
          total: 2,
        },
        error: null,
      });

    await expect(findUserIdByEmail("buyer@example.com")).resolves.toBe("user-9");
    expect(listUsers).toHaveBeenNthCalledWith(1, { page: 1, perPage: 1000 });
    expect(listUsers).toHaveBeenNthCalledWith(2, { page: 2, perPage: 1000 });
  });

  it("throws when the admin list fails", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
    listUsers.mockResolvedValue({
      data: { users: [] },
      error: { message: "lookup failed" },
    });

    await expect(findUserIdByEmail("buyer@example.com")).rejects.toThrow("lookup failed");
  });
});
