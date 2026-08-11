"use client";

import { useState } from "react";
import Link from "next/link";
import {
  User,
  Palette,
  Ruler,
  Wallet,
  Heart,
  Shirt,
  Search,
  Store,
  Upload,
  Trash2,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { Toggle } from "@/components/toggle";
import {
  clearAllScans,
  getPrefs,
  savePrefs,
  useScans,
  type UserPrefs,
} from "@/lib/storage";
import { countWardrobeItems } from "@/lib/scan-helpers";
import { PageContainer } from "@/components/page-container";
import { LogoMark } from "@/components/logo";
import { GoogleSignInButton, UserAvatar } from "@/components/auth-ui";
import { useAuth } from "@/components/auth-provider";
import { useUserProfile } from "@/hooks/use-user-profile";

function SettingsRow({
  icon: Icon,
  label,
  value,
  href,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string;
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <div className="flex items-center justify-between py-3.5">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-forma-muted" />
        <span className="text-sm text-gray-900">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="max-w-[140px] truncate text-xs text-forma-muted">{value}</span>}
        <ChevronRight className="h-4 w-4 text-gray-300" />
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="w-full text-left">
        {content}
      </button>
    );
  }
  return content;
}

function ToggleRow({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <div className="flex gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-forma-muted" />
        <div>
          <p className="text-sm text-gray-900">{label}</p>
          {description && <p className="mt-0.5 text-xs text-forma-muted">{description}</p>}
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function authStatusFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const auth = new URLSearchParams(window.location.search).get("auth");
  if (auth === "error") return "Google sign-in failed. Try again.";
  if (auth === "unconfigured") return "Sign-in is not configured on this deployment yet.";
  return null;
}

export default function ProfilePage() {
  const scans = useScans();
  const [prefs, setPrefs] = useState<UserPrefs>(() => getPrefs());
  const [status, setStatus] = useState<string | null>(authStatusFromUrl);
  const wardrobeCount = countWardrobeItems(scans);
  const profile = useUserProfile();
  const { signOut } = useAuth();

  const updatePref = (key: keyof UserPrefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    savePrefs(next);
  };

  const handleDeleteHistory = () => {
    if (!window.confirm("Delete all scan history and saved items? This cannot be undone.")) return;
    clearAllScans();
    setStatus("Scan history deleted.");
    setTimeout(() => setStatus(null), 2500);
  };

  const handleSignOut = async () => {
    await signOut();
    setStatus("Signed out.");
    setTimeout(() => setStatus(null), 2500);
  };

  const handlePlusClick = () => {
    setStatus("Forma Plus is coming soon — unlimited scans, deeper wardrobe sync, and priority alerts.");
    setTimeout(() => setStatus(null), 3500);
  };

  return (
    <PageContainer>
      <h1 className="text-2xl font-bold text-gray-900 lg:text-3xl">Settings</h1>
      <p className="mt-1 text-sm text-forma-muted">Account and preferences for Forma</p>

      {status && (
        <p className="mt-4 rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-800">{status}</p>
      )}

      <div className="mt-6 rounded-2xl border border-forma-border bg-white p-4">
        <div className="flex items-center gap-4">
          <UserAvatar
            initials={profile.initials}
            avatarUrl={profile.avatarUrl}
            name={profile.displayName}
          />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900">{profile.displayName}</p>
            <p className="truncate text-sm text-forma-muted">
              {profile.isAuthenticated
                ? profile.email ?? "Signed in with Google"
                : `Guest · ${scans.length} scans saved locally`}
            </p>
          </div>
        </div>

        <div className="mt-4">
          {profile.isAuthenticated ? (
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="w-full rounded-2xl border border-forma-border bg-white py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Sign out
            </button>
          ) : (
            <GoogleSignInButton redirectTo="/profile" label="Sign in with Google" />
          )}
        </div>
      </div>

      <section className="mt-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-forma-muted">Account</h2>
        <div className="divide-y divide-gray-100 rounded-2xl border border-forma-border bg-white px-4">
          <SettingsRow icon={Palette} label="Personal style" value="Set after more scans" />
          <SettingsRow icon={Ruler} label="Sizes" value="Add in Forma Plus" />
          <SettingsRow icon={Wallet} label="Budget" value="Under $200" />
          <SettingsRow icon={Heart} label="Favorite brands" value="Learned from scans" />
          <SettingsRow
            icon={Shirt}
            label="Wardrobe sync"
            value={wardrobeCount > 0 ? `${wardrobeCount} items from scans` : "Scan to start"}
            href="/wardrobe"
          />
        </div>
      </section>

      <div className="mt-6 space-y-6 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-forma-muted">
            Shopping intelligence
          </h2>
          <div className="divide-y divide-gray-100 rounded-2xl border border-forma-border bg-white px-4">
            <ToggleRow
              icon={Wallet}
              label="Price-drop alerts"
              description="Notify me when watched items hit a target price"
              checked={prefs.priceDropAlerts}
              onChange={(v) => updatePref("priceDropAlerts", v)}
            />
            <ToggleRow
              icon={Sparkles}
              label="Sale predictions"
              description="Show likely markdown timing before I buy"
              checked={prefs.salePredictions}
              onChange={(v) => updatePref("salePredictions", v)}
            />
            <ToggleRow
              icon={Search}
              label="Alternative alerts"
              description="Suggest higher-quality or lower-cost options"
              checked={prefs.alternativeAlerts}
              onChange={(v) => updatePref("alternativeAlerts", v)}
            />
            <ToggleRow
              icon={User}
              label="Review summaries"
              description="Summarize fit, quality, and value from reviews"
              checked={prefs.reviewSummaries}
              onChange={(v) => updatePref("reviewSummaries", v)}
            />
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-forma-muted">Privacy and data</h2>
          <div className="divide-y divide-gray-100 rounded-2xl border border-forma-border bg-white px-4">
            <SettingsRow icon={Search} label="Search history" value={`${scans.length} scans stored locally`} />
            <SettingsRow icon={Store} label="Connected retailers" value="Live via Serper" />
            <SettingsRow icon={Upload} label="Upload permissions" value="Photos, clipboard, links" />
            <SettingsRow
              icon={Trash2}
              label="Delete scan history"
              value="Clear all local data"
              onClick={handleDeleteHistory}
            />
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-forma-muted">Notifications</h2>
          <div className="divide-y divide-gray-100 rounded-2xl border border-forma-border bg-white px-4">
            <ToggleRow
              icon={Sparkles}
              label="Weekly digest"
              checked={prefs.weeklyDigest}
              onChange={(v) => updatePref("weeklyDigest", v)}
            />
            <ToggleRow
              icon={Wallet}
              label="Price-drop push alerts"
              checked={prefs.priceDropPush}
              onChange={(v) => updatePref("priceDropPush", v)}
            />
            <ToggleRow
              icon={Heart}
              label="Saved item reminders"
              checked={prefs.savedItemReminders}
              onChange={(v) => updatePref("savedItemReminders", v)}
            />
            <ToggleRow
              icon={User}
              label="Email updates"
              checked={prefs.emailUpdates}
              onChange={(v) => updatePref("emailUpdates", v)}
            />
          </div>
        </section>
      </div>

      <div className="mt-6 rounded-2xl border border-forma-border bg-white p-5 lg:max-w-xl">
        <div className="mb-3 flex items-center gap-2">
          <LogoMark sizePx={32} />
          <h3 className="font-semibold text-gray-900">Forma Plus</h3>
        </div>
        <p className="text-xs leading-relaxed text-forma-muted">
          Unlimited searches, advanced wardrobe analysis, AI stylist, and priority sale predictions.
        </p>
        <button
          type="button"
          onClick={handlePlusClick}
          className="mt-4 w-full rounded-2xl bg-forma-primary py-3.5 text-sm font-semibold text-white"
        >
          Upgrade to Forma Plus
        </button>
      </div>
    </PageContainer>
  );
}
