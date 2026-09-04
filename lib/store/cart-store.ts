/**
 * Canonical cart store — single source of truth for the entire storefront.
 *
 * CartItem represents one line in the cart. The `id` (cartItemId) is a
 * deterministic key derived from menuItemId + variant + add-ons +
 * special instructions so that identical selections are merged instead of
 * duplicated.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CartAddOn {
  name: string;
  price: number;
}

export interface CartItem {
  /** Stable key used for all mutations — derived from item identity. */
  cartItemId: string;
  /** DB UUID of the menu item (null for non-catalogued deal slots). */
  menuItemId: string | null;
  name: string;
  variantName?: string;
  addOns?: CartAddOn[];
  quantity: number;
  /** Price per unit including variant + add-on deltas. */
  unitPrice: number;
  /** unitPrice × quantity — kept in sync by the store. */
  subtotal: number;
  imageUrl?: string | null;
  specialInstructions?: string;
}

/** Shape accepted by `addItem` — cartItemId is derived automatically. */
export type CartItemInput = Omit<CartItem, "cartItemId" | "subtotal">;

interface CartTotals {
  itemCount: number;
  totalPrice: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItemInput) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  /** Returns aggregated itemCount and totalPrice. */
  getTotals: () => CartTotals;
  /** Convenience alias — returns totalPrice directly. */
  getCartTotal: () => number;
  /** Convenience alias — returns itemCount directly. */
  getTotalItems: () => number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Builds a deterministic, stable cartItemId from the item's identity fields. */
function buildCartItemId(item: CartItemInput): string {
  const addOnsKey = item.addOns?.length
    ? item.addOns.map((a) => a.name).sort().join("|")
    : "";
  const instrKey = item.specialInstructions
    ? `|instr:${item.specialInstructions}`
    : "";
  return `${item.menuItemId ?? "null"}-${item.variantName ?? "base"}-${addOnsKey}${instrKey}`;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (input) =>
        set((state) => {
          const cartItemId = buildCartItemId(input);
          const existingIndex = state.items.findIndex(
            (i) => i.cartItemId === cartItemId
          );

          if (existingIndex > -1) {
            // Merge into existing line — accumulate quantity
            const updated = [...state.items];
            const existing = updated[existingIndex];
            const newQty = existing.quantity + input.quantity;
            updated[existingIndex] = {
              ...existing,
              quantity: newQty,
              subtotal: existing.unitPrice * newQty,
            };
            return { items: updated };
          }

          const newItem: CartItem = {
            ...input,
            cartItemId,
            subtotal: input.unitPrice * input.quantity,
          };
          return { items: [...state.items, newItem] };
        }),

      removeItem: (cartItemId) =>
        set((state) => ({
          items: state.items.filter((i) => i.cartItemId !== cartItemId),
        })),

      updateQuantity: (cartItemId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { items: state.items.filter((i) => i.cartItemId !== cartItemId) };
          }
          return {
            items: state.items.map((i) =>
              i.cartItemId === cartItemId
                ? { ...i, quantity, subtotal: i.unitPrice * quantity }
                : i
            ),
          };
        }),

      clearCart: () => set({ items: [] }),

      getTotals: () => {
        const items = get().items;
        return {
          itemCount: items.reduce((total, i) => total + i.quantity, 0),
          totalPrice: items.reduce((total, i) => total + i.subtotal, 0),
        };
      },

      getCartTotal: () =>
        get().items.reduce((total, i) => total + i.subtotal, 0),

      getTotalItems: () =>
        get().items.reduce((total, i) => total + i.quantity, 0),
    }),
    {
      name: "cart-storage",
    }
  )
);
