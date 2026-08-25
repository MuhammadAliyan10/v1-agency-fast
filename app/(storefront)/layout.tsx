import { ReactNode } from "react";
import { Navbar } from "@/components/features/storefront/navbar";

import { Footer } from "@/components/features/storefront/footer";

export default function StorefrontLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-background relative">
      <Navbar />
      <main className="flex-1 flex flex-col w-full max-w-8xl mx-auto px-4 md:px-8 lg:px-12 pt-[120px] pb-16 md:pb-24">
        {children}
      </main>
      <Footer />
    </div>
  );
}
