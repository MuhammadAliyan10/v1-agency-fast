import { requireAdmin } from "@/lib/auth/session";
import { getStoreStatus } from "@/server/actions/settings";
import { PageHeader } from "@/components/shared/page-header";
import { StoreStatusToggle } from "@/components/features/admin/dashboard/store-status-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Store, ShieldCheck, Info } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireAdmin();
  const isStoreOpen = await getStoreStatus();

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        heading="Store Settings"
        description="Configure global restaurant operations and store status."
      />

      <Tabs defaultValue="operations">
        <TabsList className="mb-6">
          <TabsTrigger value="operations" className="gap-2">
            <Store className="w-4 h-4" />
            Operations
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <ShieldCheck className="w-4 h-4" />
            System Info
          </TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="space-y-6">
          {/* Store Open/Close */}
          <Card className="border-border/60 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Store className="w-5 h-5 text-muted-foreground" />
                Store Availability
              </CardTitle>
              <CardDescription>
                Toggle whether customers can place new orders. When closed, the checkout page is disabled and all new order submissions are rejected.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StoreStatusToggle initialStatus={isStoreOpen} />
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="w-5 h-5 text-muted-foreground" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                  <p><strong className="text-foreground">Store Open:</strong> Customers can browse the menu and complete checkout. All orders are accepted normally.</p>
                </div>
                <Separator />
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-destructive mt-1.5 shrink-0" />
                  <p><strong className="text-foreground">Store Closed:</strong> The checkout button is disabled on the storefront and a clear banner is shown to customers. The server also rejects any order submissions made directly.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card className="border-border/60 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-muted-foreground" />
                System Information
              </CardTitle>
              <CardDescription>Read-only system configuration overview.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Environment", value: process.env.NODE_ENV ?? "development" },
                { label: "Database", value: "Neon PostgreSQL (Serverless)" },
                { label: "Auth Method", value: "JWT (7-day sessions)" },
                { label: "Currency", value: "PKR (Rs.)" },
                { label: "Payment Methods", value: "COD, JazzCash, EasyPaisa" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-mono font-semibold text-foreground bg-muted px-2 py-0.5 rounded">{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
