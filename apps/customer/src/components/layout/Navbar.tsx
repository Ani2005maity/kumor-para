import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, Search, User as UserIcon, Menu, X, LogOut, Package, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCartStore } from '../../store/useCartStore';
import { LAUNCH_CATEGORIES } from '../../lib/utils';
import { Button } from '../common/Button';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { getTotalItems, openDrawer } = useCartStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const totalItems = getTotalItems();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/catalog?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUserMenuOpen(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 w-full transition-all">
      {/* Top Banner */}
      <div className="bg-charcoal-900 text-stone-warm-200 text-xs py-2 px-4 text-center font-medium tracking-wide flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-terracotta-400" />
        <span>Direct from Indian master creators to your doorstep &bull; 100% Verified Handmade &bull; Fair Artisan Pricing</span>
      </div>

      {/* Main Navigation Bar */}
      <nav className="glass-header shadow-warm-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 gap-4">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 shrink-0 group">
              <div className="w-11 h-11 rounded-2xl bg-terracotta-600 flex items-center justify-center text-white shadow-warm-md group-hover:scale-105 group-hover:bg-terracotta-700 transition-all">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-black text-2xl tracking-tight text-charcoal-900 leading-none">
                  Kumor<span className="text-terracotta-600">Para</span>
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-warm-600 mt-1">
                  Artisanal India
                </span>
              </div>
            </Link>

            {/* Search Bar - Desktop */}
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-6">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Search terracotta, kantha stoles, dokra, brass..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-stone-warm-100/80 border border-stone-warm-200 rounded-full text-sm text-charcoal-900 placeholder:text-stone-warm-500 focus:outline-none focus:ring-2 focus:ring-terracotta-500/30 focus:border-terracotta-500 transition-all"
                />
                <Search className="w-4 h-4 text-stone-warm-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </form>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              {/* Creator Portal External Link */}
              <a
                href={import.meta.env.VITE_SELLER_URL || 'http://localhost:5174'}
                target="_blank"
                rel="noreferrer"
                className="hidden lg:inline-flex items-center gap-1.5 text-xs font-semibold text-terracotta-700 hover:text-terracotta-800 bg-terracotta-50 hover:bg-terracotta-100/80 px-3.5 py-2 rounded-xl border border-terracotta-200/60 transition-colors"
              >
                <span>Sell Your Craft</span>
                <span className="text-xs">&rarr;</span>
              </a>

              {/* User Account Menu */}
              <div className="relative">
                {user ? (
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 p-2 rounded-xl text-charcoal-800 hover:bg-stone-warm-100 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-terracotta-100 border border-terracotta-300 text-terracotta-800 font-bold text-xs flex items-center justify-center">
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span className="hidden sm:inline text-sm font-medium text-charcoal-800 max-w-[100px] truncate">
                      {user.name.split(' ')[0]}
                    </span>
                  </button>
                ) : (
                  <Link
                    to="/login"
                    className="flex items-center gap-1.5 text-sm font-medium text-charcoal-800 hover:text-terracotta-600 px-3 py-2 rounded-xl hover:bg-stone-warm-100 transition-colors"
                  >
                    <UserIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Sign In</span>
                  </Link>
                )}

                {/* Dropdown Menu */}
                {userMenuOpen && user && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-warm-xl border border-stone-warm-200 py-2 z-40 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-4 py-3 border-b border-stone-warm-100">
                        <p className="text-xs text-stone-warm-500 font-medium">Signed in as</p>
                        <p className="text-sm font-semibold text-charcoal-900 truncate">{user.name}</p>
                        <p className="text-xs text-stone-warm-500 truncate">{user.email}</p>
                      </div>

                      <div className="py-1">
                        <Link
                          to="/orders"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-charcoal-700 hover:bg-stone-warm-100 hover:text-charcoal-900 transition-colors"
                        >
                          <Package className="w-4 h-4 text-terracotta-600" />
                          <span>My Orders & Invoices</span>
                        </Link>
                      </div>

                      <div className="border-t border-stone-warm-100 pt-1">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Cart Drawer Trigger */}
              <button
                onClick={openDrawer}
                className="relative p-2.5 rounded-xl bg-stone-warm-100/80 hover:bg-stone-warm-200/80 text-charcoal-800 transition-all active:scale-95"
                aria-label="View Shopping Cart"
              >
                <ShoppingBag className="w-5 h-5 text-charcoal-800" />
                {totalItems > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-terracotta-600 text-white text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-warm-sm animate-in zoom-in">
                    {totalItems}
                  </span>
                )}
              </button>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-charcoal-700 hover:text-charcoal-900 hover:bg-stone-warm-100 rounded-xl"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Desktop Category Navigation Strip */}
          <div className="hidden md:flex items-center gap-1 border-t border-stone-warm-200/60 py-2.5 overflow-x-auto no-scrollbar">
            <Link
              to="/catalog"
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                location.pathname === '/catalog' && !location.search
                  ? 'bg-terracotta-600 text-white shadow-warm-sm'
                  : 'text-charcoal-700 hover:text-terracotta-600 hover:bg-stone-warm-100'
              }`}
            >
              All Creations
            </Link>
            {LAUNCH_CATEGORIES.map((cat) => {
              const isActive = location.search.includes(`category=${cat.name}`);
              return (
                <Link
                  key={cat.slug}
                  to={`/catalog?category=${encodeURIComponent(cat.name)}`}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    isActive
                      ? 'bg-terracotta-600 text-white shadow-warm-sm'
                      : 'text-charcoal-700 hover:text-terracotta-600 hover:bg-stone-warm-100'
                  }`}
                >
                  <span>{cat.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-stone-warm-200 px-4 pt-3 pb-6 space-y-4 animate-in slide-in-from-top-4 duration-200">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Search handcrafted crafts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-stone-warm-100 border border-stone-warm-200 rounded-xl text-sm"
              />
              <Search className="w-4 h-4 text-stone-warm-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </form>

            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-warm-500 px-2 py-1">
                Explore Categories
              </p>
              <Link
                to="/catalog"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-sm font-medium text-charcoal-800 hover:bg-stone-warm-100 rounded-lg"
              >
                All Creations
              </Link>
              {LAUNCH_CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  to={`/catalog?category=${encodeURIComponent(cat.name)}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-charcoal-800 hover:bg-stone-warm-100 rounded-lg"
                >
                  <span>{cat.name}</span>
                </Link>
              ))}
            </div>

            <div className="border-t border-stone-warm-100 pt-3">
              <a
                href={import.meta.env.VITE_SELLER_URL || 'http://localhost:5174'}
                target="_blank"
                rel="noreferrer"
                className="block text-center py-2.5 text-xs font-bold text-terracotta-700 bg-terracotta-50 rounded-xl border border-terracotta-200"
              >
                Become a Kumor Para Artisan &rarr;
              </a>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};
