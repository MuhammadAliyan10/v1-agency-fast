"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

interface ProductGalleryProps {
  imageUrl: string | null;
  name: string;
  categoryName?: string;
}

export function ProductGallery({ imageUrl, name, categoryName }: ProductGalleryProps) {
  const router = useRouter();
  const fallbackImage = "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&h=800&fit=crop&q=80";
  const displayImage = imageUrl || fallbackImage;

  return (
    <div className="relative w-full h-[40vh] md:h-[50vh] bg-zinc-100">
      <button 
        onClick={() => router.back()}
        className="absolute top-4 left-4 z-50 bg-white/95 backdrop-blur-md p-2 shadow-md text-zinc-950 hover:bg-white active:scale-95 transition-all border border-zinc-200"
        aria-label="Go back"
      >
        <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
      </button>

      <Image
        src={displayImage}
        alt={name}
        fill
        sizes="100vw"
        className="object-cover"
        priority
      />
    </div>
  );
}
