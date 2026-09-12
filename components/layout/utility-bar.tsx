import { Globe2 } from "lucide-react";

const today = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
}).format(new Date());

export function UtilityBar() {
  return (
    <div className="w-full bg-surface-inverted text-muted-foreground-inverted">
      <div className="container-biasly flex h-9 items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span>Browser Extension</span>
          <span className="hidden sm:inline">
            Theme:{" "}
            <span className="font-semibold text-foreground-inverted">Light</span>{" "}
            Dark Auto
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden md:inline">{today}</span>
          <span className="hidden sm:inline">Set Location</span>
          <span className="flex items-center gap-1.5">
            <Globe2 className="size-3.5" strokeWidth={2} />
            International Edition
          </span>
        </div>
      </div>
    </div>
  );
}
