// app/admin/coupons/page.tsx
import { listCoupons } from "@/server/actions/coupons";
import { getPublicMenu } from "@/server/actions/storefront";
import { CouponsAdmin } from "@/components/features/admin/coupons/coupons-admin";
import { PageHeader } from "@/components/shared/page-header";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const [couponsRes, menuRes] = await Promise.all([listCoupons(), getPublicMenu()]);
  const menuItems = (menuRes.data || []).flatMap((cat: any) =>
    (cat.items || []).map((item: any) => ({ id: item.id, name: item.name }))
  );
  return (
    <div className="space-y-6">
      <PageHeader
        heading="Coupons"
        description="Create and manage discount coupon codes."
      />

      <div className="mt-8">
        <CouponsAdmin initialCoupons={couponsRes.data || []} menuItems={menuItems} />
      </div>
    </div>
  );
}
