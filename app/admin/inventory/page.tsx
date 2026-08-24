import { PageHeader } from "@/components/shared/page-header";
import { getInventoryItems } from "@/server/actions/inventory";
import { InventoryTable } from "@/components/features/admin/inventory/inventory-table";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const res = await getInventoryItems();
  const inventoryData = res.success ? res.data : [];

  return (
    <div className="space-y-6">
      <PageHeader 
        heading="Inventory Management" 
        description="Track raw ingredients, stock levels, and packaging."
      />
      
      <div className="mt-8">
        <InventoryTable data={inventoryData || []} />
      </div>
    </div>
  );
}
