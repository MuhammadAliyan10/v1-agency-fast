import type { Metadata, Viewport } from "next";
import { ReactNode } from "react";
import { Navbar } from "@/components/features/storefront/navbar";
import { Footer } from "@/components/features/storefront/footer";
import { StoreClosedBanner } from "@/components/features/storefront/store-closed-banner";
import { getStoreStatus } from "@/server/actions/settings";
import { MobileBottomNav } from "@/components/features/storefront/mobile-bottom-nav";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
};

export default async function StorefrontLayout({
  children,
}: {
  children: ReactNode;
}) {
  const isStoreOpen = await getStoreStatus();

  return (
    <div className="fixed inset-0 flex flex-col bg-background overflow-hidden overscroll-none">
      <StoreClosedBanner isOpen={isStoreOpen} />
      <Navbar />
      <main id="main-scroll-container" className="flex-1 flex flex-col w-full max-w-10xl mx-auto overflow-y-auto overscroll-y-contain pb-[calc(env(safe-area-inset-bottom)+80px)]">
        {children}
        <Footer />
      </main>
      <MobileBottomNav isOpen={isStoreOpen} />
    </div>
  );
}
