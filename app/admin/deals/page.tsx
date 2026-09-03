// app/admin/deals/page.tsx
import { getAllDeals } from "@/server/actions/deals";
import { getPublicMenu } from "@/server/actions/storefront";
import { DealsAdmin } from "@/components/features/admin/deals/deals-admin";

export const dynamic = "force-dynamic";

export default async function AdminDealsPage() {
  const [dealsRes, menuRes] = await Promise.all([getAllDeals(), getPublicMenu()]);

  const categories = menuRes.data || [];
  
  const menuItems = categories.flatMap((cat: any) =>
    (cat.items || []).map((item: any) => ({ 
      id: item.id, 
      name: item.name, 
      basePrice: item.basePrice,
      categoryId: cat.id,
      variants: item.variants || [],
    }))
  );

  // Enrich categories with variant data on their items
  const enrichedCategories = categories.map((cat: any) => ({
    ...cat,
    items: (cat.items || []).map((item: any) => ({
      ...item,
      variants: item.variants || [],
    })),
  }));

  return (
    <div className="space-y-6 p-6">
      <DealsAdmin initialDeals={dealsRes.data || []} menuItems={menuItems} categories={categories} />
    </div>
  );
}
