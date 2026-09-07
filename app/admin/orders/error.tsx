"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function OrdersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Orders board error:", error);
  }, [error]);

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center border-2 border-destructive/20 bg-destructive/5">
      <AlertCircle className="w-12 h-12 text-destructive mb-4" />
      <h2 className="text-xl font-heading font-bold text-foreground mb-2">Kanban Board Disconnected</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">
        A malformed order payload caused the board to crash. Other systems are still operational.
      </p>
      <Button onClick={() => reset()} className="rounded-none bg-primary text-primary-foreground">
        Restart Board
      </Button>
    </div>
  );
}
