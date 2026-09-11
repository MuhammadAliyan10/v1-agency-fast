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
    const addOns = Array.isArray(item.selectedAddOns)
      ? (item.selectedAddOns as { name: string }[]).map(a => a.name).join(", ")
      : "";
    const isDeal = item.itemName.includes("[DEAL]");
    const dealSelections = isDeal && item.dealSelections ? item.dealSelections : null;
    const hasNote = item.specialInstructions &&
      !(item.specialInstructions.startsWith("[DEAL:") && item.specialInstructions.endsWith("]"));
    
    const dealSelectionsHtml = dealSelections && dealSelections.length > 0
      ? dealSelections.map((sel: any) => `<div class="addon">• ${sel.name}</div>`).join("")
      : "";
    
    return `
      <div style="margin-bottom:5px">
        <div class="row">
          <div class="qty">${item.quantity}x</div>
          <div class="iname">
            ${item.itemName.replace(/^\[DEAL\]\s*/, "")}
            ${item.variantName && item.variantName !== "Combo Deal" ? `<span style="font-weight:normal;font-size:11px"> (${item.variantName})</span>` : ""}
          </div>
          <div class="iprice">Rs.${item.subtotal?.toLocaleString()}</div>
        </div>
        ${dealSelectionsHtml || addOns ? `<div>${dealSelectionsHtml}${addOns ? `<div class="addon">+ ${addOns}</div>` : ""}</div>` : ""}
        ${hasNote ? `<div class="inote">*** ${item.specialInstructions}</div>` : ""}
      </div>`;
  }).join("");

  const isPaid = order.paymentStatus === "paid";
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const html = `<!DOCTYPE html><html><head><title>Slip ${order.id}</title><style>
    @page{margin:0;size:80mm 297mm}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Courier New',monospace;font-size:11px;width:80mm;padding:3mm 4mm;color:#000;background:#fff}
    .center{text-align:center}.bold{font-weight:700}.xl{font-size:22px}.xxl{font-size:28px}.sm{font-size:9px}
    .dash{border-bottom:1px dashed #000;margin:4px 0}
    .row{display:flex;justify-content:space-between;align-items:flex-start;margin:3px 0}
    .qty{width:22px;font-weight:700;font-size:16px}.iname{flex:1;padding-right:6px;font-weight:700;font-size:13px}
    .iprice{font-weight:700;font-size:13px;text-align:right;min-width:50px}
    .inote{font-size:10px;margin-left:22px;font-weight:700}.addon{font-size:9px;margin-left:22px;color:#333}
    .total-row{display:flex;justify-content:space-between;padding:3px 0}.grand{font-size:20px;font-weight:700}
    .due-box{border:2px solid #000;padding:4px 8px;margin:6px 0;text-align:center}
    .logo{width:52px;height:52px;display:block;margin:0 auto 4px}
    .type-banner{font-size:16px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:4px 0}
    .hall-tag{font-size:10px;font-weight:700;border:1px solid #000;display:inline-block;padding:1px 4px;margin-top:2px}
    .order-num{font-size:20px;font-weight:700}.recall{font-size:14px;font-weight:700}
    .delivery-detail{font-size:13px;font-weight:700;margin:2px 0}
    .delivery-detail-sm{font-size:11px;margin:2px 0}
  </style></head><body>
    <div style="text-align:center;margin-bottom:4px">
      <img src="${origin}/Logo.png" class="logo" alt="Logo" />
      <div class="bold xl center" style="letter-spacing:1px">CLASSY CRAVE</div>
      <div class="sm center" style="letter-spacing:3px;margin-bottom:6px">SOPHISTICATION IN EVERY BITE</div>
      <div class="dash"></div>
      <div class="type-banner center">${order.orderType?.replace(/_/g, " ") || ""}</div>
      ${isDineIn ? `
        <div style="margin-top:4px">
          <div class="xxl bold center">${order.tableNumber || "N/A"}</div>
          ${order.tableHallType === "family" ? '<div class="hall-tag center">FAMILY HALL</div>' : ""}
        </div>` : ""}
      <div style="margin-top:6px">
        <span class="order-num bold">#${order.id}</span>
        ${isUpdated ? '<span class="recall bold" style="margin-left:8px">(RECALL)</span>' : ""}
      </div>
    </div>
    <div class="dash" style="margin:6px 0"></div>
    ${order.orderType === "delivery" ? `
      <div style="margin-bottom:6px">
        ${order.customerName ? `<div class="delivery-detail bold">${order.customerName}</div>` : ""}
        ${order.customerPhone ? `<div class="delivery-detail bold">${formatPhone(order.customerPhone)}</div>` : ""}
        ${order.deliveryAddress ? `<div class="delivery-detail bold" style="font-size:14px">${order.deliveryAddress}</div>` : ""}
        ${order.rider?.name ? `<div class="delivery-detail-sm bold" style="margin-top:4px">Rider: ${order.rider.name}</div>` : ""}
      </div>` : `
      <div style="margin-bottom:4px;font-size:11px">
        ${isDineIn
          ? `<div>Waiter: ${order.waiter?.name || order.waiterName || "—"}</div>`
          : `${order.customerName ? `<div class="bold">${order.customerName}</div>` : ""}${order.customerPhone ? `<div>${formatPhone(order.customerPhone)}</div>` : ""}`}
      </div>`}
    <div style="font-size:9px;margin-bottom:4px">${order.createdAt ? format(new Date(order.createdAt), "dd MMM yyyy  h:mm a") : ""}</div>
    <div class="dash"></div>
    <div style="margin:5px 0">${itemsHtml}</div>
    <div class="dash"></div>
    <div style="margin:5px 0">
      ${(order.deliveryFee ?? 0) > 0 ? `<div class="total-row" style="font-size:11px"><span>Delivery Fee</span><span>Rs.${order.deliveryFee}</span></div>` : ""}
      ${(order.discountAmount ?? 0) > 0 ? `<div class="total-row" style="font-size:11px"><span>Discount</span><span>- Rs.${order.discountAmount}</span></div>` : ""}
      <div class="total-row" style="margin-top:4px;border-top:1px dashed #000;padding-top:4px">
        <span class="grand bold">TOTAL</span>
        <span class="grand bold">Rs.${order.totalAmount?.toLocaleString()}</span>
      </div>
    </div>
    ${!isPaid
      ? `<div class="due-box bold" style="font-size:16px">AMOUNT DUE: Rs.${order.totalAmount?.toLocaleString()}</div>`
      : `<div style="text-align:center;font-size:13px;font-weight:700;margin:6px 0">✓ PAID — ${order.paymentMethod}</div>`}
    ${isPaid ? `<div style="text-align:center;font-size:10px;margin-bottom:4px">Payment: ${order.paymentMethod}</div>` : ""}
    <div class="dash" style="margin:6px 0"></div>
    <div style="text-align:center;font-size:11px;font-weight:700">Thank you for dining with us!</div>
    <div style="text-align:center;font-size:9px;margin-top:3px">Classy Crave</div>
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

  const html = `<!DOCTYPE html><html><head><title>KOT ${order.id}</title></head><body style="margin:0;padding:0;">
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
