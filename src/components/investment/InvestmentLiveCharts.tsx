'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useBusinessStore } from '@/store/useBusinessStore';
import { useTranslation } from '@/hooks/useTranslation';
import {
  type AssetType,
  type AssetDef,
  ALL_ASSETS,
  CRYPTO_ASSETS,
  FOREX_ASSETS,
  SAHAM_ASSETS,
  formatAssetPrice,
  currencyPrefix,
} from '@/lib/asset-catalogue';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  TrendingUp,
  TrendingDown,
  Search,
  RefreshCw,
  LineChart,
  Bitcoin,
} from 'lucide-react';
import InvestmentChart from '@/components/investment/InvestmentChart';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MarketPrice {
  symbol: string;
  type: string;
  price: number;
  change24h: number;
  volume: number;
  marketCap: number;
  high24h: number;
  low24h: number;
  name?: string;
  sector?: string;
}

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------

const TYPE_TABS: { key: 'all' | AssetType; label: string; color: string }[] = [
  { key: 'all', label: 'Semua', color: '#BB86FC' },
  { key: 'crypto', label: 'Crypto', color: '#03DAC6' },
  { key: 'forex', label: 'Forex', color: '#CF6679' },
  { key: 'saham', label: 'Saham', color: '#BB86FC' },
];

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  crypto: { bg: 'rgba(3,218,198,0.12)', text: '#03DAC6' },
  forex: { bg: 'rgba(207,102,121,0.12)', text: '#CF6679' },
  saham: { bg: 'rgba(187,134,252,0.12)', text: '#BB86FC' },
};

const POSITIVE_COLOR = '#03DAC6';
const NEGATIVE_COLOR = '#CF6679';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatChange(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}

// ---------------------------------------------------------------------------
// Skeleton Card
// ---------------------------------------------------------------------------

