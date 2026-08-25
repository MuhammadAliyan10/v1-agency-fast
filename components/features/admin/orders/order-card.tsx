"use client";

import { formatDistanceToNow } from "date-fns";
import { Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OrderStatus } from "@/server/actions/live-orders";

interface OrderCardProps {
  order: any;
  onUpdateStatus: (orderId: string, newStatus: OrderStatus) => void;
  onClick: () => void;
  isUpdating: boolean;
  innerRef?: React.Ref<HTMLDivElement>;
  draggableProps?: any;
  dragHandleProps?: any;
}

export function OrderCard({ order, onUpdateStatus, onClick, isUpdating, innerRef, draggableProps, dragHandleProps }: OrderCardProps) {
  const timeAgo = order.createdAt ? formatDistanceToNow(new Date(order.createdAt), { addSuffix: true }) : "N/A";
  
  // Highlighting logic based on status and time
  let borderColor = "border-border";
  let statusBadgeColor = "bg-secondary text-secondary-foreground";
  
  if (order.status === "pending") {
    borderColor = "border-orange-500 shadow-sm shadow-orange-500/20";
    statusBadgeColor = "bg-orange-500/20 text-orange-600 dark:text-orange-400 hover:bg-orange-500/30";
  } else if (order.status === "preparing") {
    borderColor = "border-yellow-500 shadow-sm shadow-yellow-500/20";
    statusBadgeColor = "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/30";
  } else if (order.status === "approved") {
    borderColor = "border-blue-500";
    statusBadgeColor = "bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/30";
  }

  const renderActionButtons = () => {
    switch (order.status) {
      case "pending":
        return (
          <div className="flex w-full gap-2 mt-2">
            <Button 
              size="sm" 
              className="w-full bg-orange-500 hover:bg-orange-600 text-white" 
              disabled={isUpdating}
              onClick={(e) => { e.stopPropagation(); onUpdateStatus(order.id, "preparing"); }}
            >
              Start Preparing
            </Button>
          </div>
        );
      case "preparing":
        return (
          <div className="flex w-full gap-2 mt-2">
            <Button 
              size="sm" 
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white" 
              disabled={isUpdating}
              onClick={(e) => { e.stopPropagation(); onUpdateStatus(order.id, "out_for_delivery"); }}
            >
              Mark Ready / Out
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card 
      className={`cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md ${borderColor}`}
      onClick={onClick}
      ref={innerRef}
      {...draggableProps}
      {...dragHandleProps}
    >
      <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
        <div>
          <h4 className="font-bold text-base">#{order.id}</h4>
          <p className="text-xs text-muted-foreground flex items-center mt-1">
            <Clock className="w-3 h-3 mr-1" />
            {timeAgo}
          </p>
        </div>
        <Badge variant="outline" className={statusBadgeColor}>
          {order.status.toUpperCase()}
        </Badge>
      </CardHeader>
      
      <CardContent className="p-4 pt-2">
        <div className="text-sm space-y-1">
          <p className="font-medium truncate">{order.customerName}</p>
          <p className="text-muted-foreground text-xs truncate" title={order.deliveryAddress}>
            {order.deliveryAddress}
          </p>
        </div>
        
        <div className="flex items-center justify-between mt-3 pt-3 border-t text-sm">
          <span className="text-muted-foreground">{order.items.length} Items</span>
          <span className="font-bold">Rs. {order.totalAmount}</span>
        </div>
        
        {order.items.some((i: any) => i.specialInstructions) && (
          <div className="flex items-center gap-1 mt-2 text-xs font-medium text-red-500 bg-red-500/10 px-2 py-1 rounded">
            <AlertCircle className="w-3 h-3" />
            Special Instructions
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0">
        {renderActionButtons()}
      </CardFooter>
    </Card>
  );
}
