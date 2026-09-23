import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartItem {
  productId: string;
  sellerId: string;
  shopName: string;
  shopSlug?: string;
  title: string;
  slug: string;
  image: string;
  price: number; // in paise
  qty: number;
  stock: number;
  fulfilmentType?: 'ready_stock' | 'made_to_order';
  productionDays?: number;
  customisationNote?: string;
  isCustomisable?: boolean;
}

export interface SellerCartGroup {
  sellerId: string;
  shopName: string;
  shopSlug?: string;
  items: CartItem[];
  subtotal: number; // in paise
}

interface CartState {
  items: CartItem[];
  isDrawerOpen: boolean;
  
  // Actions
  addItem: (item: Omit<CartItem, 'qty'> & { qty?: number }) => void;
  removeItem: (productId: string, customisationNote?: string) => void;
  updateQty: (productId: string, qty: number, customisationNote?: string) => void;
  updateNote: (productId: string, note: string) => void;
  clearCart: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;

  // Computed / Selectors
  getTotalItems: () => number;
  getSubtotalPaise: () => number;
  getSellerGroups: () => SellerCartGroup[];
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isDrawerOpen: false,

      addItem: (newItem) => {
        set((state) => {
          const qtyToAdd = newItem.qty || 1;
          const noteKey = newItem.customisationNote || '';
          const existingIndex = state.items.findIndex(
            (i) => i.productId === newItem.productId && (i.customisationNote || '') === noteKey
          );

          if (existingIndex > -1) {
            const updatedItems = [...state.items];
            const currentItem = updatedItems[existingIndex];
            const maxAllowed = newItem.stock > 0 ? newItem.stock : 999;
            const newQty = Math.min(currentItem.qty + qtyToAdd, maxAllowed);
            updatedItems[existingIndex] = {
              ...currentItem,
              qty: newQty,
            };
            return { items: updatedItems, isDrawerOpen: true };
          }

          const itemToAdd: CartItem = {
            productId: newItem.productId,
            sellerId: newItem.sellerId,
            shopName: newItem.shopName || 'Artisan Studio',
            shopSlug: newItem.shopSlug,
            title: newItem.title,
            slug: newItem.slug,
            image: newItem.image,
            price: newItem.price,
            qty: qtyToAdd,
            stock: newItem.stock,
            fulfilmentType: newItem.fulfilmentType,
            productionDays: newItem.productionDays,
            customisationNote: newItem.customisationNote,
            isCustomisable: newItem.isCustomisable,
          };

          return {
            items: [...state.items, itemToAdd],
            isDrawerOpen: true,
          };
        });
      },

      removeItem: (productId, customisationNote = '') => {
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.productId === productId && (i.customisationNote || '') === customisationNote)
          ),
        }));
      },

      updateQty: (productId, qty, customisationNote = '') => {
        if (qty <= 0) {
          get().removeItem(productId, customisationNote);
          return;
        }

        set((state) => {
          const updatedItems = state.items.map((item) => {
            if (item.productId === productId && (item.customisationNote || '') === customisationNote) {
              const maxAllowed = item.stock > 0 ? item.stock : 999;
              return { ...item, qty: Math.min(qty, maxAllowed) };
            }
            return item;
          });
          return { items: updatedItems };
        });
      },

      updateNote: (productId, note) => {
        set((state) => {
          const updatedItems = state.items.map((item) => {
            if (item.productId === productId) {
              return { ...item, customisationNote: note };
            }
            return item;
          });
          return { items: updatedItems };
        });
      },

      clearCart: () => set({ items: [] }),

      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
      toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.qty, 0);
      },

      getSubtotalPaise: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.qty, 0);
      },

      getSellerGroups: () => {
        const items = get().items;
        const groupMap = new Map<string, SellerCartGroup>();

        for (const item of items) {
          const key = item.sellerId || 'unknown';
          if (!groupMap.has(key)) {
            groupMap.set(key, {
              sellerId: item.sellerId,
              shopName: item.shopName || 'Artisan Workshop',
              shopSlug: item.shopSlug,
              items: [],
              subtotal: 0,
            });
          }
          const group = groupMap.get(key)!;
          group.items.push(item);
          group.subtotal += item.price * item.qty;
        }

        return Array.from(groupMap.values());
      },
    }),
    {
      name: 'kumorpara_customer_cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    }
  )
);
