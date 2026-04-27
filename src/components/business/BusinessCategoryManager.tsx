'use client';

import { useState, useEffect, useCallback } from 'react';
import { useBusinessStore } from '@/store/useBusinessStore';
import { useTranslation } from '@/hooks/useTranslation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
  Plus,
  Search,
  Pencil,
  Trash2,
  Tag,
  TrendingUp,
  TrendingDown,
  Package,
  Palette,
  Layers,
} from 'lucide-react';
import { DynamicIcon } from '@/components/shared/DynamicIcon';
import { IconPicker } from '@/components/shared/IconPicker';

/* ── Constants ── */
const COLORS = [
  '#03DAC6', '#BB86FC', '#FFD700', '#CF6679',
  '#FF6B35', '#00BFA5', '#64B5F6', '#FF8A80',
  '#AED581', '#FFD54F', '#CE93D8', '#80DEEA',
];

const CATEGORY_TYPES = ['pemasukan', 'pengeluaran', 'produk'] as const;
type CategoryType = (typeof CATEGORY_TYPES)[number];

const TYPE_CONFIG: Record<CategoryType, { icon: typeof TrendingUp; accentColor: string; gradientFrom: string; gradientTo: string }> = {
  pemasukan: {
    icon: TrendingUp,
    accentColor: '#03DAC6',
    gradientFrom: '#03DAC6',
    gradientTo: '#00B894',
  },
  pengeluaran: {
    icon: TrendingDown,
    accentColor: '#CF6679',
    gradientFrom: '#CF6679',
    gradientTo: '#E84393',
  },
  produk: {
    icon: Package,
    accentColor: '#BB86FC',
    gradientFrom: '#BB86FC',
    gradientTo: '#03DAC6',
  },
};

/* ── Interfaces ── */
interface Category {
  id: string;
  name: string;
  type: string;
  color: string;
  icon: string | null;
  isActive: boolean;
}

