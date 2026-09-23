import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Percent,
  CheckCircle,
  Tag,
  Sparkles,
  ShoppingBag,
  Package,
} from 'lucide-react';
import { api } from '../../lib/api';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card, CardBody } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';

interface CategoryItem {
  _id: string;
  name: string;
  slug: string;
  iconKey?: string;
  defaultCommissionRate?: number;
  hsnCode?: string;
  gstRate?: number;
  isActive: boolean;
  createdAt: string;
}

const getCategoryIcon = (iconKey?: string) => {
  switch (iconKey?.toLowerCase()) {
    case 'sparkles':
    case 'jewellery':
      return <Sparkles className="w-4 h-4 text-amber-400" />;
    case 'shirt':
    case 'fashion':
      return <ShoppingBag className="w-4 h-4 text-terracotta-400" />;
    case 'home':
    case 'home-decor':
      return <Package className="w-4 h-4 text-emerald-400" />;
    case 'gift':
    case 'gifts':
      return <Tag className="w-4 h-4 text-purple-400" />;
    case 'palette':
    case 'art':
    case 'art-and-crafts':
      return <Layers className="w-4 h-4 text-sky-400" />;
    default:
      return <Layers className="w-4 h-4 text-admin-400" />;
  }
};

export const CategoriesPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    iconKey: 'layers',
    defaultCommissionRate: '10',
    hsnCode: '6912',
    gstRate: '12',
    isActive: true,
  });

  const { data, isLoading } = useQuery<{ categories: CategoryItem[] }>({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const res = await api.get<{ categories: CategoryItem[] }>('/categories/admin/all');
      return res || { categories: [] };
    },
  });

  const categories = data?.categories || [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: formData.name,
        slug: formData.slug || undefined,
        iconKey: formData.iconKey,
        defaultCommissionRate: parseFloat(formData.defaultCommissionRate) || 10,
        hsnCode: formData.hsnCode || undefined,
        gstRate: parseFloat(formData.gstRate) || undefined,
        isActive: formData.isActive,
      };

      if (editingCategory) {
        return await api.put(`/categories/${editingCategory._id}`, payload);
      } else {
        return await api.post('/categories', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setIsModalOpen(false);
      setEditingCategory(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    },
  });

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      slug: '',
      iconKey: 'layers',
      defaultCommissionRate: '10',
      hsnCode: '6912',
      gstRate: '12',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: CategoryItem) => {
    setEditingCategory(c);
    setFormData({
      name: c.name,
      slug: c.slug,
      iconKey: c.iconKey || 'layers',
      defaultCommissionRate: c.defaultCommissionRate?.toString() || '10',
      hsnCode: c.hsnCode || '6912',
      gstRate: c.gstRate?.toString() || '12',
      isActive: c.isActive,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete category "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
            Craft Categories & Commission Defaults
          </h1>
          <p className="text-xs text-admin-400 mt-1">
            Manage marketplace craft taxonomy, statutory HSN defaults, and category-level commission rates (Tier 2).
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenAdd}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add New Category
        </Button>
      </div>

      {/* Categories Table */}
      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-admin-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-16 p-8 space-y-2">
              <Layers className="w-10 h-10 text-admin-600 mx-auto" />
              <h3 className="font-bold text-sm text-admin-300">No Categories Configured</h3>
              <p className="text-xs text-admin-500">Create launch categories to organize artisan creations.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-admin-950/60 border-b border-admin-800 text-admin-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Icon & Name</th>
                    <th className="px-6 py-4">URL Slug</th>
                    <th className="px-6 py-4">Default Commission (Tier 2)</th>
                    <th className="px-6 py-4">Default HSN / GST</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-800 text-admin-200">
                  {categories.map((c) => (
                    <tr key={c._id} className="hover:bg-admin-800/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-white flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-admin-800 flex items-center justify-center shrink-0">
                          {getCategoryIcon(c.iconKey || c.slug)}
                        </div>
                        <span className="text-sm">{c.name}</span>
                      </td>
                      <td className="px-6 py-4 font-mono text-admin-400">{c.slug}</td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-terracotta-400 text-sm">
                          {c.defaultCommissionRate ?? 10}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-admin-300">HSN: {c.hsnCode || '6912'}</div>
                        <div className="text-admin-400 text-[11px]">GST: {c.gstRate ?? 12}%</div>
                      </td>
                      <td className="px-6 py-4">
                        {c.isActive ? (
                          <Badge variant="emerald" size="sm">Active</Badge>
                        ) : (
                          <Badge variant="slate" size="sm">Inactive</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="p-1.5 text-admin-400 hover:text-white rounded-lg hover:bg-admin-800 transition-colors"
                            aria-label="Edit category"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(c._id, c.name)}
                            className="p-1.5 text-admin-400 hover:text-red-400 rounded-lg hover:bg-admin-800 transition-colors"
                            aria-label="Delete category"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* CREATE / EDIT CATEGORY MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? `Edit Category: ${editingCategory.name}` : 'Create New Craft Category'}
        maxWidth="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="space-y-4 text-xs text-admin-200"
        >
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-1">
              <Input
                label="Icon Key"
                required
                value={formData.iconKey}
                onChange={(e) => setFormData({ ...formData, iconKey: e.target.value })}
                placeholder="layers"
              />
            </div>
            <div className="col-span-3">
              <Input
                label="Category Name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Terracotta Pottery"
              />
            </div>
          </div>

          <Input
            label="URL Slug (Optional - Auto-generated)"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="e.g. terracotta-pottery"
          />

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Commission % (Tier 2)"
              type="number"
              required
              value={formData.defaultCommissionRate}
              onChange={(e) => setFormData({ ...formData, defaultCommissionRate: e.target.value })}
              placeholder="10"
            />

            <Input
              label="Default HSN"
              value={formData.hsnCode}
              onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
              placeholder="6912"
            />

            <Input
              label="Default GST %"
              type="number"
              value={formData.gstRate}
              onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
              placeholder="12"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-admin-800">
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={saveMutation.isPending}>
              {editingCategory ? 'Update Category' : 'Save Category'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
