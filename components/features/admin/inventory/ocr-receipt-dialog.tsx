"use client";

import { useState, useTransition, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { processOCRReceipt, commitInventoryInvoice, OCRReceiptData } from "@/server/actions/ocr-inventory";
import { toast } from "sonner";
import { UploadCloud, FileImage, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";

interface OcrReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryItems?: any[];
}

// Client-side image compression using Canvas API
async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;

        if (width > height && width > maxDim) {
          height *= maxDim / width;
          width = maxDim;
        } else if (height > maxDim) {
          width *= maxDim / height;
          height = maxDim;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject("Canvas ctx null");
        ctx.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        resolve(dataUrl.split(',')[1]);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function OcrReceiptDialog({ open, onOpenChange, inventoryItems = [] }: OcrReceiptDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [isCommitting, startCommitTransition] = useTransition();
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  
  // Staging State
  const [stagedData, setStagedData] = useState<OCRReceiptData | null>(null);
  const [itemMappings, setItemMappings] = useState<Record<number, string>>({}); // idx -> dbItemId or "NEW"
  const [vendorName, setVendorName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedBase64 = await compressImage(file);
      setImageBase64(compressedBase64);
    } catch (err) {
      toast.error("Failed to compress image client-side.");
    }
  };

  const handleProcess = () => {
    if (!imageBase64) return;
    
    startTransition(async () => {
      const res = await processOCRReceipt(imageBase64);
      if (res.success && res.data) {
        toast.success("AI parsed the invoice successfully.");
        setStagedData(res.data);
        setVendorName(res.data.vendorName || "");
        setInvoiceNumber(res.data.invoiceNumber || "");
        
        // Auto-match strings if identical
        const newMappings: Record<number, string> = {};
        res.data.items.forEach((ocrItem: any, idx: number) => {
          const match = inventoryItems.find((dbItem) => dbItem.itemName.toLowerCase() === ocrItem.name.toLowerCase());
          newMappings[idx] = match ? match.id : "NEW";
        });
        setItemMappings(newMappings);
      } else {
        toast.error(res.error || "Failed to process receipt");
      }
    });
  };

  const handleCommit = () => {
    if (!stagedData) return;
    
    startCommitTransition(async () => {
      const commitItems = stagedData.items.map((item, idx) => ({
        dbItemId: itemMappings[idx] || "NEW",
        ocrName: item.name,
        quantity: item.quantity,
        totalCost: item.totalCost,
        unit: item.unit || "pcs",
      }));

      const res = await commitInventoryInvoice(vendorName, invoiceNumber, commitItems);
      if (res.success) {
        toast.success("Ledger transaction committed successfully.");
        resetState();
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(res.error || "Ledger transaction failed");
      }
    });
  };

  const resetState = () => {
    setImageBase64(null);
    setStagedData(null);
    setItemMappings({});
    setVendorName("");
    setInvoiceNumber("");
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-[700px] rounded-none">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold uppercase tracking-tight">Invoice Processing Pipeline</DialogTitle>
          <DialogDescription className="text-xs">
            {stagedData ? "Verify AI extraction and map items to the database ledger." : "Upload an invoice to automatically extract items, quantities, and costs."}
          </DialogDescription>
        </DialogHeader>

        {!stagedData ? (
          <div className="grid gap-4 py-4">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
            />

            {!imageBase64 ? (
              <div 
                className="border-2 border-dashed rounded-none p-10 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                <div className="font-semibold text-sm">Select receipt image</div>
                <div className="text-xs text-muted-foreground mt-1">Image will be compressed client-side before processing.</div>
              </div>
            ) : (
              <div className="border bg-muted p-6 rounded-none flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileImage className="w-8 h-8 text-primary" />
                  <div>
                    <div className="font-bold text-sm">Image Ready for Processing</div>
                    <div className="text-xs text-muted-foreground">Compressed successfully</div>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setImageBase64(null)} className="rounded-none">Discard</Button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase">Vendor Name</Label>
                <Input value={vendorName} onChange={(e) => setVendorName(e.target.value)} className="rounded-none h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase">Invoice Number</Label>
                <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="rounded-none h-8 text-xs" />
              </div>
            </div>

            <div className="border rounded-none max-h-[300px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">OCR Extracted Name</TableHead>
                    <TableHead className="text-xs w-[80px]">Qty</TableHead>
                    <TableHead className="text-xs w-[100px]">Total Cost</TableHead>
                    <TableHead className="text-xs min-w-[180px]">Map to Database Item</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stagedData.items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-bold text-xs">{item.name}</TableCell>
                      <TableCell className="text-xs">{item.quantity} {item.unit}</TableCell>
                      <TableCell className="text-xs font-mono">Rs.{item.totalCost}</TableCell>
                      <TableCell>
                        <Select 
                          value={itemMappings[idx]} 
                          onValueChange={(val) => setItemMappings(prev => ({ ...prev, [idx]: val }))}
                        >
                          <SelectTrigger className="h-7 text-xs rounded-none bg-background">
                            <SelectValue placeholder="Map item..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-none">
                            <SelectItem value="NEW" className="font-bold text-primary">Create New Item</SelectItem>
                            {inventoryItems.map(dbItem => (
                              <SelectItem key={dbItem.id} value={dbItem.id}>
                                {dbItem.itemName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 border-t pt-4">
          <Button variant="outline" onClick={handleClose} disabled={isPending || isCommitting} className="rounded-none">Cancel</Button>
          {!stagedData ? (
            <Button onClick={handleProcess} disabled={!imageBase64 || isPending} className="rounded-none">
              {isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing AI...</>
              ) : (
                <><ScanText className="w-4 h-4 mr-2" /> Analyze Receipt</>
              )}
            </Button>
          ) : (
            <Button onClick={handleCommit} disabled={isCommitting} className="rounded-none bg-emerald-600 hover:bg-emerald-700 text-white">
              {isCommitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Committing Ledger...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Commit Invoice</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ScanText({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <path d="M7 8h8" />
      <path d="M7 12h10" />
      <path d="M7 16h6" />
    </svg>
  )
}
