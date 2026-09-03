"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white text-zinc-900 font-sans px-4">
      <div className="text-center space-y-5 max-w-sm">
        {/* Big 404 */}
        <p className="text-[120px] md:text-[160px] font-black leading-none tracking-tighter text-zinc-100 select-none">
          404
        </p>

        {/* Divider */}
        <div className="w-12 h-[2px] bg-primary mx-auto" />

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
            Page Not Found
          </h1>
          <p className="text-sm text-zinc-500 leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        {/* Back button only */}
        <GoBackButton />
      </div>
    </div>
  );
}

function GoBackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-2 h-10 px-5 border border-zinc-300 hover:border-zinc-400 text-zinc-700 hover:text-zinc-900 text-sm font-semibold transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
      Go Back
    </button>
  );
}
