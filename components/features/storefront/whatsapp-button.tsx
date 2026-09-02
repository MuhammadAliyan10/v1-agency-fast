"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WhatsAppButtonProps {
  orderId: string;
  status: string;
}

export function WhatsAppButton({ orderId, status }: WhatsAppButtonProps) {
  const restaurantNumber = "923441588883";
  
  const handleWhatsAppClick = () => {
    const message = `Hello Classy Crave! I just placed an order on the website.\n*Order ID:* ${orderId}\n*Status:* ${status}\nCan you please confirm?`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${restaurantNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, "_blank");
  };

  return (
    <Button 
      onClick={handleWhatsAppClick}
      className="w-full h-14 text-lg font-bold shadow-lg bg-[#25D366] hover:bg-[#20bd5a] text-white transition-all active:scale-[0.98] border-none"
    >
      <MessageCircle className="w-5 h-5 mr-2" />
      Contact via WhatsApp
    </Button>
  );
}
