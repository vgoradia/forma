import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SharedVerdictView } from "@/components/shared-verdict-view";
import { getAppUrl } from "@/lib/app-url";
import { readSharedVerdict } from "@/lib/shared-verdict-store";
import { isShareId, sharedVerdictMetadataCopy } from "@/lib/shared-verdict";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const verdict = isShareId(id) ? await readSharedVerdict(id) : null;
  if (!verdict) {
    return {
      title: "Verdict not found — Forma",
      robots: { index: false, follow: false },
    };
  }

  const { title, description } = sharedVerdictMetadataCopy(verdict);
  const url = `${getAppUrl()}/v/${id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: "Forma",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function SharedVerdictPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isShareId(id)) notFound();

  const verdict = await readSharedVerdict(id);
  if (!verdict) notFound();

  return <SharedVerdictView verdict={verdict} />;
}
