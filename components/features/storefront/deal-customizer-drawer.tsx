// components/features/storefront/deal-customizer-drawer.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { AppDrawer } from "@/components/ui/app-drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { STORE_CONSTANTS } from "@/lib/constants";
import { useCartStore } from "@/lib/store/cart-store";
import { useCart } from "@/store/use-cart";
import { toast } from "sonner";
import {
  ShoppingBag, CheckCircle2, Minus, Plus, Sparkles, Utensils,
  Clock, ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DealVariant {
  id: string;
  name: string;
  price: number;
  isAvailable?: boolean | null;
}

export interface DealMenuItem {
  id: string;
  name: string;
  basePrice: number;
  imageUrl?: string | null;
  variants?: DealVariant[];
}

export interface DealSlot {
  id: string;
  slotName: string;
  quantity: number;
  menuItemId?: string | null;
  categoryId?: string | null;
  requiredVariantName?: string | null;
  menuItem?: (DealMenuItem & { variants?: DealVariant[] }) | null;
  category?: {
    id: string;
    name: string;
    menuItems?: DealMenuItem[];
  } | null;
}

export interface DealItem {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  dealType: "combo" | "event";
  eventLabel?: string | null;
  originalPrice: number;
  dealPrice: number;
  validUntil?: Date | string | null;
  slots: DealSlot[];
}

interface SlotSelection {
  slotId: string;
  itemId: string;
  itemName: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
}

// ─── Helper: filter items for a dynamic slot ─────────────────────────────────

function getSlotChoices(slot: DealSlot): DealMenuItem[] {
  if (!slot.category?.menuItems) return [];
  const required = slot.requiredVariantName?.trim().toLowerCase();
  if (!required) return slot.category.menuItems;
  return slot.category.menuItems.filter((item) =>
    item.variants?.some((v) => v.name.trim().toLowerCase() === required)
  );
}

// ─── SlotStep: Renders one deal slot (fixed or dynamic) ──────────────────────

function SlotStep({
  slot,
  stepNumber,
  selection,
  onSelect,
}: {
  slot: DealSlot;
  stepNumber: number;
  selection: SlotSelection | undefined;
  onSelect: (sel: SlotSelection) => void;
}) {
  const isFixed = !!slot.menuItemId && !slot.categoryId;
  const choices = useMemo(() => getSlotChoices(slot), [slot]);
  const required = slot.requiredVariantName?.trim().toLowerCase();

  if (isFixed && slot.menuItem) {
    const hasVariants = (slot.menuItem.variants?.length ?? 0) > 0;
    const isFixedComplete = !hasVariants || !!selection?.variantId;

    return (
      <div className={cn("border bg-white rounded-none overflow-hidden", isFixedComplete ? "border-border/60" : "border-amber-400")}>
        <div className={cn("flex items-center gap-2 px-4 py-2 border-b border-border/40", isFixedComplete ? "bg-zinc-100" : "bg-amber-50")}>
          <div className={cn("w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] font-black shrink-0", isFixedComplete ? "bg-green-600" : "bg-amber-500")}>
            {isFixedComplete ? "✓" : stepNumber}
          </div>
          <span className={cn("text-xs font-black uppercase tracking-wide", isFixedComplete ? "text-zinc-600" : "text-amber-800")}>
            STEP {stepNumber}: {slot.slotName.toUpperCase()}
          </span>
          <Badge className={cn("ml-auto text-[9px] font-bold rounded-none border", isFixedComplete ? "bg-green-100 text-green-700 border-green-300" : "bg-amber-100 text-amber-700 border-amber-300")}>
            Fixed Item
          </Badge>
        </div>
        <div className="flex items-center gap-3 p-4">
          {slot.menuItem.imageUrl && (
            <div className="relative w-12 h-12 shrink-0 overflow-hidden rounded-none bg-zinc-100">
              <Image src={slot.menuItem.imageUrl} alt={slot.menuItem.name} fill className="object-cover" sizes="48px" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-zinc-950">{slot.quantity}× {slot.menuItem.name}</p>
            {hasVariants && selection?.variantName && (
              <p className="text-[11px] text-zinc-500 font-medium">{selection.variantName}</p>
            )}
            {!hasVariants && (
              <p className="text-xs text-zinc-500">Included in this deal</p>
            )}
            {hasVariants && !selection?.variantId && (
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mt-1">Pick flavor below</p>
            )}
          </div>
          {isFixedComplete && <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />}
        </div>
        
        {hasVariants && (
          <div className="px-4 pb-3 pt-1 border-t border-border/40 bg-zinc-50/50">
            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-2">Choose your flavor:</p>
            <div className="flex flex-wrap gap-2">
              {slot.menuItem.variants!.map((v) => {
                const isVariantSelected = selection?.variantId === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => onSelect({
                      slotId: slot.id,
                      itemId: slot.menuItem!.id,
                      itemName: slot.menuItem!.name,
                      variantId: v.id,
                      variantName: v.name,
                      quantity: slot.quantity,
                    })}
                    className={cn(
                      "text-xs px-3 py-1.5 border font-bold transition-all rounded-none",
                      isVariantSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-zinc-300 text-zinc-700 hover:border-primary hover:text-primary bg-white"
                    )}
                  >
                    {v.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Dynamic slot — show radio group of choices
  const isComplete = !!selection;

  return (
    <div className={cn("border bg-white rounded-none overflow-hidden", isComplete ? "border-primary/50" : "border-border/60")}>
      <div className={cn(
        "flex items-center gap-2 px-4 py-2 border-b",
        isComplete ? "bg-primary/5 border-primary/20" : "bg-zinc-100 border-border/40"
      )}>
        <div className={cn(
          "w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] font-black shrink-0",
          isComplete ? "bg-primary" : "bg-zinc-400"
        )}>
          {isComplete ? "✓" : stepNumber}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-black uppercase tracking-wide text-zinc-700">
            STEP {stepNumber}: {slot.slotName.toUpperCase()}
          </span>
          {required && (
            <span className="ml-2 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5">
              {required.charAt(0).toUpperCase() + required.slice(1)} size
            </span>
          )}
        </div>
        {!isComplete && (
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider shrink-0">Choose one</span>
        )}
      </div>

      {choices.length === 0 ? (
        <div className="p-4 text-center text-xs text-zinc-400">
          No items available for this slot.
        </div>
      ) : (
        <RadioGroup
          value={selection?.itemId ?? ""}
          onValueChange={(itemId) => {
            const item = choices.find((c) => c.id === itemId);
            if (!item) return;
            if (required) {
              const variant = item.variants?.find((v) => v.name.trim().toLowerCase() === required);
              onSelect({ slotId: slot.id, itemId: item.id, itemName: item.name, variantId: variant?.id, variantName: variant?.name, quantity: slot.quantity });
            } else if (!item.variants || item.variants.length === 0) {
              onSelect({ slotId: slot.id, itemId: item.id, itemName: item.name, quantity: slot.quantity });
            } else {
              onSelect({ slotId: slot.id, itemId: item.id, itemName: item.name, variantId: undefined, variantName: undefined, quantity: slot.quantity });
            }
          }}
          className="flex flex-col divide-y divide-border/30"
        >
          {choices.map((item) => {
            const matchingVariant = required
              ? item.variants?.find((v) => v.name.trim().toLowerCase() === required)
              : null;
            const isSelected = selection?.itemId === item.id;
            const itemVariants = item.variants || [];
            const needsVariantPick = isSelected && !required && itemVariants.length > 0;

            return (
              <div key={item.id}>
                <label
                  htmlFor={`slot-${slot.id}-item-${item.id}`}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 cursor-pointer min-h-[48px] transition-colors",
                    isSelected ? "bg-primary/5" : "hover:bg-zinc-50"
                  )}
                >
                  <RadioGroupItem
                    id={`slot-${slot.id}-item-${item.id}`}
                    value={item.id}
                    className="shrink-0"
                  />
                  {item.imageUrl && (
                    <div className="relative w-10 h-10 shrink-0 overflow-hidden rounded-none bg-zinc-100">
                      <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="40px" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-bold leading-snug", isSelected ? "text-primary" : "text-zinc-900")}>
                      {item.name}
                    </p>
                    {matchingVariant && (
                      <p className="text-[11px] text-zinc-500 font-medium">
                        {matchingVariant.name} · {STORE_CONSTANTS.CURRENCY} {matchingVariant.price}
                      </p>
                    )}
                    {!required && itemVariants.length > 0 && !isSelected && (
                      <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                        {itemVariants.map(v => v.name).join(" · ")}
                      </p>
                    )}
                  </div>
                  {isSelected && selection?.variantId && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                  {isSelected && !required && itemVariants.length > 0 && !selection?.variantId && (
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider shrink-0">Pick flavor</span>
                  )}
                </label>

                {needsVariantPick && (
                  <div className="px-4 pb-3 bg-primary/5 border-t border-primary/10">
                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mt-2 mb-2">
                      Choose your flavor:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {itemVariants.map((v) => {
                        const isVariantSelected = selection?.variantId === v.id;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => onSelect({
                              slotId: slot.id,
                              itemId: item.id,
                              itemName: item.name,
                              variantId: v.id,
                              variantName: v.name,
                              quantity: slot.quantity,
                            })}
                            className={cn(
                              "text-xs px-3 py-1.5 border font-bold transition-all rounded-none",
                              isVariantSelected
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-zinc-300 text-zinc-700 hover:border-primary hover:text-primary bg-white"
                            )}
                          >
                            {v.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </RadioGroup>
      )}
    </div>
  );
}

// ─── DealCard ─────────────────────────────────────────────────────────────────

export function DealCard({ deal }: { deal: DealItem }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selections, setSelections] = useState<Record<string, SlotSelection>>({});

  const addItemStore = useCartStore((state) => state.addItem);

  const savings = deal.originalPrice > deal.dealPrice ? deal.originalPrice - deal.dealPrice : 0;
  const savingsPct = deal.originalPrice > deal.dealPrice && deal.originalPrice > 0 
    ? Math.round((savings / deal.originalPrice) * 100) 
    : 0;

  const isExpiringSoon = deal.validUntil
    ? (new Date(deal.validUntil).getTime() - Date.now()) < 24 * 60 * 60 * 1000
    : false;

  const dynamicSlots = useMemo(() =>
    deal.slots.filter((s) => s.categoryId && !s.menuItemId),
    [deal.slots]
  );
  const fixedSlots = useMemo(() =>
    deal.slots.filter((s) => s.menuItemId && !s.categoryId),
    [deal.slots]
  );

  const isComplete = useMemo(() => {
    const dynamicComplete = dynamicSlots.every((s) => {
      const sel = selections[s.id];
      if (!sel) return false;
      const choices = getSlotChoices(s);
      const selectedItem = choices.find(c => c.id === sel.itemId);
      const hasVariants = (selectedItem?.variants?.length ?? 0) > 0;
      if (hasVariants && !s.requiredVariantName && !sel.variantId) return false;
      return true;
    });

    const fixedComplete = fixedSlots.every((s) => {
      if (!s.menuItem) return true;
      const hasVariants = (s.menuItem.variants?.length ?? 0) > 0;
      if (!hasVariants) return true;
      const sel = selections[s.id];
      if (!sel || !sel.variantId) return false;
      return true;
    });

    return dynamicComplete && fixedComplete;
  }, [dynamicSlots, fixedSlots, selections]);

  useEffect(() => {
    if (!drawerOpen) return;
    const auto: Record<string, SlotSelection> = {};
    dynamicSlots.forEach((slot) => {
      const choices = getSlotChoices(slot);
      if (choices.length > 0 && !selections[slot.id]) {
        const item = choices[0];
        const required = slot.requiredVariantName?.trim().toLowerCase();
        const variant = required ? item.variants?.find((v) => v.name.trim().toLowerCase() === required) : undefined;
        auto[slot.id] = { slotId: slot.id, itemId: item.id, itemName: item.name, variantId: variant?.id, variantName: variant?.name, quantity: slot.quantity };
      }
    });
    if (Object.keys(auto).length > 0) {
      setSelections((prev) => ({ ...auto, ...prev }));
    }
  }, [drawerOpen, dynamicSlots]);

  const handleSelect = (sel: SlotSelection) => {
    setSelections((prev) => ({ ...prev, [sel.slotId]: sel }));
  };

  const handleAddToCart = () => {
    if (!isComplete) return;

    const parts: string[] = [];
    let stepNum = 1;
    deal.slots.forEach((slot) => {
      if (slot.menuItemId && slot.menuItem) {
        const sel = selections[slot.id];
        const variantPart = sel?.variantName ? ` (${sel.variantName})` : "";
        parts.push(`Step ${stepNum}: ${slot.quantity}× ${slot.menuItem.name}${variantPart}`);
      } else {
        const sel = selections[slot.id];
        if (sel) {
          const variantPart = sel.variantName ? ` (${sel.variantName})` : "";
          parts.push(`Step ${stepNum}: ${sel.quantity}× ${sel.itemName}${variantPart}`);
        }
      }
      stepNum++;
    });
    const instructionsText = `[DEAL: ${deal.name}] - ${parts.join(", ")}`;

    const addOnsList = deal.slots.map((slot) => {
      if (slot.menuItem) {
        const sel = selections[slot.id];
        const variantPart = sel?.variantName ? ` (${sel.variantName})` : "";
        return { name: `${slot.quantity}× ${slot.menuItem.name}${variantPart}`, price: 0 };
      }
      const sel = selections[slot.id];
      return { name: `${sel.quantity}× ${sel.itemName}${sel.variantName ? ` (${sel.variantName})` : ""}`, price: 0 };
    });

    addItemStore({
      id: `deal-${deal.id}-${Date.now()}`,
      name: `[DEAL] ${deal.name}`,
      price: deal.dealPrice,
      quantity,
      options: {
        imageUrl: deal.imageUrl || null,
        variant: deal.eventLabel || "Combo Offer",
        addOns: addOnsList,
        specialInstructions: instructionsText,
      },
    });

    toast.success(`${quantity}× "${deal.name}" added to cart!`);
    setDrawerOpen(false);
    setQuantity(1);
    setSelections({});
  };

  return (
    <>
      {/* ── Card ─────────────────────────────────────── */}
      <div className="group bg-white border border-zinc-200/80 hover:border-primary/50 flex flex-col overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 rounded-none">
        {/* Image Banner */}
        <div className="relative aspect-[16/9] w-full bg-zinc-100 overflow-hidden">
          {deal.imageUrl ? (
            <Image
              src={deal.imageUrl} alt={deal.name} fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/10 via-amber-50 to-primary/5 flex flex-col items-center justify-center gap-2">
              <Sparkles className="w-10 h-10 text-primary opacity-50" />
              <span className="text-[10px] font-black text-primary tracking-widest uppercase">{deal.eventLabel || "Special Deal"}</span>
            </div>
          )}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
            {savingsPct > 0 && (
              <Badge className="bg-primary text-primary-foreground font-black text-xs px-2.5 py-1 rounded-none shadow-md">SAVE {savingsPct}%</Badge>
            )}
            {deal.dealType === "event" && deal.eventLabel && (
              <Badge className="bg-black text-white font-bold text-xs px-2 py-0.5 rounded-none">{deal.eventLabel}</Badge>
            )}
          </div>
          {savings > 0 && (
            <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-none">
              Save {STORE_CONSTANTS.CURRENCY} {savings}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col flex-1">
          <h2 className="font-heading font-black text-lg text-zinc-950 tracking-tight leading-snug group-hover:text-primary transition-colors mb-1">
            {deal.name}
          </h2>
          {deal.description && (
            <p className="text-xs text-zinc-500 mb-4 line-clamp-2 leading-relaxed">{deal.description}</p>
          )}

          {/* Slot list preview */}
          {deal.slots.length > 0 && (
            <div className="mb-5 bg-zinc-50 p-3 border border-zinc-100">
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1">
                <Utensils className="w-3 h-3 text-primary" /> What&apos;s Included:
              </p>
              <ul className="space-y-1.5">
                {deal.slots.map((slot, idx) => (
                  <li key={idx} className="flex items-center text-xs text-zinc-800 font-semibold gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                    <span>
                      <span className="font-bold text-primary mr-1">{slot.quantity}×</span>
                      {slot.slotName}
                      {slot.categoryId && (
                        <span className="ml-1.5 text-[10px] text-primary font-bold bg-primary/10 px-1 py-0.5">
                          (Choose {slot.requiredVariantName || "flavor"})
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isExpiringSoon && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-600 font-bold mb-4 bg-amber-50 px-2.5 py-1 border border-amber-200/60">
              <Clock className="w-3.5 h-3.5 animate-pulse" /> Limited time remaining!
            </div>
          )}

          <div className="mt-auto pt-4 border-t border-zinc-100 flex items-center justify-between gap-3">
            <div>
              <span className="text-xl font-black text-zinc-950">{STORE_CONSTANTS.CURRENCY} {deal.dealPrice}</span>
              {savings > 0 && (
                <span className="text-xs text-zinc-400 line-through ml-2">{STORE_CONSTANTS.CURRENCY} {deal.originalPrice}</span>
              )}
            </div>
            <Button
              onClick={() => setDrawerOpen(true)}
              className="h-11 px-5 font-bold text-xs uppercase tracking-wider rounded-none gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              {dynamicSlots.length > 0 ? "Customize & Order" : "Add to Cart"}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Customizer Drawer ────────────────────────── */}
      <AppDrawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <div className="flex flex-col h-full bg-background rounded-none min-h-0 overflow-hidden">
          
          {/* Scrollable Content Body with Side Padding */}
          <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-6">
            
            {/* Image Header */}
            {deal.imageUrl ? (
              <div className="relative w-full aspect-[4/3] shrink-0 bg-muted rounded-none overflow-hidden mb-4 mt-2">
                <Image src={deal.imageUrl} alt={deal.name} fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4">
                  {savingsPct > 0 && (
                    <Badge className="bg-primary text-primary-foreground text-[10px] font-black rounded-none mb-1">
                      {savingsPct}% OFF
                    </Badge>
                  )}
                  <h2 className="text-white font-heading font-black text-xl leading-tight">{deal.name}</h2>
                </div>
              </div>
            ) : (
              <div className="mb-4 mt-2">
                {savingsPct > 0 && (
                  <Badge className="bg-primary text-primary-foreground text-[10px] font-black rounded-none mb-1">
                    {savingsPct}% OFF
                  </Badge>
                )}
                <h2 className="font-heading font-black text-2xl text-zinc-950">{deal.name}</h2>
                {deal.description && <p className="text-xs text-zinc-500 mt-1">{deal.description}</p>}
              </div>
            )}

            {dynamicSlots.length > 0 && (
              <p className="text-xs text-zinc-500 font-medium flex items-center gap-1 mb-4 bg-muted/50 p-2.5">
                <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" />
                Select your preferences for {dynamicSlots.length} item{dynamicSlots.length > 1 ? "s" : ""} below:
              </p>
            )}

            {/* Slot Steps */}
            <div className="space-y-4">
              {deal.slots.map((slot, index) => (
                <SlotStep
                  key={slot.id}
                  slot={slot}
                  stepNumber={index + 1}
                  selection={selections[slot.id]}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          </div>

          {/* Sticky Bottom Actions Footer */}
          <div className="shrink-0 p-4 bg-background border-t border-border z-50">
            <div className="flex flex-col gap-3 max-w-xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total</span>
                  <span className="text-xl font-black text-zinc-950">{STORE_CONSTANTS.CURRENCY} {deal.dealPrice * quantity}</span>
                </div>
                <div className="flex items-center border border-border h-10">
                  <Button type="button" variant="ghost" size="icon" className="h-full w-10 rounded-none hover:bg-muted" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}>
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-8 text-center font-bold text-sm">{quantity}</span>
                  <Button type="button" variant="ghost" size="icon" className="h-full w-10 rounded-none hover:bg-muted" onClick={() => setQuantity(quantity + 1)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Button
                onClick={handleAddToCart}
                disabled={!isComplete}
                className="w-full h-12 font-bold text-sm uppercase tracking-wider rounded-none gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg active:scale-[0.98] transition-transform"
              >
                <ShoppingBag className="w-4 h-4" />
                {isComplete
                  ? `Add to Cart · ${STORE_CONSTANTS.CURRENCY} ${deal.dealPrice * quantity}`
                  : `Choose all items to continue (${Object.keys(selections).length}/${dynamicSlots.length} done)`}
              </Button>
            </div>
          </div>
        </div>
      </AppDrawer>
    </>
  );
}
