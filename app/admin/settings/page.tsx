import { requireAdmin } from "@/lib/auth/session";
import { getStoreStatus, getAllSettings } from "@/server/actions/settings";
import { PageHeader } from "@/components/shared/page-header";
import { StoreStatusToggle } from "@/components/features/admin/dashboard/store-status-toggle";
import { SettingsForm } from "@/components/features/admin/settings/settings-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Store, ShieldCheck, Info } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireAdmin();
  const isStoreOpen = await getStoreStatus();
  const settingsRes = await getAllSettings();
  const settings = settingsRes.success ? (settingsRes.data || {}) : {};

  return (
    <div className="space-y-6">
      <PageHeader
        heading="Store Settings"
        description="Configure global restaurant operations, financials, and system preferences."
      />

      <Tabs defaultValue="operations" className="w-full">
        <div className="w-full border-b border-border mb-8">
          <TabsList className="flex w-full justify-start gap-6 rounded-none bg-transparent p-0 h-12 -mb-px">
            <TabsTrigger 
              value="operations" 
              className="inline-flex h-12 items-center justify-center whitespace-nowrap rounded-none border-x-0 border-t-0 border-b-2 border-transparent bg-transparent px-1 py-1 font-medium text-muted-foreground shadow-none transition-none focus-visible:ring-0 focus-visible:outline-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent hover:text-foreground gap-2 after:hidden"
            >
              <Store className="w-4 h-4" />
              Operations
            </TabsTrigger>
            <TabsTrigger 
              value="system" 
              className="inline-flex h-12 items-center justify-center whitespace-nowrap rounded-none border-x-0 border-t-0 border-b-2 border-transparent bg-transparent px-1 py-1 font-medium text-muted-foreground shadow-none transition-none focus-visible:ring-0 focus-visible:outline-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent hover:text-foreground gap-2 after:hidden"
            >
              <ShieldCheck className="w-4 h-4" />
              System Info
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="operations" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
          {/* Store Open/Close */}
          <Card className="border-border/60 shadow-sm bg-gradient-to-br from-card to-muted/20">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Store className="w-5 h-5 text-emerald-500" />
                Store Availability
              </CardTitle>
              <CardDescription>
                Toggle whether customers can place new orders. When closed, the checkout page is disabled and all new order submissions are rejected.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-background border rounded-lg p-4">
                <div className="space-y-1">
                  <p className="font-medium text-sm">Accepting New Orders</p>
                  <p className="text-xs text-muted-foreground">Currently {isStoreOpen ? "Open" : "Closed"} for business.</p>
                </div>
                <StoreStatusToggle initialStatus={isStoreOpen} />
              </div>
            </CardContent>
          </Card>

          <SettingsForm initialSettings={settings} />
        </TabsContent>

        <TabsContent value="system" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-muted-foreground" />
                System Diagnostics
              </CardTitle>
              <CardDescription>Read-only environment overview.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {[
                { label: "Application Environment", value: process.env.NODE_ENV ?? "development" },
                { label: "Database Engine", value: "Neon Serverless PostgreSQL" },
                { label: "Application Version", value: "v1.2.0" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center py-3 border-b border-border/40 last:border-0">
                  <span className="text-sm font-medium text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-mono text-foreground bg-muted/50 px-2.5 py-1 rounded-md border">{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
