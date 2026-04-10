'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { DynamicIcon } from './DynamicIcon';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// ── Curated icon list for category picker ──
const PICKER_ICONS: { name: string; label: string; group: string }[] = [
  // 💰 Finance
  { name: 'Wallet', label: 'Dompet', group: 'Finance' },
  { name: 'CreditCard', label: 'Kartu Kredit', group: 'Finance' },
  { name: 'Banknote', label: 'Uang Tunai', group: 'Finance' },
  { name: 'Coins', label: 'Koin', group: 'Finance' },
  { name: 'CircleDollarSign', label: 'Dollar', group: 'Finance' },
  { name: 'PiggyBank', label: 'Celengan', group: 'Finance' },
  { name: 'Receipt', label: 'Struk', group: 'Finance' },
  { name: 'Calculator', label: 'Kalkulator', group: 'Finance' },
  { name: 'TrendingUp', label: 'Naik', group: 'Finance' },
  { name: 'TrendingDown', label: 'Turun', group: 'Finance' },
  { name: 'Landmark', label: 'Bank', group: 'Finance' },
  { name: 'ArrowUpRight', label: 'Plus', group: 'Finance' },
  { name: 'ArrowDownRight', label: 'Minus', group: 'Finance' },
  // 🍔 Makanan & Minuman
  { name: 'UtensilsCrossed', label: 'Makan', group: 'Makanan' },
  { name: 'Coffee', label: 'Kopi', group: 'Makanan' },
  { name: 'Utensils', label: 'Sendok', group: 'Makanan' },
  { name: 'Pizza', label: 'Pizza', group: 'Makanan' },
  { name: 'Beef', label: 'Daging', group: 'Makanan' },
  { name: 'Apple', label: 'Apel', group: 'Makanan' },
  { name: 'Droplets', label: 'Minuman', group: 'Makanan' },
  // 🛍️ Belanja
  { name: 'ShoppingBag', label: 'Belanja', group: 'Belanja' },
  { name: 'Tag', label: 'Label', group: 'Belanja' },
  { name: 'Gift', label: 'Hadiah', group: 'Belanja' },
  { name: 'Store', label: 'Toko', group: 'Belanja' },
  { name: 'Package', label: 'Paket', group: 'Belanja' },
  { name: 'Shirt', label: 'Baju', group: 'Belanja' },
  // 🚗 Transportasi
  { name: 'Car', label: 'Mobil', group: 'Transport' },
  { name: 'Bus', label: 'Bus', group: 'Transport' },
  { name: 'Train', label: 'Kereta', group: 'Transport' },
  { name: 'Bike', label: 'Sepeda', group: 'Transport' },
  { name: 'Plane', label: 'Pesawat', group: 'Transport' },
  { name: 'Ship', label: 'Kapal', group: 'Transport' },
  { name: 'Fuel', label: 'Bensin', group: 'Transport' },
  { name: 'Truck', label: 'Truk', group: 'Transport' },
  // 🏠 Rumah & Utilitas
  { name: 'Home', label: 'Rumah', group: 'Rumah' },
  { name: 'Building', label: 'Gedung', group: 'Rumah' },
  { name: 'Building2', label: 'Kantor', group: 'Rumah' },
  { name: 'Zap', label: 'Listrik', group: 'Rumah' },
  { name: 'Flame', label: 'Gas', group: 'Rumah' },
  { name: 'Wifi', label: 'Wifi', group: 'Rumah' },
  { name: 'Smartphone', label: 'HP', group: 'Rumah' },
  { name: 'Battery', label: 'Baterai', group: 'Rumah' },
  // ❤️ Kesehatan
  { name: 'Heart', label: 'Jantung', group: 'Kesehatan' },
  { name: 'Stethoscope', label: 'Dokter', group: 'Kesehatan' },
  { name: 'Pill', label: 'Obat', group: 'Kesehatan' },
  { name: 'Dumbbell', label: 'Gym', group: 'Kesehatan' },
  { name: 'Syringe', label: 'Suntik', group: 'Kesehatan' },
  { name: 'Thermometer', label: 'Demam', group: 'Kesehatan' },
  // 🎮 Hiburan
  { name: 'Gamepad2', label: 'Game', group: 'Hiburan' },
  { name: 'Music', label: 'Musik', group: 'Hiburan' },
  { name: 'Tv', label: 'TV', group: 'Hiburan' },
  { name: 'Monitor', label: 'Monitor', group: 'Hiburan' },
  { name: 'Camera', label: 'Kamera', group: 'Hiburan' },
  { name: 'Headphones', label: 'Headset', group: 'Hiburan' },
  { name: 'Film', label: 'Film', group: 'Hiburan' },
  // 📚 Pendidikan
  { name: 'GraduationCap', label: 'Lulusan', group: 'Pendidikan' },
  { name: 'BookOpen', label: 'Buku', group: 'Pendidikan' },
  { name: 'Laptop', label: 'Laptop', group: 'Pendidikan' },
  // ✈️ Travel
  { name: 'Hotel', label: 'Hotel', group: 'Travel' },
  { name: 'MapPin', label: 'Lokasi', group: 'Travel' },
  { name: 'Compass', label: 'Kompas', group: 'Travel' },
  { name: 'Globe', label: 'Globe', group: 'Travel' },
  { name: 'Umbrella', label: 'Payung', group: 'Travel' },
  { name: 'Sun', label: 'Matahari', group: 'Travel' },
  // 👨‍👩‍👧 Keluarga
  { name: 'Baby', label: 'Bayi', group: 'Keluarga' },
  { name: 'Dog', label: 'Anjing', group: 'Keluarga' },
  { name: 'Cat', label: 'Kucing', group: 'Keluarga' },
  { name: 'Users', label: 'Keluarga', group: 'Keluarga' },
  // 💼 Pekerjaan
  { name: 'Briefcase', label: 'Pekerjaan', group: 'Pekerjaan' },
  { name: 'FileText', label: 'Dokumen', group: 'Pekerjaan' },
  { name: 'Clipboard', label: 'Clipboard', group: 'Pekerjaan' },
  { name: 'Settings', label: 'Setting', group: 'Pekerjaan' },
  { name: 'Wrench', label: 'Tools', group: 'Pekerjaan' },
  { name: 'Hammer', label: 'Palu', group: 'Pekerjaan' },
  { name: 'Paintbrush', label: 'Kuas', group: 'Pekerjaan' },
  // 🏆 Lainnya
  { name: 'Star', label: 'Bintang', group: 'Lainnya' },
  { name: 'Trophy', label: 'Piala', group: 'Lainnya' },
  { name: 'Medal', label: 'Medali', group: 'Lainnya' },
  { name: 'Crown', label: 'Mahkota', group: 'Lainnya' },
  { name: 'Gem', label: 'Permata', group: 'Lainnya' },
  { name: 'Lightbulb', label: 'Ide', group: 'Lainnya' },
  { name: 'Target', label: 'Target', group: 'Lainnya' },
  { name: 'Shield', label: 'Perisai', group: 'Lainnya' },
  { name: 'Lock', label: 'Gembok', group: 'Lainnya' },
  { name: 'Bell', label: 'Lonceng', group: 'Lainnya' },
  { name: 'Clock', label: 'Jam', group: 'Lainnya' },
  { name: 'Calendar', label: 'Kalender', group: 'Lainnya' },
  { name: 'Send', label: 'Kirim', group: 'Lainnya' },
  { name: 'Phone', label: 'Telepon', group: 'Lainnya' },
  { name: 'Mail', label: 'Email', group: 'Lainnya' },
  { name: 'Leaf', label: 'Daun', group: 'Lainnya' },
  { name: 'TreePine', label: 'Pohon', group: 'Lainnya' },
  { name: 'Flower2', label: 'Bunga', group: 'Lainnya' },
  { name: 'Snowflake', label: 'Salju', group: 'Lainnya' },
  { name: 'Cloud', label: 'Awan', group: 'Lainnya' },
];

