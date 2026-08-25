"use client";

import { ChefHat, Bike, Star } from "lucide-react";

export function FeaturesSection() {
  const features = [
    {
      icon: ChefHat,
      title: "Premium Ingredients",
      description: "We use only the freshest, locally sourced ingredients for the perfect taste."
    },
    {
      icon: Bike,
      title: "Lightning Fast Delivery",
      description: "Piping hot food delivered straight to your door across Sillanwali."
    },
    {
      icon: Star,
      title: "The Classy Experience",
      description: "Top-rated by our community. Your satisfaction is our absolute priority."
    }
  ];

  return (
    <section className="py-16 md:py-24 w-full">
      <div className="container max-w-7xl mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className="flex flex-col items-center group">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors duration-300 shadow-[0_0_30px_-5px_rgba(249,115,22,0.3)]">
                  <Icon className="w-10 h-10 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground text-sm max-w-[280px]">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
