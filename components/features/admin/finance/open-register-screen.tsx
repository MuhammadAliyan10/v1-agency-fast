"use client";

import { useState, useTransition } from "react";
import { Banknote, Loader2 } from "lucide-react";
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
    <div className="flex items-center justify-center min-h-[50vh] p-4">
      <Card className="w-full max-w-sm rounded-none shadow-sm border-border">
        <CardHeader className="text-center pb-6 border-b border-border/40 bg-muted/10">
          <div className="mx-auto bg-primary/10 w-12 h-12 flex items-center justify-center rounded-none mb-4">
            <Banknote className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-lg font-bold uppercase tracking-widest">
            Open Register
          </CardTitle>
          <CardDescription className="text-xs font-medium">
            Enter the starting cash float to begin a new shift.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Starting Cash Float
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">
                Rs.
              </span>
              <Input 
                type="number" 
                placeholder="0" 
                value={floatAmount}
                onChange={(e) => setFloatAmount(e.target.value)}
                className="pl-12 h-12 text-lg font-bold rounded-none focus-visible:ring-primary shadow-sm"
                disabled={pending}
              />
            </div>
          </div>
          
          <Button 
            className="w-full h-12 rounded-none font-bold text-xs uppercase tracking-widest" 
            onClick={handleOpen}
            disabled={pending || !floatAmount}
          >
            {pending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Open Shift
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
