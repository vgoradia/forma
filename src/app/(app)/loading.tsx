import { PageContainer } from "@/components/page-container";

export default function AppLoading() {
  return (
    <PageContainer>
      <div className="animate-pulse space-y-6 py-4">
        <div className="h-8 w-40 rounded-lg bg-gray-200" />
        <div className="h-4 w-64 max-w-full rounded bg-gray-100" />
        <div className="h-48 rounded-3xl bg-gray-100" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-32 rounded-2xl bg-gray-100" />
          <div className="h-32 rounded-2xl bg-gray-100" />
        </div>
      </div>
    </PageContainer>
  );
}