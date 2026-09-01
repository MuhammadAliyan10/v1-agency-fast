// app/admin/menu/page.tsx
import { PageHeader } from "@/components/shared/page-header";
import { getPaginatedMenu, getCategories, getMenuStats } from "@/server/actions/menu";
import { MenuTable } from "@/components/features/admin/menu/menu-table";
import { MenuStats } from "@/components/features/admin/menu/menu-stats";

export const dynamic = "force-dynamic";

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; category?: string }>;
}) {
  const params   = await searchParams;
  const page     = Number(params?.page) || 1;
  const search   = params?.search   || "";
  const category = params?.category || "";

  const [menuRes, categoriesRes, statsRes] = await Promise.all([
    getPaginatedMenu(page, 10, search, category),
    getCategories(),
    getMenuStats(),
  ]);

  const menuData      = menuRes.success      ? menuRes.data                                                     : { items: [], totalCount: 0, totalPages: 1, currentPage: 1 };
  const categoriesData = categoriesRes.success ? categoriesRes.data                                             : [];
  const statsData     = statsRes.success     ? statsRes.data                                                    : { totalItems: 0, availableItems: 0, featuredItems: 0, avgBasePrice: 0, unavailableItems: 0 };

  return (
    <div className="space-y-6">
      <PageHeader
        heading="Menu Items"
        description="Manage your menu, variants, add-ons, attributes, and availability."
      />

      <MenuStats stats={statsData} />

      <MenuTable data={menuData!} categories={categoriesData!} />
    </div>
  );
}
