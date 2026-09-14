// components/features/admin/orders/print-invoice-button.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Printer, Banknote, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { markOrderPaidFromHistory } from "@/server/actions/order-history";
import { format } from "date-fns";

// ─── Shared print helper (same template as kanban-card.tsx) ──────────────────
export function buildAndPrintFromData(order: any) {
  const isDineIn  = order.orderType === "dine_in";
  const isUpdated = (order.items || []).some((i: any) => (i.roundNumber ?? 1) > 1);

  function formatPhone(phone: string | null) {
    if (!phone) return "";
    let clean = phone.replace(/\D/g, "");
    if (clean.startsWith("92") && clean.length === 12) clean = "0" + clean.slice(2);
    if (clean.length === 11) return clean.slice(0, 4) + " " + clean.slice(4);
    return phone;
  }

  const itemsHtml = (order.items || []).map((item: any) => {
    const addOns = Array.isArray(item.selectedAddOns) ? (item.selectedAddOns as { name: string }[]) : [];
    const isDeal = item.itemName.includes("[DEAL]");
    const dealName = isDeal ? item.itemName.replace(/^\[DEAL\]\s*/, "") : null;
    let dealSelections = null;
    if (isDeal && item.dealSelections) {
      try { dealSelections = typeof item.dealSelections === "string" ? JSON.parse(item.dealSelections) : item.dealSelections; } catch(e){}
    }
    
    let html = `
      <div style="margin-bottom: 8px;">
        <div style="display: flex; align-items: flex-start;">
          <div style="width: 40px; font-size: 20px; font-weight: 900; text-align: left;">${item.quantity}x</div>
          <div style="flex: 1; padding-left: 8px;">
            <div style="font-weight: 800; font-size: 16px; margin-bottom: 4px;">
              ${isDeal ? dealName : item.itemName}
              ${!isDeal && item.variantName && item.variantName !== "Deal" ? `<span style="font-weight: normal; font-size: 14px;"> (${item.variantName})</span>` : ""}
            </div>
    `;
    
    if (dealSelections && dealSelections.length > 0) {
      html += `<div style="font-size: 14px; color: #333; margin-bottom: 4px;">`;
      dealSelections.forEach((sel: any) => { html += `<div>• ${sel.name}</div>`; });
      html += `</div>`;
    }
    
    if (!isDeal && addOns.length > 0) {
      html += `<div style="font-size: 14px; color: #333; margin-bottom: 4px;">+ ${addOns.map((a: any) => a.name).join(", ")}</div>`;
    }
    
    if (item.specialInstructions) {
      html += `<div style="font-size: 14px; font-weight: 700; margin-bottom: 4px;">*** ${item.specialInstructions}</div>`;
    }
    
    html += `
          </div>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 10px; font-size: 16px; font-weight: 700; margin-bottom: 6px;">
          <div style="width: 55px; text-align: right;">${(item.unitPrice || (item.subtotal/item.quantity)).toLocaleString()}</div>
          <div style="width: 55px; text-align: right;">${item.subtotal.toLocaleString()}</div>
        </div>
        <div style="border-bottom: 1px solid #000;"></div>
      </div>
    `;
    
    return html;
  }).join("");

  const isPaid = order.paymentStatus === "paid";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const tableDisplay = order.tableNumber ? (/^table/i.test(order.tableNumber) ? order.tableNumber : `Table ${order.tableNumber}`) : "Table N/A";
  const tableZoneDisplay = order.tableZone === "family" ? " (Family Hall)" : order.tableZone === "outdoor" ? " (Outdoor)" : "";

  const html = `<!DOCTYPE html><html><head><title>Slip ${order.id}</title><style>
    @page{margin:0;size:80mm 297mm}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Courier New',Courier,monospace;font-size:14px;width:80mm;padding:8px;color:#000;background:#fff;line-height:1.2;}
  </style></head><body>
    <div style="text-align: center; margin-bottom: 8px;">
      <img src="${origin}/slip/FullLogo.png" alt="Header" style="width: 80%; max-width: 250px; display: block; margin: 0 auto 8px;" />
      <div style="border-bottom: 1px dashed #000; margin: 8px 0;"></div>
      
      <div style="font-size: 16px; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">
        ${(order.orderType || "").replace(/_/g, " ")}
      </div>
      
      ${isDineIn ? `
        <div style="font-size: 18px; font-weight: 900; margin-bottom: 8px;">
          ${tableDisplay}${tableZoneDisplay}
        </div>
      ` : ""}
      
      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 6px 0; margin-bottom: 8px;">
        <div style="text-align: left;">
          <div style="font-size: 20px; font-weight: 900;">#${order.id.split("-").pop()}</div>
          ${isUpdated ? `<div style="font-size: 14px; font-weight: bold; margin-top: 2px;">(Recall)</div>` : ""}
        </div>
        <div style="font-size: 13px; text-align: right; font-weight: 600; line-height: 1.4;">
          ${format(order.createdAt || new Date(), "dd/MM/yyyy")}<br />
          ${format(order.createdAt || new Date(), "hh:mm a")}
        </div>
      </div>
    </div>
    
    <div style="font-size: 13px; margin-bottom: 8px; text-transform: capitalize; width: 100%;">
      ${order.orderType === "delivery" ? `
        <div style="font-weight: 900; font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${order.customerName || "Customer"}</div>
        ${order.customerPhone ? `<div style="font-weight: 900; font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${formatPhone(order.customerPhone)}</div>` : ""}
        ${order.deliveryAddress ? `<div style="font-weight: 900; font-size: 16px; margin-top: 2px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${order.deliveryAddress}</div>` : ""}
      ` : isDineIn ? `
        <div style="font-size: 14px; font-weight: 700;">Waiter: ${order.waiterName || order.waiter?.name || "—"}</div>
      ` : `
        <div style="font-weight: 800; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${order.customerName || "Customer"}</div>
        ${order.customerPhone ? `<div style="font-weight: 800; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${formatPhone(order.customerPhone)}</div>` : ""}
      `}
    </div>

    <div style="display: flex; justify-content: space-between; background-color: #ddd; color: #000; padding: 6px 4px; font-size: 14px; font-weight: bold; margin-bottom: 6px; -webkit-print-color-adjust: exact; border-top: 1px solid #000; border-bottom: 1px solid #000;">
      <div style="width: 40px; text-align: left;">Qty</div>
      <div style="flex: 1; padding-left: 8px;">Product</div>
      <div style="width: 55px; text-align: right;">Price</div>
      <div style="width: 55px; text-align: right;">Sub</div>
    </div>

    <div style="margin: 5px 0;">
      ${itemsHtml}
    </div>

    <div style="margin-top: 8px;">
      ${(order.deliveryFee ?? 0) > 0 ? `
        <div style="display: flex; justify-content: flex-end; gap: 10px; font-size: 16px; font-weight: 700; margin-bottom: 4px;">
          <div style="flex: 1; text-align: right;">Delivery Fee:</div>
          <div style="width: auto; text-align: right;">Rs ${order.deliveryFee.toLocaleString()}</div>
        </div>
      ` : ""}
      ${(order.discountAmount ?? 0) > 0 ? `
        <div style="display: flex; justify-content: flex-end; gap: 10px; font-size: 16px; font-weight: 700; margin-bottom: 4px;">
          <div style="flex: 1; text-align: right;"></div>
          <div style="width: auto; text-align: right;">-Rs ${order.discountAmount.toLocaleString()}</div>
        </div>
      ` : ""}
      
      <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 900; margin-top: 8px;">
        <div style="text-align: right; flex: 1; padding-right: 20px;">
          <div>Amount:</div>
          <div style="font-size: 16px; font-weight: 900; margin-top: 4px; ${isPaid ? 'padding: 2px 8px; background-color: #000; color: #fff; display: inline-block; border-radius: 4px;' : ''}">
            ${isPaid ? `PAID (${order.paymentMethod})` : "Total Due"}
          </div>
        </div>
        <div style="text-align: right;">
          <div>Rs ${order.totalAmount.toLocaleString()}</div>
          ${!isPaid ? `<div style="font-size: 14px; font-weight: 600; margin-top: 4px;">Rs ${order.totalAmount.toLocaleString()}</div>` : ""}
        </div>
      </div>
    </div>
  </body></html>`;

  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  document.body.appendChild(iframe);
  iframe.contentWindow?.document.write(html);
  iframe.contentWindow?.document.close();
  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 500);
  }, 250);
}

