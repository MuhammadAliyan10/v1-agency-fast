"use client";

import React from "react";
import Image from "next/image";

interface ProductGalleryProps {
  imageUrl: string | null;
  name: string;
  categoryName?: string;
}

export function ProductGallery({ imageUrl, name, categoryName }: ProductGalleryProps) {
  const fallbackImage = `https://source.unsplash.com/featured/?${encodeURIComponent(categoryName || name || 'food')}`;
  const displayImage = imageUrl || fallbackImage;

  return (
    <div className="relative w-full h-64 md:h-80 bg-muted">
      <Image
        src={displayImage}
        alt={name}
        fill
        sizes="100vw"
        className="object-cover"
        priority
      />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
    </div>
  );
}
