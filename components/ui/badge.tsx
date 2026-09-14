import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full font-medium",
  {
    variants: {
      variant: {
        default: "bg-surface text-foreground",
        left: "bg-bias-left text-bias-left-foreground",
        center: "bg-bias-center text-bias-center-foreground",
        right: "bg-bias-right text-bias-right-foreground",
        neutral: "bg-surface text-muted-foreground",
      },
      size: {
        default: "text-sm px-3 py-1.5",
        sm: "text-xs px-2 py-1",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size, className }))} {...props} />;
}

export { Badge, badgeVariants };