// ─── Mark as Paid button ──────────────────────────────────────────────────────
export function MarkOrderPaidButton({ orderId, paymentStatus }: { orderId: string; paymentStatus: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (paymentStatus === "paid") return null;

  return (
    <Button
      variant="default"
      className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const res = await markOrderPaidFromHistory(orderId);
          if (res.success) {
            toast.success("Order marked as paid");
            router.refresh();
          } else {
            toast.error(res.error || "Failed to mark as paid");
          }
        });
      }}
    >
      {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
      Mark as Paid
    </Button>
  );
}

// ─── Print invoice button (uses same template as kanban-card) ─────────────────
export function PrintInvoiceButton({ order }: { order?: any }) {
  return (
    <Button
      variant="default"
      className="gap-2 print:hidden"
      onClick={() => {
        if (order) {
          buildAndPrintFromData(order);
        } else {
          window.print();
        }
      }}
    >
      <Printer className="w-4 h-4" /> Print Slip
    </Button>
  );
}

export function buildAndPrintKOTFromData(order: any) {
  const isUpdated = (order.items || []).some((i: any) => (i.roundNumber ?? 1) > 1);
  const isDineIn = order.orderType === "dine_in" || order.orderType === "dine-in";
  
  const itemsHtml = (order.items || []).map((item: any) => {
    const addOns = Array.isArray(item.selectedAddOns)
      ? (item.selectedAddOns as { name: string }[]).map(a => a.name)
      : [];
    const isDeal = item.itemName.includes("[DEAL]");
    const dealName = isDeal ? item.itemName.replace(/^\[DEAL\]\s*/, "") : null;
    let dealSelections = null;
    if (isDeal && item.dealSelections) {
      try { dealSelections = typeof item.dealSelections === "string" ? JSON.parse(item.dealSelections) : item.dealSelections; } catch(e){}
    }
    
    let html = `
      <div style="margin-bottom:8px;">
        <div style="display:flex;align-items:flex-start;">
          <div style="width:40px;font-size:24px;font-weight:900;text-align:left;">${item.quantity}x</div>
          <div style="flex:1;padding-left:8px;">
            <div style="font-weight:800;font-size:18px;margin-bottom:4px;">
              ${isUpdated ? `<span style="margin-right:4px;">[R${item.roundNumber || 1}]</span>` : ""}
              ${isDeal ? dealName : item.itemName}
              ${!isDeal && item.variantName && item.variantName !== "Deal" ? `<span style="font-weight:normal;font-size:14px;"> (${item.variantName})</span>` : ""}
            </div>
    `;
    
    if (dealSelections && dealSelections.length > 0) {
      html += `<div style="font-size:14px;color:#333;margin-bottom:4px;">`;
      dealSelections.forEach((sel: any) => {
        html += `<div style="font-weight:600;font-style:italic;">• ${sel.name}</div>`;
      });
      html += `</div>`;
    }
    
    if (!isDeal && addOns.length > 0) {
      html += `<div style="font-size:14px;color:#333;margin-bottom:4px;font-weight:600;font-style:italic;">+ ${addOns.join(", ")}</div>`;
    }
    
    if (item.specialInstructions) {
      item.specialInstructions.split(" • ").forEach((inst: string) => {
        html += `<div style="font-size:14px;font-weight:900;margin-top:2px;text-transform:uppercase;font-style:italic;">*** ${inst}</div>`;
      });
    }
    
    html += `
          </div>
        </div>
        <div style="border-bottom:1px solid #000;margin-top:4px;"></div>
      </div>
    `;
    return html;
  }).join("");

  const orderTypeTitle = (order.orderType || "").replace(/_/g, " ").toUpperCase();
  const dateStr = order.createdAt ? format(new Date(order.createdAt), "MM/dd/yyyy hh:mm a") : "N/A";
  const customerLine = `<div style="display:flex;"><span style="width:85px;">Customer</span><span style="text-transform:capitalize;font-weight:bold;">: ${order.customerName || "Walk-in"}</span></div>`;
  const tableLine = isDineIn ? `<div style="display:flex;"><span style="width:85px;">Table No.</span><span style="font-weight:bold;">: ${order.tableNumber || "N/A"} ${order.tableZone ? `(${order.tableZone.toUpperCase()})` : ""}</span></div>` : "";

  const totalQty = (order.items || []).reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);

  const html = `<!DOCTYPE html><html><head><title>KOT ${order.id}</title><style>@page{margin:0;size:80mm 297mm} *{box-sizing:border-box;margin:0;padding:0}</style></head><body style="margin:0;padding:0;">
    <div style="width:80mm;margin:0;padding:8px;color:#000;background-color:#fff;font-family:'Courier New',Courier,monospace;font-size:14px;line-height:1.2;">
      <div style="text-align:center;font-weight:900;font-size:24px;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">KOT</div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:4px;font-size:13px;">
        <div style="display:flex;flex-direction:column;">
          <span style="font-weight:bold;font-size:16px;">#${order.id?.toUpperCase()}</span>
        </div>
        <span>${dateStr}</span>
      </div>
      <div style="border-bottom:1px solid #000;margin-bottom:6px;"></div>
      <div style="text-align:center;font-size:20px;font-weight:900;margin-bottom:8px;text-transform:uppercase;">${orderTypeTitle} ${isUpdated ? "(Recall)" : ""}</div>
      <div style="font-size:13px;margin-bottom:8px;line-height:1.5;">
        ${customerLine}
        ${tableLine}
      </div>
      
      ${order.deliveryNotes ? `
        <div style="font-size: 18px; font-weight: 900; margin-bottom: 8px; text-transform: uppercase;">
          ${order.deliveryNotes}
        </div>
      ` : ""}

      <div style="display:flex;justify-content:space-between;background-color:#ddd;color:#000;padding:6px 4px;font-size:14px;font-weight:bold;margin-bottom:6px;-webkit-print-color-adjust:exact;border-top:1px solid #000;border-bottom:1px solid #000;">
        <div style="width:40px;text-align:left;">Qty</div>
        <div style="flex:1;padding-left:8px;">Product</div>
      </div>
      <div style="margin:5px 0;">${itemsHtml}</div>
      <div style="display:flex;justify-content:flex-end;align-items:center;font-size:14px;margin-bottom:8px;padding-right:4px;">
        <span style="font-weight:bold;margin-right:8px;">Total Items :</span>
        <span style="font-weight:bold;width:40px;text-align:center;">${totalQty}</span>
      </div>
      <div style="border-bottom:1px solid #000;margin-top:8px;"></div>
    </div>
  </body></html>`;

  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  document.body.appendChild(iframe);
  iframe.contentWindow?.document.write(html);
  iframe.contentWindow?.document.close();
  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 500);
  }, 250);
}
