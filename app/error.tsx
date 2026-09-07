"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global boundary caught an error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
      <AlertCircle className="w-16 h-16 text-destructive mb-6" />
      <h2 className="text-3xl font-heading font-bold text-foreground mb-4">Something went wrong</h2>
      <p className="text-muted-foreground max-w-md mx-auto mb-8">
        We encountered an unexpected issue while processing your request. Our engineering team has been notified.
      </p>
      <div className="flex gap-4">
        <Button onClick={() => window.location.href = "/"} variant="outline" className="rounded-none">
          Go Home
        </Button>
        <Button onClick={() => reset()} className="rounded-none bg-primary text-primary-foreground">
          Try Again
        </Button>
      </div>
    </div>
  );
}
