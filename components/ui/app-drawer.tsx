import * as React from "react"
import { Drawer, DrawerContent, DrawerOverlay, DrawerPortal } from "@/components/ui/drawer"
import { cn } from "@/lib/utils"

interface AppDrawerProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
}

export function AppDrawer({ children, open, onOpenChange, className }: AppDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerPortal>
        <DrawerOverlay className="bg-black/60 backdrop-blur-sm" />
        <DrawerContent className={cn("rounded-none border-0 mt-24 flex flex-col max-h-[85vh]", className)}>
          <div className="mx-auto mt-4 h-1 w-[40px] shrink-0 bg-muted/50 rounded-full mb-4" />
          <div className="flex-1 overflow-y-auto overscroll-none px-4 pb-safe">
            {children}
          </div>
        </DrawerContent>
      </DrawerPortal>
    </Drawer>
  )
}
