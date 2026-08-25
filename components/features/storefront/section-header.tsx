"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  children?: React.ReactNode;
}

export function SectionHeader({
  title,
  description,
  actionLabel,
  actionHref,
  children,
}: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between mb-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground max-w-[80%] md:max-w-md">
            {description}
          </p>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        {children}
        
        {actionLabel && actionHref && (
          <Link
            href={actionHref}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "hidden sm:flex text-primary hover:text-primary/80 hover:bg-primary/10 gap-1 pl-4 rounded-full transition-colors font-semibold"
            )}
          >
            {actionLabel}
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