const GROUP_ORDER = ['Finance', 'Makanan', 'Belanja', 'Transport', 'Rumah', 'Kesehatan', 'Hiburan', 'Pendidikan', 'Travel', 'Keluarga', 'Pekerjaan', 'Lainnya'];

const GROUP_LABELS: Record<string, string> = {
  Finance: '💰 Finance',
  Makanan: '🍔 Makanan',
  Belanja: '🛍️ Belanja',
  Transport: '🚗 Transport',
  Rumah: '🏠 Rumah',
  Kesehatan: '❤️ Kesehatan',
  Hiburan: '🎮 Hiburan',
  Pendidikan: '📚 Pendidikan',
  Travel: '✈️ Travel',
  Keluarga: '👨‍👩‍👧 Keluarga',
  Pekerjaan: '💼 Pekerjaan',
  Lainnya: '✨ Lainnya',
};

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
  accentColor?: string;
}

export function IconPicker({ value, onChange, accentColor = '#BB86FC' }: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Auto-scroll grid to top when opening
  useEffect(() => {
    if (isOpen && gridRef.current) {
      gridRef.current.scrollTop = 0;
    }
  }, [isOpen]);

  const filteredIcons = useMemo(() => {
    let icons = PICKER_ICONS;
    if (search.trim()) {
      const q = search.toLowerCase();
      icons = icons.filter(
        (icon) =>
          icon.name.toLowerCase().includes(q) ||
          icon.label.toLowerCase().includes(q) ||
          icon.group.toLowerCase().includes(q)
      );
      return icons;
    }
    if (activeGroup) {
      icons = icons.filter((icon) => icon.group === activeGroup);
    }
    return icons;
  }, [search, activeGroup]);

  const groupedIcons = useMemo(() => {
    const groups: Record<string, typeof PICKER_ICONS> = {};
    for (const icon of filteredIcons) {
      if (!groups[icon.group]) groups[icon.group] = [];
      groups[icon.group].push(icon);
    }
    return GROUP_ORDER.filter((g) => groups[g]?.length).map((g) => ({
      group: g,
      label: GROUP_LABELS[g] || g,
      icons: groups[g],
    }));
  }, [filteredIcons]);

  const selectedIcon = PICKER_ICONS.find((i) => i.name === value);

  const handleSelect = (iconName: string) => {
    onChange(iconName);
    setIsOpen(false);
    setSearch('');
    setActiveGroup(null);
  };

  const renderIconButton = (icon: typeof PICKER_ICONS[0]) => {
    const isSelected = value === icon.name;

    return (
      <button
        key={icon.name}
        type="button"
        title={`${icon.label} (${icon.name})`}
        onClick={() => handleSelect(icon.name)}
        className="h-11 w-11 sm:h-9 sm:w-9 rounded-xl grid place-items-center transition-all duration-150 hover:scale-110 active:scale-95 leading-none [&>*]:block"
        style={{
          background: isSelected ? `${accentColor}25` : 'rgba(255,255,255,0.04)',
          border: isSelected ? `2px solid ${accentColor}` : '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <DynamicIcon
          name={icon.name}
          className="h-5 w-5"
          style={{ color: isSelected ? accentColor : '#B3B3B3' }}
        />
      </button>
    );
  };

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full h-9 text-xs bg-[#1E1E1E] border border-white/[0.08] text-white/80 rounded-lg px-3 text-left hover:border-white/[0.15] transition-colors flex items-center gap-3"
      >
        <span
          className="w-6 h-6 rounded-md grid place-items-center shrink-0 leading-none [&>*]:block"
          style={{ background: `${accentColor}20` }}
        >
          <DynamicIcon name={value || 'Tag'} className="h-3.5 w-3.5" />
        </span>
        <span className="flex-1 truncate">
          {selectedIcon ? `${selectedIcon.label} (${selectedIcon.name})` : 'Pilih icon...'}
        </span>
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md" style={{ background: `${accentColor}15`, color: accentColor }}>
          {filteredIcons.length > 0 ? `${filteredIcons.length} icon` : '...'}
        </span>
      </button>

      {/* Icon Picker — Nested Radix Dialog (bottom sheet on mobile, centered modal on desktop) */}
      <Dialog open={isOpen} onOpenChange={(v) => { if (!v) { setIsOpen(false); setSearch(''); setActiveGroup(null); } }}>
        <DialogContent
          className="bg-[#141414] border-white/[0.08] rounded-2xl gap-0 p-0 overflow-hidden
            fixed bottom-0 left-0 right-0 top-auto translate-x-0 translate-y-0
            sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
            sm:max-w-lg w-full sm:w-auto max-h-[85vh] sm:max-h-[80vh]"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}
          showCloseButton={true}
        >
          {/* Accessibility */}
          <DialogTitle className="sr-only">Pilih Icon</DialogTitle>
          <DialogDescription className="sr-only">Pilih icon untuk kategori</DialogDescription>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-white/[0.06]">
            <p className="text-sm font-semibold" style={{ color: '#E6E1E5' }}>Pilih Icon</p>
            <span className="text-[10px]" style={{ color: '#666' }}>{filteredIcons.length} tersedia</span>
          </div>

          {/* Search */}
          <div className="px-3 pt-3 pb-2">
            <div className="flex items-center gap-2 px-3 h-9 rounded-lg bg-[#1E1E1E] border border-white/[0.06]">
              <Search className="h-3.5 w-3.5 text-white/30 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (e.target.value) setActiveGroup(null);
                }}
                placeholder="Cari icon..."
                className="flex-1 bg-transparent text-xs text-white/90 placeholder:text-white/25 outline-none"
                autoFocus
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="text-white/30 hover:text-white/60">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Group tabs */}
          {!search && (
            <div className="flex gap-1 px-3 py-2 overflow-x-auto border-b border-white/[0.04]" style={{ scrollbarWidth: 'none' }}>
              <button
                type="button"
                onClick={() => setActiveGroup(null)}
                className="text-[10px] font-semibold px-2.5 py-1 rounded-md shrink-0 transition-all whitespace-nowrap"
                style={{
                  background: activeGroup === null ? `${accentColor}20` : 'transparent',
                  color: activeGroup === null ? accentColor : '#9E9E9E',
                }}
              >
                Semua
              </button>
              {GROUP_ORDER.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setActiveGroup(activeGroup === g ? null : g)}
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-md shrink-0 transition-all whitespace-nowrap"
                  style={{
                    background: activeGroup === g ? `${accentColor}20` : 'transparent',
                    color: activeGroup === g ? accentColor : '#9E9E9E',
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          )}

          {/* Icon grid */}
          <div
            ref={gridRef}
            className="overflow-y-auto p-3"
            style={{ maxHeight: 'calc(85vh - 140px)', scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}
          >
            {groupedIcons.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-xs" style={{ color: '#9E9E9E' }}>Icon tidak ditemukan</p>
              </div>
            ) : search ? (
              <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                {filteredIcons.map((icon) => renderIconButton(icon))}
              </div>
            ) : (
              <div className="space-y-4">
                {groupedIcons.map(({ group, label, icons }) => (
                  <div key={group}>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-2 px-0.5" style={{ color: '#666' }}>
                      {label}
                    </p>
                    <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                      {icons.map((icon) => renderIconButton(icon))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
