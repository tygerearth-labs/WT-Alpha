'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  AssetType,
  AssetDef,
  currencyPrefix,
  formatAssetPrice,
  ALL_ASSETS,
} from '@/lib/asset-catalogue';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Check, CornerDownLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SelectedAsset {
  symbol: string;
  name: string;
  type: AssetType;
  currentPrice: number;
}

interface AssetSearchInputProps {
  businessId: string;
  value?: SelectedAsset | null;
  onSelect: (asset: SelectedAsset) => void;
  disabled?: boolean;
}

interface MarketPrice {
  symbol: string;
  type: string;
  price: number;
  change24h: number;
}

// ── Design tokens ────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  crypto: { bg: 'rgba(3,218,198,0.12)', text: '#03DAC6' },
  forex: { bg: 'rgba(207,102,121,0.12)', text: '#CF6679' },
  saham: { bg: 'rgba(187,134,252,0.12)', text: '#BB86FC' },
  komoditas: { bg: 'rgba(255,215,0,0.12)', text: '#FFD700' },
  indeks: { bg: 'rgba(100,181,246,0.12)', text: '#64B5F6' },
};

const TYPE_ICONS: Record<string, string> = {
  crypto: '🪙',
  forex: '💱',
  saham: '📈',
  komoditas: '🏗️',
  indeks: '📊',
};

// ── Smart helpers ────────────────────────────────────────────────────────────

/** Limit displayed results per type group */
const MAX_PER_TYPE = 8;

// ── Component ────────────────────────────────────────────────────────────────

