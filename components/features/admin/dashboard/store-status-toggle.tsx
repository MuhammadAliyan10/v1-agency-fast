"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Store } from "lucide-react";
import { toggleStoreStatus } from "@/server/actions/settings";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface StoreStatusToggleProps {
  initialStatus: boolean;
}

export function StoreStatusToggle({ initialStatus }: StoreStatusToggleProps) {
  const [isOpen, setIsOpen] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();

  const handleToggle = (checked: boolean) => {
    setIsOpen(checked);
    startTransition(async () => {
      const result = await toggleStoreStatus(checked);
      if (result.success) {
        toast.success(checked ? "Store is now Open" : "Store is now Closed");
      } else {
        toast.error("Failed to update store status");
        setIsOpen(!checked);
      }
    });
  };

  return (
    <div className={cn(
      "flex items-center justify-between p-4  border shadow-sm transition-colors",
      isOpen 
        ? "bg-primary/5 border-primary/20" 
        : "bg-destructive/5 border-destructive/20"
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2  flex items-center justify-center",
          isOpen ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"
        )}>
          <Store className="h-5 w-5" />
        </div>
        <div>
          <h3 className={cn(
            "font-semibold text-sm",
            isOpen ? "text-primary" : "text-destructive"
          )}>
            {isOpen ? "Store is Accepting Orders" : "Store is Closed"}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isOpen 
              ? "Customers can browse and place new orders." 
              : "Checkout is disabled. Customers cannot place orders."}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Label htmlFor="store-toggle" className="text-sm font-semibold cursor-pointer">
          {isOpen ? "Open" : "Closed"}
        </Label>
        <Switch
          id="store-toggle"
          checked={isOpen}
          onCheckedChange={handleToggle}
          disabled={isPending}
          className={cn(isOpen && "data-[state=checked]:bg-primary")}
        />
      </div>
    </div>
  );
}
