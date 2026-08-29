"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin Panel Error:", error);
  }, [error]);

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col items-center justify-center p-8 text-center bg-card rounded-2xl border border-border shadow-sm">
      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6 border border-red-200 dark:border-red-800">
        <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-500" />
      </div>
      
      <h2 className="text-2xl font-bold tracking-tight mb-3">Something went wrong</h2>
      
      <p className="text-muted-foreground max-w-[500px] mb-8">
        We encountered an unexpected error while loading this page. Our team has been notified. 
        Please try refreshing or returning to the dashboard.
      </p>
      
      <div className="flex items-center gap-4">
        <Button 
          onClick={reset} 
          className="gap-2 font-semibold"
          size="lg"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
        <Button 
          variant="outline" 
          onClick={() => window.location.href = "/admin/dashboard"}
          size="lg"
        >
          Go to Dashboard
        </Button>
      </div>

      <div className="mt-12 p-4 bg-muted/30 border rounded-lg max-w-[600px] w-full text-left overflow-auto">
        <p className="text-xs font-mono text-muted-foreground break-words whitespace-pre-wrap">
          {error.message || "An unknown error occurred."}
        </p>
      </div>
    </div>
  );
}
