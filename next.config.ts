import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // 1. Your Existing Unsplash Configs
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "source.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
      },

      // 2. High-Quality Food Stock Photography
      {
        protocol: "https",
        hostname: "images.pexels.com", // Pexels
      },
      {
        protocol: "https",
        hostname: "pixabay.com", // Pixabay
      },

      // 3. Production Image Hosting (For when the client uploads real photos)
      {
        protocol: "https",
        hostname: "res.cloudinary.com", // Cloudinary
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com", // Vercel Blob
      },

      // 4. Integrations
      {
        protocol: "https",
        hostname: "scontent.whatsapp.net", // WhatsApp CDN (If you ever pull WA profile pics)
      }
    ],
  },
};

export default nextConfig;
