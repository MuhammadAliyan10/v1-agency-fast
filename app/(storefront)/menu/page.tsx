import { getPublicMenu } from "@/server/actions/storefront";
import { getStoreStatus } from "@/server/actions/settings";
import { MenuClient } from "@/components/features/storefront/menu-client";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const { data } = await getPublicMenu();
  const categories = data || [];
  const isStoreOpen = await getStoreStatus();

  return (
    <div className="min-h-screen bg-background">
      <MenuClient categories={categories as any} isStoreOpen={isStoreOpen} />
    </div>
  );
}
