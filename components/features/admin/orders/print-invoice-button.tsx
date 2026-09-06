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
function buildAndPrintFromData(order: any) {
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
    const hasNote = item.specialInstructions &&
      !(item.specialInstructions.startsWith("[DEAL:") && item.specialInstructions.endsWith("]"));
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
        ${addOns ? `<div class="addon">+ ${addOns}</div>` : ""}
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
