import { Info } from "lucide-react";
import type { ReactNode } from "react";

export function SidebarCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-background p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <button
          type="button"
          aria-label={`About ${title}`}
          className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Info className="size-4" strokeWidth={2} />
        </button>
      </div>
      {children}
    </section>
  );
}
