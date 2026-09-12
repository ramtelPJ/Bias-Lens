import { cn } from "@/lib/utils";

interface BiasMeterProps {
  leftPercentage: number;
  centerPercentage: number;
  rightPercentage: number;
  compact?: boolean;
  className?: string;
}

export function BiasMeter({
  leftPercentage,
  centerPercentage,
  rightPercentage,
  compact = false,
  className,
}: BiasMeterProps) {
  return (
    <div
      className={cn(
        "flex w-full overflow-hidden rounded-sm text-xs font-semibold",
        compact ? "h-6" : "h-8 text-sm",
        className,
      )}
    >
      <div
        className="flex items-center justify-center bg-bias-left text-bias-left-foreground"
        style={{ width: `${leftPercentage}%` }}
      >
        <span className="truncate px-1">
          {compact ? "L" : "Left"} {leftPercentage}%
        </span>
      </div>
      <div
        className="flex items-center justify-center bg-bias-center text-bias-center-foreground"
        style={{ width: `${centerPercentage}%` }}
      >
        <span className="truncate px-1">Center {centerPercentage}%</span>
      </div>
      <div
        className="flex items-center justify-center bg-bias-right text-bias-right-foreground"
        style={{ width: `${rightPercentage}%` }}
      >
        <span className="truncate px-1">Right {rightPercentage}%</span>
      </div>
    </div>
  );
}
