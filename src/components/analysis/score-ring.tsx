export function ScoreRing({ score, label }: { score: number; label: string }) {
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-16 w-16 lg:h-20 lg:w-20">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="#e5e7eb" strokeWidth="6" />
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="#6366f1"
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-base font-semibold text-gray-900 lg:text-lg">
          {score}
        </span>
      </div>
      <span className="mt-1 text-[10px] text-forma-muted lg:text-xs">{label}</span>
    </div>
  );
}
