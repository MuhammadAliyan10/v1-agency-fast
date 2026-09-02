"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface VoidReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string, isWaste: boolean) => void;
  isItemLevel?: boolean;
}

const VOID_REASONS = [
  { id: "customer_changed_mind", label: "Customer Changed Mind", isWaste: false },
  { id: "kitchen_error", label: "Kitchen Error / Dropped", isWaste: true },
  { id: "out_of_stock", label: "Out of Stock", isWaste: false },
  { id: "fake_order", label: "Fake / Prank Order", isWaste: false },
  { id: "quality_issue", label: "Quality Issue / Returned", isWaste: true },
];

export function VoidReasonDialog({ open, onOpenChange, onConfirm, isItemLevel = false }: VoidReasonDialogProps) {
  const [selectedId, setSelectedId] = useState<string>("customer_changed_mind");

  const handleConfirm = () => {
    const reason = VOID_REASONS.find(r => r.id === selectedId);
    if (reason) {
      onConfirm(reason.label, reason.isWaste);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isItemLevel ? "Void Item" : "Cancel Order"}</DialogTitle>
          <DialogDescription>
            Please select the reason for this cancellation. This helps track inventory waste and financials accurately.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <RadioGroup value={selectedId} onValueChange={setSelectedId} className="space-y-3">
            {VOID_REASONS.map((reason) => (
              <div key={reason.id} className="flex items-center space-x-3">
                <RadioGroupItem value={reason.id} id={reason.id} />
                <Label htmlFor={reason.id} className="flex-1 cursor-pointer font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {reason.label}
                  {reason.isWaste && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-900/30 dark:text-red-400">
                      Inventory Loss
                    </span>
                  )}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Keep Order
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            Confirm Cancellation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
