"use client";

import Link from "next/link";
import { MapPin, Phone, Clock, MessageCircle } from "lucide-react";
import { STORE_CONSTANTS } from "@/lib/constants";
import { usePathname } from "next/navigation";

// ---------------------------------------------------------------------------
// Inline social icons — avoiding heavy icon-pack imports for a minor asset
// ---------------------------------------------------------------------------

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

// ---------------------------------------------------------------------------
// Marquee — pure CSS animation, no framer-motion dependency
// ---------------------------------------------------------------------------

const MARQUEE_TEXT = "PREMIUM FAST FOOD • SILLANWALI • FAST DELIVERY • HOT & FRESH • CLASSY CRAVE • ";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Footer() {
  const pathname = usePathname();

  // Only show on homepage — keeps other pages clean
  if (pathname !== "/") return null;

  return (
    <footer className="bg-zinc-950 text-white border-t border-zinc-900 font-sans">

      {/* ── Scrolling marquee — pure CSS, zero runtime cost ──────────── */}
      <div className="overflow-hidden border-b border-zinc-900/60 py-2.5 bg-zinc-900/30">
        <div className="flex whitespace-nowrap animate-marquee">
          {/* Duplicate the string so the loop is seamless */}
          {[0, 1].map((n) => (
            <span
              key={n}
              className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 shrink-0 pr-16"
              aria-hidden={n === 1}
            >
              {Array.from({ length: 6 }).fill(MARQUEE_TEXT).join("")}
            </span>
          ))}
        </div>
      </div>

      {/* ── Main body ─────────────────────────────────────────────────── */}
      <div className="px-5 pt-8 pb-6 max-w-7xl mx-auto">

        {/* Brand headline + tagline */}
        <div className="mb-7">
          <h2 className="font-heading font-black text-2xl text-white mb-1.5 tracking-tight">
            Classy Crave<span className="text-primary">.</span>
          </h2>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-xs">
            Sillanwali ka sab se tasty aur fast delivery wala restaurant. Fresh banao, hot milao.
          </p>
        </div>

        {/* ── 2-col grid on mobile, 4-col on desktop ──────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-7 mb-8">

          {/* Contact */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-primary">
              Contact
            </h3>
            <ul className="space-y-2.5 text-xs text-zinc-400">
              <li className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <span>Sillanwali, Sargodha Road, Pakistan</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                <a
                  href={`tel:${STORE_CONSTANTS.RAW_PHONE_NUMBER}`}
                  className="hover:text-white transition-colors font-mono font-medium"
                >
                  {STORE_CONSTANTS.PHONE_NUMBER}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>12:00 PM – 1:00 AM Daily</span>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-primary">
              Menu
            </h3>
            <ul className="space-y-2 text-xs text-zinc-400">
              {[
                { href: "/menu",  label: "Full Menu" },
                { href: "/deals", label: "Deals & Combos" },
                { href: "/track", label: "Track Order" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-primary">
              Info
            </h3>
            <ul className="space-y-2 text-xs text-zinc-400">
              {[
                { href: "/about",   label: "About Us" },
                { href: "/contact", label: "Contact" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
              <li className="text-zinc-500">COD &amp; Mobile Wallets</li>
              <li className="text-zinc-500">Pickup Available</li>
            </ul>
          </div>

          {/* Order CTA */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-primary">
              Order Now
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Website pe order karo ya WhatsApp karo — COD available hai.
            </p>
            <div className="flex flex-col gap-2 pt-1">
              <Link
                href="/menu"
                className="h-9 px-4 bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider flex items-center justify-center hover:bg-primary/90 active:scale-[0.97] transition-transform"
              >
                Order Online
              </Link>
              <a
                href={`https://wa.me/${STORE_CONSTANTS.WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noreferrer"
                className="h-9 px-4 bg-green-600 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-green-700 active:scale-[0.97] transition-transform"
              >
                <WhatsAppIcon className="w-3.5 h-3.5" />
                WhatsApp Order
              </a>
            </div>
          </div>
        </div>

        {/* ── Divider ──────────────────────────────────────────────────── */}
        <div className="border-t border-zinc-900 pt-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">

            {/* Social icons */}
            <div className="flex items-center gap-3">
              <a
                href={`https://wa.me/${STORE_CONSTANTS.WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp"
                className="w-8 h-8 border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-600 flex items-center justify-center transition-colors"
              >
                <WhatsAppIcon className="w-3.5 h-3.5" />
              </a>
              <a
                href={STORE_CONSTANTS.INSTAGRAM_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="w-8 h-8 border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-600 flex items-center justify-center transition-colors"
              >
                {/* <Instagram className="w-3.5 h-3.5" /> */}
              </a>
              <a
                href={STORE_CONSTANTS.FACEBOOK_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="w-8 h-8 border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-600 flex items-center justify-center transition-colors"
              >
                {/* <Facebook className="w-3.5 h-3.5" /> */}
              </a>
            </div>

            {/* Copyright */}
            <p className="text-[11px] text-zinc-600 text-center sm:text-right">
              © {new Date().getFullYear()} Classy Crave. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* ── Extra bottom spacing for the mobile nav bar ───────────────── */}
      {/* The MobileBottomNav is ~64px + safe-area. This padding ensures the
          last footer line is never hidden behind it.                       */}
      <div className="h-20 md:h-0" aria-hidden="true" />
    </footer>
  );
}
