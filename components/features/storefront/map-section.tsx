"use client";

import React from "react";

export function MapSection() {
  return (
    <section className="py-12 md:py-16 w-full">
      <div className="flex flex-col items-center mb-8 px-4">
        <h2 className="text-3xl font-serif font-black uppercase tracking-tight text-center mb-2">Drop by for a Bite</h2>
        <p className="text-muted-foreground text-center">
          Model Town Iqbal Colony, Sillanwali
        </p>
      </div>
      
      <div className="w-[100vw] relative left-1/2 -translate-x-1/2 h-[40vh] min-h-[350px] max-h-[500px] overflow-hidden bg-muted">
        {/* Developer Note: Replace this iframe src with the exact Google Maps Embed link for Classy Crave */}
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3410.6387082496734!2d72.5350!3d31.8200!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3923055555555555%3A0x0!2sSillanwali%2C%20Punjab%2C%20Pakistan!5e0!3m2!1sen!2s!4v1700000000000!5m2!1sen!2s"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen={true}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="absolute inset-0 w-full h-full"
          title="Classy Crave Location in Sillanwali"
        />
      </div>
    </section>
  );
}
