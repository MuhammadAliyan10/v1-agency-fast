"use client";

import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Minus, Check, ShoppingBag, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPOSMenuData } from "@/server/actions/menu";
import { createManualOrder, getStaffWaiters, addItemsToExistingOrder, LiveOrder } from "@/server/actions/live-orders";
import { getTablesWithStatus } from "@/server/actions/tables";
import { z } from "zod";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "@/lib/auth/session-context";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

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
    name: z.string().optional(),
    imageUrl: z.string().optional().nullable(),
    variantName: z.string().optional(),
    unitPrice: z.number().optional(),
    totalPrice: z.number().optional(),
    hash: z.string().optional(),
  })).min(1, "Cart cannot be empty"),
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

type ManualOrderFormValues = z.infer<typeof manualOrderSchema>;

// Hashing function for cart items
const generateItemHash = (menuItemId: string, variantId?: string | null, addOns: string[] = [], specialInstructions?: string) => {
  const addOnsStr = [...addOns].sort().join(",");
  const instrStr = specialInstructions ? specialInstructions.trim().toLowerCase() : "none";
  return `${menuItemId}_${variantId || "none"}_${addOnsStr}_${instrStr}`;
};

export function ManualOrderDialog({ children, existingOrder, defaultTableId, defaultTableNumber }: { children: React.ReactNode; existingOrder?: LiveOrder; defaultTableId?: string; defaultTableNumber?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const session = useSession();

  const form = useForm<ManualOrderFormValues>({
    resolver: zodResolver(manualOrderSchema) as any,
    defaultValues: {
      orderType: "dine_in",
      customerPhone: "",
      customerName: "",
      deliveryAddress: "",
      tableNumber: "",
      tableId: "",
      waiterId: "",
      deliveryFee: 50,
      discountAmount: 0,
      paymentMethod: "Cash",
      paymentStatus: "paid",
      items: [],
    }
  });

  const { fields: cart, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const orderType = form.watch("orderType");
  const tableId = form.watch("tableId");
  const waiterId = form.watch("waiterId");
  const customerName = form.watch("customerName");
  const customerPhone = form.watch("customerPhone");
  const deliveryAddress = form.watch("deliveryAddress");
  const deliveryFee = form.watch("deliveryFee");
  const discountAmount = form.watch("discountAmount");
  const paymentMethod = form.watch("paymentMethod");
  const paymentStatus = form.watch("paymentStatus");

  // POS State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  const [pendingTableId, setPendingTableId] = useState<string | null>(null);
  const [splitCheckModalOpen, setSplitCheckModalOpen] = useState(false);
  const [discountType, setDiscountType] = useState<"flat" | "percent">("flat");
  
  // Calculate max allowed discount percentage for this user
  const maxAllowedPercent = session?.role === "admin" 
    ? 100 
    : (session?.permissions?.maxDiscountPercentage ?? 0);
  
  // Item Config Modal State
  const [configItem, setConfigItem] = useState<any | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<Set<string>>(new Set());
  const [itemSpecialInstructions, setItemSpecialInstructions] = useState("");

  // Initialize from existingOrder if provided
  useEffect(() => {
    if (isOpen && existingOrder) {
      form.reset({
        orderType: "dine_in",
        customerName: existingOrder.customerName || "",
        customerPhone: existingOrder.customerPhone || "",
        tableId: existingOrder.tableId || "",
        tableNumber: existingOrder.tableNumber || "",
        waiterId: existingOrder.waiterId || "",
        deliveryFee: 50,
        discountAmount: 0,
        paymentMethod: "Cash",
        paymentStatus: "paid",
        items: []
      });
    } else if (isOpen && !existingOrder) {
      form.reset({
        orderType: "dine_in",
        customerName: "",
        customerPhone: "",
        tableId: defaultTableId || "",
        tableNumber: defaultTableNumber || "",
        waiterId: "",
        deliveryAddress: "",
        deliveryFee: 50,
        discountAmount: 0,
        paymentMethod: "Cash",
        paymentStatus: "paid",
        items: []
      });
    }
  }, [isOpen, existingOrder, defaultTableId, defaultTableNumber, form]);

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

  const items = form.watch("items");
  const subtotal = items.reduce((acc, item) => acc + (item.totalPrice || 0), 0);
  const calculatedDiscount = discountType === "percent" ? (subtotal * Math.min(discountAmount || 0, 100)) / 100 : (discountAmount || 0);
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

  const handleTableChange = (selectedId: string) => {
    if (!selectedId) {
      form.setValue("tableId", "");
      form.setValue("tableNumber", "");
      return;
    }
    const table = tablesData?.find(t => t.id === selectedId);
    if (table?.isOccupied && !existingOrder) {
      setPendingTableId(selectedId);
      setSplitCheckModalOpen(true);
    } else {
      form.setValue("tableId", selectedId);
      form.setValue("tableNumber", table?.name || "");
    }
  };

  // Handlers
  const openItemConfig = (item: any) => {
    const itemVariants = menuData?.variants.filter(v => v.menuItemId === item.id) || [];
    setConfigItem(item);
    setSelectedVariant(itemVariants.length > 0 ? itemVariants[0].id : null);
    setSelectedAddOns(new Set());
    setItemSpecialInstructions("");
  };

  const addToCart = (menuItemId: string, name: string, basePrice: number, variantId?: string | null, addOnIds: string[] = [], specialInstructions?: string, imageUrl?: string | null) => {
    const hash = generateItemHash(menuItemId, variantId, addOnIds, specialInstructions);
    
    const currentItems = form.getValues("items");
    const existingIndex = currentItems.findIndex(p => p.hash === hash);
    
    if (existingIndex !== -1) {
      const existing = currentItems[existingIndex];
      const newQty = (existing.quantity || 0) + 1;
      update(existingIndex, {
        ...existing,
        quantity: newQty,
        totalPrice: newQty * (existing.unitPrice || 0)
      });
    } else {
      let unitPrice = basePrice;
      let variantName;
      if (variantId) {
        const v = menuData?.variants.find(v => v.id === variantId);
        if (v) {
          unitPrice = v.price;
          variantName = v.name;
        }
      }
      
      for (const aid of addOnIds) {
        const a = menuData?.addOns.find(a => a.id === aid);
        if (a) {
          unitPrice += a.price;
        }
      }
      
      append({
        hash,
        menuItemId,
        name,
        imageUrl,
        variantId,
        variantName,
        quantity: 1,
        selectedAddOns: addOnIds,
        specialInstructions: specialInstructions?.trim() || undefined,
        unitPrice,
        totalPrice: unitPrice
      });
    }
    
    setConfigItem(null);
  };

  const removeFromCart = (hash: string) => {
    const idx = form.getValues("items").findIndex(p => p.hash === hash);
    if (idx !== -1) remove(idx);
  };

  const updateQuantity = (hash: string, delta: number) => {
    const currentItems = form.getValues("items");
    const idx = currentItems.findIndex(p => p.hash === hash);
    if (idx !== -1) {
      const p = currentItems[idx];
      const newQ = Math.max(0, (p.quantity || 0) + delta);
      if (newQ === 0) {
        remove(idx);
      } else {
        update(idx, { ...p, quantity: newQ, totalPrice: newQ * (p.unitPrice || 0) });
      }
    }
  };

  const onSubmit = async (data: ManualOrderFormValues) => {
      if (data.items.length === 0) {
        toast.error("Cart is empty");
        return;
      }
      
      try {
        if (existingOrder) {
          const payload = {
            orderId: existingOrder.id,
            items: data.items.map(c => ({
              menuItemId: c.menuItemId,
              variantId: c.variantId,
              quantity: c.quantity,
              selectedAddOns: c.selectedAddOns || [],
              specialInstructions: c.specialInstructions,
            }))
          };
          const res = await addItemsToExistingOrder(payload);
          if (!res.success) throw new Error(res.error);
        } else {
          const payload = {
            ...data,
            deliveryFee: appliedDeliveryFee,
            discountAmount: calculatedDiscount,
            items: data.items.map(c => ({
              menuItemId: c.menuItemId,
              variantId: c.variantId,
              quantity: c.quantity,
              selectedAddOns: c.selectedAddOns || [],
              specialInstructions: c.specialInstructions,
            }))
          };
          
          const res = await createManualOrder(payload);
          if (!res.success) throw new Error(res.error);
        }
        
        queryClient.invalidateQueries({ queryKey: ["live-orders"] });
        setIsOpen(false);
        
        toast.success(existingOrder ? "Items Added to Order" : "Order Placed Successfully", {
          duration: 5000,
        });
        
        form.reset();
      } catch (err: any) {
        toast.error(err.message || "Failed to place order");
      }
  };

  useEffect(() => {
    if (orderType === "delivery") {
      form.setValue("paymentMethod", "COD");
      form.setValue("paymentStatus", "unpaid");
    } else {
      form.setValue("paymentMethod", "Cash");
      form.setValue("paymentStatus", "paid");
    }
  }, [orderType, form]);

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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="w-[40%] xl:w-[35%] flex flex-col bg-background border-r">
              <div className="flex-1 p-5 border-b overflow-y-auto">
                <div className="mb-6 space-y-3">
                  <Label className="text-base font-bold">Order Type</Label>
                  <Tabs value={orderType} onValueChange={(v) => form.setValue("orderType", v as any)}>
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

                <div className="space-y-4 mb-8 bg-muted/30 p-4 border">
                  {orderType === "dine_in" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Table No.</Label>
                        <Select 
                          value={tableId} 
                          onValueChange={handleTableChange} 
                          disabled={!!existingOrder}
                        >
                          <SelectTrigger className="h-10 w-full bg-background shadow-none">
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
                          value={waiterId || ""} 
                          onValueChange={val => form.setValue("waiterId", val || "")} 
                          disabled={!!existingOrder}
                        >
                          <SelectTrigger className="h-10 w-full bg-background shadow-none">
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
                      <Input value={customerPhone} onChange={e => form.setValue("customerPhone", e.target.value)} placeholder="03XXXXXXXXX" className="h-10 w-full bg-background shadow-none" disabled={!!existingOrder} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Customer Name {orderType !== "dine_in" && <span className="text-destructive">*</span>}</Label>
                      <Input value={customerName} onChange={e => form.setValue("customerName", e.target.value)} placeholder="Walk-in Guest" className="h-10 w-full bg-background shadow-none" disabled={!!existingOrder} />
                    </div>
                  </div>

                  {orderType === "delivery" && (
                    <div className="space-y-1.5">
                      <Label>Delivery Address <span className="text-destructive">*</span></Label>
                      <Input value={deliveryAddress} onChange={e => form.setValue("deliveryAddress", e.target.value)} placeholder="Full address" className="h-10 w-full bg-background shadow-none" />
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
                        <div key={item.id} className="flex gap-3 items-start justify-between bg-muted/10 p-2 border border-dashed rounded-none">
                          <div className="flex-1">
                            <div className="font-bold text-sm">{item.itemName}</div>
                            {item.variantName && <div className="text-xs text-muted-foreground">{item.variantName}</div>}
                            {Array.isArray(item.selectedAddOns) && item.selectedAddOns.map((a: any, i) => (
                              <div key={i} className="text-xs text-muted-foreground">+ {a.name || ""}</div>
                            ))}
                            {item.specialInstructions && !(item.specialInstructions.startsWith("[DEAL:") && item.specialInstructions.endsWith("]")) && (
                              <div className="text-[11px] text-amber-600 font-semibold mt-0.5 border border-amber-200 bg-amber-50/50 px-1 inline-block rounded-none">
                                ⚠️ {item.specialInstructions}
                              </div>
                            )}
                            <div className="text-sm font-semibold mt-1">Rs. {item.unitPrice}</div>
                          </div>
                          <div className="flex items-center justify-center bg-background border h-7 px-2 rounded-none">
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
                  {items.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground text-sm">Cart is empty. Select items from the menu.</div>
                  ) : (
                    items.map((item, idx) => (
                      <div key={item.hash || idx} className="flex gap-3 items-start justify-between bg-background p-3 border shadow-sm rounded-none group relative">
                        {item.imageUrl ? (
                          <div className="w-16 h-16 shrink-0 bg-muted rounded-none overflow-hidden border">
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-16 h-16 shrink-0 bg-muted flex items-center justify-center rounded-none border">
                            <ShoppingBag className="w-6 h-6 text-muted-foreground/30" />
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <div className="font-bold text-sm leading-tight truncate pr-6">{item.name}</div>
                            <button 
                              type="button"
                              onClick={() => removeFromCart(item.hash || "")}
                              className="absolute top-2 right-2 text-muted-foreground hover:text-rose-600 bg-background/80 hover:bg-rose-50 p-1 rounded-none opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                            </button>
                          </div>
                          
                          {item.variantName && <div className="text-xs text-muted-foreground mt-0.5">{item.variantName}</div>}
                          {item.specialInstructions && !(item.specialInstructions.startsWith("[DEAL:") && item.specialInstructions.endsWith("]")) && (
                            <div className="text-[10px] text-amber-600 font-bold mt-1 border border-amber-200 bg-amber-50/50 px-1.5 py-0.5 inline-block rounded-none">
                              ⚠️ {item.specialInstructions}
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <div className="text-primary font-black text-sm">Rs. {item.unitPrice}</div>
                            <div className="flex items-center bg-muted/50 border rounded-none h-7">
                              <Button type="button" variant="ghost" size="icon" className="h-full w-7 rounded-none hover:bg-muted" onClick={() => updateQuantity(item.hash || "", -1)}><Minus className="h-3 w-3" /></Button>
                              <span className="text-xs font-bold w-6 text-center select-none">{item.quantity}</span>
                              <Button type="button" variant="ghost" size="icon" className="h-full w-7 rounded-none hover:bg-muted" onClick={() => updateQuantity(item.hash || "", 1)}><Plus className="h-3 w-3" /></Button>
                            </div>
                          </div>
                        </div>
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
                        className="h-7 w-20 text-right font-semibold shadow-none" 
                        value={deliveryFee} 
                        onChange={e => form.setValue("deliveryFee", Number(e.target.value))} 
                      />
                    </div>
                  )}
                  
                  <div className="flex justify-between text-sm items-center pt-1 border-t">
                    <span className="text-muted-foreground">Discount</span>
                    <div className="flex items-center gap-1">
                      <Button type="button" variant={discountType === "percent" ? "secondary" : "ghost"} size="sm" className="h-7 px-2 text-xs" onClick={() => {
                        setDiscountType("percent");
                        if (discountAmount > maxAllowedPercent) form.setValue("discountAmount", maxAllowedPercent);
                      }}>%</Button>
                      <Button type="button" variant={discountType === "flat" ? "secondary" : "ghost"} size="sm" className="h-7 px-2 text-xs" onClick={() => {
                        setDiscountType("flat");
                        const maxFlat = (subtotal * maxAllowedPercent) / 100;
                        if (discountAmount > maxFlat) form.setValue("discountAmount", maxFlat);
                      }}>Rs</Button>
                      <Input 
                        type="number" 
                        className="h-7 w-16 text-right shadow-none" 
                        value={discountAmount === 0 ? "" : discountAmount}
                        placeholder="0"
                        onChange={e => {
                          const v = Number(e.target.value);
                          if (discountType === "percent" && v > maxAllowedPercent) {
                            toast.error(`Your role is limited to a maximum discount of ${maxAllowedPercent}%.`);
                            return;
                          }
                          if (discountType === "flat") {
                            const maxFlat = (subtotal * maxAllowedPercent) / 100;
                            if (v > maxFlat) {
                              toast.error(`Your role is limited to a max discount of Rs. ${maxFlat.toFixed(0)} (${maxAllowedPercent}%).`);
                              return;
                            }
                          }
                          form.setValue("discountAmount", v);
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
                        onValueChange={(val: any) => form.setValue("paymentMethod", val)}
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
                      <div className="flex gap-1 h-9 bg-muted p-1">
                         <Button type="button" variant={paymentStatus === "unpaid" ? "destructive" : "ghost"} className="flex-1 h-full text-xs" onClick={() => form.setValue("paymentStatus", "unpaid")}>Unpaid</Button>
                         <Button type="button" variant={paymentStatus === "paid" ? "default" : "ghost"} className="flex-1 h-full text-xs" onClick={() => form.setValue("paymentStatus", "paid")}>Paid</Button>
                      </div>
                   </div>
                </div>

                <Button 
                  type="submit"
                  className="w-full h-14 text-lg font-bold gap-2" 
                  disabled={items.length === 0 || form.formState.isSubmitting || !isFormValid}
                >
                  {form.formState.isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Check className="h-5 w-5" />
                  )}
                  {form.formState.isSubmitting 
                    ? "Processing..." 
                    : "Place Order"}
                </Button>
              </div>
            </form>
          </Form>

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
                  className="pl-9 h-11 text-lg font-medium shadow-none"
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
                    className="whitespace-nowrap rounded-none"
                    onClick={() => setSelectedCategory("all")}
                  >
                    All Items
                  </Button>
                  {menuData?.categories.map(c => (
                    <Button 
                      key={c.id} 
                      variant={selectedCategory === c.id ? "default" : "outline"}
                      className="whitespace-nowrap rounded-none"
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
                    const cartQty = cart.filter(c => c.menuItemId === item.id).reduce((sum, c) => sum + (c.quantity || 0), 0);

                    return (
                      <button 
                        key={item.id}
                        type="button"
                        className="group flex flex-col text-left bg-background border overflow-hidden shadow-sm hover:shadow-md hover:border-primary transition-all active:scale-95 relative h-[240px] w-full rounded-none"
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
                             {hasVariants && <span className="text-[10px] bg-background/90 backdrop-blur-sm px-1.5 py-0.5 rounded-none font-medium shadow-sm border border-border/50">Variants</span>}
                             {hasAddOns && <span className="text-[10px] bg-background/90 backdrop-blur-sm px-1.5 py-0.5 rounded-none font-medium shadow-sm border border-border/50">Add-ons</span>}
                          </div>
                          {cartQty > 0 && (
                            <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 shadow-sm rounded-none">
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
                      type="button"
                      key={v.id} 
                      variant={selectedVariant === v.id ? "default" : "outline"} 
                      onClick={() => setSelectedVariant(v.id)}
                      className="justify-between rounded-none"
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
                      type="button"
                      key={a.id} 
                      variant={selectedAddOns.has(a.id) ? "default" : "outline"} 
                      onClick={() => {
                        const newSet = new Set(selectedAddOns);
                        if (newSet.has(a.id)) newSet.delete(a.id);
                        else newSet.add(a.id);
                        setSelectedAddOns(newSet);
                      }}
                      className="justify-between rounded-none"
                    >
                      {a.name} <span>+Rs. {a.price}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              <Label className="text-base font-bold">Special Instructions</Label>
              <Input 
                placeholder="E.g. No onions, extra spicy..." 
                value={itemSpecialInstructions}
                onChange={(e) => setItemSpecialInstructions(e.target.value)}
                className="shadow-none rounded-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => addToCart(configItem.id, configItem.name, configItem.basePrice, selectedVariant, Array.from(selectedAddOns), itemSpecialInstructions, configItem.imageUrl)} className="w-full h-12 text-lg rounded-none">
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
              form.setValue("tableId", pendingTableId || "");
              const table = tablesData?.find(t => t.id === pendingTableId);
              form.setValue("tableNumber", table?.name || "");
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
