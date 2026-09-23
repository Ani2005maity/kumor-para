import React from 'react';
import { ShieldCheck, HeartHandshake, Sparkles, Truck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-charcoal-900 text-stone-warm-300 border-t border-charcoal-800">
      {/* Value Proposition Highlights */}
      <div className="border-b border-charcoal-800 bg-charcoal-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-terracotta-900/60 border border-terracotta-700/50 flex items-center justify-center text-terracotta-400 shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-stone-warm-100">100% Authentic Handmade</h4>
                <p className="text-xs text-stone-warm-400 mt-1 leading-relaxed">
                  No mass factory items. Every piece is handcrafted by registered Indian master creators.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-terracotta-900/60 border border-terracotta-700/50 flex items-center justify-center text-terracotta-400 shrink-0">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-stone-warm-100">Direct Creator Support</h4>
                <p className="text-xs text-stone-warm-400 mt-1 leading-relaxed">
                  90%+ of sale value goes directly to artisan bank accounts without middlemen margins.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-terracotta-900/60 border border-terracotta-700/50 flex items-center justify-center text-terracotta-400 shrink-0">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-stone-warm-100">Insured Pan-India Delivery</h4>
                <p className="text-xs text-stone-warm-400 mt-1 leading-relaxed">
                  Fragile pottery and craft safe-packaging with live tracking from regional workshops.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-terracotta-900/60 border border-terracotta-700/50 flex items-center justify-center text-terracotta-400 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-stone-warm-100">GST Compliant & Verified</h4>
                <p className="text-xs text-stone-warm-400 mt-1 leading-relaxed">
                  Automatic statutory Tax Invoices, HSN code tagging, and legal buyer protections.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-stone-warm-500">
        <p>
          &copy; {new Date().getFullYear()} Kumor Para Marketplace Private Limited. Handcrafted with reverence in India.
        </p>
        <div className="flex items-center gap-6">
          <span className="hover:text-stone-warm-300 cursor-pointer">Terms of Service</span>
          <span className="hover:text-stone-warm-300 cursor-pointer">Privacy Policy</span>
          <span className="hover:text-stone-warm-300 cursor-pointer">Artisan Code of Conduct</span>
        </div>
      </div>
    </footer>
  );
};
