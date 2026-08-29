import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  cartItemId: string;
  menuItemId: string;
  name: string;
  variantName?: string;
  addOns?: { name: string; price: number }[];
  quantity: number;
  unitPrice: number;
  subtotal: number;
  imageUrl?: string;
  specialInstructions?: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "cartItemId">) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getCartTotal: () => number;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (item) => set((state) => {
        const addOnsKey = item.addOns 
          ? item.addOns.map((a) => a.name).sort().join("|") 
          : "";
        const instructionsKey = item.specialInstructions ? `|instr:${item.specialInstructions}` : "";
        
        const cartItemId = `${item.menuItemId}-${item.variantName || "base"}-${addOnsKey}${instructionsKey}`;
        
        const existingIndex = state.items.findIndex((i) => i.cartItemId === cartItemId);
        
        if (existingIndex > -1) {
          const updatedItems = [...state.items];
          const existingItem = updatedItems[existingIndex];
          const newQuantity = existingItem.quantity + item.quantity;
          
          updatedItems[existingIndex] = {
            ...existingItem,
            quantity: newQuantity,
            subtotal: existingItem.unitPrice * newQuantity
          };
          
          return { items: updatedItems };
        }
        
        return { 
          items: [...state.items, { ...item, cartItemId }] 
        };
      }),
      
      removeItem: (cartItemId) => set((state) => ({
        items: state.items.filter((item) => item.cartItemId !== cartItemId)
      })),
      
      updateQuantity: (cartItemId, quantity) => set((state) => {
        if (quantity <= 0) {
          return {
            items: state.items.filter((item) => item.cartItemId !== cartItemId)
          };
        }
        
        return {
          items: state.items.map((item) => 
            item.cartItemId === cartItemId 
              ? { ...item, quantity, subtotal: item.unitPrice * quantity } 
              : item
          )
        };
      }),
      
      clearCart: () => set({ items: [] }),
      
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
      
      getCartTotal: () => {
        return get().items.reduce((total, item) => total + item.subtotal, 0);
      },
    }),
    {
      name: "classy-crave-cart",
    }
  )
);
