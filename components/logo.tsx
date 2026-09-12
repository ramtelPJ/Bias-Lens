import { cn } from "@/lib/utils";

interface LogoProps {
  inverted?: boolean;
  className?: string;
}

export function Logo({ inverted = false, className }: LogoProps) {
  return (
    <span className={cn("inline-flex flex-col leading-none select-none", className)}>
      <span
        className={cn(
          "text-xl font-bold tracking-tight",
          inverted ? "text-foreground-inverted" : "text-foreground",
        )}
      >
        Bias Lens
      </span>
      <span
        className={cn(
          "text-xs font-medium tracking-wide",
          inverted ? "text-muted-foreground-inverted" : "text-muted-foreground",
        )}
      >
        News
      </span>
    </span>
  );
}
