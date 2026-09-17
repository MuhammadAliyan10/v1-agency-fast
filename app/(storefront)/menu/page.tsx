import { getPublicMenu } from "@/server/actions/storefront";
import { getStoreStatus } from "@/server/actions/settings";
import { MenuClient } from "@/components/features/storefront/menu-client";

// ISR: revalidate every 30s — matches the unstable_cache TTL inside getPublicMenu/getStoreStatus
export const revalidate = 30;

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
