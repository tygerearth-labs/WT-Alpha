'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useBusinessStore } from '@/store/useBusinessStore';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import type { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';

interface InvestmentChartProps {
  symbol: string;
  type: 'saham' | 'crypto' | 'forex';
  height?: number;
}

interface OhlcBar {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface VolumeBar {
  time: UTCTimestamp;
  value: number;
  color: string;
}

const CRYPTO_MAP: Record<string, string> = {
  BTCUSDT: 'bitcoin',
  ETHUSDT: 'ethereum',
  BNBUSDT: 'binancecoin',
  ADAUSDT: 'cardano',
  SOLUSDT: 'solana',
  XRPUSDT: 'ripple',
  DOTUSDT: 'polkadot',
  DOGEUSDT: 'dogecoin',
  AVAXUSDT: 'avalanche-2',
  MATICUSDT: 'matic-network',
  LINKUSDT: 'chainlink',
  UNIUSDT: 'uniswap',
};

const TIME_RANGES = [
  { label: '1D', days: 1 },
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
] as const;

const UP_COLOR = '#03DAC6';
const DOWN_COLOR = '#CF6679';

export default function InvestmentChart({
  symbol,
  type,
  height = 350,
}: InvestmentChartProps) {
  const { activeBusiness } = useBusinessStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedRange, setSelectedRange] = useState(30);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number | null>(null);

  const chartHeight = height;
  const volumeHeight = Math.round(chartHeight * 0.25);
  const mainChartHeight = chartHeight - volumeHeight;

  const businessId = activeBusiness?.id;

