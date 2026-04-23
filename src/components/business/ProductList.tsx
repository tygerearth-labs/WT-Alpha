'use client';

import { useEffect, useState, useCallback } from 'react';
import { useBusinessStore } from '@/store/useBusinessStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Package, Search, AlertTriangle, DollarSign, Boxes } from 'lucide-react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  price: number;
  stock: number;
  category: string | null;
  unit: string | null;
  isActive: boolean;
  createdAt: string;
}

interface StockSummary {
  totalActive: number;
  totalStock: number;
  lowStock: number;
  outOfStock: number;
  totalStockValue: number;
}

const UNIT_OPTIONS = [
  { value: 'pcs', label: 'Pcs' },
  { value: 'kg', label: 'Kg' },
  { value: 'liter', label: 'Liter' },
  { value: 'box', label: 'Box' },
  { value: 'pack', label: 'Pack' },
  { value: 'meter', label: 'Meter' },
  { value: 'set', label: 'Set' },
];

const CATEGORY_OPTIONS = [
  { value: 'makanan', label: 'Makanan' },
  { value: 'minuman', label: 'Minuman' },
  { value: 'elektronik', label: 'Elektronik' },
  { value: 'pakaian', label: 'Pakaian' },
  { value: 'jasa', label: 'Jasa' },
  { value: 'lainnya', label: 'Lainnya' },
];

