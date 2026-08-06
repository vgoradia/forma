import { Suspense } from "react";
import { ScanContent } from "./scan-content";

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="px-5 pt-12 text-sm text-forma-muted">Loading...</div>}>
      <ScanContent />
    </Suspense>
  );
}
