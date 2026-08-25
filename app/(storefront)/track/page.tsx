"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TrackSearchPage() {
  const router = useRouter();
  const [orderId, setOrderId] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) return;
    
    setIsSearching(true);
    const formattedId = orderId.trim().toUpperCase();
    
    // Add "CC-" prefix if the user just typed numbers
    const finalId = formattedId.startsWith("CC-") ? formattedId : `CC-${formattedId}`;
    
    router.push(`/track/${finalId}`);
  };

  return (
    <div className="animate-in fade-in duration-500 w-full max-w-2xl mx-auto mb-24 pt-12 md:pt-20">
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Track Your Order</h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          Enter your Order ID below to see the live status of your delicious meal.
        </p>
      </div>

      <div className="bg-card border border-border/50 p-6 md:p-10 shadow-sm relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] -z-10" />

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto relative z-10">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input 
              placeholder="e.g. CC-12345 or 12345" 
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="pl-12 h-14 text-lg bg-background border-border/50"
              autoFocus
            />
          </div>
          <Button 
            type="submit" 
            disabled={!orderId.trim() || isSearching}
            className="h-14 px-8 text-lg font-bold shrink-0 shadow-lg hover:shadow-xl transition-all"
          >
            {isSearching ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            {isSearching ? "Searching..." : "Track Now"}
          </Button>
        </form>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>You can find your Order ID on your receipt or confirmation screen.</p>
        </div>
      </div>
    </div>
  );
}
