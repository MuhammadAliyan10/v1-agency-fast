const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components/features/admin/orders/manual-order-dialog.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add Hook Form imports
content = content.replace(
  'import { useSession } from "@/lib/auth/session-context";',
  `import { useSession } from "@/lib/auth/session-context";\nimport { useForm, useFieldArray, Controller } from "react-hook-form";\nimport { zodResolver } from "@hookform/resolvers/zod";\nimport { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";`
);

// 2. Modify Schema to include UI fields (passthrough or just explicit)
content = content.replace(
  'specialInstructions: z.string().optional(),\n  })).min(1),',
  `specialInstructions: z.string().optional(),\n    name: z.string().optional(),\n    imageUrl: z.string().optional().nullable(),\n    variantName: z.string().optional(),\n    unitPrice: z.number().optional(),\n    totalPrice: z.number().optional(),\n    hash: z.string().optional(),\n    addOnObjects: z.array(z.any()).optional(),\n  })).min(1, { message: "Cart cannot be empty" }),`
);

// 3. Replace State and Logic (from export function to // Effects for Order Type changes)
// This is the hardest part. Let's do it using a large replacement string.

const stateLogicOldStart = 'export function ManualOrderDialog({ children, existingOrder, defaultTableId, defaultTableNumber }: { children: React.ReactNode; existingOrder?: LiveOrder; defaultTableId?: string; defaultTableNumber?: string }) {\n  const [isOpen, setIsOpen] = useState(false);\n  const queryClient = useQueryClient();\n\n  // POS State';

const stateLogicOldEnd = '  // Effects for Order Type changes';

const stateIndexStart = content.indexOf(stateLogicOldStart);
const stateIndexEnd = content.indexOf(stateLogicOldEnd);

if (stateIndexStart === -1 || stateIndexEnd === -1) {
    console.error("Could not find state logic bounds");
    process.exit(1);
}

const newStateLogic = `export function ManualOrderDialog({ children, existingOrder, defaultTableId, defaultTableNumber }: { children: React.ReactNode; existingOrder?: LiveOrder; defaultTableId?: string; defaultTableNumber?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const session = useSession();

  const form = useForm<z.infer<typeof manualOrderSchema>>({
    resolver: zodResolver(manualOrderSchema),
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
  const tableNumber = form.watch("tableNumber");
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

  const subtotal = form.watch("items").reduce((acc, item) => acc + (item.totalPrice || 0), 0);
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
      
      const addOnObjects = [];
      for (const aid of addOnIds) {
        const a = menuData?.addOns.find(a => a.id === aid);
        if (a) {
          unitPrice += a.price;
          addOnObjects.push({ id: a.id, name: a.name, price: a.price });
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
        addOnObjects,
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

  const onSubmit = async (data: z.infer<typeof manualOrderSchema>) => {
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

`;

content = content.substring(0, stateIndexStart) + newStateLogic + content.substring(stateIndexEnd);

// Fix the JSX to use form.handleSubmit
content = content.replace(
  '<div className="w-[40%] xl:w-[35%] flex flex-col bg-background border-r">',
  '<Form {...form}>\n<form onSubmit={form.handleSubmit(onSubmit)} className="w-[40%] xl:w-[35%] flex flex-col bg-background border-r">'
);

// We need to change the closing tag of the left panel to close the form
content = content.replace(
  '            </div>\n          </div>\n\n          {/* RIGHT PANEL: Menu */}',
  '            </div>\n          </form>\n          </Form>\n\n          {/* RIGHT PANEL: Menu */}'
);

// We need to change the createMutation references on the button
content = content.replace(
  'onClick={() => createMutation.mutate()}',
  'type="submit"'
);

content = content.replace(
  'disabled={cart.length === 0 || createMutation.isPending || !isFormValid}',
  'disabled={form.watch("items").length === 0 || form.formState.isSubmitting || !isFormValid}'
);

content = content.replace(
  'createMutation.isPending',
  'form.formState.isSubmitting'
).replace(
  'createMutation.isPending',
  'form.formState.isSubmitting'
);


// Replace Inputs with simple form register/SetValue since this is too complex to turn into FormField quickly, but wait, react-hook-form inputs can just use onChange=e => form.setValue
content = content.replace(
  'value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}',
  'value={customerPhone} onChange={e => form.setValue("customerPhone", e.target.value)}'
);
content = content.replace(
  'value={customerName} onChange={e => setCustomerName(e.target.value)}',
  'value={customerName} onChange={e => form.setValue("customerName", e.target.value)}'
);
content = content.replace(
  'value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)}',
  'value={deliveryAddress} onChange={e => form.setValue("deliveryAddress", e.target.value)}'
);
content = content.replace(
  'onValueChange={(val) => handleTableChange({ target: { value: val } } as any)}',
  'onValueChange={handleTableChange}'
);
content = content.replace(
  'onValueChange={setWaiterId}',
  'onValueChange={val => form.setValue("waiterId", val)}'
);
content = content.replace(
  'value={deliveryFee} \n                      onChange={e => setDeliveryFee(Number(e.target.value))}',
  'value={deliveryFee} \n                      onChange={e => form.setValue("deliveryFee", Number(e.target.value))}'
);
content = content.replace(
  'value={discountValue === 0 ? "" : discountValue}',
  'value={discountAmount === 0 ? "" : discountAmount}'
);
content = content.replace(
  'setDiscountValue(v);',
  'form.setValue("discountAmount", v);'
);
content = content.replace(
  'discountValue > maxAllowedPercent',
  'discountAmount > maxAllowedPercent'
);
content = content.replace(
  'setDiscountValue(maxAllowedPercent);',
  'form.setValue("discountAmount", maxAllowedPercent);'
);
content = content.replace(
  'setDiscountValue(maxFlat);',
  'form.setValue("discountAmount", maxFlat);'
);
content = content.replace(
  'onValueChange={(v) => setOrderType(v as any)}',
  'onValueChange={(v) => form.setValue("orderType", v as any)}'
);
content = content.replace(
  'onValueChange={(val: any) => setPaymentMethod(val)}',
  'onValueChange={(val: any) => form.setValue("paymentMethod", val)}'
);
content = content.replace(
  'onClick={() => setPaymentStatus("unpaid")}',
  'type="button" onClick={() => form.setValue("paymentStatus", "unpaid")}'
);
content = content.replace(
  'onClick={() => setPaymentStatus("paid")}',
  'type="button" onClick={() => form.setValue("paymentStatus", "paid")}'
);

// Update Effects for orderType
content = content.replace(
  '  // Effects for Order Type changes\n  useEffect(() => {\n    if (orderType === "delivery") {\n      setPaymentMethod("COD");\n      setPaymentStatus("unpaid");\n    } else {\n      setPaymentMethod("Cash");\n      setPaymentStatus("paid");\n    }\n  }, [orderType]);',
  '  useEffect(() => {\n    if (orderType === "delivery") {\n      form.setValue("paymentMethod", "COD");\n      form.setValue("paymentStatus", "unpaid");\n    } else {\n      form.setValue("paymentMethod", "Cash");\n      form.setValue("paymentStatus", "paid");\n    }\n  }, [orderType, form]);'
);


fs.writeFileSync(filePath, content, 'utf8');
console.log("Refactoring complete");
