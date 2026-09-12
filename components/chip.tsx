import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";

interface ChipProps {
  label: string;
  className?: string;
}

export function Chip({ label, className }: ChipProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface px-4 py-2 text-sm font-medium text-foreground whitespace-nowrap transition-colors hover:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      {label}
      <Plus className="size-3.5 text-muted-foreground" strokeWidth={2} />
    </button>
  );
}
