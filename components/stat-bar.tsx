import { cn } from "@/lib/utils";

type BiasVariant = "left" | "center" | "right";

interface StatBarProps {
  label: string;
  value: string;
  percentage: number;
  variant: BiasVariant;
  className?: string;
}

const FILL_CLASS: Record<BiasVariant, string> = {
  left: "bg-bias-left",
  center: "bg-bias-center",
  right: "bg-bias-right",
};

export function StatBar({ label, value, percentage, variant, className }: StatBarProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="w-14 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="w-16 shrink-0 text-sm font-semibold text-foreground">{value}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
        <div
          className={cn("h-full rounded-full", FILL_CLASS[variant])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
