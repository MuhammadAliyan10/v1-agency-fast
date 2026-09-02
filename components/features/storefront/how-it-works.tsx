"use client";

import React from "react";
import { HandHeart, Zap, Wallet } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      icon: HandHeart,
      title: "Choose Favorites",
      description: "Pick from our premium fast food menu."
    },
    {
      icon: Zap,
      title: "Fast Delivery",
      description: "Hot and fresh to your doorstep."
    },
    {
      icon: Wallet,
      title: "Pay with Cash",
      description: "Simple, frictionless COD available."
    }
  ];

  return (
    <section className="py-12 bg-muted/30 border-b border-border">
      <div className="max-w-4xl mx-auto px-4 md:px-6">
        <div className="text-center mb-8">
          <h2 className="font-bold text-2xl tracking-tight text-foreground uppercase">Why Classy Crave?</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col items-center text-center p-6 bg-background rounded-none shadow-sm border border-border">
              <div className="w-12 h-12 flex items-center justify-center bg-primary/10 text-primary mb-4 rounded-none">
                <step.icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
