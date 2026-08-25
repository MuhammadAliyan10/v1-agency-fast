import { getPublicMenu } from "@/server/actions/storefront";
import { MenuClient } from "@/components/features/storefront/menu-client";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const { data } = await getPublicMenu();
  const categories = data || [];

  return (
    <div className="min-h-screen bg-background">
      <MenuClient categories={categories as any} />
    </div>
  );
}
