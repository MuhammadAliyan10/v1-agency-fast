import { Construction } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";

export default function StaffPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        heading="Staff Management" 
        description="Manage roles, permissions, and staff accounts."
      />
      
      <div className="flex flex-col items-center justify-center min-h-[400px] border rounded-md border-dashed bg-muted/20">
        <div className="p-4 bg-muted rounded-full mb-4">
          <Construction className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">Coming Soon</h3>
        <p className="text-muted-foreground max-w-sm text-center mt-2">
          The staff management and access control module is currently under active development.
        </p>
      </div>
    </div>
  );
}
