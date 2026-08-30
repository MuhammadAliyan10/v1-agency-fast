import { ReactNode } from "react";
import { Navbar } from "@/components/features/storefront/navbar";
import { Footer } from "@/components/features/storefront/footer";
import { StoreClosedBanner } from "@/components/features/storefront/store-closed-banner";
import { getStoreStatus } from "@/server/actions/settings";
import { MobileBottomNav } from "@/components/features/storefront/mobile-bottom-nav";

export default async function StorefrontLayout({
  children,
}: {
  children: ReactNode;
}) {
  const isStoreOpen = await getStoreStatus();

  return (
    <div className="flex flex-col min-h-screen bg-background relative">
      <StoreClosedBanner isOpen={isStoreOpen} />
      <Navbar />
      <main className="flex-1 flex flex-col w-full max-w-10xl mx-auto pb-20 md:pb-24">
        {children}
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
