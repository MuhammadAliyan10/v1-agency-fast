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
            @media print {
              @page { margin: 0; size: 80mm auto; }
              body {
                margin: 0;
                padding: 3mm 4mm;
                width: 80mm;
                font-family: 'Courier New', monospace;
                color: #000;
                background: #fff;
                font-size: 11px;
                line-height: 1.3;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .text-center { text-align: center; }
              .font-bold { font-weight: bold; }
              .font-black { font-weight: 900; }
              .border-b { border-bottom: 1px dashed black; margin: 6px 0; }
              .flex-between { display: flex; justify-content: space-between; margin: 3px 0; }
            }
          </style>
        </head>
        <body>
          <div class="text-center" style="margin-bottom: 8px;">
            <img src="${window.location.origin}/slip/FullLogo.png" alt="Header" style="width: 100%; display: block; margin: 0 auto 8px;" />
            <div class="border-b"></div>
            <div style="font-size: 16px; font-weight: 900; letter-spacing: 2px;">END OF SHIFT REPORT</div>
            <div class="border-b"></div>
          </div>
          
          <div style="margin-bottom: 8px;">
            <div class="flex-between">
              <span class="font-bold">Shift ID:</span>
              <span>${data.id.slice(0, 8)}</span>
            </div>
            <div class="flex-between">
              <span class="font-bold">Shift Opened:</span>
              <span>${new Date(data.openedAt).toLocaleString()}</span>
            </div>
            <div class="flex-between">
              <span class="font-bold">Printed:</span>
              <span>${new Date().toLocaleString()}</span>
            </div>
          </div>
          
          <div class="border-b"></div>
          
          <div style="margin-bottom: 8px;">
            <div class="text-center font-black" style="font-size: 14px; margin-bottom: 6px;">CASH RECONCILIATION</div>
            <div class="flex-between">
              <span class="font-bold">Starting Float</span>
              <span class="font-bold">Rs ${data.startingFloat.toLocaleString()}</span>
            </div>
            <div class="flex-between">
              <span class="font-bold">Cash Sales</span>
              <span class="font-bold">Rs ${data.cashSales.toLocaleString()}</span>
            </div>
            <div class="border-b"></div>
            <div class="flex-between">
              <span class="font-black" style="font-size: 12px;">Expected in Drawer</span>
              <span class="font-black" style="font-size: 12px;">Rs ${data.expectedCash.toLocaleString()}</span>
            </div>
            <div class="flex-between">
              <span class="font-black" style="font-size: 12px;">Actual Cash Counted</span>
              <span class="font-black" style="font-size: 12px;">Rs ${data.actualCash.toLocaleString()}</span>
            </div>
            <div class="border-b"></div>
            <div class="flex-between">
              <span class="font-black" style="font-size: 13px;">Variance</span>
              <span class="font-black" style="font-size: 13px;">Rs ${data.variance.toLocaleString()}</span>
            </div>
          </div>
          
          <div class="border-b"></div>
          
          <div style="margin-bottom: 8px;">
            <div class="text-center font-black" style="font-size: 14px; margin-bottom: 6px;">EXCEPTIONS</div>
            <div class="flex-between">
              <span class="font-bold">Total Voids</span>
              <span class="font-bold">Rs ${data.totalVoidAmount.toLocaleString()}</span>
            </div>
            <div class="flex-between">
              <span class="font-bold">Total Waste</span>
              <span class="font-bold">Rs ${data.totalWasteAmount.toLocaleString()}</span>
            </div>
            <div class="flex-between">
              <span class="font-bold">Void/Waste Items</span>
              <span class="font-bold">${data.voidCount} items</span>
            </div>
          </div>

          <div class="border-b"></div>

          <div class="text-center" style="margin-top: 16px;">
            <div style="font-size: 12px; font-weight: 700; margin-bottom: 20px;">DECLARATION</div>
            <div style="margin: 24px 0 8px;">
              <div style="border-bottom: 1px solid #000; width: 70%; margin: 0 auto;"></div>
              <div style="font-size: 11px; font-weight: 700; margin-top: 4px;">Manager Signature</div>
            </div>
            <div style="margin: 24px 0 8px;">
              <div style="border-bottom: 1px solid #000; width: 70%; margin: 0 auto;"></div>
              <div style="font-size: 11px; font-weight: 700; margin-top: 4px;">Date</div>
            </div>
          </div>
          
          <div class="border-b"></div>
          <div class="text-center font-bold" style="font-size: 10px; margin-top: 8px;">End of Report</div>
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
        size="sm"
        className={`gap-1.5 h-9 ${shiftData ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" : ""}`}
        onClick={() => setIsOpen(true)}
      >
        {shiftData ? (
          <><Unlock className="h-4 w-4" /> Shift Open</>
        ) : (
          <><Lock className="h-4 w-4" /> Open Shift</>
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
