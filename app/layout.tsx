// app/layout.tsx
import type { Metadata } from "next";
import { Inter, Figtree } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/providers/theme-provider";
import QueryProvider from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";


// ─────────────────────────────────────────────
// Typography
// Heading: Inter
// Body:    Figtree
// ─────────────────────────────────────────────
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// ─────────────────────────────────────────────
// SEO — Root Metadata
// ─────────────────────────────────────────────
export const metadata: Metadata = {
  metadataBase: new URL("https://classycrave.pk"),
  title: {
    default: "Classy Crave — Premium Fast Food | Order Online in Sillanwali",
    template: "%s | Classy Crave",
  },
  description:
    "Order burgers, pizza, wings, rolls, desserts and more online from Classy Crave — Sillanwali's finest fast food restaurant. Fast delivery, fresh ingredients, premium taste.",
  keywords: [
    "Classy Crave",
    "order food online Sillanwali",
    "burger delivery Sillanwali",
    "pizza delivery Pakistan",
    "fast food Sillanwali",
    "online food order Pakistan",
    "best burger Sillanwali",
  ],
  authors: [{ name: "Classy Crave", url: "https://classycrave.pk" }],
  creator: "Classy Crave",
  publisher: "Classy Crave",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_PK",
    url: "https://classycrave.pk",
    siteName: "Classy Crave",
    title: "Classy Crave | Premium Fast Food | Order Online",
    description:
      "Sillanwali's finest burgers, pizza, wings & more. Order online for delivery or pickup.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Classy Crave — Premium Fast Food",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Classy Crave — Premium Fast Food",
    description: "Order burgers, pizza & more online from Classy Crave, Sillanwali.",
    images: ["/og-image.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: "/icon.png",
  },
  manifest: "/site.webmanifest",
  category: "food",
};

interface LayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: LayoutProps) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full antialiased", inter.variable, figtree.variable)}
    >
      <head>
        {/* Preconnect to Google Fonts CDN */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Structured Data — Local Business */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Restaurant",
              name: "Classy Crave",
              description:
                "Premium fast food restaurant in Sillanwali offering burgers, pizza, wings, rolls, and desserts.",
              url: "https://classycrave.pk",
              telephone: "+923441588883",
              address: {
                "@type": "PostalAddress",
                streetAddress: "Sillanwali",
                addressLocality: "Sillanwali",
                addressRegion: "Punjab",
                postalCode: "40250",
                addressCountry: "PK",
              },
              geo: {
                "@type": "GeoCoordinates",
                latitude: "31.1748",
                longitude: "72.8616",
              },
              servesCuisine: ["Burgers", "Pizza", "Fast Food", "Wings", "Desserts"],
              priceRange: "$$",
              openingHoursSpecification: [
                {
                  "@type": "OpeningHoursSpecification",
                  dayOfWeek: [
                    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
                  ],
                  opens: "12:00",
                  closes: "01:00",
                },
              ],
              hasMenu: "https://classycrave.pk/menu",
              acceptsReservations: false,
              potentialAction: {
                "@type": "OrderAction",
                target: "https://classycrave.pk/menu",
              },
            }),
          }}
        />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-background text-foreground">

        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <QueryProvider>
              <main id="main-content" className="flex-1">
                {children}
              </main>
            </QueryProvider>
          </TooltipProvider>
        </ThemeProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
