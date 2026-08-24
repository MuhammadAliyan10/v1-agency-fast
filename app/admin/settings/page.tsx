import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        heading="Store Settings" 
        description="Configure global restaurant settings."
      >
        <Button>Save Changes</Button>
      </PageHeader>
      <div className="mt-8">
        <p className="text-sm text-muted-foreground">Settings form placeholder.</p>
      </div>
    </div>
  );
}
