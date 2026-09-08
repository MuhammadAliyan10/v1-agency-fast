"use client";

import { useState, useTransition } from "react";
import { Calculator, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { openRegister } from "@/server/actions/finance";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function OpenRegisterScreen() {
  const [floatAmount, setFloatAmount] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleOpen = () => {
    const amount = Number(floatAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error("Please enter a valid starting float amount");
      return;
    }

    startTransition(async () => {
      const res = await openRegister(amount);
      if (res.success) {
        toast.success("Register opened successfully!");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to open register");
      }
    });
  };

  return (
    <Card className="rounded-none shadow-sm border-border">
      <CardHeader className="text-center pb-4 border-b border-border/40 bg-muted/10">
        <div className="mx-auto bg-primary/10 w-12 h-12 flex items-center justify-center rounded-none mb-3">
          <Calculator className="w-6 h-6 text-primary" />
        </div>
        <CardTitle className="text-xl font-black uppercase tracking-tight">Open Register</CardTitle>
        <CardDescription className="font-medium text-xs">
          Enter the starting cash float in the drawer to begin a new shift.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-5">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
            Starting Float (Cash)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-muted-foreground">Rs.</span>
            <Input 
              type="number" 
              placeholder="0" 
              value={floatAmount}
              onChange={(e) => setFloatAmount(e.target.value)}
              className="pl-12 h-14 text-xl font-black rounded-none shadow-sm focus-visible:ring-primary"
              disabled={pending}
            />
          </div>
        </div>
        
        <Button 
          className="w-full h-12 rounded-none font-bold text-sm uppercase tracking-wider" 
          onClick={handleOpen}
          disabled={pending || !floatAmount}
        >
          {pending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Open Shift
        </Button>
      </CardContent>
    </Card>
  );
}
