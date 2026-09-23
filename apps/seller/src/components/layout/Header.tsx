import React from 'react';
import { Menu, Plus, ExternalLink, Bell, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  onOpenAddProduct?: () => void;
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileMenu,
  onOpenAddProduct,
  title,
}) => {
  const { seller } = useAuth();

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-stone-warm-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 -ml-2 text-charcoal-700 hover:bg-stone-warm-100 rounded-xl lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        {title && (
          <h1 className="font-display font-bold text-lg sm:text-xl text-charcoal-900 truncate">
            {title}
          </h1>
        )}
      </div>

      {/* Right: Quick Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {seller?.status === 'pending' && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-medium">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Profile under moderation</span>
          </div>
        )}

        {seller?.slug && (
          <a
            href={`${
              import.meta.env.VITE_CUSTOMER_URL ||
              (import.meta.env.PROD
                ? 'https://kumorpara.onrender.com'
                : 'http://localhost:5173')
            }/shop/${seller.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-charcoal-700 bg-stone-warm-100 hover:bg-stone-warm-200 rounded-xl transition-colors"
          >
            <span>View Live Shop</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}

        {onOpenAddProduct && (
          <Button
            size="sm"
            onClick={onOpenAddProduct}
            className="shadow-warm-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Creation</span>
          </Button>
        )}
      </div>
    </header>
  );
};
