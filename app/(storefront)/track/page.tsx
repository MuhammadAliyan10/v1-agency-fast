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
    const cleanToken = orderId.replace(/^#/, "").trim().toUpperCase();
    if (!cleanToken) return;
    
    setIsSearching(true);
    router.push(`/track/${encodeURIComponent(cleanToken)}`);
  };

  return (
    <div className="flex-1 bg-white text-zinc-900 font-sans pb-64 pt-12 px-4 md:px-8 min-h-screen flex flex-col items-center justify-center">
      <div className="w-full max-w-sm mx-auto space-y-6 text-center">
        
        {/* Title & Description */}
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-950">
            Track Your Order
          </h1>
          <p className="text-xs md:text-sm text-zinc-500 max-w-xs mx-auto leading-relaxed">
            Enter your tracking token or Order ID below to view live preparation and delivery status.
          </p>
        </div>

        {/* Direct Form without extra card box */}
        <form onSubmit={handleSubmit} className="space-y-3 pt-2 text-left">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input 
              placeholder="Enter tracking token..." 
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="pl-10 h-11 text-sm bg-white border-zinc-300 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-colors font-sans rounded-none"
              autoFocus
            />
          </div>

          <Button 
            type="submit" 
            disabled={!orderId.trim() || isSearching}
            className="h-11 text-sm font-semibold w-full rounded-none transition-colors active:scale-[0.99]"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {isSearching ? "Searching..." : "Track Order"}
          </Button>
        </form>

        <p className="text-[11px] text-zinc-400">
          Find your tracking token in your WhatsApp or SMS confirmation message.
        </p>

      </div>
    </div>
  );
}
