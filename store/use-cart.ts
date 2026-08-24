import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  cartItemId: string;
  menuItemId: string;
  name: string;
  imageUrl?: string | null;
  basePrice: number;
  variant?: {
    id: string;
    name: string;
    price: number;
  } | null;
  addOns?: Array<{
    id: string;
    name: string;
    price: number;
  }>;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface CartStore {
  items: CartItem[];
  cartTotal: number;
  addItem: (item: Omit<CartItem, "cartItemId" | "subtotal" | "unitPrice">) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
}

const calculateItemSubtotal = (item: Pick<CartItem, "basePrice" | "variant" | "addOns" | "quantity">) => {
  let unitPrice = item.variant ? item.variant.price : item.basePrice;
  if (item.addOns && item.addOns.length > 0) {
    unitPrice += item.addOns.reduce((sum, addon) => sum + addon.price, 0);
  }
  return unitPrice * item.quantity;
};

const calculateUnit = (item: Pick<CartItem, "basePrice" | "variant" | "addOns">) => {
  let unitPrice = item.variant ? item.variant.price : item.basePrice;
  if (item.addOns && item.addOns.length > 0) {
    unitPrice += item.addOns.reduce((sum, addon) => sum + addon.price, 0);
  }
  return unitPrice;
};

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      cartTotal: 0,
      addItem: (newItem) => {
        set((state) => {
          const unitPrice = calculateUnit(newItem);
          // Generate a unique ID based on the item, variant, and add-ons combination
          const addOnIds = newItem.addOns?.map((a) => a.id).sort().join(",") || "";
          const variantId = newItem.variant?.id || "default";
          const cartItemId = `${newItem.menuItemId}-${variantId}-${addOnIds}`;

          const existingItemIndex = state.items.findIndex((i) => i.cartItemId === cartItemId);

          let updatedItems;
          if (existingItemIndex > -1) {
            // Item exactly like this already exists, just increase quantity
            updatedItems = [...state.items];
            const existing = updatedItems[existingItemIndex];
            const newQuantity = existing.quantity + newItem.quantity;
            updatedItems[existingItemIndex] = {
              ...existing,
              quantity: newQuantity,
              subtotal: unitPrice * newQuantity,
            };
          } else {
            // New unique item combination
            updatedItems = [
              ...state.items,
              {
                ...newItem,
                cartItemId,
                unitPrice,
                subtotal: unitPrice * newItem.quantity,
              },
            ];
          }

          const cartTotal = updatedItems.reduce((sum, item) => sum + item.subtotal, 0);
          return { items: updatedItems, cartTotal };
        });
      },
      removeItem: (cartItemId) => {
        set((state) => {
          const updatedItems = state.items.filter((i) => i.cartItemId !== cartItemId);
          const cartTotal = updatedItems.reduce((sum, item) => sum + item.subtotal, 0);
          return { items: updatedItems, cartTotal };
        });
      },
      updateQuantity: (cartItemId, quantity) => {
        set((state) => {
          if (quantity <= 0) {
            const updatedItems = state.items.filter((i) => i.cartItemId !== cartItemId);
            const cartTotal = updatedItems.reduce((sum, item) => sum + item.subtotal, 0);
            return { items: updatedItems, cartTotal };
          }

          const updatedItems = state.items.map((item) =>
            item.cartItemId === cartItemId
              ? { ...item, quantity, subtotal: item.unitPrice * quantity }
              : item
          );
          const cartTotal = updatedItems.reduce((sum, item) => sum + item.subtotal, 0);
          return { items: updatedItems, cartTotal };
        });
      },
      clearCart: () => set({ items: [], cartTotal: 0 }),
    }),
    {
      name: "classy-crave-cart", // key in local storage
    }
  )
);
