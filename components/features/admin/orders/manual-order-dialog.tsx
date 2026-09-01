"use client";

import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, Minus, X, Check, ShoppingBag, Loader2, Printer } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPOSMenuData } from "@/server/actions/menu";
import { createManualOrder, getStaffWaiters, addItemsToExistingOrder, LiveOrder } from "@/server/actions/live-orders";
import { getTablesWithStatus } from "@/server/actions/tables";
import { z } from "zod";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const manualOrderSchema = z.object({
  orderType: z.enum(["delivery", "pickup", "dine_in"]),
  customerPhone: z.string().optional(),
  customerName: z.string().optional(),
  deliveryAddress: z.string().optional(),
  deliveryNotes: z.string().optional(),
  tableNumber: z.string().optional(),
  tableId: z.string().optional(),
  waiterId: z.string().optional().nullable(),
  deliveryFee: z.number().default(0),
  discountAmount: z.number().default(0),
  paymentMethod: z.enum(["COD", "Cash", "Card", "JazzCash", "EasyPaisa"]).default("Cash"),
  paymentStatus: z.enum(["paid", "unpaid"]).default("unpaid"),
  items: z.array(z.object({
    menuItemId: z.string(),
    variantId: z.string().optional().nullable(),
    quantity: z.number().min(1),
    selectedAddOns: z.array(z.string()).optional(),
    specialInstructions: z.string().optional(),
  })).min(1),
}).superRefine((data, ctx) => {
  if (data.orderType === "dine_in") {
    if (!data.waiterId || data.waiterId.trim() === "") {
      ctx.addIssue({ path: ["waiterId"], message: "Waiter is required for Dine-In orders", code: z.ZodIssueCode.custom });
    }
    if (!data.tableId || data.tableId.trim() === "") {
      ctx.addIssue({ path: ["tableId"], message: "Table is required for Dine-In orders", code: z.ZodIssueCode.custom });
    }
    if (!data.customerName || data.customerName.trim() === "") {
      ctx.addIssue({ path: ["customerName"], message: "Customer Name is required for Dine-In orders", code: z.ZodIssueCode.custom });
    }
  }
  if (data.orderType === "delivery") {
    if (!data.customerName || data.customerName.trim() === "") {
      ctx.addIssue({ path: ["customerName"], message: "Customer Name is required for Delivery", code: z.ZodIssueCode.custom });
    }
    if (!data.customerPhone || data.customerPhone.trim() === "") {
      ctx.addIssue({ path: ["customerPhone"], message: "Customer Phone is required for Delivery", code: z.ZodIssueCode.custom });
    }
    if (!data.deliveryAddress || data.deliveryAddress.trim() === "") {
      ctx.addIssue({ path: ["deliveryAddress"], message: "Delivery Address is required for Delivery", code: z.ZodIssueCode.custom });
    }
  }
  if (data.orderType === "pickup") {
    if (!data.customerName || data.customerName.trim() === "") {
      ctx.addIssue({ path: ["customerName"], message: "Customer Name is required for Pickup", code: z.ZodIssueCode.custom });
    }
    if (!data.customerPhone || data.customerPhone.trim() === "") {
      ctx.addIssue({ path: ["customerPhone"], message: "Customer Phone is required for Pickup", code: z.ZodIssueCode.custom });
    }
  }
});

// Hashing function for cart items
const generateItemHash = (menuItemId: string, variantId?: string | null, addOns: string[] = []) => {
  const addOnsStr = [...addOns].sort().join(",");
  return `${menuItemId}_${variantId || "none"}_${addOnsStr}`;
};

interface CartItem {
  hash: string;
  menuItemId: string;
  name: string;
  variantId?: string | null;
  variantName?: string;
  quantity: number;
  selectedAddOns: { id: string; name: string; price: number }[];
  specialInstructions?: string;
  unitPrice: number;
  totalPrice: number;
}

