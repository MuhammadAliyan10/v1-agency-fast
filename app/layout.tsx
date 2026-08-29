// app/layout.tsx
import type { Metadata } from "next";
import { Inter, Playfair_Display, Geist_Mono, Figtree } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-heading' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });
const figtree = Figtree({ subsets: ['latin'], variable: '--font-figtree' });

export const metadata: Metadata = {
  title: "Classy Crave — Order Online | Sillanwali",
  description:
    "Order burgers, pizzas, wings, pastas, desserts and more online from Classy Crave, Sillanwali. Call 03441588883.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("h-full antialiased", geistMono.variable, "font-sans", inter.variable, playfair.variable, figtree.variable)}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <main id="main-content" className="flex-1">
              {children}
            </main>
          </TooltipProvider>
        </ThemeProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
