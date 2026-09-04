/**
 * Backward-compatibility adapter.
 *
 * All code that imports from "@/store/use-cart" continues to work unchanged.
 * Internally this is just the canonical cart store from lib/store/cart-store,
 * so there is now a single Zustand instance and a single localStorage key.
 *
 * Prefer importing from "@/lib/store/cart-store" directly in new code.
 */

export {
  useCartStore as useCart,
  type CartItem,
  type CartItemInput,
  type CartAddOn,
} from "@/lib/store/cart-store";
