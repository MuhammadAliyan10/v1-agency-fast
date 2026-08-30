// components/features/storefront/store-closed-banner.tsx
"use client";

import { AlertTriangle } from "lucide-react";
import { STORE_CONSTANTS } from "@/lib/constants";

interface StoreClosedBannerProps {
  isOpen: boolean;
}

export function StoreClosedBanner({ isOpen }: StoreClosedBannerProps) {
  if (isOpen) return null;

  return (
    <div className="w-full bg-red-600 text-white py-3 px-4 z-[100] sticky top-0">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 text-sm font-semibold">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>
          {STORE_CONSTANTS.STORE_NAME} is currently closed. We are not accepting new orders.
        </span>
      </div>
    </div>
  );
}
