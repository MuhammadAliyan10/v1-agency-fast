"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { openShift, closeShift, getCurrentShift } from "@/server/actions/shifts";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Calculator, Lock, Unlock } from "lucide-react";

export function ShiftManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shiftData, setShiftData] = useState<any>(null);
  
  const [floatAmount, setFloatAmount] = useState("");
  const [actualCash, setActualCash] = useState("");
  const [notes, setNotes] = useState("");

  const fetchShift = async () => {
    const res = await getCurrentShift();
    if (res.success) {
      setShiftData(res.data);
    }
  };

  useEffect(() => {
    fetchShift();
  }, []);

  const handleOpenShift = async () => {
    const amount = parseInt(floatAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error("Please enter a valid float amount.");
      return;
    }
    setLoading(true);
    const res = await openShift(amount);
    if (res.success) {
      toast.success("Shift opened successfully!");
      fetchShift();
      setIsOpen(false);
    } else {
      toast.error(res.error);
    }
    setLoading(false);
  };

  const handleCloseShift = async () => {
    const cash = parseInt(actualCash);
    if (isNaN(cash) || cash < 0) {
      toast.error("Please enter the exact physical cash counted in the drawer.");
      return;
    }
    setLoading(true);
    const res = await closeShift(shiftData.id, cash, notes);
    if (res.success) {
      toast.success("Shift closed and Z-Report generated!");
      // Here you would trigger Z-Report printing
      generateZReportPrint(res.data);
      fetchShift();
      setIsOpen(false);
    } else {
      toast.error(res.error);
    }
    setLoading(false);
  };

  const generateZReportPrint = (data: any) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    iframe.contentWindow?.document.write(`
      <html>
        <head>
          <title>Z-Report - ${data.id}</title>
          <style>
            @page { margin: 0; size: 80mm 297mm; }
            body { font-family: monospace, sans-serif; font-size: 12px; width: 80mm; padding: 4mm; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .border-b { border-bottom: 1px dashed black; margin-bottom: 8px; padding-bottom: 8px; }
          </style>
        </head>
        <body>
          <div class="text-center font-bold" style="font-size: 16px;">Z-REPORT (END OF DAY)</div>
          <div class="text-center border-b">Shift ID: ${data.id.slice(0, 8)}</div>
          
          <div style="display: flex; justify-content: space-between; margin-top: 8px;">
            <span>Starting Float:</span><span>Rs. ${data.startingFloat}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Cash Sales:</span><span>Rs. ${data.cashSales}</span>
          </div>
          <div class="border-b" style="display: flex; justify-content: space-between; margin-top: 8px;">
            <span class="font-bold">System Expected Cash:</span><span class="font-bold">Rs. ${data.expectedCash}</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-top: 8px;">
            <span>Actual Counted Cash:</span><span>Rs. ${data.actualCash}</span>
          </div>
          <div class="border-b" style="display: flex; justify-content: space-between;">
            <span class="font-bold">Variance (Discrepancy):</span><span class="font-bold">Rs. ${data.variance}</span>
          </div>

          <div style="display: flex; justify-content: space-between; margin-top: 8px;">
            <span>Total Voids:</span><span>Rs. ${data.totalVoidAmount}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Total Waste:</span><span>Rs. ${data.totalWasteAmount}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Void/Waste Count:</span><span>${data.voidCount} items</span>
          </div>

          <div style="margin-top: 24px; text-align: center;">
            Manager Signature<br><br>
            _________________________
          </div>
        </body>
      </html>
    `);
    iframe.contentWindow?.document.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 500);
  };

  return (
    <>
      <Button 
        variant={shiftData ? "outline" : "default"} 
        className={shiftData ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" : ""}
        onClick={() => setIsOpen(true)}
      >
        {shiftData ? (
          <><Unlock className="w-4 h-4 mr-2" /> Shift Open</>
        ) : (
          <><Lock className="w-4 h-4 mr-2" /> Open Shift</>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          {!shiftData ? (
            <>
              <DialogHeader>
                <DialogTitle>Open Register Shift</DialogTitle>
                <DialogDescription>
                  Enter the starting float (cash currently in the drawer) to open the register.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="float">Starting Float (Rs.)</Label>
                  <Input 
                    id="float" 
                    type="number" 
                    placeholder="e.g. 5000" 
                    value={floatAmount} 
                    onChange={(e) => setFloatAmount(e.target.value)} 
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button onClick={handleOpenShift} disabled={loading || !floatAmount}>
                  Open Register
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Close Shift & Generate Z-Report</DialogTitle>
                <DialogDescription>
                  Count the physical cash in the drawer and enter it below. The system will calculate any variance automatically.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg flex items-center justify-between">
                  <span className="font-semibold text-sm">Shift Started</span>
                  <Badge variant="outline">{new Date(shiftData.openedAt).toLocaleString()}</Badge>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="actual">Actual Counted Cash (Rs.)</Label>
                  <div className="relative">
                    <Calculator className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="actual" 
                      type="number" 
                      className="pl-9"
                      placeholder="Enter exact drawer amount..." 
                      value={actualCash} 
                      onChange={(e) => setActualCash(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea 
                    id="notes" 
                    placeholder="Reason for missing cash or general shift notes..." 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsOpen(false)}>Keep Shift Open</Button>
                <Button variant="destructive" onClick={handleCloseShift} disabled={loading || !actualCash}>
                  Close Shift & Print Z-Report
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
