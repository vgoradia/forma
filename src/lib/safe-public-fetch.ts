import http from "node:http";
import https from "node:https";
import { lookup as dnsLookup } from "node:dns";
import { lookup as dnsLookupAsync } from "node:dns/promises";
import type { LookupAddress, LookupOptions } from "node:dns";
import {
  hasBlockedAddress,
  isAllowedProxyImageUrl,
  isBlockedHostname,
  isIpLiteral,
  normalizeHostname,
  safeRedirectTarget,
} from "@/lib/security";

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const DEFAULT_MAX_REDIRECTS = 5;
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;
const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-connection",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "content-length",
]);

export class UnsafeUrlError extends Error {
  constructor(message = "URL is not allowed") {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

export class ResponseTooLargeError extends Error {
  constructor(message = "Response too large") {
    super(message);
    this.name = "ResponseTooLargeError";
  }
}

export type UpstreamResponse = {
  status: number;
  headers: Headers;
  body: Uint8Array;
};

export type PublicHttpDeps = {
  /** Resolves a hostname to IP addresses. Defaults to the system resolver. */
  resolve?: (hostname: string) => Promise<string[]>;
  /** Performs one HTTP request with redirects disabled. */
  request?: (url: URL, headers: Record<string, string>, signal: AbortSignal) => Promise<UpstreamResponse>;
};

type FetchInit = {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  maxRedirects?: number;
  maxBytes?: number;
};

function blockedLookupError(): NodeJS.ErrnoException {
  const error = new Error("Blocked network address") as NodeJS.ErrnoException;
  error.code = "EBLOCKED";
  return error;
}

/**
 * DNS lookup used for the actual socket. Every returned address is checked, and the
 * connection uses one of those addresses rather than resolving the name again.
 */
export function publicAddressLookup(
  hostname: string,
  options: LookupOptions,
  callback: (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void,
): void {
  const host = normalizeHostname(hostname);
  if (!host || isBlockedHostname(host)) {
    callback(blockedLookupError(), "");
    return;
  }

  dnsLookup(host, { family: options.family, hints: options.hints, all: true, verbatim: true }, (err, addresses) => {
    if (err) {
      callback(err, "");
      return;
    }
    if (hasBlockedAddress(addresses.map((entry) => entry.address))) {
      callback(blockedLookupError(), "");
      return;
    }
    if (options.all) {
      callback(null, addresses);
      return;
    }
    const selected = addresses[0];
    callback(null, selected.address, selected.family);
  });
}

async function resolvePublicAddresses(hostname: string): Promise<string[]> {
  const records = await dnsLookupAsync(hostname, { all: true, verbatim: true });
  return records.map((record) => record.address);
}

async function assertPublicResolution(
  hostname: string,
  resolve: (hostname: string) => Promise<string[]>,
): Promise<void> {
  const host = normalizeHostname(hostname);
  if (!host || isBlockedHostname(host)) {
    throw new UnsafeUrlError();
  }
  if (isIpLiteral(host)) return;

  const addresses = await resolve(host);
  if (hasBlockedAddress(addresses)) {
    throw new UnsafeUrlError();
  }
}

function toHeaders(raw: http.IncomingHttpHeaders): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined || HOP_BY_HOP.has(key)) continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else {
      headers.set(key, value);
    }
  }
  return headers;
}

function defaultRequest(
  target: URL,
  headers: Record<string, string>,
  signal: AbortSignal,
  maxBytes: number,
): Promise<UpstreamResponse> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    const succeed = (value: UpstreamResponse) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const transport = target.protocol === "https:" ? https : http;
    const request = transport.request(
      {
        protocol: target.protocol,
        hostname: normalizeHostname(target.hostname),
        port: target.port ? Number(target.port) : undefined,
        path: `${target.pathname}${target.search}`,
        method: "GET",
        headers: {
          ...headers,
          "Accept-Encoding": "identity",
        },
        lookup: publicAddressLookup,
        signal,
      },
      (response) => {
        const status = response.statusCode ?? 0;
        const responseHeaders = toHeaders(response.headers);
        if (REDIRECT_STATUSES.has(status)) {
          response.resume();
          succeed({ status, headers: responseHeaders, body: new Uint8Array() });
          return;
        }

        const chunks: Buffer[] = [];
        let received = 0;
        response.on("data", (chunk: Buffer) => {
          received += chunk.length;
          if (received > maxBytes) {
            response.destroy();
            fail(new ResponseTooLargeError());
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          const body = Buffer.concat(chunks);
          succeed({ status, headers: responseHeaders, body: new Uint8Array(body) });
        });
        response.on("error", (error) => {
          fail(error);
        });
      },
    );

    request.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EBLOCKED") {
        fail(new UnsafeUrlError());
        return;
      }
      fail(error);
    });
    request.end();
  });
}

/**
 * Fetch a public http(s) URL. Redirects are not followed automatically: each Location
 * is resolved and rejected when it points at a non-public host, and DNS answers are
 * checked again before the socket connects.
 */
export async function fetchPublicHttp(
  url: string,
  init: FetchInit = {},
  deps: PublicHttpDeps = {},
): Promise<Response> {
  const maxRedirects = init.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const maxBytes = init.maxBytes ?? DEFAULT_MAX_BYTES;
  const signal = init.signal ?? AbortSignal.timeout(12_000);
  const headers = init.headers ?? {};
  const resolve = deps.resolve ?? resolvePublicAddresses;
  const request =
    deps.request ??
    ((nextUrl: URL, nextHeaders: Record<string, string>, nextSignal: AbortSignal) =>
      defaultRequest(nextUrl, nextHeaders, nextSignal, maxBytes));

  let current = url;

  for (let redirects = 0; ; redirects += 1) {
    if (!isAllowedProxyImageUrl(current)) {
      throw new UnsafeUrlError();
    }

    const target = new URL(current);
    await assertPublicResolution(target.hostname, resolve);
    const upstream = await request(target, headers, signal);

    if (!REDIRECT_STATUSES.has(upstream.status)) {
      const body = new ArrayBuffer(upstream.body.byteLength);
      new Uint8Array(body).set(upstream.body);
      return new Response(body, {
        status: upstream.status,
        headers: upstream.headers,
      });
    }

    if (redirects >= maxRedirects) {
      throw new UnsafeUrlError("Too many redirects");
    }

    const location = upstream.headers.get("location");
    if (!location) {
      throw new UnsafeUrlError("Redirect missing location");
    }

    const next = safeRedirectTarget(current, location);
    if (!next) {
      throw new UnsafeUrlError();
    }
    current = next;
  }
}
