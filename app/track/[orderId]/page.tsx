"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { 
  CheckCircle2, 
  Clock, 
  ChefHat, 
  Bike, 
  PackageCheck, 
  Loader2, 
  Copy,
  Star,
  MapPin,
  Phone,
  CreditCard,
  ChevronLeft
} from "lucide-react";
import { toast } from "sonner";
import { getOrderTrackingStatus } from "@/server/actions/tracking";
import { WhatsAppButton } from "@/components/features/storefront/whatsapp-button";
import { STORE_CONSTANTS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { OrderActions } from "./order-actions";

type OrderStatus = "pending" | "approved" | "preparing" | "delayed" | "out_for_delivery" | "delivered" | "rejected" | "cancelled";

interface TrackingData {
  id: string;
  status: OrderStatus;
  orderType?: "delivery" | "pickup";
  totalAmount: number;
  subtotal: number;
  deliveryFee: number;
  createdAt: Date;
  deliveryAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  customerName: string;
  customerPhone: string;
  paymentMethod: string;
  deliveryNotes?: string | null;
  delayReason?: string | null;
  rejectionReason?: string | null;
  rider?: { name: string; phone: string } | null;
  items: any[];
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
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-6" />
        <p className="text-muted-foreground font-medium text-lg tracking-wide uppercase">Locating your order...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white text-center">
        <div className="w-20 h-20 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-8">
          <Clock className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-heading font-black mb-3">Order Not Found</h2>
        <p className="text-muted-foreground text-lg mb-10 max-w-sm">{error}</p>
        <button 
          onClick={() => router.push("/")}
          className="text-primary hover:text-primary/80 font-bold border-b-2 border-primary pb-1 transition-colors"
        >
          Return to Menu
        </button>
      </div>
    );
  }

  const isPickup = data.orderType === "pickup";

  const deliverySteps = [
    { key: "pending", label: "Order Placed", desc: "Waiting for confirmation", icon: Clock },
    { key: "preparing", label: "Preparing", desc: "Chefs are cooking", icon: ChefHat },
    { key: "out_for_delivery", label: "On the Way", desc: "Rider is heading to you", icon: Bike },
    { key: "delivered", label: "Delivered", desc: "Enjoy your meal!", icon: PackageCheck },
  ];

  const pickupSteps = [
    { key: "pending", label: "Order Placed", desc: "Waiting for confirmation", icon: Clock },
    { key: "preparing", label: "Preparing", desc: "Chefs are cooking", icon: ChefHat },
    { key: "ready_for_pickup", label: "Ready!", desc: "Come collect your order", icon: PackageCheck },
    { key: "delivered", label: "Collected", desc: "Enjoy your meal!", icon: CheckCircle2 },
  ];

  const steps = isPickup ? pickupSteps : deliverySteps;

  const getStepIndex = (status: OrderStatus) => {
    if (status === "cancelled" || status === "rejected") return -1;
    return steps.findIndex(s => s.key === status);
  };

  const mapsUrl = data.latitude && data.longitude
    ? `https://maps.google.com/?q=${data.latitude},${data.longitude}`
    : data.deliveryAddress ? `https://maps.google.com/?q=${encodeURIComponent(data.deliveryAddress)}` : null;

  const currentStepIndex = getStepIndex(data.status);
  const isCancelled = data.status === "cancelled";

  return (
    <div 
      className="min-h-screen bg-white pb-16 font-sans text-sm"
      style={{ '--font-heading': 'var(--font-inter)', '--font-sans': 'var(--font-figtree)' } as React.CSSProperties}
    >
      {/* Premium subtle top border */}
      <div className="h-1 w-full bg-gradient-to-r from-primary/20 via-primary to-primary/20" />
      
      <div className="w-full max-w-[85rem] mx-auto px-4 md:px-6 xl:px-8 pt-6 md:pt-8">
        
        {/* Back Link */}
        <button 
          onClick={() => router.push("/")}
          className="inline-flex items-center text-xs font-bold text-muted-foreground hover:text-primary transition-colors mb-6 group"
        >
          <ChevronLeft className="w-3.5 h-3.5 mr-1 group-hover:-translate-x-1 transition-transform" /> 
          Back to Menu
        </button>

        {/* Top Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-heading font-black tracking-tight mb-2 text-black">
              Track Your Order
            </h1>
            <div className="flex items-center flex-wrap gap-2 text-muted-foreground text-sm">
              <span className="opacity-80">Order Number:</span>
              <span className="font-bold text-foreground font-mono tracking-wide text-base">{data.id}</span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(data.id);
                  toast.success("Order ID copied to clipboard!");
                }}
                className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground flex-shrink-0 ml-1"
                title="Copy Order ID"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              Placed on {format(new Date(data.createdAt), "MMMM do, yyyy 'at' h:mm a")} 
              <span className="mx-2 opacity-50">•</span>
              <span className="text-primary font-bold">ETA: 30 - 45 mins</span>
            </p>
          </div>
          
          <div className="shrink-0">
            <OrderActions orderId={data.id} status={data.status} items={data.items} />
          </div>
        </div>

        {/* Horizontal Status Bar */}
        <div className="bg-white border-2 border-border/60 p-6 md:p-8 mb-8 relative overflow-hidden">
          {/* Subtle bg accent */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-green-500/[0.03] rounded-full blur-3xl -z-10 -translate-y-1/2 translate-x-1/3" />
          
          <h2 className="text-lg font-black font-heading mb-8 uppercase tracking-widest text-muted-foreground">Live Status</h2>
          
          {isCancelled ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-20 h-20 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-6">
                <Clock className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-destructive mb-3">Order Cancelled</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                {data.rejectionReason || "We're sorry, but this order has been cancelled. Please contact support if you believe this is a mistake."}
              </p>
            </div>
          ) : (
            <div className="relative isolate">
              {/* Progress Line Background Desktop */}
              <div className="absolute top-5 left-[12.5%] right-[12.5%] h-[2px] bg-muted -z-10 hidden md:block" />
              
              {/* Active Progress Line Desktop */}
              <div 
                className="absolute top-5 left-[12.5%] h-[2px] bg-green-500 transition-all duration-1000 ease-in-out -z-10 hidden md:block"
                style={{ width: `${(currentStepIndex / (steps.length - 1)) * 75}%` }}
              />

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-0">
                {steps.map((step, index) => {
                  const isCompleted = index <= currentStepIndex;
                  const isCurrent = index === currentStepIndex;
                  const Icon = step.icon;

                  return (
                    <div key={step.key} className="flex flex-row md:flex-col items-center md:items-center gap-3 md:gap-3 relative">
                      {/* Vertical line for mobile */}
                      {index !== steps.length - 1 && (
                        <div className="absolute left-5 top-10 bottom-[-1.5rem] w-[2px] bg-muted md:hidden -z-10" />
                      )}
                      
                      {/* Vertical active line for mobile */}
                      {index < currentStepIndex && index !== steps.length - 1 && (
                        <div className="absolute left-5 top-10 bottom-[-1.5rem] w-[2px] bg-green-500 md:hidden -z-10" />
                      )}

                      <div 
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-700 bg-white",
                          isCompleted 
                            ? "border-green-500 text-green-500" 
                            : "border-border text-muted-foreground opacity-50",
                          isCurrent && "shadow-[0_0_0_6px_rgba(34,197,94,0.15)] scale-110"
                        )}
                      >
                        {isCompleted && !isCurrent ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <Icon className={cn("w-5 h-5", isCurrent && "animate-pulse")} />
                        )}
                      </div>
                      
                      <div className="md:text-center mt-0.5 md:mt-1">
                        <h4 className={cn(
                          "font-bold text-sm",
                          isCompleted ? "text-foreground" : "text-muted-foreground opacity-50"
                        )}>
                          {step.label}
                        </h4>
                        <p className={cn(
                          "text-[10px] md:text-xs mt-0.5",
                          isCurrent ? "text-green-600 font-medium" : "text-muted-foreground opacity-70"
                        )}>
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Order Details & Items Grid */}
        <div className="grid lg:grid-cols-12 gap-6 xl:gap-8">
          
          {/* Left Column: Items */}
          <div className="lg:col-span-7 xl:col-span-8">
            <div className="bg-white border-2 border-border/60 p-6">
              <h2 className="font-heading font-black text-lg mb-6 uppercase tracking-widest text-muted-foreground">Order Items</h2>
              
              <div className="space-y-5">
                {data.items && data.items.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-start gap-4 pb-5 border-b border-border/30 last:border-0 last:pb-0">
                    <div className="flex gap-4">
                      {item.menuItem?.imageUrl ? (
                        <div className="relative w-16 h-16 shrink-0 bg-muted">
                          <img 
                            src={item.menuItem.imageUrl} 
                            alt={item.itemName} 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-foreground text-background text-xs font-bold flex items-center justify-center rounded-full">
                            {item.quantity}
                          </div>
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-muted flex items-center justify-center font-black text-muted-foreground shrink-0 text-sm">
                          {item.quantity}x
                        </div>
                      )}
                      
                      <div className="pt-1">
                        <p className="font-bold text-base leading-none mb-1.5">{item.itemName}</p>
                        {item.variantName && (
                          <p className="text-xs text-muted-foreground">Size: {item.variantName}</p>
                        )}
                        {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            + {item.selectedAddOns.map((a: any) => a.name).join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="font-black text-base pt-1">
                      {STORE_CONSTANTS.CURRENCY} {item.subtotal}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-border/50">
                <div className="flex flex-col gap-2.5 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-medium text-foreground">{STORE_CONSTANTS.CURRENCY} {data.subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span className="font-medium text-foreground">{STORE_CONSTANTS.CURRENCY} {data.deliveryFee}</span>
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/50">
                    <span className="font-bold uppercase tracking-wider text-xs">Total Paid</span>
                    <span className="font-black text-xl text-primary">{STORE_CONSTANTS.CURRENCY} {data.totalAmount}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Review Option */}
            {data.status === "delivered" && (
              <div className="mt-6 bg-green-50/50 border-2 border-green-500/20 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-heading font-black text-lg mb-1 text-foreground">How was your meal?</h3>
                  <p className="text-muted-foreground text-xs">We'd love to hear your feedback.</p>
                </div>
                <button 
                  onClick={() => toast.info("Review feature coming soon!")}
                  className="shrink-0 inline-flex items-center justify-center h-10 px-5 rounded-none bg-green-500 text-white font-bold hover:opacity-90 transition-opacity w-full md:w-auto text-sm"
                >
                  <Star className="w-3.5 h-3.5 mr-2 fill-current" />
                  Leave a Review
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Customer Details */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6">
            <div className="bg-white border-2 border-border/60 p-6">
              <h2 className="font-heading font-black text-lg mb-6 uppercase tracking-widest text-muted-foreground">Delivery Details</h2>
              <ul className="space-y-5">
                <li className="flex gap-4">
                  <div className="w-10 h-10 bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="pt-0.5">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-0.5">Address</p>
                    <p className="font-medium text-foreground leading-snug text-sm">{data.deliveryAddress}</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="w-10 h-10 bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="pt-0.5">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-0.5">Contact</p>
                    <p className="font-medium text-foreground text-sm">{data.customerName}</p>
                    <p className="text-foreground mt-0.5 text-xs text-muted-foreground">{data.customerPhone}</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="w-10 h-10 bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div className="pt-0.5">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-0.5">Payment</p>
                    <p className="font-medium text-foreground capitalize text-sm">{data.paymentMethod}</p>
                  </div>
                </li>
              </ul>
            </div>
            
            {data.deliveryNotes && (
              <div className="bg-[#FAF9F5] border-2 border-[#EBE7DF] p-6">
                <h3 className="font-bold text-[#8C7A5B] uppercase tracking-wider text-[10px] mb-2">Delivery Notes</h3>
                <p className="text-[#594E40] text-xs leading-relaxed">{data.deliveryNotes}</p>
              </div>
            )}

            {data.rider && (data.status === "out_for_delivery" || data.status === "delivered") && (
              <div className="bg-primary/5 border-2 border-primary/20 p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/20 text-primary rounded-full flex items-center justify-center shrink-0">
                  <Bike className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-[10px] uppercase tracking-wider text-primary mb-0.5">Your Rider</h3>
                  <p className="font-bold text-base text-foreground leading-none mb-1">{data.rider.name}</p>
                  <p className="text-xs text-muted-foreground">{data.rider.phone}</p>
                </div>
              </div>
            )}

            {data.delayReason && data.status === "delayed" && (
              <div className="bg-orange-50 border-2 border-orange-200 p-6">
                <h3 className="font-bold text-orange-800 uppercase tracking-wider text-[10px] mb-2">Notice</h3>
                <p className="text-orange-900 text-xs leading-relaxed">{data.delayReason}</p>
              </div>
            )}

            <WhatsAppButton orderId={data.id} status={data.status} />
          </div>
          
        </div>
      </div>
    </div>
  );
}
