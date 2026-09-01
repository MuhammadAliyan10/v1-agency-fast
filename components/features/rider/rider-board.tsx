"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRiderActiveOrders, markOrderDelivered } from "@/server/actions/rider";
import { Button } from "@/components/ui/button";
import { Bike, Navigation, MapPin, Phone, User, CheckCircle2, Clock, Banknote, CreditCard } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function RiderBoard() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["rider-orders"],
    queryFn: async () => {
      const res = await getRiderActiveOrders();
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    refetchInterval: 10000,
  });

  const deliverMutation = useMutation({
    mutationFn: async ({ orderId, paymentMethod }: { orderId: string, paymentMethod: string }) => {
      const res = await markOrderDelivered(orderId, paymentMethod);
      if (!res.success) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      toast.success("Order marked as delivered!");
      queryClient.invalidateQueries({ queryKey: ["rider-orders"] });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to mark order as delivered");
    }
  });

  if (isLoading) return <div className="flex justify-center p-8"><p className="text-zinc-500 animate-pulse">Loading deliveries...</p></div>;
  if (error) return <div className="flex justify-center p-8"><p className="text-red-500">Error loading deliveries.</p></div>;

  const orders = data || [];

  return (
    <div className="flex flex-col gap-4 p-4">
      {orders.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-zinc-500 opacity-50 border-2 border-dashed border-zinc-800 rounded-xl p-8">
          <Bike className="w-16 h-16 mb-4" />
          <h3 className="text-lg font-bold">No Active Deliveries</h3>
          <p className="text-sm text-center mt-2 max-w-[250px]">You have no assigned deliveries right now. Take a break!</p>
        </div>
      )}

      {orders.map((order) => {
        const timeElapsed = order.createdAt ? formatDistanceToNow(new Date(order.createdAt)) : "Unknown time";
        
        // Generate Google Maps Deep Link (iOS/Android compatible)
        const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryAddress || "")}`;

        return (
          <div key={order.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-md flex flex-col">
            
            <div className="p-4 border-b border-zinc-800 bg-zinc-950 flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-black text-2xl text-zinc-100 flex items-center gap-2">
                    #{order.id.slice(-4)}
                  </h3>
                  <p className="text-xs text-zinc-400 flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" /> Dispatched {timeElapsed} ago
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-emerald-400">Rs. {order.totalAmount}</p>
                  <Badge variant="outline" className={cn(
                    "mt-1 text-[10px] uppercase font-bold",
                    order.paymentMethod === "COD" ? "border-amber-500 text-amber-500 bg-amber-950/20" : "border-emerald-500 text-emerald-500 bg-emerald-950/20"
                  )}>
                    {order.paymentMethod === "COD" ? <><Banknote className="w-3 h-3 mr-1"/> COD - Collect Cash</> : <><CreditCard className="w-3 h-3 mr-1"/> Pre-Paid</>}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="p-4 flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="flex items-start gap-3 bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50">
                  <User className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-zinc-200">{order.customerName}</p>
                    {order.customerPhone && (
                      <a href={`tel:${order.customerPhone}`} className="text-blue-400 flex items-center gap-1 mt-1 hover:underline">
                        <Phone className="w-3 h-3" /> {order.customerPhone}
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50">
                  <MapPin className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-zinc-300 font-medium leading-tight">
                      {order.deliveryAddress || "No address provided"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex flex-col gap-3">
              <Button 
                variant="outline" 
                className="w-full h-12 text-blue-400 border-blue-900 bg-blue-950/20 hover:bg-blue-900/40 hover:text-blue-300 font-bold"
                onClick={() => window.open(mapsLink, '_blank')}
              >
                <Navigation className="w-5 h-5 mr-2" /> Navigate
              </Button>
              
              <Button 
                className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg shadow-lg"
                onClick={() => deliverMutation.mutate({ orderId: order.id, paymentMethod: order.paymentMethod || "COD" })}
                disabled={deliverMutation.isPending}
              >
                <CheckCircle2 className="w-6 h-6 mr-2" /> Mark Delivered
              </Button>
            </div>

          </div>
        )
      })}
    </div>
  );
}
