import { PageHeader } from "@/components/shared/page-header";
import { OrderHistoryTable } from "@/components/features/admin/orders/order-history-table";
import { getOrderHistory } from "@/server/actions/order-history";
import { requireAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function OrderHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAdmin();
  
  // Await the searchParams in Next.js 15+ 
  const params = await searchParams;
  
  const page = typeof params.page === "string" ? parseInt(params.page, 10) : 1;
  const search = typeof params.search === "string" ? params.search : "";
  const status = typeof params.status === "string" ? params.status : "all";
  const dateFrom = typeof params.from === "string" ? params.from : undefined;
  const dateTo = typeof params.to === "string" ? params.to : undefined;

  const { success, data, totalPages, totalCount, currentPage } = await getOrderHistory({
    page,
    search,
    status,
    dateFrom,
    dateTo,
  });

  if (!success) {
    return (
      <div className="p-8 text-center text-destructive">
        <h2 className="font-bold">Error loading order history.</h2>
        <p>Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        heading="Order History" 
        description="View, search, and filter all past and present orders." 
      />
      
      <OrderHistoryTable 
        orders={data || []} 
        totalPages={totalPages || 1} 
        currentPage={currentPage || 1} 
        totalCount={totalCount || 0}
      />
    </div>
  );
}
