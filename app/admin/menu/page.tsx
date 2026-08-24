import { PageHeader } from "@/components/shared/page-header";
import { getPaginatedMenu, getCategories } from "@/server/actions/menu";
import { MenuTable } from "@/components/features/admin/menu/menu-table";

export const dynamic = "force-dynamic";

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; category?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params?.page) || 1;
  const search = params?.search || "";
  const category = params?.category || "";

  const [menuRes, categoriesRes] = await Promise.all([
    getPaginatedMenu(page, 10, search, category),
    getCategories()
  ]);

  const menuData = menuRes.success ? menuRes.data : { items: [], totalCount: 0, totalPages: 1, currentPage: 1 };
  const categoriesData = categoriesRes.success ? categoriesRes.data : [];

  return (
    <div className="space-y-6">
      <PageHeader 
        heading="Menu Items" 
        description="Manage your menu, variants, and availability."
      />
      
      <div className="mt-8">
        <MenuTable 
          // @ts-ignore
          data={menuData} 
          categories={categoriesData || []} 
        />
      </div>
    </div>
  );
}
