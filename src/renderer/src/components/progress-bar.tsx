interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
}

export function ProgressBar({
  value,
  max = 1,
  className = "",
}: ProgressBarProps) {
  const percent = Math.min(100, (value / max) * 100);

  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-gray-200 ${className}`}
    >
      <div
        className="h-full rounded-full bg-purple-500 transition-all duration-300"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
