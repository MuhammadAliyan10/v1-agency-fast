import { PageHeader } from "@/components/shared/page-header";
import { getCustomers } from "@/server/actions/customers";
import { CustomersTable } from "@/components/features/admin/customers/customers-table";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const res = await getCustomers();
  const customers = res.success && res.data ? res.data : [];

  return (
    <div className="space-y-6">
      <PageHeader 
        heading="Customers" 
        description="Manage your registered customers, view lifetime spend, and handle account access."
      >
        <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-md font-medium text-sm">
          <Users className="w-4 h-4" />
          <span>Total Customers: {customers.length}</span>
        </div>
      </PageHeader>
      
      <div className="mt-8">
        <CustomersTable data={customers} />
      </div>
    </div>
  );
}
