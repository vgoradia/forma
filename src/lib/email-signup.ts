const EMAIL_PATTERN =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

export function normalizeSignupEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length < 3 || email.length > 254) return null;
  if (email.includes("..") || !EMAIL_PATTERN.test(email)) return null;
  return email;
}

export function normalizeSignupSource(value: unknown): string {
  if (typeof value !== "string") return "unknown";
  const source = value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40);
  return source || "unknown";
}

export function normalizeUserAgent(value: string | null): string | null {
  if (!value) return null;
  const agent = value.replace(/\s+/g, " ").trim().slice(0, 512);
  return agent || null;
}

export function isMissingEmailSignupsTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  const message = (error.message ?? "").toLowerCase();
  return (
    message.includes("email_signups") &&
    (message.includes("does not exist") || message.includes("schema cache") || message.includes("could not find"))
  );
}

export function isDuplicateSignup(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "23505") return true;
  return (error.message ?? "").toLowerCase().includes("duplicate key");
}
