"use client";

import { forwardRef } from "react";
import { format } from "date-fns";

export interface KotPrintData {
  orderId: string;
  customerName: string;
  orderType: string;
  tableNumber?: string | null;
  items: {
    itemName: string;
    variantName?: string | null;
    quantity: number;
    specialInstructions?: string | null;
    selectedAddOns?: any;
  }[];
  createdAt?: string | Date | null;
}

export const KotPrinter = forwardRef<HTMLDivElement, { data: KotPrintData }>(({ data }, ref) => {
  return (
    <div 
      ref={ref} 
      className="hidden print:block print:w-[80mm] print:m-0 print:p-0 print:text-black print:bg-white font-mono text-sm leading-tight"
    >
      <div className="text-center pb-2 border-b-2 border-black border-dashed mb-2">
        <h1 className="font-bold text-xl uppercase tracking-widest">KOT</h1>
        <p className="text-xs">Classy Crave</p>
        <p className="text-xs font-bold mt-1">Order #{data.orderId.slice(-4)}</p>
      </div>

      <div className="mb-2 pb-2 border-b border-black border-dashed">
        <p><strong>Type:</strong> <span className="uppercase">{data.orderType}</span></p>
        {data.tableNumber && <p><strong>Table:</strong> {data.tableNumber}</p>}
        {data.orderType === "delivery" && <p><strong>Customer:</strong> {data.customerName}</p>}
        <p><strong>Time:</strong> {data.createdAt ? format(new Date(data.createdAt), "HH:mm:ss") : format(new Date(), "HH:mm:ss")}</p>
      </div>

      <table className="w-full text-left mb-2 border-collapse">
        <thead>
          <tr className="border-b border-black border-dashed">
            <th className="py-1 w-2/3">Item</th>
            <th className="py-1 w-1/3 text-right">Qty</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, i) => (
            <tr key={i} className="border-b border-black border-dotted last:border-none">
              <td className="py-1 align-top">
                <div className="font-bold">{item.itemName}</div>
                {item.variantName && <div className="text-xs pl-2">- {item.variantName}</div>}
                
                {/* Render Addons if any */}
                {item.selectedAddOns && Array.isArray(item.selectedAddOns) && item.selectedAddOns.map((addon: any, idx: number) => (
                  <div key={idx} className="text-xs pl-2 text-gray-700 italic">
                    + {addon.name}
                  </div>
                ))}

                {item.specialInstructions && (
                  <div className="text-xs pl-2 mt-0.5 font-bold uppercase italic border border-black p-0.5 w-fit">
                    ** {item.specialInstructions}
                  </div>
                )}
              </td>
              <td className="py-1 align-top text-right font-bold text-lg">
                x{item.quantity}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-center pt-2 border-t-2 border-black border-dashed mt-4 text-xs font-bold">
        --- END OF TICKET ---
      </div>
    </div>
  );
});

KotPrinter.displayName = "KotPrinter";
