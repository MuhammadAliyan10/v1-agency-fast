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
      <main className="flex-1 flex flex-col w-full max-w-10xl mx-auto pt-4 md:pt-8 pb-16 md:pb-24">
        {children}
      </main>
      <Footer />
    </div>
  );
}
