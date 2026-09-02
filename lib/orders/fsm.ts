import { OrderStatus } from "@/server/actions/live-orders";

// Define allowed transitions for each state
const transitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ["approved", "preparing", "cancelled", "rejected"],
  approved: ["preparing", "cancelled", "rejected"],
  preparing: ["ready_for_pickup", "out_for_delivery", "cancelled"], // Some places might dispatch directly
  ready_for_pickup: ["out_for_delivery", "delivered", "cancelled"],
  delayed: ["preparing", "ready_for_pickup", "cancelled"],
  out_for_delivery: ["delivered"],
  delivered: [],
  rejected: [],
  cancelled: [],
};

export function canTransition(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
  if (currentStatus === newStatus) return true; // No-op is valid
  const allowed = transitions[currentStatus];
  return allowed ? allowed.includes(newStatus) : false;
}
