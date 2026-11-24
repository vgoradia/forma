import assert from "node:assert/strict";
import { lookup as dnsLookup } from "node:dns";
import { describe, test } from "vitest";
import {
  hasBlockedAddress,
  isAllowedProxyImageUrl,
  isBlockedHostname,
  isBlockedIpAddress,
  safeRedirectTarget,
  validateProductUrl,
} from "@/lib/security";
import {
  fetchPublicHttp,
  publicAddressLookup,
  UnsafeUrlError,
} from "@/lib/safe-public-fetch";
import type { UpstreamResponse } from "@/lib/safe-public-fetch";

const PUBLIC_IMAGE = "https://cdn.example.com/a.jpg";

function withNodeEnv(value: string | undefined, run: () => void) {
  const env = process.env as Record<string, string | undefined>;
  const previous = env.NODE_ENV;
  if (value === undefined) delete env.NODE_ENV;
  else env.NODE_ENV = value;
  try {
    run();
  } finally {
    if (previous === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = previous;
  }
}

describe("blocked hosts and addresses", () => {
  test("blocks loopback, private, link-local, and metadata names", () => {
    const blocked = [
      "localhost",
      "localhost.",
      "app.localhost",
      "printer.local",
      "shop.internal",
      "metadata.google.internal",
      "metadata.goog",
      "metadata",
      "instance-data",
      "0.0.0.0",
      "0.1.2.3",
      "127.0.0.1",
      "127.0.0.1.",
      "10.1.2.3",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.20",
      "169.254.169.254",
      "100.64.0.1",
      "100.127.255.255",
      "192.0.0.8",
      "192.0.2.1",
      "198.18.0.1",
      "198.51.100.10",
      "203.0.113.5",
      "224.0.0.1",
      "240.0.0.1",
      "255.255.255.255",
      "::1",
      "[::1]",
      "::",
      "[::]",
      "fe80::1",
      "[fe80::1]",
      "febf::1",
      "fc00::1",
      "fd12:3456:789a::1",
      "fec0::1",
      "ff02::1",
      "2001:db8::1",
      "2002:7f00:1::",
      "64:ff9b::8.8.8.8",
      "::ffff:7f00:1",
      "[::ffff:7f00:1]",
      "::ffff:a9fe:a9fe",
      "[::ffff:169.254.169.254]",
    ];

    for (const host of blocked) {
      assert.equal(isBlockedHostname(host), true, host);
    }
  });

  test("allows public hosts and addresses", () => {
    const allowed = [
      "cdn.example.com",
      "example.com.",
      "facebook.com",
      "fd.example.com",
      "8.8.8.8",
      "1.1.1.1",
      "172.15.5.5",
      "172.32.0.1",
      "100.63.255.255",
      "100.128.0.1",
      "11.0.0.1",
      "192.169.1.1",
      "169.255.0.1",
      "198.20.0.1",
      "2001:4860:4860::8888",
      "fb00::1",
      "fe7f::1",
      "::ffff:0808:0808",
    ];

    for (const host of allowed) {
      assert.equal(isBlockedHostname(host), false, host);
    }
  });

  test("blocks alternate IPv4 spellings once the URL parser canonicalizes them", () => {
    for (const url of [
      "http://2130706433/",
      "http://0x7f000001/",
      "http://0177.0.0.1/",
      "http://127.1/",
      "http://[::ffff:7f00:1]/",
      "http://[::1]/",
      "https://169.254.169.254/latest/meta-data/",
    ]) {
      assert.equal(isAllowedProxyImageUrl(url), false, url);
    }
  });

  test("treats any private answer in a DNS set as unsafe", () => {
    assert.equal(hasBlockedAddress([]), true);
    assert.equal(hasBlockedAddress(["8.8.8.8", "10.0.0.1"]), true);
    assert.equal(hasBlockedAddress(["::1"]), true);
    assert.equal(hasBlockedAddress(["8.8.8.8", "2001:4860:4860::8888"]), false);
  });

  test("product URL validation uses the same host block", () => {
    assert.equal(validateProductUrl("https://[::1]/"), "URL is not allowed");
    assert.equal(validateProductUrl("https://metadata.google.internal/"), "URL is not allowed");
    assert.equal(validateProductUrl("http://fd.example.com/item"), null);
    assert.equal(validateProductUrl("https://shop.example.com/p/1"), null);
  });
});

describe("proxy URL policy", () => {
  test("allows public http(s) images outside production", () => {
    withNodeEnv(undefined, () => {
      assert.equal(isAllowedProxyImageUrl(PUBLIC_IMAGE), true);
      assert.equal(isAllowedProxyImageUrl("http://cdn.example.com/a.jpg"), true);
      assert.equal(isAllowedProxyImageUrl("file:///etc/passwd"), false);
      assert.equal(isAllowedProxyImageUrl("javascript:alert(1)"), false);
      assert.equal(isAllowedProxyImageUrl("http://127.0.0.1/secret"), false);
    });
  });

  test("production image URLs must be https", () => {
    withNodeEnv("production", () => {
      assert.equal(isAllowedProxyImageUrl("http://cdn.example.com/a.jpg"), false);
      assert.equal(isAllowedProxyImageUrl(PUBLIC_IMAGE), true);
      assert.equal(isAllowedProxyImageUrl("https://10.0.0.8/a.jpg"), false);
      assert.equal(
        safeRedirectTarget(PUBLIC_IMAGE, "http://169.254.169.254/latest/meta-data/"),
        null,
      );
    });
  });
});

describe("redirect hops", () => {
  test("resolves safe relative redirects and rejects internal targets", () => {
    assert.equal(
      safeRedirectTarget("https://cdn.example.com/dir/a.jpg", "b.jpg"),
      "https://cdn.example.com/dir/b.jpg",
    );
    assert.equal(
      safeRedirectTarget("https://cdn.example.com/dir/a.jpg", "/b.jpg"),
      "https://cdn.example.com/b.jpg",
    );
    assert.equal(safeRedirectTarget(PUBLIC_IMAGE, "https://images.example.com/b.jpg"), "https://images.example.com/b.jpg");
    assert.equal(safeRedirectTarget(PUBLIC_IMAGE, "http://127.0.0.1/secret"), null);
    assert.equal(safeRedirectTarget(PUBLIC_IMAGE, "http://[::1]/secret"), null);
    assert.equal(safeRedirectTarget(PUBLIC_IMAGE, "//169.254.169.254/latest/meta-data"), null);
    assert.equal(safeRedirectTarget(PUBLIC_IMAGE, "http://cdn.example.com@127.0.0.1/"), null);
    assert.equal(safeRedirectTarget(PUBLIC_IMAGE, "file:///etc/passwd"), null);
    assert.equal(safeRedirectTarget(PUBLIC_IMAGE, "http://["), null);
  });

  test("does not request a redirect target that fails the host check", async () => {
    const calls: string[] = [];
    await assert.rejects(
      () =>
        fetchPublicHttp(
          PUBLIC_IMAGE,
          {},
          {
            resolve: async () => ["8.8.8.8"],
            request: async (url) => {
              calls.push(url.href);
              return redirect(`http://169.254.169.254/latest/meta-data/`);
            },
          },
        ),
      UnsafeUrlError,
    );
    assert.deepEqual(calls, [PUBLIC_IMAGE]);
  });

  test("does not request a hop whose DNS answers are private", async () => {
    const calls: string[] = [];
    await assert.rejects(
      () =>
        fetchPublicHttp(
          PUBLIC_IMAGE,
          {},
          {
            resolve: async (hostname) => (hostname === "rebind.example" ? ["10.1.2.3"] : ["8.8.8.8"]),
            request: async (url) => {
              calls.push(url.href);
              return redirect("https://rebind.example/secret");
            },
          },
        ),
      UnsafeUrlError,
    );
    assert.deepEqual(calls, [PUBLIC_IMAGE]);
  });

  test("follows a public redirect chain and returns the final body", async () => {
    const calls: string[] = [];
    const response = await fetchPublicHttp(
      PUBLIC_IMAGE,
      {},
      {
        resolve: async () => ["8.8.8.8"],
        request: async (url) => {
          calls.push(url.href);
          if (url.href === PUBLIC_IMAGE) return redirect("https://images.example.com/final.jpg");
          return {
            status: 200,
            headers: new Headers({ "content-type": "image/jpeg" }),
            body: Uint8Array.from([1, 2, 3]),
          };
        },
      },
    );

    assert.deepEqual(calls, [PUBLIC_IMAGE, "https://images.example.com/final.jpg"]);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/jpeg");
    assert.deepEqual(Array.from(new Uint8Array(await response.arrayBuffer())), [1, 2, 3]);
  });

  test("stops after the redirect limit", async () => {
    const calls: string[] = [];
    await assert.rejects(
      () =>
        fetchPublicHttp(
          PUBLIC_IMAGE,
          { maxRedirects: 1 },
          {
            resolve: async () => ["8.8.8.8"],
            request: async (url) => {
              calls.push(url.pathname);
              return redirect(`/hop-${calls.length}`);
            },
          },
        ),
      (error: unknown) => error instanceof UnsafeUrlError && /redirect/i.test(error.message),
    );
    assert.deepEqual(calls, ["/a.jpg", "/hop-1"]);
  });
});

describe("connect-time lookup", () => {
  test("rejects loopback names and addresses without using the network", async () => {
    for (const host of ["localhost", "127.0.0.1", "::1", "10.0.0.1", "169.254.169.254"]) {
      const error = await lookupError(host);
      assert.ok(error, host);
      assert.equal(error?.code, "EBLOCKED");
    }
  });

  test("accepts public address literals", async () => {
    const resolved = await lookupAddress("1.1.1.1");
    assert.equal(resolved.address, "1.1.1.1");
    assert.equal(resolved.family, 4);
  });

  test("system lookup of an IP literal agrees with the block list", async () => {
    const system = await new Promise<string>((resolve, reject) => {
      dnsLookup("8.8.8.8", (error, address) => {
        if (error) reject(error);
        else resolve(address);
      });
    });
    assert.equal(isBlockedIpAddress(system), false);
  });
});

function redirect(location: string): UpstreamResponse {
  return {
    status: 302,
    headers: new Headers({ location }),
    body: new Uint8Array(),
  };
}

function lookupError(hostname: string): Promise<NodeJS.ErrnoException | null> {
  return new Promise((resolve) => {
    publicAddressLookup(hostname, {}, (error) => {
      resolve(error);
    });
  });
}

function lookupAddress(hostname: string): Promise<{ address: string; family?: number }> {
  return new Promise((resolve, reject) => {
    publicAddressLookup(hostname, {}, (error, address, family) => {
      if (error || typeof address !== "string") {
        reject(error ?? new Error("missing address"));
        return;
      }
      resolve({ address, family });
    });
  });
}
