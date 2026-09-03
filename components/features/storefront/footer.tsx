"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, MapPin, Phone, Mail, Clock } from "lucide-react";
import { STORE_CONSTANTS } from "@/lib/constants";

import { usePathname } from "next/navigation";

// Custom Social Icons
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
  </svg>
);

const marqueeText = `PREMIUM FAST FOOD • SILLANWALI • FAST DELIVERY • HOT & FRESH • Classy Crave • `;

export function Footer() {
  const pathname = usePathname();

  if (pathname !== "/") return null;

  return (
    <footer className="relative bg-zinc-950 text-white overflow-hidden font-sans pb-40 md:pb-12 border-t border-zinc-900 mt-auto">
      {/* 1. The Marquee */}
      <div className="border-b border-zinc-900/80 py-3 overflow-hidden bg-zinc-900/40">
        <motion.div
          className="whitespace-nowrap flex"
          animate={{ x: [0, -1000] }}
          transition={{
            repeat: Infinity,
            ease: "linear",
            duration: 25,
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 mr-8 flex items-center gap-2"
            >
              {marqueeText}
            </span>
          ))}
        </motion.div>
      </div>

      {/* 2. Main Content Grid */}
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          
          {/* Col 1: Brand & Contact Info (Span 4) */}
          <div className="lg:col-span-4 space-y-5">
            <div>
              <h2 className="font-heading font-black text-2xl tracking-tight text-white mb-2">
                Classy Crave<span className="text-primary">.</span>
              </h2>
              <p className="text-zinc-400 text-sm leading-relaxed max-w-sm">
                Serving Sillanwali with premium, handcrafted fast food. Fresh ingredients, unforgettable flavors, delivered hot to your doorstep.
              </p>
            </div>

            <div className="space-y-2.5 text-xs text-zinc-300 pt-1">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <span>Sillanwali, Sargodha Road, Pakistan</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-primary shrink-0" />
                <a href="tel:03441588883" className="hover:text-primary transition-colors font-mono font-medium">
                  0344 1588883
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-primary shrink-0" />
                <a href="mailto:hello@classycrave.pk" className="hover:text-primary transition-colors font-mono">
                  hello@classycrave.pk
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-primary shrink-0" />
                <span>Open Daily: 12:00 PM – 01:00 AM</span>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <a
                href={STORE_CONSTANTS.WHATSAPP_NUMBER ? `https://wa.me/${STORE_CONSTANTS.WHATSAPP_NUMBER}` : "#"}
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 bg-zinc-900 border border-zinc-800 hover:border-primary text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                aria-label="WhatsApp"
              >
                <WhatsAppIcon className="h-4 w-4" />
              </a>
              <a
                href={STORE_CONSTANTS.INSTAGRAM_URL}
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 bg-zinc-900 border border-zinc-800 hover:border-primary text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                aria-label="Instagram"
              >
                <InstagramIcon className="h-4 w-4" />
              </a>
              <a
                href={STORE_CONSTANTS.FACEBOOK_URL}
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 bg-zinc-900 border border-zinc-800 hover:border-primary text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                aria-label="Facebook"
              >
                <TikTokIcon className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Col 2: Quick Links (Span 3) */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="font-mono text-xs text-primary uppercase tracking-widest font-bold">
              Navigation & Menu
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/menu" className="text-zinc-400 hover:text-white transition-colors">
                  Explore Full Menu
                </Link>
              </li>
              <li>
                <Link href="/deals" className="text-zinc-400 hover:text-white transition-colors">
                  Deals & Combos
                </Link>
              </li>
              <li>
                <Link href="/track" className="text-zinc-400 hover:text-white transition-colors">
                  Track Your Order
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-zinc-400 hover:text-white transition-colors">
                  About Our Kitchen
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-zinc-400 hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Customer Care & Hours (Span 2) */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-mono text-xs text-primary uppercase tracking-widest font-bold">
              Information
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li className="text-zinc-400">
                Delivery Zones: Sillanwali City & Suburbs
              </li>
              <li className="text-zinc-400">
                Payment: COD & Mobile Wallet
              </li>
              <li className="text-zinc-400">
                Takeaway / Pickup Available
              </li>
            </ul>
          </div>

          {/* Col 4: Newsletter / Quick Order (Span 3) */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="font-mono text-xs text-primary uppercase tracking-widest font-bold">
              Stay Connected
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Get exclusive promo codes and instant WhatsApp deal updates.
            </p>
            <form onSubmit={(e) => e.preventDefault()} className="relative max-w-sm">
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary transition-colors pr-10"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-primary transition-colors"
                aria-label="Subscribe"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-zinc-900 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} Classy Crave. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/about" className="hover:text-zinc-300 transition-colors">Privacy Policy</Link>
            <Link href="/about" className="hover:text-zinc-300 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
