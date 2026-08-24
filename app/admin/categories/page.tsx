import { PageHeader } from "@/components/shared/page-header";
import { getCategoriesWithItemCount } from "@/server/actions/categories";
import { CategoryTable } from "@/components/features/admin/categories/category-table";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const res = await getCategoriesWithItemCount();
  const categoriesData = res.success ? res.data : [];

  return (
    <div className="space-y-6">
      <PageHeader 
        heading="Category Management" 
        description="Organize and sort how food sections appear on the customer menu."
      />
      
      <div className="mt-8">
        <CategoryTable data={categoriesData || []} />
      </div>
    </div>
  );
}
