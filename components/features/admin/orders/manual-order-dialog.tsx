"use client";

import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Minus, Check, ShoppingBag, Loader2, X, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPOSMenuData } from "@/server/actions/menu";
import { getPublicDeals } from "@/server/actions/deals";
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
import { cn } from "@/lib/utils";

const manualOrderSchema = z.object({
  orderType: z.enum(["delivery", "pickup", "dine_in"]),
  customerPhone: z.string().optional().refine(
    (val) => !val || val.trim() === "" || /^03[0-9]{9}$/.test(val.trim()),
    { message: "Phone must be in format 03XXXXXXXXX (11 digits)" }
  ),
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
      paymentStatus: "unpaid",
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
  const [rightTab, setRightTab] = useState<"menu" | "deals">("menu");
  const [hallFilter, setHallFilter] = useState<"all" | "general" | "family">("general");

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

  // Deal Config State
  const [configDeal, setConfigDeal] = useState<any | null>(null);
  // Cash tendered calculator state
  const [cashTendered, setCashTendered] = useState<string>("");
  const [dealSlotSelections, setDealSlotSelections] = useState<Record<string, { menuItemId: string; name: string; variantId: string | null; variantName: string | null }>>({});
  const [dealQuantity, setDealQuantity] = useState(1);

  // Initialize form when dialog opens.
  // If the cart already has items (user accidentally closed), preserve them — don't wipe.
  useEffect(() => {
    if (!isOpen) return;

    const currentItems = form.getValues("items");
    // Only reset if the cart is empty (first open or after a successful submit)
    if (currentItems.length > 0) return;

    if (existingOrder) {
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
        paymentStatus: "unpaid",
        items: [],
      });
    } else {
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
        paymentStatus: "unpaid",
        items: [],
      });
      setHallFilter("general");
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
    enabled: isOpen,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
  });

  const { data: dealsData, isLoading: isDealsLoading } = useQuery({
    queryKey: ["pos-deals"],
    queryFn: async () => {
      const res = await getPublicDeals();
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    enabled: isOpen,
    staleTime: 1000 * 60 * 5,
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
    const isValidPhone = !!customerPhone && /^03[0-9]{9}$/.test(customerPhone.trim());
    if (orderType === "delivery") {
      return (customerName?.trim() || "") !== "" && isValidPhone && (deliveryAddress?.trim() || "") !== "";
    }
    if (orderType === "pickup") {
      return (customerName?.trim() || "") !== "" && isValidPhone;
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

  const openDealConfig = (deal: any) => {
    setConfigDeal(deal);
    // Auto-fill fixed slots immediately
    const autoSelections: typeof dealSlotSelections = {};
    for (const slot of deal.slots) {
      if (slot.menuItemId && !slot.categoryId && slot.menuItem) {
        if (!slot.menuItem.variants || slot.menuItem.variants.length === 0) {
          autoSelections[slot.id] = { menuItemId: slot.menuItem.id, name: slot.menuItem.name, variantId: null, variantName: null };
        } else {
          autoSelections[slot.id] = { menuItemId: slot.menuItem.id, name: slot.menuItem.name, variantId: null, variantName: null };
        }
      }
    }
    setDealSlotSelections(autoSelections);
    setDealQuantity(1);
  };

  const addDealToCart = (deal: any) => {
    const slotSummary = deal.slots.map((slot: any, idx: number) => {
      const sel = dealSlotSelections[slot.id];
      if (!sel) return null;
      return `Step ${idx + 1}: ${slot.quantity}x ${sel.name}${sel.variantName ? ` (${sel.variantName})` : ""}`;
    }).filter(Boolean).join(" | ");

    const hash = generateItemHash(`deal-${deal.id}`, null, [], slotSummary);
    const currentItems = form.getValues("items");
    const existingIdx = currentItems.findIndex(p => p.hash === hash);

    if (existingIdx !== -1) {
      const existing = currentItems[existingIdx];
      const newQty = (existing.quantity || 0) + dealQuantity;
      update(existingIdx, { ...existing, quantity: newQty, totalPrice: newQty * deal.dealPrice });
    } else {
      append({
        hash,
        menuItemId: deal.slots[0]?.menuItemId || deal.id,
        name: `[DEAL] ${deal.name}`,
        imageUrl: deal.imageUrl || null,
        variantId: null,
        variantName: deal.eventLabel || "Combo Deal",
        quantity: dealQuantity,
        selectedAddOns: [],
        specialInstructions: `[DEAL: ${deal.name}] - ${slotSummary}`,
        unitPrice: deal.dealPrice,
        totalPrice: deal.dealPrice * dealQuantity,
      });
    }

    toast.success(`${dealQuantity}× "${deal.name}" added to order!`);
    setConfigDeal(null);
    setDealSlotSelections({});
    setDealQuantity(1);
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
            currentVersion: existingOrder.orderVersion,
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
        setCashTendered("");
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
      form.setValue("paymentStatus", "unpaid");
    }
    setCashTendered("");
  }, [orderType, form]);

  return (
    <>
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent
        className="!max-w-[95vw] w-full h-[95vh] p-0 flex flex-col overflow-hidden bg-background"
        onInteractOutside={(e) => {
          // Prevent accidental close when the cart has unsaved items
          if (form.getValues("items").length > 0) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (form.getValues("items").length > 0) e.preventDefault();
        }}
      >
        <DialogHeader className="px-4 py-2.5 border-b shrink-0 flex-row justify-between items-center">
          <div>
            <DialogTitle className="text-lg font-bold leading-tight">{existingOrder ? `Append to #${existingOrder.id}` : "New POS Order"}</DialogTitle>
            <DialogDescription className="text-xs mt-0">{existingOrder ? "Add new rounds/items to this existing order." : "Walk-ins and direct calls."}</DialogDescription>
          </div>
          {items.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive gap-1.5 shrink-0"
              onClick={() => {
                form.reset();
                setCashTendered("");
                setIsOpen(false);
              }}
            >
              <X className="h-4 w-4" />
              Discard &amp; Close
            </Button>
          )}
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* LEFT PANEL: Cart & Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="w-[40%] xl:w-[35%] flex flex-col bg-background border-r">
              <div className="flex-1 p-3 border-b overflow-y-auto">
                <div className="mb-4 space-y-2">
                  <Label className="text-sm font-bold">Order Type</Label>
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

                <div className="space-y-3 mb-4 bg-muted/30 p-3 border">
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
                            {(hallFilter === "all"
                              ? tablesData
                              : tablesData?.filter(t => t.hallType === hallFilter)
                            )?.map(table => (
                              <SelectItem key={table.id} value={table.id}>
                                {table.name}
                                {table.isOccupied ? " 🔴" : ""}
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
                  {/* Hall type selector — only when dine_in and not append mode */}
                  {orderType === "dine_in" && !existingOrder && (
                    <div className="space-y-1.5">
                      <Label>Hall</Label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            // filter tables by general hall and clear tableId if current table is family
                            const currentTable = tablesData?.find(t => t.id === tableId);
                            if (currentTable?.hallType === "family") {
                              form.setValue("tableId", "");
                              form.setValue("tableNumber", "");
                            }
                            setHallFilter("general");
                          }}
                          className={cn(
                            "flex-1 h-9 text-sm font-semibold border transition-all",
                            hallFilter === "general"
                              ? "bg-foreground text-background border-foreground"
                              : "bg-background text-muted-foreground border-border hover:border-foreground/40"
                          )}
                        >
                          General Hall
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const currentTable = tablesData?.find(t => t.id === tableId);
                            if (currentTable?.hallType === "general") {
                              form.setValue("tableId", "");
                              form.setValue("tableNumber", "");
                            }
                            setHallFilter("family");
                          }}
                          className={cn(
                            "flex-1 h-9 text-sm font-semibold border transition-all",
                            hallFilter === "family"
                              ? "bg-amber-600 text-white border-amber-600"
                              : "bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400"
                          )}
                        >
                          Family Hall
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Customer Phone {orderType !== "dine_in" && <span className="text-destructive">*</span>}</Label>
                      <Input
                        value={customerPhone}
                        onChange={e => {
                          const v = e.target.value.replace(/[^0-9]/g, "").slice(0, 11);
                          form.setValue("customerPhone", v);
                        }}
                        placeholder="03XXXXXXXXX"
                        className={cn(
                          "h-10 w-full bg-background shadow-none",
                          customerPhone && customerPhone.length > 0 && !/^03[0-9]{9}$/.test(customerPhone)
                            ? "border-rose-400 focus-visible:ring-rose-400"
                            : ""
                        )}
                        disabled={!!existingOrder}
                        maxLength={11}
                        inputMode="numeric"
                      />
                      {customerPhone && customerPhone.length > 0 && !/^03[0-9]{9}$/.test(customerPhone) && (
                        <p className="text-[10px] text-rose-500 font-semibold mt-0.5">Must start with 03 and be 11 digits</p>
                      )}
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
                      <div key={item.hash || idx} className="flex gap-2 items-start justify-between bg-background p-2.5 border shadow-sm rounded-none group relative">
                        {item.imageUrl ? (
                          <div className="w-12 h-12 shrink-0 bg-muted rounded-none overflow-hidden border">
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 shrink-0 bg-muted flex items-center justify-center rounded-none border">
                            <ShoppingBag className="w-5 h-5 text-muted-foreground/30" />
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
                          {/* Inline special instructions input */}
                          <Input
                            type="text"
                            placeholder="Note (e.g. no onions)..."
                            value={item.specialInstructions && !(item.specialInstructions.startsWith("[DEAL:") && item.specialInstructions.endsWith("]")) ? item.specialInstructions : ""}
                            onChange={e => {
                              const currentItems = form.getValues("items");
                              const cartIdx = currentItems.findIndex(p => p.hash === item.hash);
                              if (cartIdx !== -1) {
                                const updated = { ...currentItems[cartIdx], specialInstructions: e.target.value || undefined };
                                update(cartIdx, updated);
                              }
                            }}
                            className="h-6 text-xs shadow-none border-dashed mt-1.5 px-2 rounded-none placeholder:text-muted-foreground/50"
                          />
                          <div className="flex items-center justify-between mt-1.5">
                            <div className="text-primary font-black text-xs">Rs. {item.unitPrice}</div>
                            <div className="flex items-center bg-muted/50 border rounded-none h-6">
                              <Button type="button" variant="ghost" size="icon" className="h-full w-6 rounded-none hover:bg-muted" onClick={() => updateQuantity(item.hash || "", -1)}><Minus className="h-2.5 w-2.5" /></Button>
                              <span className="text-xs font-bold w-5 text-center select-none">{item.quantity}</span>
                              <Button type="button" variant="ghost" size="icon" className="h-full w-6 rounded-none hover:bg-muted" onClick={() => updateQuantity(item.hash || "", 1)}><Plus className="h-2.5 w-2.5" /></Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Total Footer */}
              <div className="p-3 bg-muted/20 shrink-0">
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

                {/* Cash Tendered / Change Calculator
                    Shown only when payment is Cash/COD and marked paid */}
                {(paymentMethod === "Cash" || paymentMethod === "COD") &&
                  paymentStatus === "paid" && (
                  <div className="mb-4 p-3 bg-muted/50 border space-y-2.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
                      Cash Received from Customer
                    </Label>
                    {/* Quick-select preset amounts */}
                    <div className="flex gap-1.5">
                      {([500, 1000, 5000] as const).map((amount) => (
                        <Button
                          key={amount}
                          type="button"
                          variant={Number(cashTendered) === amount ? "default" : "outline"}
                          size="sm"
                          className="h-8 flex-1 text-xs font-bold rounded-none px-1"
                          onClick={() => setCashTendered(String(amount))}
                        >
                          {amount}
                        </Button>
                      ))}
                    </div>
                    <Input
                      type="number"
                      placeholder={`Min Rs. ${grandTotal}`}
                      value={cashTendered}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCashTendered(e.target.value)
                      }
                      className="h-12 text-xl font-black text-right shadow-none rounded-none"
                      min={grandTotal}
                    />
                    {/* Change due */}
                    {cashTendered !== "" && Number(cashTendered) >= grandTotal && (
                      <div className="flex justify-between items-center pt-2 border-t border-dashed">
                        <span className="text-sm font-bold text-muted-foreground">
                          Change to Return
                        </span>
                        <span className="text-2xl font-black text-emerald-600">
                          Rs.{" "}
                          {(Number(cashTendered) - grandTotal).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {/* Short payment warning */}
                    {cashTendered !== "" &&
                      Number(cashTendered) > 0 &&
                      Number(cashTendered) < grandTotal && (
                      <div className="flex items-center gap-1.5 text-destructive text-xs font-semibold pt-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        Short by Rs.{" "}
                        {(grandTotal - Number(cashTendered)).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}

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

          {/* RIGHT PANEL: Menu + Deals */}
          <div className="w-[60%] xl:w-[65%] flex flex-col bg-muted/10 relative">
            {isMenuLoading && (
              <div className="absolute inset-0 z-10 bg-background/50 flex items-center justify-center backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {/* Right panel tab switcher */}
            <div className="p-4 border-b bg-background shrink-0 space-y-3">
              <div className="flex gap-0 border-b">
                <button
                  type="button"
                  onClick={() => setRightTab("menu")}
                  className={`px-6 py-2 text-sm font-semibold border-b-2 transition-none ${rightTab === "menu" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                  Menu
                </button>
                <button
                  type="button"
                  onClick={() => { setRightTab("deals"); setSearchQuery(""); }}
                  className={`px-6 py-2 text-sm font-semibold border-b-2 transition-none ${rightTab === "deals" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                  Deals
                </button>
              </div>

              {rightTab === "menu" && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search menu instantly..."
                    className="pl-9 h-11 text-base font-medium shadow-none"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* MENU TAB */}
            {rightTab === "menu" && (
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
                    const cartQty = items.filter(c => c.menuItemId === item.id).reduce((sum, c) => sum + (c.quantity || 0), 0);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        className="group flex flex-col text-left bg-background border overflow-hidden shadow-sm hover:shadow-md hover:border-primary transition-all active:scale-95 relative h-[240px] w-full rounded-none"
                        onClick={() => {
                          const itemVariants = menuData?.variants.filter(v => v.menuItemId === item.id) || [];
                          const itemAddOns = menuData?.addOns.filter(a => a.menuItemId === item.id) || [];
                          if (itemVariants.length === 0 && itemAddOns.length === 0) {
                            // No config needed — add directly with quantity 1, no modal
                            addToCart(item.id, item.name, item.basePrice, null, [], undefined, item.imageUrl);
                          } else {
                            openItemConfig(item);
                          }
                        }}
                      >
                        <div className="w-full h-[120px] bg-muted relative shrink-0">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag className="w-10 h-10 text-muted-foreground/30" />
                            </div>
                          )}
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
            )}

            {/* DEALS TAB */}
            {rightTab === "deals" && (
              <div className="flex-1 overflow-y-auto p-4">
                {isDealsLoading && (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  </div>
                )}

                {!isDealsLoading && (!dealsData || dealsData.length === 0) && (
                  <div className="text-center py-20 text-muted-foreground">No active deals available.</div>
                )}

                {/* Deal list or deal slot builder */}
                {!isDealsLoading && dealsData && dealsData.length > 0 && !configDeal && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-20">
                    {dealsData.map(deal => (
                      <button
                        key={deal.id}
                        type="button"
                        className="group flex flex-col text-left bg-background border overflow-hidden shadow-sm hover:shadow-md hover:border-primary transition-all active:scale-95 rounded-none"
                        onClick={() => openDealConfig(deal)}
                      >
                        <div className="w-full h-[130px] bg-muted relative shrink-0">
                          {deal.imageUrl ? (
                            <img src={deal.imageUrl} alt={deal.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag className="w-10 h-10 text-muted-foreground/30" />
                            </div>
                          )}
                          <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-none">
                            {deal.eventLabel || "DEAL"}
                          </div>
                        </div>
                        <div className="p-3 flex flex-col gap-1 flex-1">
                          <h4 className="font-bold text-sm line-clamp-1">{deal.name}</h4>
                          {deal.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">{deal.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-auto pt-2">
                            <span className="text-muted-foreground line-through text-xs">Rs. {deal.originalPrice}</span>
                            <span className="text-primary font-black text-base">Rs. {deal.dealPrice}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Inline Deal Slot Builder */}
                {!isDealsLoading && configDeal && (
                  <div className="space-y-6 pb-6">
                    <div className="flex items-center gap-3 border-b pb-4">
                      <button
                        type="button"
                        onClick={() => { setConfigDeal(null); setDealSlotSelections({}); setDealQuantity(1); }}
                        className="text-muted-foreground hover:text-foreground p-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 5-7 7 7 7"/></svg>
                      </button>
                      <div>
                        <h3 className="font-bold text-base">{configDeal.name}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground line-through text-xs">Rs. {configDeal.originalPrice}</span>
                          <span className="text-primary font-black">Rs. {configDeal.dealPrice}</span>
                        </div>
                      </div>
                    </div>

                    {configDeal.slots.map((slot: any, slotIdx: number) => {
                      const isFixed = !!slot.menuItemId && !slot.categoryId;
                      const isDynamic = !!slot.categoryId;

                      // For dynamic slots, filter available items
                      const dynamicItems = isDynamic
                        ? (slot.category?.menuItems || []).filter((mi: any) => {
                            if (!slot.requiredVariantName) return true;
                            return (mi.variants || []).some((v: any) =>
                              v.name.toLowerCase().includes(slot.requiredVariantName.toLowerCase())
                            );
                          })
                        : [];

                      const currentSelection = dealSlotSelections[slot.id];

                      return (
                        <div key={slot.id} className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${currentSelection ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground border"}`}>
                              {currentSelection ? <Check className="w-3 h-3" /> : slotIdx + 1}
                            </div>
                            <Label className="font-bold text-sm">
                              {slot.slotName}
                              {slot.requiredVariantName && (
                                <span className="ml-2 text-xs font-normal text-muted-foreground">({slot.requiredVariantName})</span>
                              )}
                            </Label>
                          </div>

                          {isFixed && slot.menuItem && (
                            <div
                              className={`flex flex-col border transition-all rounded-none ${currentSelection?.menuItemId === slot.menuItem.id && (!slot.menuItem.variants?.length || currentSelection?.variantId) ? "border-primary bg-primary/5" : "border-border"}`}
                            >
                              <div 
                                className="flex items-center gap-3 p-3 cursor-pointer"
                                onClick={() => {
                                  if (!slot.menuItem.variants?.length) {
                                    setDealSlotSelections(prev => ({
                                      ...prev,
                                      [slot.id]: { menuItemId: slot.menuItem.id, name: slot.menuItem.name, variantId: null, variantName: null }
                                    }));
                                  }
                                }}
                              >
                                {slot.menuItem.imageUrl && (
                                  <img src={slot.menuItem.imageUrl} alt={slot.menuItem.name} className="w-12 h-12 object-cover shrink-0" />
                                )}
                                <div className="flex-1">
                                  <p className="font-semibold text-sm">{slot.menuItem.name}</p>
                                  {(!slot.menuItem.variants || slot.menuItem.variants.length === 0) && (
                                    <p className="text-xs text-muted-foreground mt-1">Included in deal</p>
                                  )}
                                </div>
                                {currentSelection?.menuItemId === slot.menuItem.id && (!slot.menuItem.variants?.length || currentSelection?.variantId) && (
                                  <Check className="w-4 h-4 text-primary shrink-0" />
                                )}
                                {currentSelection?.menuItemId === slot.menuItem.id && slot.menuItem.variants?.length > 0 && !currentSelection?.variantId && (
                                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider shrink-0">Pick flavor</span>
                                )}
                              </div>
                              
                              {slot.menuItem.variants && slot.menuItem.variants.length > 0 && (
                                <div className="px-3 pb-3 pt-1 border-t border-border/50 flex flex-wrap gap-1.5 bg-background">
                                  <p className="w-full text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">
                                    Choose your flavor:
                                  </p>
                                  {slot.menuItem.variants.map((v: any) => {
                                    const variantActive = currentSelection?.variantId === v.id;
                                    return (
                                      <button
                                        key={v.id}
                                        type="button"
                                        onClick={() => setDealSlotSelections(prev => ({
                                          ...prev,
                                          [slot.id]: { menuItemId: slot.menuItem.id, name: slot.menuItem.name, variantId: v.id, variantName: v.name }
                                        }))}
                                        className={`text-xs px-3 py-1.5 border font-bold transition-all rounded-none ${variantActive ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary hover:text-foreground"}`}
                                      >
                                        {v.name}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {isDynamic && (
                            <div className="grid grid-cols-3 gap-3">
                              {dynamicItems.length === 0 && (
                                <p className="col-span-2 text-xs text-muted-foreground py-3">No matching items found for this slot.</p>
                              )}
                              {dynamicItems.map((mi: any) => {
                                const matchingVariants = slot.requiredVariantName
                                  ? (mi.variants || []).filter((v: any) =>
                                      v.name.toLowerCase().includes(slot.requiredVariantName.toLowerCase())
                                    )
                                  : mi.variants || [];

                                const isSelected = currentSelection?.menuItemId === mi.id;
                                // All variants to show as buttons (filtered by requiredVariantName only if set)
                                const allVariants: any[] = mi.variants || [];
                                const displayVariants = slot.requiredVariantName
                                  ? matchingVariants
                                  : allVariants;

                                return (
                                  <div
                                    key={mi.id}
                                    className={`flex flex-col overflow-hidden border-2 rounded-none transition-all bg-background ${isSelected && (!displayVariants.length || currentSelection?.variantId) ? "border-primary shadow-md" : isSelected ? "border-primary/50" : "border-border hover:border-primary/40"}`}
                                  >
                                    {/* Image */}
                                    <div className="w-full h-28 bg-muted shrink-0 relative">
                                      {mi.imageUrl ? (
                                        <img src={mi.imageUrl} alt={mi.name} className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <ShoppingBag className="w-8 h-8 text-muted-foreground/20" />
                                        </div>
                                      )}
                                      {isSelected && currentSelection?.variantId && (
                                        <div className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground rounded-full p-0.5">
                                          <Check className="w-3 h-3" />
                                        </div>
                                      )}
                                      {isSelected && displayVariants.length > 0 && !currentSelection?.variantId && (
                                        <div className="absolute top-1.5 right-1.5 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-none">
                                          Pick flavor
                                        </div>
                                      )}
                                    </div>

                                    {/* Content */}
                                    <div className="p-2 flex flex-col gap-1.5 flex-1">
                                      <p className="font-bold text-xs leading-tight line-clamp-2">{mi.name}</p>

                                      {displayVariants.length > 0 ? (
                                        <div className="flex flex-wrap gap-1 mt-auto">
                                          {displayVariants.map((v: any) => {
                                            const variantActive = currentSelection?.menuItemId === mi.id && currentSelection?.variantId === v.id;
                                            return (
                                              <button
                                                key={v.id}
                                                type="button"
                                                onClick={() => setDealSlotSelections(prev => ({
                                                  ...prev,
                                                  [slot.id]: { menuItemId: mi.id, name: mi.name, variantId: v.id, variantName: v.name }
                                                }))}
                                                className={`text-[11px] px-2 py-1 border font-semibold transition-all rounded-none ${variantActive ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary hover:text-foreground"}`}
                                              >
                                                {v.name}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => setDealSlotSelections(prev => ({
                                            ...prev,
                                            [slot.id]: { menuItemId: mi.id, name: mi.name, variantId: null, variantName: null }
                                          }))}
                                          className={`mt-auto text-[11px] px-2 py-1.5 border font-semibold transition-all rounded-none w-full ${isSelected ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary hover:text-foreground"}`}
                                        >
                                          {isSelected ? "✓ Selected" : "Select"}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Quantity + Add to Order */}
                    <div className="border-t pt-4 space-y-4 sticky -bottom-4 -mx-4 px-4 bg-background/95 backdrop-blur-sm pb-4">
                      {(() => {
                        const totalSlots = configDeal.slots.length;
                        const filledSlots = Object.keys(dealSlotSelections).length;
                        const allFilled = configDeal.slots.every((s: any) => {
                          const sel = dealSlotSelections[s.id];
                          if (!sel) return false;
                          
                          // Check if the selected item has variants
                          let hasVariants = false;
                          if (s.categoryId) {
                            const dynamicItems = s.category?.menuItems || [];
                            const mi = dynamicItems.find((item: any) => item.id === sel.menuItemId);
                            if (mi && mi.variants && mi.variants.length > 0) {
                              hasVariants = true;
                            }
                          } else if (s.menuItem) {
                            hasVariants = (s.menuItem.variants?.length || 0) > 0;
                          }

                          if (hasVariants && !sel.variantId) return false;
                          return true;
                        });
                        return (
                          <>
                            {!allFilled && (
                              <p className="text-xs text-amber-600 font-semibold">
                                {totalSlots - filledSlots} selection(s) remaining before you can add to order.
                              </p>
                            )}
                            <div className="flex items-center gap-4">
                              <div className="flex items-center border rounded-none h-10">
                                <Button type="button" variant="ghost" size="icon" className="h-full w-10 rounded-none" onClick={() => setDealQuantity(q => Math.max(1, q - 1))}>
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-8 text-center font-bold text-sm">{dealQuantity}</span>
                                <Button type="button" variant="ghost" size="icon" className="h-full w-10 rounded-none" onClick={() => setDealQuantity(q => q + 1)}>
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              <Button
                                type="button"
                                disabled={!allFilled}
                                className="flex-1 h-10 rounded-none font-bold"
                                onClick={() => addDealToCart(configDeal)}
                              >
                                Add to Order — Rs. {configDeal.dealPrice * dealQuantity}
                              </Button>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
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
