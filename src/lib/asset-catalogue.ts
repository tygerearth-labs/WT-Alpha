// ── Shared Asset Catalogue ──────────────────────────────────────────────────
// Single source of truth for all tradeable assets used across
// InvestmentLiveCharts, InvestmentPortfolio, and the search combobox.

export type AssetType = 'crypto' | 'forex' | 'saham';

export interface AssetDef {
  symbol: string;       // e.g. "BTCUSDT", "BBCA", "XAUUSD"
  type: AssetType;
  label: string;        // display label, e.g. "BTC", "BBCA", "XAU/USD"
  name?: string;        // full name, e.g. "Bitcoin", "Bank Central Asia"
  sector?: string;      // for saham
}

// ── Crypto ───────────────────────────────────────────────────────────────────

export const CRYPTO_ASSETS: AssetDef[] = [
  { symbol: 'BTCUSDT', type: 'crypto', label: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETHUSDT', type: 'crypto', label: 'ETH', name: 'Ethereum' },
  { symbol: 'BNBUSDT', type: 'crypto', label: 'BNB', name: 'Binance Coin' },
  { symbol: 'SOLUSDT', type: 'crypto', label: 'SOL', name: 'Solana' },
  { symbol: 'XRPUSDT', type: 'crypto', label: 'XRP', name: 'Ripple' },
  { symbol: 'ADAUSDT', type: 'crypto', label: 'ADA', name: 'Cardano' },
  { symbol: 'DOTUSDT', type: 'crypto', label: 'DOT', name: 'Polkadot' },
  { symbol: 'DOGEUSDT', type: 'crypto', label: 'DOGE', name: 'Dogecoin' },
  { symbol: 'AVAXUSDT', type: 'crypto', label: 'AVAX', name: 'Avalanche' },
  { symbol: 'LINKUSDT', type: 'crypto', label: 'LINK', name: 'Chainlink' },
];

// ── Forex ────────────────────────────────────────────────────────────────────

export const FOREX_ASSETS: AssetDef[] = [
  { symbol: 'EURUSD', type: 'forex', label: 'EUR/USD', name: 'Euro / US Dollar' },
  { symbol: 'GBPUSD', type: 'forex', label: 'GBP/USD', name: 'British Pound / US Dollar' },
  { symbol: 'USDJPY', type: 'forex', label: 'USD/JPY', name: 'US Dollar / Japanese Yen' },
  { symbol: 'USDIDR', type: 'forex', label: 'USD/IDR', name: 'US Dollar / Indonesian Rupiah' },
  { symbol: 'AUDUSD', type: 'forex', label: 'AUD/USD', name: 'Australian Dollar / US Dollar' },
  { symbol: 'USDCAD', type: 'forex', label: 'USD/CAD', name: 'US Dollar / Canadian Dollar' },
  { symbol: 'USDCHF', type: 'forex', label: 'USD/CHF', name: 'US Dollar / Swiss Franc' },
  { symbol: 'XAUUSD', type: 'forex', label: 'XAU/USD', name: 'Gold / US Dollar' },
];

// ── Saham (Indonesian Stocks) ────────────────────────────────────────────────

export const SAHAM_ASSETS: AssetDef[] = [
  { symbol: 'BBCA', type: 'saham', label: 'BBCA', name: 'Bank Central Asia', sector: 'Banking' },
  { symbol: 'BBRI', type: 'saham', label: 'BBRI', name: 'Bank Rakyat Indonesia', sector: 'Banking' },
  { symbol: 'BMRI', type: 'saham', label: 'BMRI', name: 'Bank Mandiri', sector: 'Banking' },
  { symbol: 'TLKM', type: 'saham', label: 'TLKM', name: 'Telkom Indonesia', sector: 'Telecom' },
  { symbol: 'ASII', type: 'saham', label: 'ASII', name: 'Astra International', sector: 'Conglomerate' },
  { symbol: 'GOTO', type: 'saham', label: 'GOTO', name: 'GoTo Gojek Tokopedia', sector: 'Technology' },
  { symbol: 'UNVR', type: 'saham', label: 'UNVR', name: 'Unilever Indonesia', sector: 'Consumer' },
  { symbol: 'ARTO', type: 'saham', label: 'ARTO', name: 'Bank Jago', sector: 'Banking' },
  { symbol: 'ANTM', type: 'saham', label: 'ANTM', name: 'Aneka Tambang', sector: 'Mining' },
  { symbol: 'BRIS', type: 'saham', label: 'BRIS', name: 'Bank Syariah Indonesia', sector: 'Banking' },
];

// ── Combined ─────────────────────────────────────────────────────────────────

export const ALL_ASSETS: AssetDef[] = [
  ...CRYPTO_ASSETS,
  ...FOREX_ASSETS,
  ...SAHAM_ASSETS,
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Search assets by query (symbol, label, or name) */
export function searchAssets(query: string, typeFilter?: AssetType | 'all'): AssetDef[] {
  const q = query.toLowerCase().trim();
  return ALL_ASSETS.filter((asset) => {
    const matchesType = !typeFilter || typeFilter === 'all' || asset.type === typeFilter;
    if (!matchesType) return false;
    if (!q) return true;
    return (
      asset.label.toLowerCase().includes(q) ||
      asset.symbol.toLowerCase().includes(q) ||
      (asset.name && asset.name.toLowerCase().includes(q)) ||
      (asset.sector && asset.sector.toLowerCase().includes(q))
    );
  });
}

/** Currency prefix for an asset type */
export function currencyPrefix(type: AssetType): string {
  if (type === 'saham') return 'Rp';
  if (type === 'forex') return '';
  return '$';
}

/** Currency label for an asset type */
export function currencyLabel(type: AssetType): string {
  if (type === 'saham') return 'IDR';
  return 'USD';
}

/** Format price for display */
export function formatAssetPrice(price: number, type: AssetType): string {
  if (type === 'saham') {
    return price.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  if (type === 'forex') {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }
  // crypto
  if (price >= 1000) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (price >= 1) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}
