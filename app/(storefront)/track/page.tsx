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
    <div className="animate-in fade-in duration-500 w-full max-w-xl mx-auto flex flex-col justify-center min-h-[70vh] px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-5xl font-heading font-black tracking-tight mb-3 text-zinc-950">Track Your Order</h1>
        <p className="text-muted-foreground text-sm md:text-base font-medium">
          Enter your Order ID below to see the live status of your meal.
        </p>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-zinc-100 relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] -z-10" />

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 relative z-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <Input 
              placeholder="e.g. CC-12345 or 12345" 
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="pl-12 h-14 md:h-16 text-base md:text-lg bg-zinc-50 border-transparent rounded-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:bg-white transition-all font-mono tracking-wide"
              autoFocus
            />
          </div>
          <Button 
            type="submit" 
            disabled={!orderId.trim() || isSearching}
            className="h-14 md:h-16 text-base md:text-lg font-bold rounded-sm shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-[0.98]"
          >
            {isSearching ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            {isSearching ? "Searching..." : "Track Now"}
          </Button>
        </form>

        <div className="mt-6 text-center text-xs md:text-sm text-zinc-500 font-medium">
          <p>Find your Order ID on your receipt or confirmation screen.</p>
        </div>
      </div>
    </div>
  );
}
