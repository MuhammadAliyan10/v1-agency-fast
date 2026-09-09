"use client";

import { forwardRef } from "react";
import { format } from "date-fns";

export interface KotPrintData {
  orderId: string;
  customerName: string;
  orderType: string;
  tableNumber?: string | null;
  tableZone?: string | null;
  isUpdated?: boolean;
  items: {
    itemName: string;
    variantName?: string | null;
    quantity: number;
    specialInstructions?: string | null;
    selectedAddOns?: any;
    roundNumber?: number | null;
  }[];
  createdAt?: string | Date | null;
}

export const KotPrinter = forwardRef<HTMLDivElement, { data: KotPrintData }>(({ data }, ref) => {
  const totalItems = data.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div 
      ref={ref} 
      className="hidden print:block print:w-[80mm] print:m-0 print:p-2 print:text-black print:bg-white font-sans text-sm leading-tight"
    >
      <div className="text-center font-extrabold text-2xl uppercase tracking-widest mb-4">
        KOT
      </div>

      <div className="flex justify-between items-end mb-1 text-[13px]">
        <div className="flex flex-col">
          <span className="font-bold text-[16px]">{`#${data.orderId.toUpperCase()}`}</span>
        </div>
        <span>{data.createdAt ? format(new Date(data.createdAt), "MM/dd/yyyy hh:mm a") : format(new Date(), "MM/dd/yyyy hh:mm a")}</span>
      </div>

      <div className="border-b border-black mb-1.5"></div>

      <div className="text-[13px] mb-1.5 leading-relaxed">
        <div className="flex">
          <span className="w-[85px]">Type</span>
          <span className="font-bold flex items-center gap-1">
            : {data.orderType.replace("_", " ").toUpperCase()}
            {data.isUpdated && <span className="font-bold">(Recall)</span>}
          </span>
        </div>
        <div className="flex">
          <span className="w-[85px]">Customer</span>
          <span className="capitalize">: {data.customerName || "Walk-in"}</span>
        </div>
        {(data.orderType === "dine_in" || data.orderType === "dine-in") && (
          <div className="flex">
            <span className="w-[85px]">Table No.</span>
            <span>: {data.tableNumber || "N/A"} {data.tableZone ? `(${data.tableZone.toUpperCase()})` : ""}</span>
          </div>
        )}
      </div>

      <div className="border-b border-black mb-1"></div>

      <table className="w-full text-left text-[13px] border-collapse">
        <thead>
          <tr>
            <th className="py-1 font-bold w-12 text-center">Sl.No</th>
            <th className="py-1 font-bold text-left pl-2">Item Name</th>
            <th className="py-1 font-bold text-center w-12">Qty.</th>
          </tr>
        </thead>
      </table>

      <div className="border-b border-black mb-1"></div>

      <table className="w-full text-left text-[13px] border-collapse mb-1">
        <tbody>
          {data.items.map((item, i) => (
            <tr key={i} className="align-top">
              <td className="py-1 w-12 text-center">{i + 1}</td>
              <td className="py-1 text-left pl-2">
                <div>
                  {data.isUpdated && <span className="font-bold mr-1">[R{item.roundNumber || 1}]</span>}
                  {item.itemName}
                </div>
                {item.variantName && <div>- {item.variantName}</div>}
                
                {/* Render Addons if any */}
                {item.selectedAddOns && Array.isArray(item.selectedAddOns) && item.selectedAddOns.map((addon: any, idx: number) => (
                  <div key={idx} className="text-[11px] text-gray-700 italic">
                    + {addon.name}
                  </div>
                ))}

                {item.specialInstructions && (
                  <div className="text-[11px] mt-0.5 font-bold uppercase italic">
                    ** {item.specialInstructions}
                  </div>
                )}
              </td>
              <td className="py-1 text-center w-12">{item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-b border-black mb-1.5"></div>

      <div className="flex justify-end items-center text-[14px] mb-2 pr-1">
        <span className="font-bold mr-2">Total Items :</span>
        <span className="font-bold w-10 text-center">{totalItems}</span>
      </div>

      <div className="border-b border-black border-dashed mt-2 border-t-0"></div>
    </div>
  );
});

KotPrinter.displayName = "KotPrinter";

