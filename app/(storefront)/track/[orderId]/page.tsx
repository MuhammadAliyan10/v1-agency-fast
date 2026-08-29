"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, ChefHat, Bike, PackageCheck, Loader2 } from "lucide-react";
import { getOrderTrackingStatus } from "@/server/actions/tracking";
import { WhatsAppButton } from "@/components/features/storefront/whatsapp-button";
import { STORE_CONSTANTS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type OrderStatus = "pending" | "preparing" | "out_for_delivery" | "delivered" | "cancelled";

interface TrackingData {
  id: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: Date;
  deliveryAddress: string;
}

export default function TrackingPage({ params }: { params: Promise<{ orderId: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const orderId = resolvedParams.orderId;
  
  const [data, setData] = useState<TrackingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStatus = async () => {
    try {
      const res = await getOrderTrackingStatus(orderId);
      if (res.success && res.data) {
        setData(res.data as TrackingData);
      } else {
        setError(res.error || "Order not found");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch order status");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll every 10 seconds
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground font-medium">Locating your order...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-6">
          <Clock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Order Not Found</h2>
        <p className="text-muted-foreground mb-8">{error}</p>
        <button 
          onClick={() => router.push("/")}
          className="text-primary hover:underline font-medium"
        >
          Return to Menu
        </button>
      </div>
    );
  }

  // Define steps
  const steps = [
    { key: "pending", label: "Received", icon: Clock },
    { key: "preparing", label: "Preparing", icon: ChefHat },
    { key: "out_for_delivery", label: "On the Way", icon: Bike },
    { key: "delivered", label: "Delivered", icon: PackageCheck },
  ];

  const getStepIndex = (status: OrderStatus) => {
    if (status === "cancelled") return -1;
    return steps.findIndex(s => s.key === status);
  };

  const currentStepIndex = getStepIndex(data.status);
  const isCancelled = data.status === "cancelled";

  return (
    <div className="animate-in fade-in duration-500 w-full max-w-3xl mx-auto mb-24 pt-12 md:pt-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-heading font-black tracking-tight mb-3">Track Your Order</h1>
        <p className="text-muted-foreground text-lg">Order ID: <span className="font-bold text-foreground">{data.id}</span></p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        
        {/* Left Column: Tracking Status (Visual Stepper) */}
        <div className="md:col-span-3 bg-white border border-border/30 rounded-[2rem] p-8 md:p-10 shadow-sm relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[4rem] -z-10" />
          
          <h2 className="text-xl font-bold mb-8">Live Status</h2>

          {isCancelled ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-4">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-destructive mb-2">Order Cancelled</h3>
              <p className="text-muted-foreground">Please contact support for more details.</p>
            </div>
          ) : (
            <div className="relative space-y-8 py-4">
              {/* Connecting Line */}
              <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-border -z-10 ml-0.5" />
              
              {steps.map((step, index) => {
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const Icon = step.icon;

                return (
                  <div key={step.key} className="flex items-start gap-4">
                    <div 
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-500",
                        isCompleted 
                          ? "bg-primary border-primary text-primary-foreground shadow-md" 
                          : "bg-background border-border text-muted-foreground"
                      )}
                    >
                      {isCompleted && !isCurrent ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : (
                        <Icon className={cn("w-6 h-6", isCurrent && "animate-pulse")} />
                      )}
                    </div>
                    
                    <div className="pt-2.5">
                      <h4 className={cn(
                        "font-bold text-lg",
                        isCompleted ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {step.label}
                      </h4>
                      {isCurrent && (
                        <p className="text-primary font-medium text-sm mt-0.5 animate-pulse">
                          Currently active...
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Order Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border border-border/30 shadow-sm rounded-3xl p-6 md:p-8">
            <h3 className="font-heading font-black text-2xl mb-6">Order Details</h3>
            
            <div className="space-y-4 text-sm">
              <div>
                <span className="text-muted-foreground block mb-1">Time Placed</span>
                <span className="font-medium">{format(new Date(data.createdAt), "hh:mm a - MMM dd, yyyy")}</span>
              </div>
              
              <div>
                <span className="text-muted-foreground block mb-1">Estimated Delivery</span>
                <span className="font-medium text-foreground">30 - 45 Minutes</span>
              </div>

              <div>
                <span className="text-muted-foreground block mb-1">Delivery Address</span>
                <span className="font-medium leading-snug block">{data.deliveryAddress}</span>
              </div>
              
              <div className="pt-4 border-t border-border/50">
                <span className="text-muted-foreground block mb-1">Total Amount</span>
                <span className="font-black text-2xl text-primary">{STORE_CONSTANTS.CURRENCY} {data.totalAmount}</span>
              </div>
            </div>
          </div>

          {/* WhatsApp Integration */}
          <WhatsAppButton orderId={data.id} status={data.status} />
        </div>
        
      </div>
    </div>
  );
}
