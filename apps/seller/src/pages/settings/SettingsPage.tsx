import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Textarea } from '../../components/common/Textarea';
import { Select } from '../../components/common/Select';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useToast } from '../../components/common/Toast';
import { INDIAN_STATES } from '../../lib/utils';
import {
  Store,
  MapPin,
  Building2,
  Palmtree,
  Save,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { seller, refreshProfile } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    shopName: '',
    craftSpecialization: '',
    bio: '',
    logo: '',
    banner: '',
    isVacationMode: false,
    street: '',
    landmark: '',
    city: '',
    stateCode: '19',
    pincode: '',
    contactName: '',
    contactPhone: '',
    accountNumber: '',
    ifscCode: '',
    accountHolderName: '',
    pan: '',
    gstin: '',
  });

  useEffect(() => {
    if (seller) {
      setFormData({
        shopName: seller.shopName || '',
        craftSpecialization: seller.craftSpecialization || '',
        bio: seller.bio || seller.story || '',
        logo: seller.logo || '',
        banner: seller.banner || '',
        isVacationMode: Boolean(seller.isVacationMode),
        street: seller.pickupAddress?.street || '',
        landmark: seller.pickupAddress?.landmark || '',
        city: seller.pickupAddress?.city || '',
        stateCode: seller.pickupAddress?.stateCode || '19',
        pincode: seller.pickupAddress?.pincode || '',
        contactName: seller.pickupAddress?.name || '',
        contactPhone: seller.pickupAddress?.phone || '',
        accountNumber: seller.bankDetails?.accountNumber || '',
        ifscCode: seller.bankDetails?.ifscCode || '',
        accountHolderName: seller.bankDetails?.accountHolderName || '',
        pan: seller.pan || '',
        gstin: seller.gstin || '',
      });
    }
  }, [seller]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const selectedState = INDIAN_STATES.find((s) => s.code === formData.stateCode);

      const payload: any = {
        shopName: formData.shopName,
        craftSpecialization: formData.craftSpecialization,
        bio: formData.bio,
        logo: formData.logo || undefined,
        banner: formData.banner || undefined,
        isVacationMode: formData.isVacationMode,
        pickupAddress: {
          name: formData.contactName,
          phone: formData.contactPhone,
          street: formData.street,
          landmark: formData.landmark || undefined,
          city: formData.city,
          state: selectedState ? selectedState.name : 'West Bengal',
          stateCode: formData.stateCode,
          pincode: formData.pincode,
        },
        bankDetails: formData.accountNumber
          ? {
              accountNumber: formData.accountNumber,
              ifscCode: formData.ifscCode,
              accountHolderName: formData.accountHolderName,
            }
          : undefined,
        pan: formData.pan || undefined,
        gstin: formData.gstin || undefined,
      };

      return api.patch('/sellers/me', payload);
    },
    onSuccess: async () => {
      await refreshProfile();
      toast.success('Studio Profile Updated', 'Your settings and pickup address have been saved.');
    },
    onError: (err: any) => {
      toast.error('Update Failed', err.message || 'Could not update studio profile.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.shopName || !formData.street || !formData.city || !formData.pincode) {
      toast.error('Missing Required Fields', 'Please ensure shop name, street address, city, and pincode are filled.');
      return;
    }
    updateMutation.mutate();
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-display font-extrabold text-charcoal-900">
          Studio Profile & Settings
        </h2>
        <p className="text-xs sm:text-sm text-stone-warm-600">
          Manage your artisan brand identity, workshop pickup details, and bank account
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Studio Identity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-terracotta-500" />
                <CardTitle>1. Studio Brand & Craft Story</CardTitle>
              </div>
              {seller && <Badge status={seller.status} size="sm" dot />}
            </div>
            <CardDescription>
              Presented on your public artisan storefront to patrons
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Shop / Brand Name *"
                name="shopName"
                value={formData.shopName}
                onChange={handleChange}
                required
              />
              <Input
                label="Craft Specialization"
                name="craftSpecialization"
                placeholder="e.g. Dokra Metal Casting, Terracotta Pottery"
                value={formData.craftSpecialization}
                onChange={handleChange}
              />
            </div>

            <Textarea
              label="Artisan Heritage & Studio Bio"
              name="bio"
              placeholder="Tell your patrons about your technique, artisan lineage, and creative vision..."
              value={formData.bio}
              onChange={handleChange}
              rows={4}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Studio Logo / Avatar URL"
                name="logo"
                placeholder="https://..."
                value={formData.logo}
                onChange={handleChange}
              />
              <Input
                label="Studio Banner Image URL"
                name="banner"
                placeholder="https://..."
                value={formData.banner}
                onChange={handleChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Workshop Pickup Address */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-terracotta-500" />
              <CardTitle>2. Workshop Pickup Address</CardTitle>
            </div>
            <CardDescription>
              Courier pickup point for dispatched orders and statutory place of supply
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Contact Person Name *"
                name="contactName"
                value={formData.contactName}
                onChange={handleChange}
                required
              />
              <Input
                label="Contact Phone Number *"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="Street Address *"
                  name="street"
                  value={formData.street}
                  onChange={handleChange}
                  required
                />
              </div>
              <Input
                label="Landmark"
                name="landmark"
                value={formData.landmark}
                onChange={handleChange}
              />
              <Input
                label="City / Town *"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
              />
              <Select
                label="State *"
                name="stateCode"
                value={formData.stateCode}
                onChange={handleChange}
                options={INDIAN_STATES.map((s) => ({
                  label: `${s.name} (${s.code})`,
                  value: s.code,
                }))}
              />
              <Input
                label="Pincode *"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Bank Details & Tax */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-terracotta-500" />
              <CardTitle>3. Bank Account & Tax Setup</CardTitle>
            </div>
            <CardDescription>
              Direct bank transfer payouts and invoicing rules
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Account Holder Name"
                name="accountHolderName"
                value={formData.accountHolderName}
                onChange={handleChange}
              />
              <Input
                label="Account Number"
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleChange}
              />
              <Input
                label="Bank IFSC Code"
                name="ifscCode"
                value={formData.ifscCode}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="PAN Number"
                name="pan"
                value={formData.pan}
                onChange={handleChange}
              />
              <Input
                label="GSTIN (Optional)"
                name="gstin"
                placeholder="19ABCDE1234F1Z5"
                value={formData.gstin}
                onChange={handleChange}
                helperText="Leave empty if non-GST registered artisan (issues Bill of Supply)."
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Vacation Mode */}
        <Card className="border-amber-200 bg-amber-50/40">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Palmtree className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-charcoal-900">
                    Artisan Vacation & Workshop Pause Mode
                  </h4>
                  <p className="text-xs text-stone-warm-600 mt-1 max-w-xl">
                    Temporarily hides the "Buy Now" button on your creations while you travel to craft exhibitions or take a workshop pause.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="isVacationMode"
                  checked={formData.isVacationMode}
                  onChange={handleChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-stone-warm-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-warm-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            size="lg"
            variant="primary"
            isLoading={updateMutation.isPending}
            className="shadow-warm-md"
          >
            <Save className="w-4 h-4" />
            <span>Save Studio Settings</span>
          </Button>
        </div>
      </form>
    </div>
  );
};
