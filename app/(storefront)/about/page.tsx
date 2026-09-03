import React from "react";
import Image from "next/image";

export const metadata = {
  title: "About Us - Classy Crave",
  description: "Learn about Classy Crave, our mission, and our passion for premium fast food.",
};

export default function AboutPage() {
  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <section className="w-full bg-zinc-950 py-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1550547660-d9450f859349?w=1600&h=600&fit=crop&q=80')] bg-cover bg-center" />
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <span className="text-white/70 font-mono uppercase tracking-[0.2em] text-xs mb-4 block">
            Our Story
          </span>
          <h1 className="text-4xl md:text-6xl font-serif font-black uppercase tracking-tight text-white mb-6">
            Redefining Fast Food
          </h1>
          <p className="text-lg md:text-xl text-zinc-300 max-w-2xl mx-auto font-medium">
            Founded in 2024, Classy Crave brings a premium, artisanal touch to the classic fast food experience in Sillanwali.
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="max-w-4xl mx-auto px-6 py-16 md:py-24 space-y-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-serif font-bold uppercase tracking-tight">The Vision</h2>
            <p className="text-muted-foreground leading-relaxed">
              We started with a simple idea: fast food doesn't have to mean compromised quality. By sourcing the freshest ingredients and elevating classic recipes with gourmet techniques, we've created a menu that satisfies both the crave and the standard for class.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Every burger is flame-grilled to perfection, every pizza dough is hand-tossed, and every wrap is crafted with care to deliver an extraordinary dining experience straight to your door.
            </p>
          </div>
          <div className="relative h-80 w-full bg-muted border border-border">
            <Image 
              src="https://images.unsplash.com/photo-1586816001966-79b736744398?w=800&h=800&fit=crop&q=80" 
              alt="Making a burger" 
              fill 
              className="object-cover"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center md:flex-row-reverse">
          <div className="relative h-80 w-full bg-muted border border-border order-2 md:order-1">
            <Image 
              src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=800&fit=crop&q=80" 
              alt="Artisan Pizza" 
              fill 
              className="object-cover"
            />
          </div>
          <div className="space-y-6 order-1 md:order-2">
            <h2 className="text-3xl font-serif font-bold uppercase tracking-tight">Our Commitment</h2>
            <p className="text-muted-foreground leading-relaxed">
              We are dedicated to the community of Sillanwali. We believe in providing a seamless ordering experience, transparent preparation, and fast, reliable delivery. 
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Our kitchen operates with the highest standards of hygiene and quality control, ensuring that what you see is exactly what you crave, delivered hot and fresh.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