function AssetCardSkeleton() {
  return (
    <Card className="bg-[#1A1A2E] border-white/[0.06]">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-16 rounded bg-white/[0.06]" />
          <Skeleton className="h-5 w-14 rounded-full bg-white/[0.06]" />
        </div>
        <Skeleton className="h-6 w-28 rounded bg-white/[0.06]" />
        <Skeleton className="h-4 w-20 rounded bg-white/[0.06]" />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InvestmentLiveCharts() {
  const { t } = useTranslation();
  const { activeBusiness } = useBusinessStore();
  const businessId = activeBusiness?.id;

  // State
  const [activeTab, setActiveTab] = useState<'all' | AssetType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(30);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<AssetType | null>(null);

  // Countdown ref for interval tracking
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // -----------------------------------------------------------------------
  // Fetch market data
  // -----------------------------------------------------------------------

  const fetchMarketData = useCallback(
    async (isRefresh = false) => {
      if (!businessId) return;

      // Abort previous request
      if (abortRef.current) {
        abortRef.current.abort();
      }
      abortRef.current = new AbortController();

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const body = {
          symbols: ALL_ASSETS.map((a) => ({
            type: a.type,
            symbol: a.symbol,
          })),
        };

        const res = await fetch(
          `/api/business/${businessId}/market-data/batch`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: abortRef.current.signal,
          }
        );

        if (!res.ok) throw new Error('Failed to fetch market data');

        const data = await res.json();
        setPrices(data.prices || []);

        if (isRefresh) {
          toast.success(t('inv.pricesUpdated') || 'Harga diperbarui', {
            duration: 2000,
          });
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        toast.error(t('inv.fetchError') || 'Gagal memuat data pasar');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [businessId, t]
  );

  // -----------------------------------------------------------------------
  // Auto-refresh with countdown
  // -----------------------------------------------------------------------

  const resetCountdown = useCallback(() => {
    setCountdown(30);
  }, []);

  useEffect(() => {
    if (!businessId) return;

    // Initial fetch
    fetchMarketData();

    // Countdown timer
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchMarketData(true);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [businessId, fetchMarketData]);

  // -----------------------------------------------------------------------
  // Filtered assets
  // -----------------------------------------------------------------------

  const filteredAssets = ALL_ASSETS.filter((asset) => {
    const matchesType = activeTab === 'all' || asset.type === activeTab;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      asset.label.toLowerCase().includes(query) ||
      asset.symbol.toLowerCase().includes(query);
    return matchesType && matchesSearch;
  });

  // Build a lookup map for prices
  const priceMap = new Map<string, MarketPrice>();
  for (const p of prices) {
    priceMap.set(`${p.type}:${p.symbol}`, p);
  }

  // -----------------------------------------------------------------------
  // Open chart dialog
  // -----------------------------------------------------------------------

  const openChart = (asset: AssetDef) => {
    setSelectedSymbol(asset.symbol);
    setSelectedType(asset.type);
    setDialogOpen(true);
  };

  // -----------------------------------------------------------------------
  // No business guard
  // -----------------------------------------------------------------------

  if (!businessId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <LineChart className="h-12 w-12 text-white/20" />
        <p className="text-white/50 text-center">
          {t('inv.registerFirst') || 'Daftarkan bisnis investasi terlebih dahulu'}
        </p>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: 'rgba(187,134,252,0.15)' }}
          >
            <LineChart className="h-5 w-5 text-[#BB86FC]" />
          </div>
          <div>
            <h2 className="text-white text-lg font-semibold leading-tight">
              {t('inv.liveCharts') || 'Live Charts'}
            </h2>
            <p className="text-white/40 text-xs mt-0.5">
              {t('inv.marketOverview') || 'Ikhtisar Pasar Real-time'}
            </p>
          </div>
        </div>

        {/* Refresh indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-white/30 text-xs">
            <RefreshCw
              className={cn(
                'h-3.5 w-3.5 transition-transform',
                refreshing && 'animate-spin'
              )}
            />
            <span>
              {refreshing
                ? t('inv.refreshing') || 'Memperbarui...'
                : `${countdown}s`}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-white/50 hover:text-white/80 hover:bg-white/[0.06] text-xs"
            disabled={loading || refreshing}
            onClick={() => {
              resetCountdown();
              fetchMarketData(true);
            }}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            {t('inv.refresh') || 'Refresh'}
          </Button>
        </div>
      </div>

      {/* ── Search bar ── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
        <Input
          placeholder={t('inv.searchAssets') || 'Cari aset... (BTC, EUR/USD, BBCA)'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-[#1A1A2E] border-white/[0.06] text-white placeholder:text-white/30 pl-10 h-10 text-sm focus-visible:ring-[#BB86FC]/30 focus-visible:border-[#BB86FC]/30"
        />
        {searchQuery && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50 text-xs"
            onClick={() => setSearchQuery('')}
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Type tabs ── */}
      <div className="flex gap-2 flex-wrap">
        {TYPE_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'text-white shadow-sm'
                  : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04] bg-transparent'
              )}
              style={
                isActive
                  ? {
                      backgroundColor: `${tab.color}20`,
                      color: tab.color,
                    }
                  : undefined
              }
            >
              {tab.label}
              {tab.key !== 'all' && (
                <span
                  className="ml-2 text-xs opacity-70"
                >
                  {tab.key === 'crypto'
                    ? CRYPTO_ASSETS.length
                    : tab.key === 'forex'
                      ? FOREX_ASSETS.length
                      : SAHAM_ASSETS.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Asset grid ── */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 15 }).map((_, i) => (
            <AssetCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredAssets.length === 0 ? (
        <Card className="bg-[#1A1A2E] border-white/[0.06]">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Search className="h-10 w-10 text-white/15 mb-3" />
            <p className="text-white/40 text-sm text-center">
              {t('inv.noAssetsFound') || 'Tidak ada aset ditemukan'}
            </p>
            <p className="text-white/25 text-xs text-center mt-1">
              {t('inv.tryDifferentSearch') || 'Coba kata kunci yang berbeda'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredAssets.map((asset) => {
            const key = `${asset.type}:${asset.symbol}`;
            const marketData = priceMap.get(key);
            const price = marketData?.price ?? null;
            const change = marketData?.change24h ?? null;
            const isPositive = change !== null && change >= 0;

            const typeColor = TYPE_COLORS[asset.type] ?? TYPE_COLORS.crypto;

            return (
              <Card
                key={key}
                className="bg-[#1A1A2E] border-white/[0.06] hover:border-white/[0.12] cursor-pointer transition-all duration-200 group hover:shadow-lg hover:shadow-black/20 active:scale-[0.98]"
                onClick={() => openChart(asset)}
              >
                <CardContent className="p-4">
                  {/* Top row: symbol + type badge */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {asset.type === 'crypto' && (
                        <Bitcoin
                          className="h-4 w-4 shrink-0"
                          style={{ color: typeColor.text }}
                        />
                      )}
                      <span className="text-white text-sm font-semibold truncate">
                        {asset.label}
                      </span>
                    </div>
                    <Badge
                      variant="secondary"
                      className="shrink-0 text-[10px] px-1.5 py-0 h-5 font-medium border-0"
                      style={{
                        backgroundColor: typeColor.bg,
                        color: typeColor.text,
                      }}
                    >
                      {asset.type.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Price */}
                  <div className="mb-1.5">
                    {price !== null ? (
                      <p className="text-white text-base font-bold tracking-tight">
                        {currencyPrefix(asset.type)}
                        {formatAssetPrice(price, asset.type)}
                      </p>
                    ) : (
                      <Skeleton className="h-6 w-24 rounded bg-white/[0.06]" />
                    )}
                  </div>

                  {/* 24h change */}
                  <div className="flex items-center gap-1">
                    {change !== null ? (
                      <>
                        {isPositive ? (
                          <TrendingUp
                            className="h-3.5 w-3.5"
                            style={{ color: POSITIVE_COLOR }}
                          />
                        ) : (
                          <TrendingDown
                            className="h-3.5 w-3.5"
                            style={{ color: NEGATIVE_COLOR }}
                          />
                        )}
                        <span
                          className={cn(
                            'text-xs font-semibold',
                            isPositive ? 'text-[#03DAC6]' : 'text-[#CF6679]'
                          )}
                        >
                          {formatChange(change)}
                        </span>
                      </>
                    ) : (
                      <Skeleton className="h-4 w-16 rounded bg-white/[0.06]" />
                    )}
                  </div>

                  {/* Hover indicator */}
                  <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] text-white/30">
                      {t('inv.clickToView') || 'Klik untuk melihat chart'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Last updated timestamp ── */}
      {prices.length > 0 && !loading && (
        <p className="text-center text-white/20 text-xs">
          {t('inv.lastUpdated') || 'Terakhir diperbarui'}:{' '}
          {new Date().toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </p>
      )}

      {/* ── Chart Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl w-[95vw] bg-[#1A1A2E] border-white/[0.06] p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-3">
            <div className="flex items-center gap-3">
              {selectedType === 'crypto' && (
                <Bitcoin className="h-5 w-5 text-[#03DAC6]" />
              )}
              <DialogTitle className="text-white text-base font-semibold">
                {selectedSymbol}
              </DialogTitle>
              {selectedType && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-2 py-0 h-5 font-medium border-0"
                  style={{
                    backgroundColor:
                      TYPE_COLORS[selectedType]?.bg ?? 'rgba(187,134,252,0.12)',
                    color:
                      TYPE_COLORS[selectedType]?.text ?? '#BB86FC',
                  }}
                >
                  {selectedType.toUpperCase()}
                </Badge>
              )}
            </div>
          </DialogHeader>
          <div className="px-4 pb-4">
            {selectedSymbol && selectedType && (
              <InvestmentChart
                symbol={selectedSymbol}
                type={selectedType as 'saham' | 'crypto' | 'forex'}
                height={450}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
