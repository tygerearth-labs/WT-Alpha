'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  AssetType,
  AssetDef,
  searchAssets,
  currencyPrefix,
  formatAssetPrice,
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
import { Search, TrendingUp, TrendingDown, Bitcoin, Check } from 'lucide-react';
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
  typeFilter?: AssetType | 'all';
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
};

// ── Component ────────────────────────────────────────────────────────────────

export default function AssetSearchInput({
  businessId,
  typeFilter = 'all',
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

  // ── Filtered assets from catalogue ────────────────────────────────────────
  const filtered = useMemo(() => {
    return searchAssets(query, typeFilter);
  }, [query, typeFilter]);

  // ── Fetch prices for filtered assets (debounced) ──────────────────────────
  useEffect(() => {
    if (!open || !businessId || filtered.length === 0) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      setLoadingPrices(true);
      try {
        const symbols = filtered.map((a) => ({ type: a.type, symbol: a.symbol }));
        const res = await fetch(`/api/business/${businessId}/market-data/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbols }),
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
        // Silently fail - will show "-" for prices
      } finally {
        setLoadingPrices(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, businessId, filtered]);

  // ── Handle select ─────────────────────────────────────────────────────────
  const handleSelect = (asset: AssetDef) => {
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
  };

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
            'flex h-10 w-full items-center gap-2 rounded-md border bg-white/[0.05] px-3 py-2 text-sm text-left transition-colors',
            'border-white/[0.1] text-white',
            'hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-[#BB86FC]/30 focus:border-[#BB86FC]/30',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            !displayValue && 'text-white/30'
          )}
        >
          <Search className="h-4 w-4 shrink-0 text-white/40" />
          <span className="truncate flex-1">
            {displayValue || 'Cari aset... (BTC, XAU, BBCA)'}
          </span>
          {value && (
            <Badge
              className="shrink-0 text-[9px] px-1.5 py-0 h-4 font-medium border-0"
              style={{
                backgroundColor: TYPE_COLORS[value.type]?.bg,
                color: TYPE_COLORS[value.type]?.text,
              }}
            >
              {value.type.toUpperCase()}
            </Badge>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 bg-[#1A1A2E] border-white/[0.08] shadow-2xl shadow-black/40"
        sideOffset={8}
        align="start"
        style={{
          maxHeight: '340px',
        }}
      >
        <Command className="bg-transparent" shouldFilter={false}>
          <CommandInput
            placeholder="Ketik nama atau kode aset..."
            value={query}
            onValueChange={setQuery}
            className="h-10 border-b border-white/[0.06] text-white placeholder:text-white/30"
          />
          <CommandList className="max-h-[260px] overflow-y-auto">
            <CommandEmpty className="py-6 text-center text-white/40 text-sm">
              Tidak ada aset ditemukan
            </CommandEmpty>

            {/* Group by type */}
            {['crypto', 'forex', 'saham']
              .filter(
                (type) =>
                  typeFilter === 'all' || typeFilter === type
              )
              .map((type) => {
                const groupAssets = filtered.filter((a) => a.type === type);
                if (groupAssets.length === 0) return null;

                const groupLabel =
                  type === 'crypto'
                    ? '🪙 Crypto'
                    : type === 'forex'
                      ? '💱 Forex'
                      : '📈 Saham';
                const typeColor = TYPE_COLORS[type];

                return (
                  <CommandGroup
                    key={type}
                    heading={
                      <span className="text-white/50 text-xs font-medium">
                        {groupLabel}{' '}
                        <span className="text-white/25">
                          ({groupAssets.length})
                        </span>
                      </span>
                    }
                    className="px-1"
                  >
                    {groupAssets.map((asset) => {
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
                            'flex items-center gap-2.5 px-2.5 py-2.5 rounded-md cursor-pointer',
                            'data-[selected=true]:bg-white/[0.06] text-white',
                            'hover:bg-white/[0.08] transition-colors'
                          )}
                        >
                          {/* Symbol & icon */}
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {asset.type === 'crypto' ? (
                              <Bitcoin
                                className="h-4 w-4 shrink-0"
                                style={{ color: typeColor.text }}
                              />
                            ) : (
                              <span
                                className="text-[10px] font-bold w-4 text-center shrink-0"
                                style={{ color: typeColor.text }}
                              >
                                {asset.type === 'forex' ? '↔' : '📊'}
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white truncate">
                                {asset.label}
                                {isSelected && (
                                  <Check className="inline h-3.5 w-3.5 ml-1.5 text-[#03DAC6]" />
                                )}
                              </p>
                              <p className="text-[11px] text-white/40 truncate">
                                {asset.name || asset.symbol}
                                {asset.sector && (
                                  <span className="ml-1.5 text-white/25">
                                    · {asset.sector}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Price & change */}
                          <div className="flex flex-col items-end shrink-0 ml-2">
                            {loadingPrices ? (
                              <Skeleton className="h-4 w-16 rounded bg-white/[0.06]" />
                            ) : price !== undefined ? (
                              <p className="text-xs font-semibold text-white/90">
                                {currencyPrefix(asset.type as AssetType)}
                                {formatAssetPrice(price, asset.type)}
                              </p>
                            ) : (
                              <p className="text-xs text-white/25">—</p>
                            )}
                            {change !== undefined && (
                              <div className="flex items-center gap-0.5">
                                {isPositive ? (
                                  <TrendingUp className="h-3 w-3 text-[#03DAC6]" />
                                ) : (
                                  <TrendingDown className="h-3 w-3 text-[#CF6679]" />
                                )}
                                <span
                                  className={cn(
                                    'text-[11px] font-medium',
                                    isPositive
                                      ? 'text-[#03DAC6]'
                                      : 'text-[#CF6679]'
                                  )}
                                >
                                  {isPositive ? '+' : ''}
                                  {change.toFixed(2)}%
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Type badge */}
                          <Badge
                            className="shrink-0 text-[9px] px-1.5 py-0 h-4 font-medium border-0"
                            style={{
                              backgroundColor: typeColor.bg,
                              color: typeColor.text,
                            }}
                          >
                            {type.toUpperCase()}
                          </Badge>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                );
              })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
