import { readSharedVerdict } from "@/lib/shared-verdict-store";
import { isShareId } from "@/lib/shared-verdict";
import { renderVerdictImage } from "@/lib/verdict-og-card";

export const alt = "Forma verdict";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const verdict = isShareId(id) ? await readSharedVerdict(id) : null;
  if (!verdict) {
    return new Response("Not found", { status: 404 });
  }

  return renderVerdictImage(verdict);
}