export default function AssetSearchInput({
  businessId,
  value,
  onSelect,
  disabled,
}: AssetSearchInputProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [prices, setPrices] = useState<Record<string, MarketPrice>>({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Smart filtered: always ALL types, prioritized by relevance ─────────────
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return []; // Don't show 90 items on empty
    return ALL_ASSETS.filter((asset) => {
      return (
        asset.label.toLowerCase().includes(q) ||
        asset.symbol.toLowerCase().includes(q) ||
        (asset.name && asset.name.toLowerCase().includes(q)) ||
        (asset.sector && asset.sector.toLowerCase().includes(q))
      );
    });
  }, [query]);

  // Group & limit results
  const grouped = useMemo(() => {
    const types: AssetType[] = ['crypto', 'saham', 'forex', 'komoditas', 'indeks'];
    const result: Array<{ type: AssetType; assets: AssetDef[] }> = [];
    for (const type of types) {
      const items = filtered.filter((a) => a.type === type);
      if (items.length > 0) {
        result.push({ type, assets: items.slice(0, MAX_PER_TYPE) });
      }
    }
    return result;
  }, [filtered]);

  const totalShown = grouped.reduce((s, g) => s + g.assets.length, 0);
  const hasMore = filtered.length > totalShown;

  // ── Handle select (declared before auto-select useEffect) ──────────────────
  const handleSelect = useCallback((asset: AssetDef) => {
    const key = `${asset.type}:${asset.symbol}`;
    const marketData = prices[key];
    const currentPrice = marketData?.price ?? 0;

    onSelect({
      symbol: asset.symbol,
      name: asset.name || asset.label,
      type: asset.type,
      currentPrice,
    });

    setOpen(false);
    setQuery('');
  }, [prices, onSelect]);

  // ── Auto-select: if only 1 result and query ≥ 2 chars, auto-pick ──────────
  const prevFilteredLenRef = useRef(0);
  useEffect(() => {
    if (query.length >= 2 && filtered.length === 1 && prevFilteredLenRef.current > 1) {
      handleSelect(filtered[0]);
    }
    prevFilteredLenRef.current = filtered.length;
  }, [filtered, query.length, handleSelect]);

  // ── Fetch prices for filtered assets (debounced, max 20) ──────────────────
  const priceSymbols = useMemo(() => {
    return filtered.slice(0, 20).map((a) => ({ type: a.type, symbol: a.symbol }));
  }, [filtered]);

  useEffect(() => {
    if (!open || !businessId || priceSymbols.length === 0) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      setLoadingPrices(true);
      try {
        const res = await fetch(`/api/business/${businessId}/market-data/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbols: priceSymbols }),
          signal: abortRef.current.signal,
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        const map: Record<string, MarketPrice> = {};
        for (const p of data.prices || []) {
          map[`${p.type}:${p.symbol}`] = p;
        }
        setPrices(map);
      } catch {
        // Silently fail
      } finally {
        setLoadingPrices(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, businessId, priceSymbols]);

  // ── Trigger button text ───────────────────────────────────────────────────
  const displayValue = value
    ? `${value.symbol}${value.name ? ` — ${value.name}` : ''}`
    : '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            'flex h-12 w-full items-center gap-3 rounded-xl border bg-white/[0.06] px-4 py-3 text-sm text-left transition-all',
            'border-white/[0.12] text-white',
            'hover:bg-white/[0.09] hover:border-white/[0.18] focus:outline-none focus:ring-2 focus:ring-[#BB86FC]/40 focus:border-[#BB86FC]/40',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            !displayValue && 'text-white/35'
          )}
        >
          <Search className="h-5 w-5 shrink-0 text-white/40" />
          <span className="truncate flex-1 text-[14px]">
            {displayValue || 'Cari aset... (BTC, XAU, BBCA, EUR, Nasdaq)'}
          </span>
          {value && (
            <Badge
              className="shrink-0 text-[9px] px-2 py-0.5 h-5 font-semibold border-0 rounded-md"
              style={{
                backgroundColor: TYPE_COLORS[value.type]?.bg,
                color: TYPE_COLORS[value.type]?.text,
              }}
            >
              {TYPE_ICONS[value.type] || ''} {value.type.toUpperCase()}
            </Badge>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 bg-[#1A1A2E] border-white/[0.08] shadow-2xl shadow-black/40 rounded-xl"
        sideOffset={8}
        align="start"
        style={{
          maxHeight: '420px',
        }}
      >
        <Command className="bg-transparent" shouldFilter={false}>
          <CommandInput
            placeholder="Ketik kode aset... (min 2 huruf)"
            value={query}
            onValueChange={setQuery}
            className="h-11 border-b border-white/[0.06] text-white text-sm placeholder:text-white/30 px-4"
          />
          <CommandList className="max-h-[350px] overflow-y-auto">
            <CommandEmpty className="py-6 text-center text-white/40 text-sm">
              Tidak ada aset ditemukan
            </CommandEmpty>

            {/* Empty state hint */}
            {!query && (
              <div className="py-8 text-center">
                <Search className="h-8 w-8 text-white/15 mx-auto mb-2" />
                <p className="text-xs text-white/30">Ketik min. 2 huruf untuk mulai cari</p>
                <p className="text-[10px] text-white/20 mt-1">{ALL_ASSETS.length} aset tersedia</p>
              </div>
            )}

            {/* Auto-select hint */}
            {query.length >= 2 && filtered.length === 1 && (
              <div className="px-3 py-1.5 bg-[#03DAC6]/8 border-b border-[#03DAC6]/15">
                <p className="text-[11px] text-[#03DAC6]/70 flex items-center gap-1">
                  <CornerDownLeft className="h-3 w-3" />
                  Auto-select: {filtered[0].label} ({filtered[0].name})
                </p>
              </div>
            )}

            {/* Results by type group */}
            {grouped.map((group) => {
              const typeColor = TYPE_COLORS[group.type] || TYPE_COLORS.crypto;
              const icon = TYPE_ICONS[group.type] || '📊';
              const groupTotal = filtered.filter((a) => a.type === group.type).length;

              return (
                <CommandGroup
                  key={group.type}
                  heading={
                    <span className="text-white/50 text-xs font-medium px-1">
                      {icon} {group.type.charAt(0).toUpperCase() + group.type.slice(1)}
                      <span className="text-white/20 ml-1">({groupTotal})</span>
                    </span>
                  }
                  className="px-1.5 py-0.5"
                >
                  {group.assets.map((asset) => {
                    const key = `${asset.type}:${asset.symbol}`;
                    const marketData = prices[key];
                    const price = marketData?.price;
                    const change = marketData?.change24h;
                    const isSelected =
                      value?.symbol === asset.symbol &&
                      value?.type === asset.type;
                    const isPositive = change !== undefined && change >= 0;

                    return (
                      <CommandItem
                        key={key}
                        value={asset.symbol}
                        onSelect={() => handleSelect(asset)}
                        className={cn(
                          'flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer',
                          'data-[selected=true]:bg-white/[0.06] text-white',
                          'hover:bg-white/[0.08] transition-colors'
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 text-xs"
                            style={{ backgroundColor: typeColor.bg, color: typeColor.text }}>
                            {asset.label.slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate leading-tight">
                              {asset.label}
                              {isSelected && (
                                <Check className="inline h-3 w-3 ml-1.5 text-[#03DAC6]" />
                              )}
                            </p>
                            <p className="text-[10px] text-white/35 truncate leading-tight">
                              {asset.name}
                              {asset.sector && <span className="text-white/20"> · {asset.sector}</span>}
                            </p>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="flex flex-col items-end shrink-0">
                          {loadingPrices ? (
                            <Skeleton className="h-3.5 w-14 rounded bg-white/[0.06]" />
                          ) : price !== undefined ? (
                            <p className="text-[11px] font-semibold text-white/80">
                              {currencyPrefix(asset.type as AssetType)}{formatAssetPrice(price, asset.type)}
                            </p>
                          ) : null}
                          {change !== undefined && (
                            <span className={cn(
                              'text-[10px] font-medium',
                              isPositive ? 'text-[#03DAC6]' : 'text-[#CF6679]'
                            )}>
                              {isPositive ? '+' : ''}{change.toFixed(2)}%
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              );
            })}

            {/* "Show more" hint */}
            {hasMore && (
              <div className="px-3 py-2 text-center border-t border-white/[0.04]">
                <p className="text-[10px] text-white/25">
                  +{filtered.length - totalShown} lagi — ketik lebih spesifik
                </p>
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