/* ── Animation Variants ── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

const cardPopVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 350, damping: 25 },
  },
};

const emptyPulseVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

/* ── Main Component ── */
export default function BusinessCategoryManager() {
  const { t } = useTranslation();
  const { activeBusiness } = useBusinessStore();
  const businessId = activeBusiness?.id;

  const [activeTab, setActiveTab] = useState<CategoryType>('pemasukan');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '', color: COLORS[0], icon: 'Tag' });
  const [saving, setSaving] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ── Fetch categories ── */
  const fetchCategories = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/business/${businessId}/categories?type=${activeTab}`
      );
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch {
      setCategories([]);
      toast.error(t('common.error'), {
        description: 'Gagal memuat kategori',
      });
    } finally {
      setLoading(false);
    }
  }, [businessId, activeTab, t]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  /* ── Open create dialog ── */
  const openCreateDialog = () => {
    setEditingCategory(null);
    setFormData({ name: '', color: COLORS[0], icon: 'Tag' });
    setDialogOpen(true);
  };

  /* ── Open edit dialog ── */
  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, color: category.color || COLORS[0], icon: category.icon || 'Tag' });
    setDialogOpen(true);
  };

  /* ── Save (create or update) ── */
  const handleSave = async () => {
    if (!businessId || !formData.name.trim()) return;

    setSaving(true);
    try {
      const body = {
        type: activeTab,
        name: formData.name.trim(),
        color: formData.color,
        icon: formData.icon,
      };

      let res: Response;
      if (editingCategory) {
        res = await fetch(
          `/api/business/${businessId}/categories/${editingCategory.id}`,
          { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
        );
      } else {
        res = await fetch(
          `/api/business/${businessId}/categories`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
        );
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Gagal menyimpan');
      }

      toast.success(
        editingCategory ? t('biz.businessUpdated') : t('biz.businessCreated'),
      );
      setDialogOpen(false);
      fetchCategories();
    } catch (err) {
      toast.error(t('common.error'), {
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
      });
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!businessId || !deletingCategory) return;

    setDeleting(true);
    try {
      const res = await fetch(
        `/api/business/${businessId}/categories/${deletingCategory.id}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Gagal menghapus');

      toast.success('Kategori berhasil dihapus');
      setDeleteDialogOpen(false);
      setDeletingCategory(null);
      fetchCategories();
    } catch {
      toast.error(t('common.error'), {
        description: 'Gagal menghapus kategori',
      });
    } finally {
      setDeleting(false);
    }
  };

  /* ── Filtered categories ── */
  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const typeConfig = TYPE_CONFIG[activeTab];
  const TypeIcon = typeConfig.icon;

  /* ── Empty State ── */
  const renderEmptyState = () => (
    <motion.div
      className="flex flex-col items-center justify-center py-16 px-6"
      variants={emptyPulseVariants}
      initial="hidden"
      animate="visible"
    >
      <div
        className="relative flex h-16 w-16 items-center justify-center rounded-2xl mb-4"
        style={{
          background: `linear-gradient(135deg, ${typeConfig.gradientFrom}20, ${typeConfig.gradientTo}15)`,
          boxShadow: `0 0 30px ${typeConfig.gradientFrom}08`,
        }}
      >
        <div
          className="absolute inset-0 rounded-2xl opacity-40"
          style={{
            background: `linear-gradient(135deg, ${typeConfig.gradientFrom}10, transparent)`,
          }}
        />
        <TypeIcon className="h-7 w-7 relative" style={{ color: typeConfig.accentColor, opacity: 0.6 }} />
        <motion.div
          className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full"
          style={{ background: typeConfig.gradientTo, boxShadow: `0 0 8px ${typeConfig.gradientTo}60` }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' as const }}
        />
      </div>
      <p className="text-sm font-medium text-muted-foreground/40 mb-1">
        Belum ada kategori {activeTab === 'pemasukan' ? t('biz.pemasukan') : activeTab === 'pengeluaran' ? t('biz.pengeluaran') : 'Produk'}
      </p>
      <p className="text-xs text-muted-foreground/25 text-center max-w-[240px] mb-4">
        Tambahkan kategori untuk mengorganisir data bisnis Anda
      </p>
      <Button
        size="sm"
        onClick={openCreateDialog}
        className="gap-2 rounded-xl text-xs font-medium"
        style={{
          background: `linear-gradient(135deg, ${typeConfig.gradientFrom}, ${typeConfig.gradientTo}cc)`,
          color: '#0D0D0D',
        }}
      >
        <Plus className="h-3.5 w-3.5" />
        {t('common.add')}
      </Button>
    </motion.div>
  );

  /* ── Skeleton Loading ── */
  const renderSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-14 rounded-xl bg-muted/20 animate-pulse"
          style={{ animationDelay: `${i * 0.08}s` }}
        />
      ))}
    </div>
  );

  if (!businessId) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <p className="text-muted-foreground/50 text-center">{t('biz.registerFirst')}</p>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-5"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Header Card ── */}
      <motion.div variants={cardPopVariants}>
        <Card className="bg-card border-border overflow-hidden">
          {/* Gradient header strip */}
          <div
            className="h-1 w-full"
            style={{
              background: `linear-gradient(90deg, ${typeConfig.gradientFrom}, ${typeConfig.gradientTo})`,
            }}
          />
          <CardHeader className="pb-3 pt-5 px-5 md:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${typeConfig.gradientFrom}18, ${typeConfig.gradientTo}12)`,
                    boxShadow: `0 0 16px ${typeConfig.gradientFrom}08`,
                  }}
                >
                  <Layers className="h-5 w-5" style={{ color: typeConfig.accentColor }} />
                </div>
                <div>
                  <CardTitle className="text-foreground text-sm md:text-base font-semibold flex items-center gap-2">
                    {t('biz.addCategory')}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground/30 mt-0.5">
                    Kelola kategori {activeTab === 'pemasukan' ? t('biz.pemasukan') : activeTab === 'pengeluaran' ? t('biz.pengeluaran') : 'Produk'}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={openCreateDialog}
                className="gap-2 rounded-xl text-xs font-medium shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${typeConfig.gradientFrom}, ${typeConfig.gradientTo}cc)`,
                  color: '#0D0D0D',
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                {t('biz.addCategory')}
              </Button>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* ── Tab Selector ── */}
      <motion.div variants={itemVariants}>
        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            setActiveTab(val as CategoryType);
            setSearchQuery('');
          }}
        >
          <div
            className="bg-card border border-border rounded-2xl p-1.5 relative overflow-x-auto"
          >
            {/* Decorative gradient circle */}
            <div
              className="absolute -top-8 -right-8 h-24 w-24 rounded-full opacity-[0.04]"
              style={{
                background: `radial-gradient(circle, ${typeConfig.gradientFrom}, transparent)`,
              }}
            />
            <TabsList className="bg-transparent h-auto p-0 gap-1 relative">
              {CATEGORY_TYPES.map((type) => {
                const config = TYPE_CONFIG[type];
                const Icon = config.icon;
                const isActive = activeTab === type;
                return (
                  <TabsTrigger
                    key={type}
                    value={type}
                    className={cn(
                      'relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 data-[state=active]:bg-transparent data-[state=active]:shadow-none',
                      isActive
                        ? 'text-foreground'
                        : 'text-muted-foreground/40 hover:text-muted-foreground/60'
                    )}
                  >
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 rounded-xl"
                        style={{
                          background: `linear-gradient(135deg, ${config.gradientFrom}18, ${config.gradientTo}10)`,
                          border: `1px solid ${config.accentColor}25`,
                        }}
                        layoutId="active-tab-bg"
                        transition={{ type: 'spring' as const, stiffness: 350, damping: 30 }}
                      />
                    )}
                    <Icon className="h-3.5 w-3.5 relative z-10" style={{ color: isActive ? config.accentColor : 'currentColor' }} />
                    <span className="relative z-10">
                      {type === 'pemasukan' ? t('biz.pemasukan') : type === 'pengeluaran' ? t('biz.pengeluaran') : 'Produk'}
                    </span>
                    {/* Count badge */}
                    {type === activeTab && categories.length > 0 && (
                      <motion.span
                        className="relative z-10 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                        style={{
                          color: config.accentColor,
                          backgroundColor: `${config.accentColor}15`,
                        }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                      >
                        {categories.length}
                      </motion.span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {/* ── Tab Content ── */}
          <TabsContent value={activeTab} className="mt-4">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const }}
            >
              {/* ── Search Bar ── */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/25" />
                  <Input
                    placeholder={t('common.search') + '...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 bg-card border-border text-foreground placeholder:text-muted-foreground/25 text-sm rounded-xl focus:border-foreground/15 focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              {/* ── Category List ── */}
              <Card className="bg-card border-border overflow-hidden">
                <div className="max-h-[420px] overflow-y-auto custom-scrollbar">
                  {loading ? (
                    renderSkeleton()
                  ) : filteredCategories.length === 0 ? (
                    searchQuery ? (
                      <div className="flex flex-col items-center py-10 px-6">
                        <Search className="h-8 w-8 text-white/15 mb-3" />
                        <p className="text-sm text-muted-foreground/30">Tidak ditemukan</p>
                        <p className="text-xs text-white/20 mt-0.5">
                          Coba kata kunci lain untuk &quot;{searchQuery}&quot;
                        </p>
                      </div>
                    ) : (
                      renderEmptyState()
                    )
                  ) : (
                    <motion.div
                      className="divide-y divide-border"
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      <AnimatePresence mode="popLayout">
                        {filteredCategories.map((category, idx) => (
                          <motion.div
                            key={category.id}
                            variants={itemVariants}
                            custom={idx}
                            layout
                            initial="hidden"
                            animate="visible"
                            exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                            className="flex items-center gap-3 px-4 md:px-5 py-3.5 group hover:bg-muted/20 transition-all duration-200"
                          >
                            {/* Icon */}
                            <div
                              className="h-8 w-8 rounded-lg shrink-0 flex items-center justify-center"
                              style={{
                                backgroundColor: `${category.color || typeConfig.accentColor}15`,
                                boxShadow: `0 0 10px ${category.color || typeConfig.accentColor}08`,
                              }}
                            >
                              <DynamicIcon
                                name={category.icon || 'Tag'}
                                className="h-4 w-4"
                                style={{ color: category.color || typeConfig.accentColor }}
                              />
                            </div>

                            {/* Name */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-muted-foreground/80 truncate group-hover:text-foreground transition-colors">
                                {category.name}
                              </p>
                            </div>

                            {/* Type badge */}
                            <Badge
                              variant="secondary"
                              className="hidden sm:flex text-[10px] font-semibold px-2 py-0.5 rounded-md border-0 shrink-0"
                              style={{
                                color: typeConfig.accentColor,
                                backgroundColor: `${typeConfig.accentColor}12`,
                              }}
                            >
                              {activeTab === 'pemasukan' ? t('biz.pemasukan') : activeTab === 'pengeluaran' ? t('biz.pengeluaran') : 'Produk'}
                            </Badge>

                            {/* Actions */}
                            <div className="flex items-center gap-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 shrink-0">
                              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditDialog(category)}
                                  className="h-9 w-9 sm:h-8 sm:w-8 p-0 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-muted/40"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </motion.div>
                              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setDeletingCategory(category);
                                    setDeleteDialogOpen(true);
                                  }}
                                  className="h-9 w-9 sm:h-8 sm:w-8 p-0 rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/[0.08]"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </motion.div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </div>

                {/* Footer count */}
                {!loading && categories.length > 0 && (
                  <div className="px-5 py-2.5 border-t border-border">
                    <p className="text-[11px] text-muted-foreground/25">
                      {filteredCategories.length} kategori
                      {searchQuery && ` ditemukan dari ${categories.length}`}
                    </p>
                  </div>
                )}
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="bg-card border-border w-[95vw] sm:max-w-md rounded-2xl"
        >
          {/* Gradient header line */}
          <div
            className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
            style={{
              background: `linear-gradient(90deg, ${typeConfig.gradientFrom}, ${typeConfig.gradientTo})`,
            }}
          />
          <DialogHeader className="pt-2">
            <DialogTitle className="text-foreground text-base font-semibold flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{
                  background: `linear-gradient(135deg, ${typeConfig.gradientFrom}18, ${typeConfig.gradientTo}12)`,
                }}
              >
                <Tag className="h-4 w-4" style={{ color: typeConfig.accentColor }} />
              </div>
              {editingCategory ? t('biz.editCategory') : t('biz.addCategory')}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground/40 text-xs">
              {editingCategory
                ? 'Ubah detail kategori yang sudah ada'
                : 'Buat kategori baru untuk data bisnis Anda'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Type indicator (read-only) */}
            <div className="space-y-2">
              <Label className="text-muted-foreground/50 text-xs">{t('biz.categoryType')}</Label>
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm"
                style={{
                  backgroundColor: `${typeConfig.accentColor}10`,
                  border: `1px solid ${typeConfig.accentColor}20`,
                }}
              >
                <TypeIcon className="h-4 w-4" style={{ color: typeConfig.accentColor }} />
                <span className="text-muted-foreground/70 font-medium capitalize">
                  {activeTab === 'pemasukan' ? t('biz.pemasukan') : activeTab === 'pengeluaran' ? t('biz.pengeluaran') : 'Produk'}
                </span>
              </div>
            </div>

            {/* Name input */}
            <div className="space-y-2">
              <Label htmlFor="category-name" className="text-muted-foreground/50 text-xs">
                {t('biz.categoryName')}
              </Label>
              <Input
                id="category-name"
                placeholder="Masukkan nama kategori..."
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="h-10 bg-muted/30 border-border text-foreground placeholder:text-white/20 text-sm rounded-xl focus:border-foreground/15 focus:ring-1 focus:ring-ring"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && formData.name.trim()) handleSave();
                }}
              />
            </div>

            {/* Icon Picker */}
            <div className="space-y-2">
              <Label className="text-muted-foreground/50 text-xs flex items-center gap-1.5">
                <Tag className="h-3 w-3" />
                Icon
              </Label>
              <IconPicker
                value={formData.icon}
                onChange={(iconName) => setFormData((prev) => ({ ...prev, icon: iconName }))}
                accentColor={typeConfig.accentColor}
              />
            </div>

            {/* Color picker */}
            <div className="space-y-2">
              <Label className="text-muted-foreground/50 text-xs flex items-center gap-1.5">
                <Palette className="h-3 w-3" />
                {t('biz.categoryColor')}
              </Label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                {COLORS.map((color) => (
                  <motion.button
                    key={color}
                    type="button"
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    className={cn(
                      'h-10 w-10 rounded-xl transition-all duration-200 relative',
                      formData.color === color && 'ring-2 ring-offset-2 ring-offset-card'
                    )}
                    style={{
                      backgroundColor: color,
                      boxShadow: formData.color === color
                        ? `0 0 16px ${color}40, 0 0 0 2px ${color}`
                        : `0 2px 8px ${color}15`,
                    }}
                    onClick={() => setFormData((prev) => ({ ...prev, color }))}
                  >
                    {formData.color === color && (
                      <motion.div
                        className="absolute inset-0 flex items-center justify-center"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring' as const, stiffness: 400, damping: 20 }}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M3 8L6.5 11.5L13 4.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              className="text-muted-foreground/50 hover:text-foreground hover:bg-muted/40 rounded-xl text-sm"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.name.trim() || saving}
              className="gap-2 rounded-xl text-sm font-medium"
              style={{
                background: formData.name.trim()
                  ? `linear-gradient(135deg, ${typeConfig.gradientFrom}, ${typeConfig.gradientTo}cc)`
                  : 'rgba(255,255,255,0.06)',
                color: formData.name.trim() ? '#0D0D0D' : 'rgba(255,255,255,0.3)',
              }}
            >
              {saving ? (
                <motion.div
                  className="h-4 w-4 border-2 border-current border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' as const }}
                />
              ) : (
                <>
                  {editingCategory ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  {editingCategory ? t('common.save') : t('common.add')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border w-[95vw] sm:max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground text-base font-semibold flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: 'rgba(207,102,121,0.12)',
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </div>
              Hapus Kategori
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground/40 text-sm">
              Apakah Anda yakin ingin menghapus kategori{' '}
              <span className="text-muted-foreground/70 font-medium">
                &quot;{deletingCategory?.name}&quot;
              </span>
              ? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              className="text-muted-foreground/50 hover:text-foreground hover:bg-muted/40 border-border rounded-xl text-sm"
            >
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90 text-foreground rounded-xl text-sm font-medium"
            >
              {deleting ? (
                <motion.div
                  className="h-4 w-4 border-2 border-current border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' as const }}
                />
              ) : (
                <span className="flex items-center gap-2">
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('common.delete')}
                </span>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Custom Scrollbar Styles ── */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }
      `}</style>
    </motion.div>
  );
}