export default function ProductList() {
  const { t } = useTranslation();
  const { activeBusiness } = useBusinessStore();
  const { formatAmount } = useCurrencyFormat();
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    price: '',
    stock: '0',
    category: '',
    unit: 'pcs',
    description: '',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const businessId = activeBusiness?.id;

  const fetchProducts = useCallback(() => {
    if (!businessId) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (categoryFilter) params.set('category', categoryFilter);

    fetch(`/api/business/${businessId}/products?${params.toString()}`)
      .then((r) => {
        if (r.ok) return r.json();
        return { products: [], summary: null };
      })
      .then((data) => {
        setProducts(data.products || []);
        setSummary(data.summary || null);
      })
      .catch(() => {
        setProducts([]);
        setSummary(null);
      })
      .finally(() => setLoading(false));
  }, [businessId, search, categoryFilter]);

  useEffect(() => {
    if (businessId) {
      fetchProducts();
    } else {
      setLoading(false);
    }
  }, [businessId, fetchProducts]);

  const openCreateDialog = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: '',
      price: '',
      stock: '0',
      category: '',
      unit: 'pcs',
      description: '',
      isActive: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku || '',
      price: product.price.toString(),
      stock: product.stock.toString(),
      category: product.category || '',
      unit: product.unit || 'pcs',
      description: product.description || '',
      isActive: product.isActive,
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !formData.name || !formData.price) return;
    setSaving(true);
    try {
      const url = editingProduct
        ? `/api/business/${businessId}/products/${editingProduct.id}`
        : `/api/business/${businessId}/products`;
      const body: Record<string, unknown> = {
        name: formData.name,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock) || 0,
        unit: formData.unit || 'pcs',
        isActive: formData.isActive,
      };
      if (formData.sku) body.sku = formData.sku;
      if (formData.category) body.category = formData.category;
      if (formData.description) body.description = formData.description;

      const res = await fetch(url, {
        method: editingProduct ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }));
        throw new Error(err.error || 'Failed');
      }
      toast.success(
        editingProduct ? t('biz.productUpdated') : t('biz.productCreated')
      );
      setDialogOpen(false);
      fetchProducts();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!businessId || !deleteId) return;
    try {
      const res = await fetch(`/api/business/${businessId}/products/${deleteId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();
      toast.success(t('biz.productDeleted'));
      fetchProducts();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setDeleteId(null);
    }
  };

  const getStockBadge = (stock: number) => {
    if (stock === 0) {
      return (
        <Badge variant="outline" className="text-xs font-normal border-0 bg-[#FF5252]/20 text-[#FF5252]">
          {t('biz.outOfStock')}
        </Badge>
      );
    }
    if (stock <= 10) {
      return (
        <Badge variant="outline" className="text-xs font-normal border-0 bg-yellow-500/20 text-yellow-400">
          {stock}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs font-normal border-0 bg-[#03DAC6]/20 text-[#03DAC6]">
        {stock}
      </Badge>
    );
  };

  if (!businessId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-white/50 text-center">{t('biz.registerFirst')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      {!loading && summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="bg-[#1A1A2E] border border-white/[0.06] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#03DAC6]/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-[#03DAC6]" />
              </div>
              <div>
                <p className="text-xs text-white/50">{t('biz.totalProducts')}</p>
                <p className="text-lg font-bold text-white">{summary.totalActive}</p>
              </div>
            </div>
          </Card>
          <Card className="bg-[#1A1A2E] border border-white/[0.06] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#BB86FC]/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-[#BB86FC]" />
              </div>
              <div>
                <p className="text-xs text-white/50">{t('biz.totalStockValue')}</p>
                <p className="text-lg font-bold text-white">{formatAmount(summary.totalStockValue)}</p>
              </div>
            </div>
          </Card>
          <Card className="bg-[#1A1A2E] border border-white/[0.06] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#FF5252]/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-[#FF5252]" />
              </div>
              <div>
                <p className="text-xs text-white/50">{t('biz.lowStock')}</p>
                <p className="text-lg font-bold text-white">
                  {summary.lowStock + summary.outOfStock}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Boxes className="h-5 w-5 text-[#BB86FC]" />
            {t('biz.products')}
          </h2>
        </div>
        <Button
          onClick={openCreateDialog}
          size="sm"
          className="bg-[#BB86FC] text-black hover:bg-[#9B6FDB]"
        >
          <Plus className="h-4 w-4 mr-1" />
          {t('biz.addProduct')}
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.search') + '...'}
            className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v === '__all__' ? '' : v)}>
          <SelectTrigger className="bg-white/[0.05] border-white/[0.1] text-white w-full sm:w-[160px]">
            <SelectValue placeholder={t('biz.productCategory')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-white">
              {t('biz.productCategory')}
            </SelectItem>
            {CATEGORY_OPTIONS.map((c) => (
              <SelectItem key={c.value} value={c.value} className="text-white">
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="bg-[#1A1A2E] border border-white/[0.06] rounded-2xl">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg bg-white/[0.06]" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-white/40">
              <Package className="h-10 w-10 mb-2 opacity-40" />
              <p className="text-sm">{t('biz.noProducts')}</p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-white/50 text-xs">{t('biz.productName')}</TableHead>
                    <TableHead className="text-white/50 text-xs hidden sm:table-cell">{t('biz.productSku')}</TableHead>
                    <TableHead className="text-white/50 text-xs text-right">{t('biz.productPrice')}</TableHead>
                    <TableHead className="text-white/50 text-xs text-right">{t('biz.productStock')}</TableHead>
                    <TableHead className="text-white/50 text-xs hidden md:table-cell">{t('biz.productCategory')}</TableHead>
                    <TableHead className="text-white/50 text-xs hidden lg:table-cell">{t('dashboard.active')}</TableHead>
                    <TableHead className="text-white/50 text-xs w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow
                      key={product.id}
                      className={`border-white/[0.04] hover:bg-white/[0.02] ${!product.isActive ? 'opacity-50' : ''}`}
                    >
                      <TableCell className="text-white text-xs py-3 font-medium max-w-[180px] truncate">
                        {product.name}
                      </TableCell>
                      <TableCell className="py-3 hidden sm:table-cell">
                        <span className="text-white/60 text-xs font-mono">{product.sku || '-'}</span>
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium py-3 text-[#03DAC6]">
                        {formatAmount(product.price)}
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        {getStockBadge(product.stock)}
                      </TableCell>
                      <TableCell className="py-3 hidden md:table-cell">
                        {product.category && (
                          <Badge variant="outline" className="text-xs font-normal border-0 bg-white/[0.06] text-white/70">
                            {product.category}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-3 hidden lg:table-cell">
                        <Badge
                          variant="outline"
                          className={`text-xs font-normal border-0 ${
                            product.isActive
                              ? 'bg-[#03DAC6]/20 text-[#03DAC6]'
                              : 'bg-white/[0.06] text-white/50'
                          }`}
                        >
                          {product.isActive ? t('biz.active') : t('biz.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-white/40 hover:text-white hover:bg-white/10"
                          onClick={() => openEditDialog(product)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-white/40 hover:text-red-400 hover:bg-white/10"
                          onClick={() => setDeleteId(product.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#1A1A2E] border border-white/[0.06] text-white sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingProduct ? t('biz.editProduct') : t('biz.addProduct')}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {editingProduct ? t('biz.editProduct') : t('biz.addProduct')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label className="text-white/80">{t('biz.productName')} *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('biz.productName')}
                  className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30"
                />
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label className="text-white/80">{t('biz.productSku')}</Label>
                <Input
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder={t('biz.productSku')}
                  className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/80">{t('biz.productPrice')} *</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0"
                  min="0"
                  step="any"
                  className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">{t('biz.productStock')}</Label>
                <Input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="0"
                  min="0"
                  className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/80">{t('biz.productCategory')}</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger className="bg-white/[0.05] border-white/[0.1] text-white">
                    <SelectValue placeholder={t('biz.productCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value} className="text-white">
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">{t('biz.productUnit')}</Label>
                <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                  <SelectTrigger className="bg-white/[0.05] border-white/[0.1] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((u) => (
                      <SelectItem key={u.value} value={u.value} className="text-white">
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">{t('biz.productDescription')}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('biz.productDescription')}
                className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 min-h-[60px]"
              />
            </div>

            {editingProduct && (
              <div className="flex items-center gap-3 py-1">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label className="text-white/80 cursor-pointer" onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}>
                  {formData.isActive ? t('biz.active') : t('biz.inactive')}
                </Label>
              </div>
            )}

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="border-white/[0.1] text-white hover:bg-white/10"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={saving || !formData.name || !formData.price}
                className="bg-[#BB86FC] text-black hover:bg-[#9B6FDB]"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-[#1A1A2E] border border-white/[0.06] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">{t('common.delete')}</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              {t('kas.deleteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/[0.1] text-white hover:bg-white/10">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white border-0"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