  const fetchChartData = useCallback(
    async (days: number) => {
      if (!businessId || !containerRef.current) return;

      setLoading(true);
      setError(false);

      try {
        const url = `/api/business/${businessId}/market-data?type=${type}&symbol=${symbol}&chart=true&days=${days}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error('Failed to fetch');

        const data = await res.json();
        const ohlcRaw: number[][] = data.ohlc || [];

        if (ohlcRaw.length === 0) {
          setError(true);
          setLoading(false);
          return;
        }

        // Transform to chart data
        const ohlcData: OhlcBar[] = ohlcRaw.map(
          ([timestamp, open, high, low, close]) => ({
            time: (Math.floor(timestamp / 1000)) as UTCTimestamp,
            open,
            high,
            low,
            close,
          })
        );

        const volumeData: VolumeBar[] = ohlcRaw.map(
          ([timestamp, , , , close], idx) => ({
            time: (Math.floor(timestamp / 1000)) as UTCTimestamp,
            value: idx > 0 ? Math.abs(close - ohlcRaw[idx - 1][4]) * 1000 : 0,
            color: idx > 0 ? (close >= ohlcRaw[idx - 1][4] ? UP_COLOR : DOWN_COLOR) : UP_COLOR,
          })
        );

        // Set current price and change
        const lastClose = ohlcRaw[ohlcRaw.length - 1][4];
        const firstClose = ohlcRaw[0][4];
        setCurrentPrice(lastClose);
        setPriceChange(
          firstClose !== 0 ? ((lastClose - firstClose) / firstClose) * 100 : 0
        );

        // Dynamically import lightweight-charts (client-only)
        const { createChart, ColorType, CrosshairMode, CandlestickSeries, HistogramSeries } =
          await import('lightweight-charts');

        // Clean up previous chart
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
          candleSeriesRef.current = null;
          volumeSeriesRef.current = null;
        }

        const container = containerRef.current;

        // Create chart
        const chart = createChart(container, {
          width: container.clientWidth,
          height: chartHeight,
          layout: {
            background: { type: ColorType.Solid, color: '#0D0D0D' },
            textColor: 'rgba(255,255,255,0.5)',
            fontSize: 11,
          },
          grid: {
            vertLines: { color: 'rgba(255,255,255,0.04)' },
            horzLines: { color: 'rgba(255,255,255,0.04)' },
          },
          crosshair: {
            mode: CrosshairMode.Normal,
            vertLine: {
              color: 'rgba(255,255,255,0.2)',
              width: 1,
              style: 2,
              labelBackgroundColor: '#1A1A2E',
            },
            horzLine: {
              color: 'rgba(255,255,255,0.2)',
              width: 1,
              style: 2,
              labelBackgroundColor: '#1A1A2E',
            },
          },
          rightPriceScale: {
            borderColor: 'rgba(255,255,255,0.06)',
          },
          timeScale: {
            borderColor: 'rgba(255,255,255,0.06)',
            timeVisible: true,
            secondsVisible: false,
          },
          handleScroll: { vertTouchDrag: false },
        });

        chartRef.current = chart;

        // Add candlestick series
        const candleSeries = chart.addSeries(CandlestickSeries, {
          upColor: UP_COLOR,
          downColor: DOWN_COLOR,
          borderDownColor: DOWN_COLOR,
          borderUpColor: UP_COLOR,
          wickDownColor: DOWN_COLOR,
          wickUpColor: UP_COLOR,
        });
        candleSeriesRef.current = candleSeries;
        candleSeries.setData(ohlcData);

        // Add volume histogram in separate pane
        const volumeSeries = chart.addSeries(HistogramSeries, {
          priceFormat: { type: 'volume' },
          priceScaleId: 'volume',
        });
        volumeSeriesRef.current = volumeSeries;
        volumeSeries.priceScale().applyOptions({
          scaleMargins: {
            top: 0.8,
            bottom: 0,
          },
        });
        volumeSeries.setData(volumeData);

        chart.timeScale().fitContent();

        // Crosshair tooltip
        chart.subscribeCrosshairMove((param) => {
          if (!param.time || !param.point) return;
          const candleData = param.seriesData.get(candleSeries) as OhlcBar | undefined;
          if (candleData) {
            setCurrentPrice(candleData.close);
          }
        });
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [businessId, type, symbol, chartHeight]
  );

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    fetchChartData(selectedRange);
  }, [fetchChartData, selectedRange]);

  // Handle resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (chartRef.current && width > 0) {
          chartRef.current.applyOptions({ width });
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Cleanup chart on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  const formatPrice = (val: number) => {
    if (val >= 1000) {
      return val.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return val.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  };

  const changePositive = priceChange !== null && priceChange >= 0;

  return (
    <Card className="bg-[#1A1A2E] border-white/[0.06] overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <CardTitle className="text-white text-sm">{symbol}</CardTitle>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor:
                  type === 'crypto'
                    ? `${UP_COLOR}20`
                    : type === 'forex'
                      ? `${DOWN_COLOR}20`
                      : '#BB86FC20',
                color:
                  type === 'crypto'
                    ? UP_COLOR
                    : type === 'forex'
                      ? DOWN_COLOR
                      : '#BB86FC',
              }}
            >
              {type.toUpperCase()}
            </span>
          </div>

          {/* Time range selector */}
          <div className="flex gap-1">
            {TIME_RANGES.map((range) => (
              <Button
                key={range.label}
                variant={selectedRange === range.days ? 'default' : 'ghost'}
                size="sm"
                className={
                  selectedRange === range.days
                    ? 'bg-[#03DAC6]/20 text-[#03DAC6] hover:bg-[#03DAC6]/30 text-xs h-7 px-2.5'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/[0.06] text-xs h-7 px-2.5'
                }
                onClick={() => setSelectedRange(range.days)}
              >
                {range.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Price info */}
        {!loading && !error && currentPrice !== null && (
          <div className="flex items-center gap-3 mt-1">
            <span className="text-white text-xl font-bold">
              {type === 'saham' ? 'Rp' : type === 'forex' ? '' : '$'}{formatPrice(currentPrice)}
            </span>
            {priceChange !== null && (
              <div
                className="flex items-center gap-1 text-sm font-medium"
                style={{ color: changePositive ? UP_COLOR : DOWN_COLOR }}
              >
                {changePositive ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                <span>
                  {changePositive ? '+' : ''}
                  {priceChange.toFixed(2)}%
                </span>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0 pb-4 px-2">
        {loading ? (
          <div className="space-y-3">
            {/* Price skeleton */}
            <div className="flex items-center gap-3 px-2">
              <Skeleton className="h-7 w-32 rounded bg-white/[0.06]" />
              <Skeleton className="h-5 w-20 rounded bg-white/[0.06]" />
            </div>
            {/* Chart skeleton */}
            <Skeleton
              className="w-full rounded-lg bg-[#0D0D0D]"
              style={{ height: mainChartHeight }}
            />
            {/* Volume skeleton */}
            <Skeleton
              className="w-full rounded-lg bg-[#0D0D0D]"
              style={{ height: volumeHeight }}
            />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12" style={{ minHeight: chartHeight }}>
            <BarChart3 className="h-10 w-10 text-white/20 mb-3" />
            <p className="text-white/40 text-sm text-center">
              Chart data unavailable
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 text-white/50 hover:text-white/70 hover:bg-white/[0.06]"
              onClick={() => fetchChartData(selectedRange)}
            >
              Try Again
            </Button>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="rounded-lg overflow-hidden"
            style={{ height: chartHeight }}
          />
        )}
      </CardContent>
    </Card>
  );
}
