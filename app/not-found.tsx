import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center space-y-4 text-center px-4">
        <div className="p-4 bg-muted rounded-full">
          <AlertCircle className="w-12 h-12 text-muted-foreground" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">404 - Page Not Found</h1>
        <p className="text-muted-foreground max-w-[500px]">
          Oops! The page you are looking for does not exist or has been moved.
        </p>
        <div className="pt-4">
          <Button asChild>
            <Link href="/admin/dashboard">Return to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
