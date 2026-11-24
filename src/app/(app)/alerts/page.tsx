"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { PageContainer } from "@/components/page-container";
import { Toggle } from "@/components/toggle";
import { getPrefs, savePrefs } from "@/lib/storage";
import { subscribeStorage } from "@/lib/storage-events";

export default function AlertsPage() {
  const [notify, setNotify] = useState(false);

  useEffect(() => {
    const read = () => setNotify(getPrefs().priceDropAlerts);
    read();
    return subscribeStorage(read);
  }, []);

  const setNotifyPref = (value: boolean) => {
    const prefs = getPrefs();
    savePrefs({ ...prefs, priceDropAlerts: value, priceDropPush: false });
    setNotify(value);
  };

  return (
    <PageContainer>
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl font-bold text-gray-900 lg:text-3xl">Price alerts</h1>
        <p className="text-sm text-forma-muted lg:text-base">Coming soon — nothing is watching prices yet</p>
      </div>

      <div className="rounded-2xl border border-forma-border bg-white p-5 lg:max-w-xl lg:p-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100">
          <Bell className="h-5 w-5 text-forma-primary" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-gray-900">Price watches aren&apos;t live</h2>
        <p className="mt-2 text-sm leading-relaxed text-forma-muted">
          Forma does not track price drops or send sale alerts. A price on a verdict is either a verified
          listing or an AI estimate — not a notification that a price changed.
        </p>

        <div className="mt-5 flex items-start justify-between gap-4 rounded-xl bg-gray-50 px-3 py-3">
          <div>
            <p className="text-sm font-medium text-gray-900">Notify me when this launches</p>
            <p className="mt-1 text-xs leading-relaxed text-forma-muted">
              This only saves your interest on this device. No product is being watched, and no email is sent yet.
            </p>
          </div>
          <Toggle checked={notify} onChange={setNotifyPref} />
        </div>

        {notify && (
          <p className="mt-3 text-sm text-indigo-800">
            You&apos;re on the list for a future launch. Nothing is being watched right now.
          </p>
        )}

        <Link href="/scan" className="mt-5 inline-flex text-sm font-semibold text-forma-primary">
          Scan a product instead
        </Link>
      </div>
    </PageContainer>
  );
}
