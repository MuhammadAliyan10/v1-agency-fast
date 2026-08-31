// components/features/admin/orders/manual-order-dialog.tsx
"use client";

import { useState, useEffect, useTransition } from "react";
import { Search, Plus, Minus, Trash2, ShoppingBag, Phone, User, MapPin, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { createManualOrder, getMenuForManualOrder } from "@/server/actions/live-orders";
import { STORE_CONSTANTS } from "@/lib/constants";

interface MenuItemVariant {
  id: string;
  name: string;
  price: number;
}

interface MenuItem {
  id: string;
  name: string;
  basePrice: number;
  imageUrl: string | null;
  variants: MenuItemVariant[];
  category: { name: string } | null;
}

interface CartLine {
  menuItemId: string;
  variantId?: string;
  itemName: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  specialInstructions?: string;
}

interface ManualOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManualOrderDialog({ open, onOpenChange }: ManualOrderDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuSearch, setMenuSearch] = useState("");
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderType, setOrderType] = useState<"delivery" | "pickup">("delivery");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "JazzCash" | "EasyPaisa">("COD");

  useEffect(() => {
    if (!open) return;
    getMenuForManualOrder().then((res) => {
      if (res.success) setMenuItems((res.data as MenuItem[]) || []);
    });
  }, [open]);

  const filteredItems = menuItems.filter((item) =>
    item.name.toLowerCase().includes(menuSearch.toLowerCase()) ||
    item.category?.name.toLowerCase().includes(menuSearch.toLowerCase())
  );

  const getItemPrice = (item: MenuItem): { price: number; variantId?: string; variantName?: string } => {
    const selectedVariantId = selectedVariants[item.id];
    if (item.variants.length > 0) {
      const variant = item.variants.find((v) => v.id === selectedVariantId) || item.variants[0];
      return { price: variant.price, variantId: variant.id, variantName: variant.name };
    }
    return { price: item.basePrice };
  };

  const addToCart = (item: MenuItem) => {
    const { price, variantId, variantName } = getItemPrice(item);
    const lineKey = `${item.id}-${variantId ?? "base"}`;

    setCartLines((prev) => {
      const existing = prev.findIndex((l) => `${l.menuItemId}-${l.variantId ?? "base"}` === lineKey);
      if (existing > -1) {
        const updated = [...prev];
        const line = updated[existing];
        const newQty = line.quantity + 1;
        updated[existing] = { ...line, quantity: newQty, subtotal: line.unitPrice * newQty };
        return updated;
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          variantId,
          itemName: item.name,
          variantName,
          quantity: 1,
          unitPrice: price,
          subtotal: price,
        },
      ];
    });
  };

  const updateLineQty = (index: number, delta: number) => {
    setCartLines((prev) => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) {
        updated.splice(index, 1);
        return updated;
      }
      updated[index] = { ...updated[index], quantity: newQty, subtotal: updated[index].unitPrice * newQty };
      return updated;
    });
  };

  const updateLineNote = (index: number, note: string) => {
    setCartLines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], specialInstructions: note };
      return updated;
    });
  };

  const subtotal = cartLines.reduce((sum, l) => sum + l.subtotal, 0);
  const deliveryFee = orderType === "pickup" ? 0 : STORE_CONSTANTS.DELIVERY_FEE;
  const total = subtotal + deliveryFee;

  const handleSubmit = () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error("Customer name and phone are required");
      return;
    }
    if (cartLines.length === 0) {
      toast.error("Add at least one item to the order");
      return;
    }
    if (orderType === "delivery" && !deliveryAddress.trim()) {
      toast.error("Delivery address is required");
      return;
    }

    startTransition(async () => {
      const res = await createManualOrder({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        orderType,
        deliveryAddress: orderType === "pickup" ? undefined : deliveryAddress.trim(),
        deliveryNotes: deliveryNotes.trim() || undefined,
        paymentMethod,
        items: cartLines,
      });

      if (res.success) {
        toast.success(`Order #${res.orderId} created successfully!`);
        // Reset
        setCartLines([]);
        setCustomerName("");
        setCustomerPhone("");
        setDeliveryAddress("");
        setDeliveryNotes("");
        setOrderType("delivery");
        setPaymentMethod("COD");
        setMenuSearch("");
        onOpenChange(false);
      } else {
        toast.error(res.error ?? "Failed to create order");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl lg:max-w-5xl w-full h-[95vh] md:h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            New Manual Order
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col md:flex-row flex-1 min-h-0">
          {/* LEFT: Menu Picker */}
          <div className="flex flex-col w-full md:w-[55%] border-b md:border-b-0 md:border-r min-h-[50%] md:min-h-0 flex-1">
            <div className="p-4 border-b shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search menu..."
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <ScrollArea className="flex-1 min-h-0 overflow-hidden">
              <div className="p-3 space-y-2">
                {filteredItems.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">No items found</p>
                )}
                {filteredItems.map((item) => {
                  const { price } = getItemPrice(item);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.category?.name}</p>
                        {item.variants.length > 0 && (
                          <Select
                            value={selectedVariants[item.id] || item.variants[0]?.id}
                            onValueChange={(val) =>
                              setSelectedVariants((prev) => ({ ...prev, [item.id]: val }))
                            }
                          >
                            <SelectTrigger className="h-6 text-xs mt-1 w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {item.variants.map((v) => (
                                <SelectItem key={v.id} value={v.id} className="text-xs">
                                  {v.name} — Rs. {v.price}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-bold text-sm">Rs. {price}</span>
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0 rounded-full" onClick={() => addToCart(item)}>
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* RIGHT: Order Summary + Customer Details */}
          <div className="flex flex-col w-full md:w-[45%] min-h-[50%] md:min-h-0 flex-1">
            <Tabs defaultValue="items" className="flex flex-col flex-1 min-h-0">
              <TabsList className="rounded-none border-b px-4 h-12 justify-start bg-transparent shrink-0">
                <TabsTrigger value="items" className="rounded-md data-[state=active]:bg-muted">
                  Items {cartLines.length > 0 && <Badge className="ml-1 h-5 px-1.5 text-xs">{cartLines.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="customer" className="rounded-md data-[state=active]:bg-muted">
                  Customer
                </TabsTrigger>
              </TabsList>

              {/* Cart Items Tab */}
              <TabsContent value="items" className="flex-1 flex flex-col min-h-0 mt-0">
                <ScrollArea className="flex-1 min-h-0 overflow-hidden">
                  <div className="p-4 space-y-3">
                    {cartLines.length === 0 && (
                      <div className="text-center py-10 text-muted-foreground text-sm">
                        <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        Add items from the menu
                      </div>
                    )}
                    {cartLines.map((line, idx) => (
                      <div key={idx} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{line.itemName}</p>
                            {line.variantName && (
                              <p className="text-xs text-muted-foreground">{line.variantName}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateLineQty(idx, -1)}>
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-5 text-center font-bold text-sm">{line.quantity}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateLineQty(idx, 1)}>
                              <Plus className="w-3 h-3" />
                            </Button>
                            <span className="font-semibold text-sm ml-1 min-w-[60px] text-right">
                              Rs. {line.subtotal}
                            </span>
                          </div>
                        </div>
                        <Input
                          placeholder="Special instructions (optional)"
                          className="h-7 text-xs"
                          value={line.specialInstructions || ""}
                          onChange={(e) => updateLineNote(idx, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {cartLines.length > 0 && (
                  <div className="p-4 border-t space-y-1 text-sm shrink-0">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>Rs. {subtotal}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Delivery Fee</span>
                      <span>{orderType === "pickup" ? "Free" : `Rs. ${deliveryFee}`}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base pt-1 border-t">
                      <span>Total</span>
                      <span>Rs. {total}</span>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Customer Details Tab */}
              <TabsContent value="customer" className="flex-1 mt-0 overflow-auto">
                <div className="p-4 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Customer Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input className="pl-9" placeholder="Ali Khan" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Phone *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input className="pl-9" placeholder="03XX-XXXXXXX" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Order Type</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["delivery", "pickup"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setOrderType(type)}
                          className={`py-2.5 text-sm font-semibold rounded-lg border transition-all capitalize ${
                            orderType === type
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-muted hover:bg-muted/40"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {orderType === "delivery" && (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase text-muted-foreground">Delivery Address *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Textarea
                          className="pl-9 min-h-[80px] resize-none"
                          placeholder="House #, Street, Area, City"
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Order Notes</Label>
                    <Textarea
                      className="min-h-[60px] resize-none"
                      placeholder="Any notes for the kitchen or rider..."
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COD">Cash on Delivery</SelectItem>
                        <SelectItem value="JazzCash">JazzCash</SelectItem>
                        <SelectItem value="EasyPaisa">EasyPaisa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t shrink-0 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || cartLines.length === 0} className="gap-2 min-w-[160px]">
            {isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Creating Order...</>
            ) : (
              <><ShoppingBag className="w-4 h-4" /> Create Order • Rs. {total}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
