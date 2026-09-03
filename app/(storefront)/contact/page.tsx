"use client";

import React, { useState } from "react";
import { MapPin, Phone, Copy, Check, ExternalLink, Clock } from "lucide-react";
import { toast } from "sonner";
import { STORE_CONSTANTS } from "@/lib/constants";

// Custom Social Icons
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

export default function ContactPage() {
  const [copiedPhone, setCopiedPhone] = useState(false);

  const phoneNum = STORE_CONSTANTS.PHONE_NUMBER;
  const rawPhone = STORE_CONSTANTS.RAW_PHONE_NUMBER;
  const whatsappNum = STORE_CONSTANTS.WHATSAPP_NUMBER;
  const addressText = STORE_CONSTANTS.ADDRESS;

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(rawPhone);
    setCopiedPhone(true);
    toast.success("Phone number copied to clipboard!");
    setTimeout(() => setCopiedPhone(false), 2500);
  };

  return (
    <div className="flex-1 bg-white text-zinc-900 font-sans pb-72 md:pb-36 pt-6 px-4 md:px-8 min-h-screen">
      <div className="max-w-3xl mx-auto space-y-8 mb-16">
        
        {/* Page Header */}
        <div className="border-b border-zinc-200 pb-4">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-950">
            Contact Us
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Get in touch with Classy Crave Sillanwali for orders & inquiries.
          </p>
        </div>

        {/* 1. Location in Text */}
        <div className="bg-zinc-50 border border-zinc-200 p-5 rounded-none space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            <MapPin className="w-4 h-4 text-primary" /> Location
          </div>
          <p className="text-sm font-semibold text-zinc-950 leading-relaxed">
            {addressText}
          </p>
          <div className="flex items-center gap-2 text-xs text-zinc-500 pt-1">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span>Open Daily: 12:00 PM – 01:00 AM</span>
          </div>
        </div>

        {/* 2. Phone Number */}
        <div className="bg-zinc-50 border border-zinc-200 p-5 rounded-none space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              <Phone className="w-4 h-4 text-primary" /> Phone Number
            </div>
            <span className="text-xs text-zinc-400 font-medium">Direct Call</span>
          </div>
          
          <div className="flex items-center justify-between gap-4">
            <span className="text-lg md:text-xl font-bold font-mono text-zinc-950 tracking-tight">
              {phoneNum}
            </span>

            <div className="flex items-center gap-2">
              <a
                href={`tel:${rawPhone}`}
                className="h-9 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" /> Call
              </a>
              <button
                type="button"
                onClick={handleCopyPhone}
                className="h-9 px-3 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-800 font-semibold text-xs flex items-center gap-1.5 transition-colors"
              >
                {copiedPhone ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPhone ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Order on WhatsApp Button */}
        <div>
          <a
            href={`https://wa.me/${whatsappNum}?text=Hello%20Classy%20Crave!%20I%20would%20like%20to%20place%20an%20order.`}
            target="_blank"
            rel="noreferrer"
            className="w-full h-13 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 transition-colors shadow-sm py-3.5"
          >
            <WhatsAppIcon className="w-5 h-5" /> Order on WhatsApp <ExternalLink className="w-4 h-4 opacity-80" />
          </a>
        </div>

        {/* 4. Social Media Icons (Follow Us Here) */}
        <div className="border-t border-zinc-200 pt-6 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Follow Us Here
          </h2>

          <div className="flex flex-wrap items-center gap-3">
            {/* Instagram */}
            <a
              href={STORE_CONSTANTS.INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="h-10 px-4 bg-zinc-50 border border-zinc-200 hover:border-zinc-300 text-zinc-800 text-xs font-medium flex items-center gap-2 transition-colors"
            >
              <InstagramIcon className="w-4 h-4 text-pink-600" />
              <span>Instagram</span>
            </a>

            {/* Facebook */}
            <a
              href={STORE_CONSTANTS.FACEBOOK_URL}
              target="_blank"
              rel="noreferrer"
              className="h-10 px-4 bg-zinc-50 border border-zinc-200 hover:border-zinc-300 text-zinc-800 text-xs font-medium flex items-center gap-2 transition-colors"
            >
              <FacebookIcon className="w-4 h-4 text-blue-600" />
              <span>Facebook</span>
            </a>

            {/* WhatsApp Updates */}
            <a
              href={`https://wa.me/${whatsappNum}`}
              target="_blank"
              rel="noreferrer"
              className="h-10 px-4 bg-zinc-50 border border-zinc-200 hover:border-zinc-300 text-zinc-800 text-xs font-medium flex items-center gap-2 transition-colors"
            >
              <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>

        {/* 5. Google Map Location */}
        <div className="border-t border-zinc-200 pt-6 space-y-3 pb-12">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Location Map
            </h2>
            <span className="text-xs text-zinc-400">RGFV+2CV Sillanwali</span>
          </div>

          <div className="border border-zinc-200 overflow-hidden bg-zinc-100 mb-12 shadow-sm">
            <iframe
              title="Classy Crave Location Map"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3395.733575647573!2d72.5358055!3d31.8263889!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3922f3e8f8ec26e1%3A0x6b772f7c00e12345!2sModel%20Town%20Iqbal%20Colony%2C%20Sillanwali%2C%20Pakistan!5e0!3m2!1sen!2spk!4v1700000000000!5m2!1sen!2spk"
              width="100%"
              height="340"
              style={{ border: 0 }}
              allowFullScreen={false}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full"
            />
          </div>
        </div>

      </div>
    </div>
  );
}
