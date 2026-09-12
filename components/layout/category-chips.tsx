"use client";

import { useRef } from "react";
import { ChevronRight } from "lucide-react";

import { Chip } from "@/components/chip";

const CATEGORIES = [
  "World Cup",
  "IPL",
  "Social Media",
  "Business & Markets",
  "Health & Medicine",
  "Soccer",
  "Artificial Intelligence",
  "Arsenal FC",
  "Extreme Weather and Disasters",
];

export function CategoryChips() {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollRight() {
    scrollRef.current?.scrollBy({ left: 240, behavior: "smooth" });
  }

  return (
    <div className="w-full border-b border-border bg-background">
      <div className="container-biasly flex items-center gap-2 py-3">
        <div
          ref={scrollRef}
          className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {CATEGORIES.map((category) => (
            <Chip key={category} label={category} />
          ))}
        </div>
        <button
          type="button"
          aria-label="Scroll categories right"
          onClick={scrollRight}
          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ChevronRight className="size-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