export function ManualOrderDialog({ children, existingOrder, defaultTableId, defaultTableNumber }: { children: React.ReactNode; existingOrder?: LiveOrder; defaultTableId?: string; defaultTableNumber?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  // POS State
  const [orderType, setOrderType] = useState<"delivery" | "pickup" | "dine_in">("dine_in");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [tableId, setTableId] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [waiterId, setWaiterId] = useState("");
  const [pendingTableId, setPendingTableId] = useState<string | null>(null);
  const [splitCheckModalOpen, setSplitCheckModalOpen] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(50);
  const [discountType, setDiscountType] = useState<"flat" | "percent">("flat");
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Card" | "JazzCash" | "EasyPaisa" | "COD">("Cash");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "unpaid">("paid");
  
  // Item Config Modal State
  const [configItem, setConfigItem] = useState<any | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<Set<string>>(new Set());

  // Initialize from existingOrder if provided
  useEffect(() => {
    if (isOpen && existingOrder) {
      setOrderType("dine_in");
      setCustomerName(existingOrder.customerName || "");
      setCustomerPhone(existingOrder.customerPhone || "");
      setTableId(existingOrder.tableId || "");
      setTableNumber(existingOrder.tableNumber || "");
      setWaiterId(existingOrder.waiterId || "");
      setCart([]);
    } else if (isOpen && !existingOrder) {
      if (defaultTableId) setTableId(defaultTableId);
      if (defaultTableNumber) setTableNumber(defaultTableNumber);
      setCart([]);
    }
  }, [isOpen, existingOrder, defaultTableId, defaultTableNumber]);

  // Data Fetching
  const { data: menuData, isLoading: isMenuLoading } = useQuery({
    queryKey: ["pos-menu"],
    queryFn: async () => {
      const res = await getPOSMenuData();
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    enabled: isOpen
  });

  const { data: staffWaiters, isLoading: isStaffLoading } = useQuery({
    queryKey: ["pos-staff"],
    queryFn: async () => {
      const res = await getStaffWaiters();
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    enabled: isOpen
  });

  const { data: tablesData, isLoading: isTablesLoading } = useQuery({
    queryKey: ["pos-tables"],
    queryFn: async () => {
      const res = await getTablesWithStatus();
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    enabled: isOpen
  });

  // Derived Values
  const filteredItems = useMemo(() => {
    if (!menuData) return [];
    let items = menuData.items;
    
    if (selectedCategory !== "all") {
      items = items.filter(i => i.categoryId === selectedCategory);
    }
    
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(lower));
    }
    
    return items;
  }, [menuData, selectedCategory, searchQuery]);

  const subtotal = cart.reduce((acc, item) => acc + item.totalPrice, 0);
  const calculatedDiscount = discountType === "percent" ? (subtotal * Math.min(discountValue, 100)) / 100 : discountValue;
  const appliedDeliveryFee = orderType === "delivery" ? deliveryFee : 0;
  const grandTotal = Math.max(0, subtotal + appliedDeliveryFee - calculatedDiscount);

  // Computed valid state
  const isFormValid = useMemo(() => {
    if (orderType === "dine_in") {
      return (tableId?.trim() || "") !== "" && (waiterId?.trim() || "") !== "" && (customerName?.trim() || "") !== "";
    }
    if (orderType === "delivery") {
      return (customerName?.trim() || "") !== "" && (customerPhone?.trim() || "") !== "" && (deliveryAddress?.trim() || "") !== "";
    }
    if (orderType === "pickup") {
      return (customerName?.trim() || "") !== "" && (customerPhone?.trim() || "") !== "";
    }
    return false;
  }, [orderType, tableId, waiterId, customerName, customerPhone, deliveryAddress]);

  const handleTableChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (!selectedId) {
      setTableId("");
      setTableNumber("");
      return;
    }
    const table = tablesData?.find(t => t.id === selectedId);
    if (table?.isOccupied && !existingOrder) {
      setPendingTableId(selectedId);
      setSplitCheckModalOpen(true);
    } else {
      setTableId(selectedId);
      setTableNumber(table?.name || "");
    }
  };

  // Handlers
  const openItemConfig = (item: any) => {
    const itemVariants = menuData?.variants.filter(v => v.menuItemId === item.id) || [];
    const itemAddOns = menuData?.addOns.filter(a => a.menuItemId === item.id) || [];
    
    if (itemVariants.length === 0 && itemAddOns.length === 0) {
      // Direct add to cart
      addToCart(item.id, item.name, item.basePrice);
      return;
    }
    
    setConfigItem(item);
    setSelectedVariant(itemVariants.length > 0 ? itemVariants[0].id : null);
    setSelectedAddOns(new Set());
  };

  const addToCart = (menuItemId: string, name: string, basePrice: number, variantId?: string | null, addOnIds: string[] = []) => {
    const hash = generateItemHash(menuItemId, variantId, addOnIds);
    
    setCart(prev => {
      const existing = prev.find(p => p.hash === hash);
      if (existing) {
        return prev.map(p => p.hash === hash ? { 
          ...p, 
          quantity: p.quantity + 1,
          totalPrice: (p.quantity + 1) * p.unitPrice
        } : p);
      }
      
      let unitPrice = basePrice;
      let variantName;
      if (variantId) {
        const v = menuData?.variants.find(v => v.id === variantId);
        if (v) {
          unitPrice = v.price;
          variantName = v.name;
        }
      }
      
      const addOnObjects = [];
      for (const aid of addOnIds) {
        const a = menuData?.addOns.find(a => a.id === aid);
        if (a) {
          unitPrice += a.price;
          addOnObjects.push({ id: a.id, name: a.name, price: a.price });
        }
      }
      
      return [...prev, {
        hash,
        menuItemId,
        name,
        variantId,
        variantName,
        quantity: 1,
        selectedAddOns: addOnObjects,
        unitPrice,
        totalPrice: unitPrice
      }];
    });
    
    setConfigItem(null);
  };

  const updateQuantity = (hash: string, delta: number) => {
    setCart(prev => prev.map(p => {
      if (p.hash === hash) {
        const newQ = Math.max(0, p.quantity + delta);
        return { ...p, quantity: newQ, totalPrice: newQ * p.unitPrice };
      }
      return p;
    }).filter(p => p.quantity > 0));
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (cart.length === 0) throw new Error("Cart is empty");
      if (orderType === "delivery" && (!deliveryAddress || !customerPhone)) {
        throw new Error("Delivery orders require an address and phone number.");
      }
      
      if (existingOrder) {
        const payload = {
          orderId: existingOrder.id,
          items: cart.map(c => ({
            menuItemId: c.menuItemId,
            variantId: c.variantId,
            quantity: c.quantity,
            selectedAddOns: c.selectedAddOns.map(a => a.id),
          }))
        };
        const res = await addItemsToExistingOrder(payload);
        if (!res.success) throw new Error(res.error);
        return res;
      } else {
        const payload: z.infer<typeof manualOrderSchema> = {
          orderType,
          customerName,
          customerPhone,
          deliveryAddress: orderType === "delivery" ? deliveryAddress : undefined,
          tableId: orderType === "dine_in" ? tableId : undefined,
          tableNumber: orderType === "dine_in" ? tableNumber : undefined,
          waiterId: orderType === "dine_in" ? waiterId : undefined,
          deliveryFee: appliedDeliveryFee,
          discountAmount: calculatedDiscount,
          paymentMethod,
          paymentStatus,
          items: cart.map(c => ({
            menuItemId: c.menuItemId,
            variantId: c.variantId,
            quantity: c.quantity,
            selectedAddOns: c.selectedAddOns.map(a => a.id),
          }))
        };
        
        const res = await createManualOrder(payload);
        if (!res.success) throw new Error(res.error);
        return res;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["live-orders"] });
      setIsOpen(false);
      
      toast.success(existingOrder ? "Items Added to Order" : "Order Placed Successfully", {
        description: `Order ID: ${data.orderId}`,
        duration: 5000,
      });
      
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setDeliveryAddress("");
      setTableId("");
      setTableNumber("");
      setWaiterId("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to place order");
    }
  });

  // Effects for Order Type changes
  useEffect(() => {
    if (orderType === "delivery") {
      setPaymentMethod("COD");
      setPaymentStatus("unpaid");
    } else {
      setPaymentMethod("Cash");
      setPaymentStatus("paid");
    }
  }, [orderType]);

  return (
    <>
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="!max-w-[95vw] w-full h-[95vh] p-0 flex flex-col overflow-hidden bg-background">
        <DialogHeader className="px-6 py-4 border-b shrink-0 flex-row justify-between items-center">
          <div>
            <DialogTitle className="text-2xl font-bold">{existingOrder ? `Append to Order #${existingOrder.id}` : "New POS Order"}</DialogTitle>
            <DialogDescription>{existingOrder ? "Add new rounds/items to this existing order." : "Quickly construct manual orders for walk-ins and direct calls."}</DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* LEFT PANEL: Cart & Form */}
          <div className="w-[40%] xl:w-[35%] flex flex-col bg-background border-r">
            <div className="flex-1 p-5 border-b overflow-y-auto">
              <div className="mb-6 space-y-3">
                <Label className="text-base font-bold">Order Type</Label>
                <Tabs value={orderType} onValueChange={(v) => setOrderType(v as any)}>
                  <TabsList className="w-full justify-start h-auto p-0 bg-transparent rounded-none border-b">
                    {existingOrder ? (
                      <TabsTrigger 
                        value="dine_in" 
                        className="text-sm font-semibold rounded-none bg-transparent border-transparent border-t-0 border-l-0 border-r-0 border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-2 transition-none"
                      >
                        Dine-In (Append)
                      </TabsTrigger>
                    ) : (
                      <>
                        <TabsTrigger 
                          value="dine_in" 
                          className="text-sm font-semibold rounded-none bg-transparent border-transparent border-t-0 border-l-0 border-r-0 border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-2 transition-none"
                        >
                          Dine-In
                        </TabsTrigger>
                        <TabsTrigger 
                          value="pickup" 
                          className="text-sm font-semibold rounded-none bg-transparent border-transparent border-t-0 border-l-0 border-r-0 border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-2 transition-none"
                        >
                          Pickup
                        </TabsTrigger>
                        <TabsTrigger 
                          value="delivery" 
                          className="text-sm font-semibold rounded-none bg-transparent border-transparent border-t-0 border-l-0 border-r-0 border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-2 transition-none"
                        >
                          Delivery
                        </TabsTrigger>
                      </>
                    )}
                  </TabsList>
                </Tabs>
              </div>

              <div className="space-y-4 mb-8 bg-muted/30 p-4 rounded-md border">
                {orderType === "dine_in" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Table No.</Label>
                      <Select 
                        value={tableId} 
                        onValueChange={(val) => handleTableChange({ target: { value: val } } as any)} 
                        disabled={!!existingOrder}
                      >
                        <SelectTrigger className="h-10 w-full bg-background">
                          <SelectValue placeholder="Select Table" />
                        </SelectTrigger>
                        <SelectContent>
                          {tablesData?.map(table => (
                            <SelectItem key={table.id} value={table.id}>
                              {table.name} {table.isOccupied ? "🔴 (Occupied)" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Waiter <span className="text-destructive">*</span></Label>
                      <Select 
                        value={waiterId} 
                        onValueChange={setWaiterId} 
                        disabled={!!existingOrder}
                      >
                        <SelectTrigger className="h-10 w-full bg-background">
                          <SelectValue placeholder="Select Waiter" />
                        </SelectTrigger>
                        <SelectContent>
                          {staffWaiters?.map(staff => (
                            <SelectItem key={staff.id} value={staff.id}>
                              {staff.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Customer Phone {orderType !== "dine_in" && <span className="text-destructive">*</span>}</Label>
                    <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="03XXXXXXXXX" className="h-10 w-full bg-background shadow-none" disabled={!!existingOrder} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Customer Name {orderType !== "dine_in" && <span className="text-destructive">*</span>}</Label>
                    <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Walk-in Guest" className="h-10 w-full bg-background shadow-none" disabled={!!existingOrder} />
                  </div>
                </div>

                {orderType === "delivery" && (
                  <div className="space-y-1.5">
                    <Label>Delivery Address <span className="text-destructive">*</span></Label>
                    <Input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="Full address" className="h-10 w-full bg-background shadow-none" />
                  </div>
                )}
              </div>

              {/* Existing Items History */}
              {existingOrder && existingOrder.items && existingOrder.items.length > 0 && (
                <div className="space-y-3 mb-6">
                  <h3 className="font-bold flex items-center gap-2 border-b pb-2 text-muted-foreground">
                    <ShoppingBag className="h-4 w-4" /> Previously Ordered
                  </h3>
                  <div className="opacity-70 space-y-2 pointer-events-none">
                    {existingOrder.items.map(item => (
                      <div key={item.id} className="flex gap-3 items-start justify-between bg-muted/10 p-2 rounded-lg border border-dashed">
                        <div className="flex-1">
                          <div className="font-bold text-sm">{item.itemName}</div>
                          {item.variantName && <div className="text-xs text-muted-foreground">{item.variantName}</div>}
                          {Array.isArray(item.selectedAddOns) && item.selectedAddOns.map((a: any, i) => (
                            <div key={i} className="text-xs text-muted-foreground">+ {a.name || ""}</div>
                          ))}
                          <div className="text-sm font-semibold mt-1">Rs. {item.unitPrice}</div>
                        </div>
                        <div className="flex items-center justify-center bg-background border rounded-md h-7 px-2">
                          <span className="text-xs font-bold text-center">{item.quantity}x</span>
                        </div>
                        <div className="w-16 text-right font-bold text-sm text-muted-foreground">Rs. {String(item.subtotal)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cart Items */}
              <div className="space-y-3">
                <h3 className="font-bold flex items-center gap-2 border-b pb-2">
                  <ShoppingBag className="h-5 w-5" /> {existingOrder ? "New Items (This Round)" : "Current Order"}
                </h3>
                {cart.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground text-sm">Cart is empty. Select items from the menu.</div>
                ) : (
                  cart.map(item => (
                    <div key={item.hash} className="flex gap-3 items-start justify-between bg-muted/10 p-2 rounded-lg border">
                      <div className="flex-1">
                        <div className="font-bold text-sm">{item.name}</div>
                        {item.variantName && <div className="text-xs text-muted-foreground">{item.variantName}</div>}
                        {item.selectedAddOns.map(a => (
                          <div key={a.id} className="text-xs text-muted-foreground">+ {a.name}</div>
                        ))}
                        <div className="text-sm font-semibold mt-1">Rs. {item.unitPrice}</div>
                      </div>
                      <div className="flex items-center gap-2 bg-background border rounded-md">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.hash, -1)}><Minus className="h-3 w-3" /></Button>
                        <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.hash, 1)}><Plus className="h-3 w-3" /></Button>
                      </div>
                      <div className="w-16 text-right font-bold text-sm">Rs. {item.totalPrice}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Total Footer */}
            <div className="p-5 bg-muted/20 shrink-0">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">Rs. {subtotal}</span>
                </div>
                
                {orderType === "delivery" && (
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-muted-foreground">Delivery Fee</span>
                    <Input 
                      type="number" 
                      className="h-7 w-20 text-right font-semibold" 
                      value={deliveryFee} 
                      onChange={e => setDeliveryFee(Number(e.target.value))} 
                    />
                  </div>
                )}
                
                <div className="flex justify-between text-sm items-center pt-1 border-t">
                  <span className="text-muted-foreground">Discount</span>
                  <div className="flex items-center gap-1">
                    <Button variant={discountType === "percent" ? "secondary" : "ghost"} size="sm" className="h-7 px-2 text-xs" onClick={() => setDiscountType("percent")}>%</Button>
                    <Button variant={discountType === "flat" ? "secondary" : "ghost"} size="sm" className="h-7 px-2 text-xs" onClick={() => setDiscountType("flat")}>Rs</Button>
                    <Input 
                      type="number" 
                      className="h-7 w-16 text-right" 
                      value={discountValue} 
                      onChange={e => {
                        const v = Number(e.target.value);
                        if (discountType === "percent" && v > 100) return;
                        setDiscountValue(v);
                      }} 
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center mb-4">
                <span className="text-2xl font-bold">Total</span>
                <span className="text-3xl font-black text-primary">Rs. {grandTotal}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                 <div className="space-y-1">
                    <Label className="text-xs">Payment Method</Label>
                    <Select 
                      value={paymentMethod} 
                      onValueChange={(val: any) => setPaymentMethod(val)}
                    >
                      <SelectTrigger className="h-10 w-full bg-background shadow-none">
                        <SelectValue placeholder="Payment Method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Card">Card</SelectItem>
                        <SelectItem value="JazzCash">JazzCash</SelectItem>
                        <SelectItem value="EasyPaisa">EasyPaisa</SelectItem>
                        {orderType === "delivery" && <SelectItem value="COD">COD</SelectItem>}
                      </SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <div className="flex gap-1 h-9 bg-muted p-1 rounded-md">
                       <Button variant={paymentStatus === "unpaid" ? "destructive" : "ghost"} className="flex-1 h-full text-xs" onClick={() => setPaymentStatus("unpaid")}>Unpaid</Button>
                       <Button variant={paymentStatus === "paid" ? "default" : "ghost"} className="flex-1 h-full text-xs" onClick={() => setPaymentStatus("paid")}>Paid</Button>
                    </div>
                 </div>
              </div>

              <Button 
                className="w-full h-14 text-lg font-bold gap-2" 
                disabled={cart.length === 0 || createMutation.isPending || !isFormValid}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Check className="h-5 w-5" />
                )}
                {createMutation.isPending 
                  ? "Processing..." 
                  : "Place Order"}
              </Button>
            </div>
          </div>

          {/* RIGHT PANEL: Menu */}
          <div className="w-[60%] xl:w-[65%] flex flex-col bg-muted/10 relative">
            {isMenuLoading && (
              <div className="absolute inset-0 z-10 bg-background/50 flex items-center justify-center backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            
            <div className="p-4 border-b flex gap-4 shrink-0 bg-background">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search menu instantly..." 
                  className="pl-9 h-11 text-lg font-medium shadow-sm"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
                <div className="flex gap-2 pb-4 overflow-x-auto">
                  <Button 
                    variant={selectedCategory === "all" ? "default" : "outline"} 
                    className="rounded-full whitespace-nowrap"
                    onClick={() => setSelectedCategory("all")}
                  >
                    All Items
                  </Button>
                  {menuData?.categories.map(c => (
                    <Button 
                      key={c.id} 
                      variant={selectedCategory === c.id ? "default" : "outline"}
                      className="rounded-full whitespace-nowrap"
                      onClick={() => setSelectedCategory(c.id)}
                    >
                      {c.name}
                    </Button>
                  ))}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 mt-2 pb-20">
                  {filteredItems.map(item => {
                    const hasVariants = menuData?.variants.some(v => v.menuItemId === item.id);
                    const hasAddOns = menuData?.addOns.some(a => a.menuItemId === item.id);
                    // Find quantity of this item in the cart to show a quick badge
                    const cartQty = cart.filter(c => c.menuItemId === item.id).reduce((sum, c) => sum + c.quantity, 0);

                    return (
                      <button 
                        key={item.id}
                        className="group flex flex-col text-left bg-background border rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-primary transition-all active:scale-95 relative h-[240px] w-full"
                        onClick={() => openItemConfig(item)}
                      >
                        {/* Top Image */}
                        <div className="w-full h-[120px] bg-muted relative shrink-0">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag className="w-10 h-10 text-muted-foreground/30" />
                            </div>
                          )}
                          {/* Top Badges (Variants/Addons) */}
                          <div className="absolute top-2 left-2 flex flex-col gap-1">
                             {hasVariants && <span className="text-[10px] bg-background/90 backdrop-blur-sm px-1.5 py-0.5 rounded font-medium shadow-sm border border-border/50">Variants</span>}
                             {hasAddOns && <span className="text-[10px] bg-background/90 backdrop-blur-sm px-1.5 py-0.5 rounded font-medium shadow-sm border border-border/50">Add-ons</span>}
                          </div>
                          {cartQty > 0 && (
                            <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-md shadow-sm">
                              {cartQty} in cart
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-3 w-full flex flex-col flex-1 min-h-0">
                          <h4 className="font-bold text-sm line-clamp-1 mb-1 shrink-0">{item.name}</h4>
                          <div className="overflow-hidden mb-2">
                            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug break-words">
                              {item.description || "A delicious meal prepared fresh for you."}
                            </p>
                          </div>
                          <div className="text-primary font-black text-sm mt-auto shrink-0">Rs. {item.basePrice}</div>
                        </div>
                      </button>
                    );
                  })}
                  {filteredItems.length === 0 && (
                     <div className="col-span-full py-20 text-center text-muted-foreground">
                       No items found matching your search.
                     </div>
                  )}
                </div>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Item Configuration Sub-Modal */}
      <Dialog open={!!configItem} onOpenChange={(open) => !open && setConfigItem(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{configItem?.name}</DialogTitle>
            <DialogDescription>Configure options before adding to cart</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-6">
            {(menuData?.variants?.filter(v => v.menuItemId === configItem?.id)?.length || 0) > 0 && (
              <div className="space-y-3">
                <Label className="text-base font-bold">Size / Variant</Label>
                <div className="grid grid-cols-2 gap-2">
                  {menuData?.variants.filter(v => v.menuItemId === configItem?.id).map(v => (
                    <Button 
                      key={v.id} 
                      variant={selectedVariant === v.id ? "default" : "outline"} 
                      onClick={() => setSelectedVariant(v.id)}
                      className="justify-between"
                    >
                      {v.name} <span>Rs. {v.price}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            {(menuData?.addOns?.filter(a => a.menuItemId === configItem?.id)?.length || 0) > 0 && (
              <div className="space-y-3">
                <Label className="text-base font-bold">Add-ons</Label>
                <div className="grid grid-cols-2 gap-2">
                  {menuData?.addOns.filter(a => a.menuItemId === configItem?.id).map(a => (
                    <Button 
                      key={a.id} 
                      variant={selectedAddOns.has(a.id) ? "default" : "outline"} 
                      onClick={() => {
                        const newSet = new Set(selectedAddOns);
                        if (newSet.has(a.id)) newSet.delete(a.id);
                        else newSet.add(a.id);
                        setSelectedAddOns(newSet);
                      }}
                      className="justify-between"
                    >
                      {a.name} <span>+Rs. {a.price}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => addToCart(configItem.id, configItem.name, configItem.basePrice, selectedVariant, Array.from(selectedAddOns))} className="w-full h-12 text-lg">
              Add to Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>

    <AlertDialog open={splitCheckModalOpen} onOpenChange={setSplitCheckModalOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Table is Occupied</AlertDialogTitle>
          <AlertDialogDescription>
            The selected table currently has an active order. Are you creating a split check / separate bill for this table?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setPendingTableId(null)}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => {
            if (pendingTableId) {
              setTableId(pendingTableId);
              const table = tablesData?.find(t => t.id === pendingTableId);
              setTableNumber(table?.name || "");
            }
            setSplitCheckModalOpen(false);
          }}>
            Yes, Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
