"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

// Custom TikTok Icon
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

const TwitterIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>
  </svg>
);

const marqueeText = `PREMIUM FAST FOOD • EST. 2024 • FAST DELIVERY • Classy Crave • `;

export function Footer() {
  return (
    <footer className="relative bg-zinc-950 text-white overflow-hidden font-sans">
      {/* 1. The Marquee */}
      <div className="border-b border-zinc-900 py-3 overflow-hidden">
        <motion.div
          className="whitespace-nowrap flex"
          animate={{ x: [0, -1000] }}
          transition={{
            repeat: Infinity,
            ease: "linear",
            duration: 20,
          }}
        >
          {Array.from({ length: 10 }).map((_, i) => (
            <span
              key={i}
              className="text-xs font-mono uppercase tracking-widest text-zinc-500 mr-8"
            >
              {marqueeText}
            </span>
          ))}
        </motion.div>
      </div>

      {/* 2. The Content Grid */}
      <div className="relative z-10 container mx-auto px-6 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">
          {/* Col 1: The Mission (Span 4) */}
          <div className="lg:col-span-4 space-y-8">
            <h2 className="font-serif text-2xl tracking-tighter">
              Classy Crave.
            </h2>
            <p className="text-zinc-400 max-w-sm leading-relaxed">
              Based in Sillanwali, Pakistan. Crafted for the extraordinary craving.
              <br />
              <span className="text-zinc-500 text-xs mt-2 block uppercase tracking-wider">
                FAST DELIVERY
              </span>
            </p>

            <div className="space-y-1 text-sm text-zinc-400">
              <p>
                <a
                  href={`tel:03441588883`}
                  className="hover:text-white transition-colors"
                >
                  0344 1588883
                </a>
              </p>
              <p>
                <a
                  href={`mailto:hello@classycrave.pk`}
                  className="hover:text-white transition-colors"
                >
                  hello@classycrave.pk
                </a>
              </p>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <Link
                href="#"
                className="text-zinc-500 hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <InstagramIcon className="h-5 w-5" />
              </Link>
              <Link
                href="#"
                className="text-zinc-500 hover:text-white transition-colors"
                aria-label="Twitter"
              >
                <TwitterIcon className="h-5 w-5" />
              </Link>
              <Link
                href="#"
                className="text-zinc-500 hover:text-white transition-colors"
                aria-label="TikTok"
              >
                <TikTokIcon className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Col 2: Shop Links (Span 2) */}
          <div className="lg:col-span-2 space-y-8">
            <h3 className="font-mono text-xs text-zinc-500 uppercase tracking-widest">
              Menu
            </h3>
            <ul className="space-y-4">
              {[
                "All Items",
                "Best Sellers",
                "Burgers",
                "Pizzas",
              ].map((item) => (
                <li key={item}>
                  <Link
                    href="/menu"
                    className="group flex items-center text-sm text-zinc-300 hover:text-white transition-colors"
                  >
                    <span className="group-hover:translate-x-1 transition-transform duration-300">
                      {item}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Support Links (Span 2) */}
          <div className="lg:col-span-2 space-y-8">
            <h3 className="font-mono text-xs text-zinc-500 uppercase tracking-widest">
              Support
            </h3>
            <ul className="space-y-4">
              {["Track Order", "Feedback", "Refund Policy", "FAQs"].map((item) => (
                <li key={item}>
                  <Link
                    href="#"
                    className="group flex items-center text-sm text-zinc-300 hover:text-white transition-colors"
                  >
                    <span className="group-hover:translate-x-1 transition-transform duration-300">
                      {item}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: The Club Access (Span 4) */}
          <div className="lg:col-span-4 space-y-8">
            <h3 className="font-serif text-3xl md:text-4xl leading-tight">
              JOIN THE CRAVE.
            </h3>
            <form className="relative max-w-sm">
              <input
                type="email"
                placeholder="email@address.com"
                className="w-full bg-transparent border-b border-zinc-800 py-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-white transition-colors pr-12"
              />
              <button
                type="submit"
                className="absolute right-0 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                aria-label="Subscribe"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            </form>
            <p className="text-xs text-zinc-500">
              Unlock 10% off your first order.
            </p>
          </div>
        </div>
      </div>

      {/* 3. The Giant Signature & Copyright */}
      <div className="relative w-full h-[20vw] overflow-hidden mt-12 md:mt-24">
        {/* Copyright Overlay */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <p className="text-[10px] md:text-xs text-white/80 uppercase tracking-widest">
            © {new Date().getFullYear()} Classy Crave
          </p>
        </div>

        {/* Giant Text */}
        <h1 className="absolute bottom-[-5vw] left-0 w-full text-center text-[15vw] leading-none font-black text-zinc-900 select-none pointer-events-none z-0 whitespace-nowrap">
          Classy Crave
        </h1>
      </div>
    </footer>
  );
}
