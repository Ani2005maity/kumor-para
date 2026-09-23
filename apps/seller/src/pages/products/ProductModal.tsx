import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Textarea } from '../../components/common/Textarea';
import { Select } from '../../components/common/Select';
import { Button } from '../../components/common/Button';
import { useToast } from '../../components/common/Toast';
import { api } from '../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PRESET_IMAGES, CRAFT_CATEGORIES } from '../../lib/utils';
import { Image as ImageIcon, Plus, Trash2, Check, Sparkles } from 'lucide-react';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: any;
  onSaved?: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  product,
  onSaved,
}) => {
  const isEditing = Boolean(product);
  const toast = useToast();
  const queryClient = useQueryClient();

  // Fetch categories from API
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<{ categories: any[] }>('/categories'),
    staleTime: 1000 * 60 * 10,
  });

  const categories = categoriesData?.categories || CRAFT_CATEGORIES;

  const [formData, setFormData] = useState({
    title: '',
    categoryId: '',
    description: '',
    materials: '',
    priceRupees: '',
    comparePriceRupees: '',
    stock: '10',
    sku: '',
    hsnCode: '',
    gstRate: '12',
    fulfilmentType: 'ready_stock' as 'ready_stock' | 'made_to_order',
    leadTimeDays: '3',
    isCustomisable: false,
    customisationPrompt: '',
    images: [] as Array<{ url: string; alt: string; publicId: string }>,
  });

  const [customImageUrl, setCustomImageUrl] = useState('');

  useEffect(() => {
    if (product) {
      setFormData({
        title: product.title || '',
        categoryId: typeof product.categoryId === 'object' ? product.categoryId._id : product.categoryId || '',
        description: product.description || '',
        materials: Array.isArray(product.materials) ? product.materials.join(', ') : '',
        priceRupees: product.price ? (product.price / 100).toString() : '',
        comparePriceRupees: product.compareAtPrice ? (product.compareAtPrice / 100).toString() : '',
        stock: product.stock !== undefined ? product.stock.toString() : '10',
        sku: product.sku || '',
        hsnCode: product.hsnCode || '',
        gstRate: product.gstRate !== undefined ? product.gstRate.toString() : '12',
        fulfilmentType: product.fulfilmentType || 'ready_stock',
        leadTimeDays: product.leadTimeDays ? product.leadTimeDays.toString() : '3',
        isCustomisable: Boolean(product.isCustomisable),
        customisationPrompt: product.customisationPrompt || '',
        images: product.images && product.images.length > 0 ? product.images : [],
      });
    } else {
      // Default initial state
      setFormData({
        title: '',
        categoryId: categories[0]?._id || categories[0]?.slug || '',
        description: '',
        materials: 'Clay, Natural terracotta slip',
        priceRupees: '1200',
        comparePriceRupees: '1500',
        stock: '15',
        sku: `KP-${Math.floor(1000 + Math.random() * 9000)}`,
        hsnCode: '6913',
        gstRate: '12',
        fulfilmentType: 'ready_stock',
        leadTimeDays: '3',
        isCustomisable: false,
        customisationPrompt: '',
        images: [
          {
            url: PRESET_IMAGES[0].url,
            alt: PRESET_IMAGES[0].alt,
            publicId: `preset-${Date.now()}`,
          },
        ],
      });
    }
  }, [product, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAddPresetImage = (preset: typeof PRESET_IMAGES[0]) => {
    if (formData.images.some((img) => img.url === preset.url)) return;
    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, { url: preset.url, alt: preset.alt, publicId: `preset-${Date.now()}` }],
    }));
  };

  const handleAddCustomImage = () => {
    if (!customImageUrl.trim()) return;
    setFormData((prev) => ({
      ...prev,
      images: [
        ...prev.images,
        {
          url: customImageUrl.trim(),
          alt: formData.title || 'Product craft image',
          publicId: `custom-${Date.now()}`,
        },
      ],
    }));
    setCustomImageUrl('');
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSetPrimaryImage = (index: number) => {
    if (index === 0) return;
    setFormData((prev) => {
      const copy = [...prev.images];
      const [selected] = copy.splice(index, 1);
      copy.unshift(selected);
      return { ...prev, images: copy };
    });
  };

  const saveMutation = useMutation({
    mutationFn: async (submitStatus?: 'draft' | 'pending') => {
      const pricePaise = Math.round(parseFloat(formData.priceRupees || '0') * 100);
      const comparePricePaise = formData.comparePriceRupees
        ? Math.round(parseFloat(formData.comparePriceRupees) * 100)
        : undefined;

      const payload: any = {
        title: formData.title,
        categoryId: formData.categoryId,
        description: formData.description,
        materials: formData.materials
          .split(',')
          .map((m) => m.trim())
          .filter(Boolean),
        price: pricePaise,
        compareAtPrice: comparePricePaise,
        stock: parseInt(formData.stock || '0', 10),
        sku: formData.sku || undefined,
        hsnCode: formData.hsnCode || undefined,
        gstRate: parseInt(formData.gstRate || '0', 10),
        fulfilmentType: formData.fulfilmentType,
        leadTimeDays: formData.fulfilmentType === 'made_to_order' ? parseInt(formData.leadTimeDays || '1', 10) : undefined,
        isCustomisable: formData.isCustomisable,
        customisationPrompt: formData.isCustomisable ? formData.customisationPrompt : undefined,
        images: formData.images.length > 0 ? formData.images : [PRESET_IMAGES[0]],
      };

      if (submitStatus) {
        payload.status = submitStatus;
      }

      if (isEditing) {
        return api.put(`/products/${product._id}`, payload);
      } else {
        return api.post('/products', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      toast.success(
        isEditing ? 'Creation Updated' : 'Creation Saved',
        isEditing
          ? 'Your product details have been saved.'
          : 'Your product has been added to your catalog.'
      );
      onSaved?.();
      onClose();
    },
    onError: (err: any) => {
      toast.error('Save Failed', err.message || 'Could not save product.');
    },
  });

  const handleSubmit = (submitStatus?: 'draft' | 'pending') => (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.priceRupees || !formData.categoryId) {
      toast.error('Missing fields', 'Title, category, and price are required.');
      return;
    }
    saveMutation.mutate(submitStatus);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit: ${product.title}` : 'Add Handcrafted Creation'}
      description="List an authentic handmade item for review and discovery"
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit(isEditing ? undefined : 'pending')} className="space-y-6">
        {/* Section 1: Basic Information */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-700">
            1. Title & Classification
          </h4>
          <Input
            label="Creation Title *"
            name="title"
            placeholder="e.g. Hand-carved Dokra Brass Owl Figurine"
            value={formData.title}
            onChange={handleChange}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Craft Category *"
              name="categoryId"
              value={formData.categoryId}
              onChange={handleChange}
              options={categories.map((c: any) => ({
                label: c.name,
                value: c._id || c.slug,
              }))}
              required
            />

            <Input
              label="Craft Materials (Comma separated)"
              name="materials"
              placeholder="e.g. Terracotta clay, Natural pigments, Dokra brass"
              value={formData.materials}
              onChange={handleChange}
            />
          </div>

          <Textarea
            label="Artisan Description & Story"
            name="description"
            placeholder="Describe the artisan technique, heritage backstory, care instructions, and finish..."
            value={formData.description}
            onChange={handleChange}
            rows={3}
          />
        </div>

        {/* Section 2: Pricing, Stock & Tax */}
        <div className="space-y-4 pt-4 border-t border-stone-warm-200">
          <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-700">
            2. Pricing, Inventory & GST
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Selling Price (₹) *"
              name="priceRupees"
              type="number"
              min="1"
              step="any"
              placeholder="1200"
              value={formData.priceRupees}
              onChange={handleChange}
              helperText="Final price to buyer"
              required
            />

            <Input
              label="Compare At Price (₹)"
              name="comparePriceRupees"
              type="number"
              min="1"
              step="any"
              placeholder="1500"
              value={formData.comparePriceRupees}
              onChange={handleChange}
              helperText="Original MSRP for strikethrough"
            />

            <Input
              label="Available Stock *"
              name="stock"
              type="number"
              min="0"
              placeholder="10"
              value={formData.stock}
              onChange={handleChange}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="SKU Identifier"
              name="sku"
              placeholder="MRIT-OWL-01"
              value={formData.sku}
              onChange={handleChange}
            />

            <Input
              label="HSN / SAC Code"
              name="hsnCode"
              placeholder="6913"
              value={formData.hsnCode}
              onChange={handleChange}
            />

            <Select
              label="GST Tax Rate"
              name="gstRate"
              value={formData.gstRate}
              onChange={handleChange}
              options={[
                { label: '0% (Exempt)', value: '0' },
                { label: '5% (Handicrafts/Textiles)', value: '5' },
                { label: '12% (Standard Crafts)', value: '12' },
                { label: '18% (Decor/Metalware)', value: '18' },
                { label: '28% (Luxury)', value: '28' },
              ]}
            />
          </div>
        </div>

        {/* Section 3: Fulfillment & Customisation */}
        <div className="space-y-4 pt-4 border-t border-stone-warm-200">
          <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-700">
            3. Fulfillment & Customisation
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Fulfilment Type"
              name="fulfilmentType"
              value={formData.fulfilmentType}
              onChange={handleChange}
              options={[
                { label: 'Ready Stock (Ships within 24-48h)', value: 'ready_stock' },
                { label: 'Made to Order (Crafted upon purchase)', value: 'made_to_order' },
              ]}
            />

            {formData.fulfilmentType === 'made_to_order' && (
              <Input
                label="Crafting Lead Time (Days)"
                name="leadTimeDays"
                type="number"
                min="1"
                placeholder="5"
                value={formData.leadTimeDays}
                onChange={handleChange}
                helperText="Days required before dispatch"
              />
            )}
          </div>

          <div className="p-4 rounded-2xl bg-stone-warm-50 border border-stone-warm-200 space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                name="isCustomisable"
                checked={formData.isCustomisable}
                onChange={handleChange}
                className="w-4 h-4 rounded text-terracotta-600 focus:ring-terracotta-400"
              />
              <span className="text-sm font-bold text-charcoal-900">
                Offer Customisation / Personalisation (e.g. name engraving, custom initials)
              </span>
            </label>

            {formData.isCustomisable && (
              <Input
                label="Customisation Instructions Prompt"
                name="customisationPrompt"
                placeholder="e.g. Enter name or monogram to engrave on base (max 15 characters)"
                value={formData.customisationPrompt}
                onChange={handleChange}
              />
            )}
          </div>
        </div>

        {/* Section 4: Imagery Gallery */}
        <div className="space-y-4 pt-4 border-t border-stone-warm-200">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-700">
              4. Product Photos & Media
            </h4>
            <span className="text-xs text-stone-warm-500">
              {formData.images.length} photo(s) selected
            </span>
          </div>

          {/* Selected Images Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {formData.images.map((img, idx) => (
              <div
                key={idx}
                className="relative group rounded-2xl overflow-hidden border border-stone-warm-200 aspect-square bg-stone-warm-100"
              >
                <img
                  src={img.url}
                  alt={img.alt}
                  className="w-full h-full object-cover"
                />
                {idx === 0 && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-terracotta-600 text-white rounded-md text-[10px] font-bold uppercase tracking-wide">
                    Cover
                  </span>
                )}
                <div className="absolute inset-0 bg-charcoal-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {idx !== 0 && (
                    <button
                      type="button"
                      onClick={() => handleSetPrimaryImage(idx)}
                      title="Set as Cover Photo"
                      className="p-1.5 bg-white text-charcoal-900 rounded-lg hover:bg-stone-warm-100 transition-colors text-xs font-semibold"
                    >
                      Set Cover
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    title="Remove Image"
                    className="p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Quick preset selector */}
          <div className="p-3 bg-stone-warm-50 rounded-2xl border border-stone-warm-200 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-stone-warm-700">
              <Sparkles className="w-3.5 h-3.5 text-terracotta-500" />
              <span>Click to add authentic high-res craft samples:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESET_IMAGES.map((preset, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleAddPresetImage(preset)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-stone-warm-300 rounded-xl text-xs font-medium text-charcoal-800 hover:border-terracotta-400 hover:bg-terracotta-50 transition-colors"
                >
                  <Plus className="w-3 h-3 text-terracotta-500" />
                  <span>{preset.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom image URL adder */}
          <div className="flex gap-2">
            <Input
              placeholder="Or paste external image URL (e.g. Unsplash, Cloudinary)..."
              value={customImageUrl}
              onChange={(e) => setCustomImageUrl(e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleAddCustomImage}
              disabled={!customImageUrl.trim()}
            >
              Add URL
            </Button>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="pt-6 border-t border-stone-warm-200 flex flex-col sm:flex-row items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>

          {!isEditing && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleSubmit('draft')}
              isLoading={saveMutation.isPending}
            >
              Save as Draft
            </Button>
          )}

          <Button
            type="submit"
            variant="primary"
            isLoading={saveMutation.isPending}
          >
            {isEditing ? 'Save Changes' : 'Submit for Review'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
