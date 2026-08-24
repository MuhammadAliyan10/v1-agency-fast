// app/layout.tsx
import type { Metadata } from "next";
import { Figtree, Geist_Mono, Roboto } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

const robotoHeading = Roboto({subsets:['latin'],variable:'--font-heading'});

const figtree = Figtree({subsets:['latin'],variable:'--font-sans'});
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Classy Crave — Order Online | Sillanwali",
  description:
    "Order burgers, pizzas, wings, pastas, desserts and more online from Classy Crave, Sillanwali. Call 03441588883.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("h-full antialiased", geistMono.variable, "font-sans", figtree.variable, robotoHeading.variable)}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <TooltipProvider>
          <main id="main-content" className="flex-1">
            {children}
          </main>
        </TooltipProvider>
      </body>
    </html>
  );
}
