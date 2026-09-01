// components/features/admin/finance/printable-ledger.tsx
import { format } from "date-fns";
import type { DailyRevenue, FinancialStats } from "@/server/actions/finance";

interface PrintableLedgerProps {
  dailyRevenue: DailyRevenue[];
  stats: FinancialStats;
  from?: string;
  to?: string;
}

export function PrintableLedger({ dailyRevenue, stats, from, to }: PrintableLedgerProps) {
  const periodLabel = from && to
    ? `${format(new Date(from), "MMM d, yyyy")} — ${format(new Date(to), "MMM d, yyyy")}`
    : "Current Month";

  const grandTotal = dailyRevenue.reduce((s, r) => s + r.revenue, 0);
  const grandDiscounts = dailyRevenue.reduce((s, r) => s + r.discounts, 0);

  return (
    <div className="hidden print:block font-sans text-black">
      {/* Business Header */}
      <div className="border-b-2 border-black pb-4 mb-6">
        <h1 className="text-2xl font-black tracking-tight">Financial Report</h1>
        <p className="text-sm font-semibold mt-0.5">Period: {periodLabel}</p>
        <p className="text-xs text-gray-500 mt-0.5">Generated: {format(new Date(), "MMM d, yyyy 'at' h:mm a")}</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Gross Sales",       value: `Rs. ${stats.grossSales.toLocaleString()}` },
          { label: "Total Discounts",   value: `Rs. ${stats.totalDiscounts.toLocaleString()}` },
          { label: "Net Revenue",       value: `Rs. ${stats.netRevenue.toLocaleString()}` },
          { label: "Total Orders",      value: stats.totalOrders.toString() },
          { label: "Avg Order Value",   value: `Rs. ${stats.avgOrderValue.toLocaleString()}` },
          { label: "Delivery Fees",     value: `Rs. ${stats.totalDeliveryFees.toLocaleString()}` },
          { label: "Unpaid Outstanding",value: `Rs. ${stats.unpaidAmount.toLocaleString()}` },
          { label: "Paid Amount",       value: `Rs. ${stats.paidAmount.toLocaleString()}` },
        ].map(item => (
          <div key={item.label} className="border border-gray-300 p-3">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">{item.label}</p>
            <p className="text-base font-black mt-0.5">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Daily Breakdown Table */}
      <h2 className="text-base font-black mb-3 border-b border-gray-300 pb-2">Daily Breakdown</h2>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-3 py-2 text-left font-bold text-xs uppercase">Date</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-bold text-xs uppercase">Orders</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-bold text-xs uppercase">Gross Revenue</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-bold text-xs uppercase">Discounts</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-bold text-xs uppercase">Net Revenue</th>
          </tr>
        </thead>
        <tbody>
          {dailyRevenue.map((row, idx) => {
            const net = row.revenue - row.discounts;
            return (
              <tr key={row.date} className={idx % 2 === 0 ? "" : "bg-gray-50"}>
                <td className="border border-gray-300 px-3 py-1.5 font-mono text-xs">
                  {format(new Date(row.date), "EEE, MMM d yyyy")}
                </td>
                <td className="border border-gray-300 px-3 py-1.5 text-right font-medium">{row.orders}</td>
                <td className="border border-gray-300 px-3 py-1.5 text-right font-medium">
                  Rs. {row.revenue.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-1.5 text-right text-red-700">
                  {row.discounts > 0 ? `- Rs. ${row.discounts.toLocaleString()}` : "—"}
                </td>
                <td className="border border-gray-300 px-3 py-1.5 text-right font-bold">
                  Rs. {net.toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-gray-200 font-black">
            <td className="border border-gray-300 px-3 py-2 font-black uppercase text-xs">TOTAL</td>
            <td className="border border-gray-300 px-3 py-2 text-right">
              {dailyRevenue.reduce((s, r) => s + r.orders, 0)}
            </td>
            <td className="border border-gray-300 px-3 py-2 text-right">
              Rs. {grandTotal.toLocaleString()}
            </td>
            <td className="border border-gray-300 px-3 py-2 text-right text-red-700">
              - Rs. {grandDiscounts.toLocaleString()}
            </td>
            <td className="border border-gray-300 px-3 py-2 text-right">
              Rs. {(grandTotal - grandDiscounts).toLocaleString()}
            </td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-8 pt-4 border-t border-gray-300 flex justify-between text-xs text-gray-500">
        <span>This report is system-generated and confidential.</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  );
}
