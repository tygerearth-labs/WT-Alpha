'use client';

import { useRef, useEffect, useState, useMemo, useCallback, memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { BarChart3, RefreshCw, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

interface InvestmentChartProps {
  symbol: string;
  type: 'saham' | 'crypto' | 'forex';
  height?: number;
  showHeader?: boolean;
}

// ── Constants ────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  saham: { bg: 'rgba(187,134,252,0.12)', text: '#BB86FC' },
  crypto: { bg: 'rgba(3,218,198,0.12)', text: '#03DAC6' },
  forex: { bg: 'rgba(207,102,121,0.12)', text: '#CF6679' },
};

const INTERVALS = [
  { label: '1H', tv: '60' },
  { label: '4H', tv: '240' },
  { label: '1D', tv: 'D' },
  { label: '1W', tv: 'W' },
] as const;

// ── Symbol Mapping ───────────────────────────────────────────────────────────
// Maps our internal symbols to TradingView-compatible exchange:symbol format.

function toTradingViewSymbol(symbol: string, type: string): string {
  const upper = symbol.toUpperCase();
  switch (type) {
    case 'crypto':
      return upper.endsWith('USDT') ? `BINANCE:${upper}` : `BINANCE:${upper}USDT`;
    case 'forex':
      if (upper === 'XAUUSD') return 'OANDA:XAUUSD';
      if (upper.startsWith('USD')) return `FX_IDC:${upper}`;
      return `FX:${upper}`;
    case 'saham':
    default:
      return `IDX:${upper}`;
  }
}

// ── Component ────────────────────────────────────────────────────────────────

function InvestmentChartInner({
  symbol,
  type,
  height = 350,
  showHeader = true,
}: InvestmentChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeInterval, setActiveInterval] = useState('D');
  const widgetKeyRef = useRef(0);

  const tvSymbol = useMemo(() => toTradingViewSymbol(symbol, type), [symbol, type]);
  const tc = TYPE_COLORS[type] || TYPE_COLORS.crypto;

  // ── Load TradingView Widget ──────────────────────────────────────────────
  const loadWidget = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = '';
    setLoading(true);
    setError(false);
    widgetKeyRef.current += 1;

    // Create TradingView widget container div
    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = '100%';
    widgetDiv.style.width = '100%';
    container.appendChild(widgetDiv);

    // Build the TradingView embed config
    const config = {
      autosize: true,
      symbol: tvSymbol,
      interval: activeInterval,
      timezone: 'Asia/Jakarta',
      theme: 'dark',
      style: '1', // Candlestick
      locale: 'en',
      allow_symbol_change: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: 'https://www.tradingview.com',
      backgroundColor: 'rgba(13, 13, 13, 1)',
      gridColor: 'rgba(255, 255, 255, 0.04)',
    };

    // Create the TradingView embed script
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.type = 'text/javascript';
    script.textContent = JSON.stringify(config);

    const handleLoad = () => {
      setTimeout(() => setLoading(false), 1200);
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
    };

    const handleError = () => {
      setError(true);
      setLoading(false);
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
    };

    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);

    container.appendChild(script);
  }, [tvSymbol, activeInterval]);

  // ── Lifecycle ────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(loadWidget, 100);
    return () => {
      clearTimeout(timer);
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [loadWidget]);

  // ── TradingView symbol URL for external link ─────────────────────────────
  const tvChartUrl = useMemo(
    () => `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`,
    [tvSymbol],
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="bg-[#0D0D0D] overflow-hidden rounded-lg">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      {showHeader && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.04]">
          <div className="flex items-center gap-2">
            <span className="text-white text-xs font-bold font-mono">{symbol}</span>
            <Badge
              className="text-[9px] px-1.5 py-0 h-4 font-medium border-0"
              style={{ backgroundColor: tc.bg, color: tc.text }}
            >
              {type.toUpperCase()}
            </Badge>
            <span className="text-[10px] text-white/20 hidden sm:inline">via TradingView</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Interval buttons */}
            {INTERVALS.map((intv) => (
              <button
                key={intv.tv}
                className={cn(
                  'text-[10px] h-6 px-2 rounded-md font-medium transition-all duration-150',
                  activeInterval === intv.tv
                    ? 'bg-[#03DAC6]/15 text-[#03DAC6]'
                    : 'text-white/30 hover:text-white/60 hover:bg-white/[0.04]',
                )}
                onClick={() => setActiveInterval(intv.tv)}
              >
                {intv.label}
              </button>
            ))}

            {/* External link */}
            <a
              href={tvChartUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 p-1.5 rounded-md text-white/20 hover:text-[#03DAC6] hover:bg-white/[0.04] transition-colors"
              title="Open in TradingView"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}

      {/* ── Chart Area ────────────────────────────────────────────────────── */}
      <div style={{ height, width: '100%', position: 'relative' }}>
        {/* Loading skeleton overlay */}
        {loading && !error && (
          <div className="absolute inset-0 z-10 bg-[#0D0D0D] flex items-center justify-center">
            <div className="w-full h-full flex flex-col items-center justify-center gap-3">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[#03DAC6] animate-pulse" />
                <span className="text-[11px] text-white/30 font-medium">Loading chart...</span>
              </div>
              <Skeleton className="w-[80%] h-[2px] rounded-full bg-white/[0.06]" />
            </div>
          </div>
        )}

        {/* Error state */}
        {error ? (
          <div className="flex flex-col items-center justify-center h-full bg-[#0D0D0D]">
            <BarChart3 className="h-10 w-10 text-white/15 mb-3" />
            <p className="text-white/40 text-sm mb-1">Chart unavailable</p>
            <p className="text-white/20 text-[11px] mb-3">Could not load TradingView widget</p>
            <Button
              variant="ghost"
              size="sm"
              className="text-white/50 hover:text-white/70 hover:bg-white/[0.06] gap-1.5 text-xs"
              onClick={loadWidget}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </Button>
            <a
              href={tvChartUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 text-[11px] text-[#03DAC6]/50 hover:text-[#03DAC6] transition-colors flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Open on TradingView
            </a>
          </div>
        ) : (
          /* TradingView widget container */
          <div
            ref={containerRef}
            className="tradingview-widget-container"
            style={{ height: '100%', width: '100%' }}
          />
        )}
      </div>
    </div>
  );
}

export default memo(InvestmentChartInner);
