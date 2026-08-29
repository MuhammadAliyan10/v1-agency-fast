import Link from "next/link";
import { MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
);

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
);

export function Footer() {
  return (
    <footer className="bg-zinc-950 text-zinc-300 py-12 md:py-16 border-t border-zinc-900 w-full mt-auto">
      <div className="container max-w-7xl mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-12">
          
          {/* Column 1 (Brand) */}
          <div className="flex flex-col">
            <Link href="/" className="inline-block mb-6">
              <span className="font-heading font-black text-3xl tracking-tight text-primary">
                Classy Crave<span className="text-white text-4xl leading-none -mt-1">.</span>
              </span>
            </Link>
            <p className="text-sm text-zinc-400 mb-6 max-w-xs leading-relaxed">
              Elevating the fast-food experience in Sillanwali with premium ingredients and unmatched taste.
            </p>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-zinc-800 hover:text-primary text-zinc-400">
                <FacebookIcon className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-zinc-800 hover:text-primary text-zinc-400">
                <InstagramIcon className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Column 2 (Quick Links) */}
          <div className="flex flex-col">
            <h4 className="text-white font-bold mb-6">Explore</h4>
            <nav className="flex flex-col gap-3 text-sm">
              <Link href="/" className="text-zinc-400 hover:text-primary transition-colors">Home</Link>
              <Link href="/?category=all" className="text-zinc-400 hover:text-primary transition-colors">Full Menu</Link>
              <Link href="/?category=deals" className="text-zinc-400 hover:text-primary transition-colors">Trending Deals</Link>
              <Link href="/track" className="text-zinc-400 hover:text-primary transition-colors">Track Order</Link>
            </nav>
          </div>

          {/* Column 3 (Contact) */}
          <div className="flex flex-col">
            <h4 className="text-white font-bold mb-6">Contact Us</h4>
            <ul className="flex flex-col gap-4 text-sm text-zinc-400">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary shrink-0" />
                <span>Model Town Iqbal Colony,<br />Sillanwali</span>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-[#25D366] shrink-0" />
                <a href="https://wa.me/923441588883" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">
                  0344 1588883<br />
                  <span className="text-xs text-zinc-500">(Order via WhatsApp)</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4 (Opening Hours) */}
          <div className="flex flex-col">
            <h4 className="text-white font-bold mb-6">Opening Hours</h4>
            <ul className="flex flex-col gap-3 text-sm text-zinc-400">
              <li className="flex justify-between items-center border-b border-zinc-800 pb-2">
                <span>Mon - Sun</span>
                <span className="font-medium text-white">12:00 PM - 2:00 AM</span>
              </li>
              <li className="pt-2">
                <span className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">
                  We are open late!
                </span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-zinc-900 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-500">
            © {new Date().getFullYear()} Classy Crave. All rights reserved.
          </p>
          <div className="flex gap-4 text-xs text-zinc-500">
            <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
