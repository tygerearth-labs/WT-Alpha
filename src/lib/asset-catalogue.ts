// ── Shared Asset Catalogue ──────────────────────────────────────────────────
// Single source of truth for all tradeable assets used across
// InvestmentLiveCharts, InvestmentPortfolio, and the search combobox.

export type AssetType = 'crypto' | 'forex' | 'saham' | 'komoditas' | 'indeks';

export interface AssetDef {
  symbol: string;       // e.g. "BTCUSDT", "BBCA", "XAUUSD"
  type: AssetType;
  label: string;        // display label, e.g. "BTC", "BBCA", "XAU/USD"
  name?: string;        // full name, e.g. "Bitcoin", "Bank Central Asia"
  sector?: string;      // for saham
}

// ── Crypto (Top 40) ─────────────────────────────────────────────────────────

export const CRYPTO_ASSETS: AssetDef[] = [
  { symbol: 'BTCUSDT', type: 'crypto', label: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETHUSDT', type: 'crypto', label: 'ETH', name: 'Ethereum' },
  { symbol: 'BNBUSDT', type: 'crypto', label: 'BNB', name: 'Binance Coin' },
  { symbol: 'SOLUSDT', type: 'crypto', label: 'SOL', name: 'Solana' },
  { symbol: 'XRPUSDT', type: 'crypto', label: 'XRP', name: 'Ripple' },
  { symbol: 'ADAUSDT', type: 'crypto', label: 'ADA', name: 'Cardano' },
  { symbol: 'DOGEUSDT', type: 'crypto', label: 'DOGE', name: 'Dogecoin' },
  { symbol: 'AVAXUSDT', type: 'crypto', label: 'AVAX', name: 'Avalanche' },
  { symbol: 'DOTUSDT', type: 'crypto', label: 'DOT', name: 'Polkadot' },
  { symbol: 'LINKUSDT', type: 'crypto', label: 'LINK', name: 'Chainlink' },
  { symbol: 'MATICUSDT', type: 'crypto', label: 'MATIC', name: 'Polygon' },
  { symbol: 'SHIBUSDT', type: 'crypto', label: 'SHIB', name: 'Shiba Inu' },
  { symbol: 'LTCUSDT', type: 'crypto', label: 'LTC', name: 'Litecoin' },
  { symbol: 'ATOMUSDT', type: 'crypto', label: 'ATOM', name: 'Cosmos' },
  { symbol: 'UNIUSDT', type: 'crypto', label: 'UNI', name: 'Uniswap' },
  { symbol: 'NEARUSDT', type: 'crypto', label: 'NEAR', name: 'NEAR Protocol' },
  { symbol: 'APTUSDT', type: 'crypto', label: 'APT', name: 'Aptos' },
  { symbol: 'ARBUSDT', type: 'crypto', label: 'ARB', name: 'Arbitrum' },
  { symbol: 'OPUSDT', type: 'crypto', label: 'OP', name: 'Optimism' },
  { symbol: 'SUIUSDT', type: 'crypto', label: 'SUI', name: 'Sui' },
  { symbol: 'SEIUSDT', type: 'crypto', label: 'SEI', name: 'Sei' },
  { symbol: 'TIAUSDT', type: 'crypto', label: 'TIA', name: 'Celestia' },
  { symbol: 'INJUSDT', type: 'crypto', label: 'INJ', name: 'Injective' },
  { symbol: 'FETUSDT', type: 'crypto', label: 'FET', name: 'Fetch.ai' },
  { symbol: 'RNDRUSDT', type: 'crypto', label: 'RNDR', name: 'Render' },
  { symbol: 'IMXUSDT', type: 'crypto', label: 'IMX', name: 'Immutable X' },
  { symbol: 'GRTUSDT', type: 'crypto', label: 'GRT', name: 'The Graph' },
  { symbol: 'MKRUSDT', type: 'crypto', label: 'MKR', name: 'Maker' },
  { symbol: 'AAVEUSDT', type: 'crypto', label: 'AAVE', name: 'Aave' },
  { symbol: 'SNXUSDT', type: 'crypto', label: 'SNX', name: 'Synthetix' },
  { symbol: 'CRVUSDT', type: 'crypto', label: 'CRV', name: 'Curve Finance' },
  { symbol: 'MKRUSDT', type: 'crypto', label: 'MKR', name: 'Maker' },
  { symbol: 'LDOUSDT', type: 'crypto', label: 'LDO', name: 'Lido DAO' },
  { symbol: 'PENDLEUSDT', type: 'crypto', label: 'PENDLE', name: 'Pendle' },
  { symbol: 'TRXUSDT', type: 'crypto', label: 'TRX', name: 'Tron' },
  { symbol: 'XLMUSDT', type: 'crypto', label: 'XLM', name: 'Stellar' },
  { symbol: 'ALGOUSDT', type: 'crypto', label: 'ALGO', name: 'Algorand' },
  { symbol: 'FILUSDT', type: 'crypto', label: 'FIL', name: 'Filecoin' },
  { symbol: 'TONUSDT', type: 'crypto', label: 'TON', name: 'Toncoin' },
  { symbol: 'PEPEUSDT', type: 'crypto', label: 'PEPE', name: 'Pepe' },
];

// ── Forex ────────────────────────────────────────────────────────────────────

export const FOREX_ASSETS: AssetDef[] = [
  { symbol: 'EURUSD', type: 'forex', label: 'EUR/USD', name: 'Euro / US Dollar' },
  { symbol: 'GBPUSD', type: 'forex', label: 'GBP/USD', name: 'British Pound / US Dollar' },
  { symbol: 'USDJPY', type: 'forex', label: 'USD/JPY', name: 'US Dollar / Japanese Yen' },
  { symbol: 'USDIDR', type: 'forex', label: 'USD/IDR', name: 'US Dollar / Rupiah' },
  { symbol: 'AUDUSD', type: 'forex', label: 'AUD/USD', name: 'Australian Dollar / US Dollar' },
  { symbol: 'USDCAD', type: 'forex', label: 'USD/CAD', name: 'US Dollar / Canadian Dollar' },
  { symbol: 'USDCHF', type: 'forex', label: 'USD/CHF', name: 'US Dollar / Swiss Franc' },
  { symbol: 'NZDUSD', type: 'forex', label: 'NZD/USD', name: 'New Zealand Dollar / US Dollar' },
  { symbol: 'EURGBP', type: 'forex', label: 'EUR/GBP', name: 'Euro / British Pound' },
  { symbol: 'EURJPY', type: 'forex', label: 'EUR/JPY', name: 'Euro / Japanese Yen' },
  { symbol: 'GBPJPY', type: 'forex', label: 'GBP/JPY', name: 'British Pound / Japanese Yen' },
  { symbol: 'AUDJPY', type: 'forex', label: 'AUD/JPY', name: 'Australian Dollar / Japanese Yen' },
  { symbol: 'EURCHF', type: 'forex', label: 'EUR/CHF', name: 'Euro / Swiss Franc' },
  { symbol: 'GBPCHF', type: 'forex', label: 'GBP/CHF', name: 'British Pound / Swiss Franc' },
  { symbol: 'EURAUD', type: 'forex', label: 'EUR/AUD', name: 'Euro / Australian Dollar' },
  { symbol: 'USDSGD', type: 'forex', label: 'USD/SGD', name: 'US Dollar / Singapore Dollar' },
  { symbol: 'USDHKD', type: 'forex', label: 'USD/HKD', name: 'US Dollar / Hong Kong Dollar' },
  { symbol: 'USDCNH', type: 'forex', label: 'USD/CNH', name: 'US Dollar / Offshore Yuan' },
];

// ── Komoditas ────────────────────────────────────────────────────────────────

export const KOMODITAS_ASSETS: AssetDef[] = [
  { symbol: 'XAUUSD', type: 'komoditas', label: 'XAU/USD', name: 'Emas / Gold' },
  { symbol: 'XAGUSD', type: 'komoditas', label: 'XAG/USD', name: 'Perak / Silver' },
  { symbol: 'XPTUSD', type: 'komoditas', label: 'XPT/USD', name: 'Platinum / Platina' },
  { symbol: 'WTIUSD', type: 'komoditas', label: 'WTI', name: 'Minyak Mentah WTI' },
  { symbol: 'BRENTUSD', type: 'komoditas', label: 'Brent', name: 'Minyak Mentah Brent' },
  { symbol: 'NGUSD', type: 'komoditas', label: 'Natural Gas', name: 'Gas Alam' },
  { symbol: 'COPPER', type: 'komoditas', label: 'HG', name: 'Tembaga / Copper' },
];

// ── Indeks ────────────────────────────────────────────────────────────────────

export const INDEKS_ASSETS: AssetDef[] = [
  { symbol: 'US100', type: 'indeks', label: 'NASDAQ 100', name: 'Nasdaq 100 Index' },
  { symbol: 'US30', type: 'indeks', label: 'Dow Jones 30', name: 'Dow Jones Industrial Average' },
  { symbol: 'SPX500', type: 'indeks', label: 'S&P 500', name: 'S&P 500 Index' },
  { symbol: 'US2000', type: 'indeks', label: 'Russell 2000', name: 'Russell 2000 Index' },
  { symbol: 'VIX', type: 'indeks', label: 'VIX', name: 'Volatility Index' },
  { symbol: 'DXY', type: 'indeks', label: 'DXY', name: 'US Dollar Index' },
];

// ── Saham Indonesia (IHSG Bluechips + LQ45) ──────────────────────────────────

export const SAHAM_ASSETS: AssetDef[] = [
  // Banking
  { symbol: 'BBCA', type: 'saham', label: 'BBCA', name: 'Bank Central Asia', sector: 'Perbankan' },
  { symbol: 'BBRI', type: 'saham', label: 'BBRI', name: 'Bank Rakyat Indonesia', sector: 'Perbankan' },
  { symbol: 'BMRI', type: 'saham', label: 'BMRI', name: 'Bank Mandiri', sector: 'Perbankan' },
  { symbol: 'BRIS', type: 'saham', label: 'BRIS', name: 'Bank Syariah Indonesia', sector: 'Perbankan' },
  { symbol: 'ARTO', type: 'saham', label: 'ARTO', name: 'Bank Jago', sector: 'Perbankan' },
  { symbol: 'BBNI', type: 'saham', label: 'BBNI', name: 'Bank Negara Indonesia', sector: 'Perbankan' },
  { symbol: 'MEGA', type: 'saham', label: 'MEGA', name: 'Bank Mega', sector: 'Perbankan' },
  // Telekomunikasi
  { symbol: 'TLKM', type: 'saham', label: 'TLKM', name: 'Telkom Indonesia', sector: 'Telekomunikasi' },
  { symbol: 'EXCL', type: 'saham', label: 'EXCL', name: 'XL Axiata', sector: 'Telekomunikasi' },
  { symbol: 'ISAT', type: 'saham', label: 'ISAT', name: 'Indosat Ooredoo', sector: 'Telekomunikasi' },
  // Technology
  { symbol: 'GOTO', type: 'saham', label: 'GOTO', name: 'GoTo Gojek Tokopedia', sector: 'Teknologi' },
  { symbol: 'BUKA', type: 'saham', label: 'BUKA', name: 'Bukalapak', sector: 'Teknologi' },
  // Consumer & Retail
  { symbol: 'UNVR', type: 'saham', label: 'UNVR', name: 'Unilever Indonesia', sector: 'Consumer' },
  { symbol: 'ICBP', type: 'saham', label: 'ICBP', name: 'Indofood CBP', sector: 'Consumer' },
  { symbol: 'INDF', type: 'saham', label: 'INDF', name: 'Indofood Sukses Makmur', sector: 'Consumer' },
  { symbol: 'ACES', type: 'saham', label: 'ACES', name: 'Ace Hardware Indonesia', sector: 'Retail' },
  { symbol: 'MAPI', type: 'saham', label: 'MAPI', name: 'Mitra Adiperkasa', sector: 'Retail' },
  // Conglomerate & Industrials
  { symbol: 'ASII', type: 'saham', label: 'ASII', name: 'Astra International', sector: 'Konglomerat' },
  { symbol: 'UNTR', type: 'saham', label: 'UNTR', name: 'United Tractors', sector: 'Industri' },
  { symbol: 'ADRO', type: 'saham', label: 'ADRO', name: 'Adaro Energy', sector: 'Energi' },
  { symbol: 'PTBA', type: 'saham', label: 'PTBA', name: 'Bukit Asam', sector: 'Energi' },
  // Mining & Resources
  { symbol: 'ANTM', type: 'saham', label: 'ANTM', name: 'Aneka Tambang', sector: 'Pertambangan' },
  { symbol: 'TINS', type: 'saham', label: 'TINS', name: 'Timah', sector: 'Pertambangan' },
  { symbol: 'INKP', type: 'saham', label: 'INKP', name: 'Indah Kiat Pulp & Paper', sector: 'Pertambangan' },
  // Property & Infrastructure
  { symbol: 'BSDE', type: 'saham', label: 'BSDE', name: 'Bumi Serpong Damai', sector: 'Properti' },
  { symbol: 'CTRA', type: 'saham', label: 'CTRA', name: 'Ciputra Development', sector: 'Properti' },
  { symbol: 'SMGR', type: 'saham', label: 'SMGR', name: 'Semen Indonesia', sector: 'Infrastruktur' },
  { symbol: 'WIKA', type: 'saham', label: 'WIKA', name: 'Wijaya Karya', sector: 'Infrastruktur' },
  { symbol: 'TLKM', type: 'saham', label: 'TLKM', name: 'Telkom Indonesia', sector: 'Telekomunikasi' },
  // Healthcare & Pharma
  { symbol: 'KLBF', type: 'saham', label: 'KLBF', name: 'Kalbe Farma', sector: 'Farmasi' },
  // Energy & Plantation
  { symbol: 'PGAS', type: 'saham', label: 'PGAS', name: 'Perusahaan Gas Negara', sector: 'Energi' },
  { symbol: 'MEDC', type: 'saham', label: 'MEDC', name: 'Medco Energi Internasional', sector: 'Energi' },
  { symbol: 'AKRA', type: 'saham', label: 'AKRA', name: 'AKR Corporindo', sector: 'Energi' },
  { symbol: 'AALI', type: 'saham', label: 'AALI', name: 'Astra Agro Lestari', sector: 'Perkebunan' },
  { symbol: 'SSMS', type: 'saham', label: 'SSMS', name: 'Sawit Sumbermas Sarana', sector: 'Perkebunan' },
  // Finance & Insurance
  { symbol: 'TPIA', type: 'saham', label: 'TPIA', name: 'Chandra Asri Petrochemical', sector: 'Petrokimia' },
  { symbol: 'BRPT', type: 'saham', label: 'BRPT', name: 'Barito Pacific', sector: 'Energi' },
  { symbol: 'EMTK', type: 'saham', label: 'EMTK', name: 'Elang Mahkota Teknologi', sector: 'Media' },
  { symbol: 'MDKA', type: 'saham', label: 'MDKA', name: 'Merdeka Copper Gold', sector: 'Pertambangan' },
];

// ── Combined ─────────────────────────────────────────────────────────────────

export const ALL_ASSETS: AssetDef[] = [
  ...CRYPTO_ASSETS,
  ...FOREX_ASSETS,
  ...KOMODITAS_ASSETS,
  ...INDEKS_ASSETS,
  ...SAHAM_ASSETS,
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Search assets by query (symbol, label, or name) */
export function searchAssets(query: string, typeFilter?: AssetType | 'all' | string): AssetDef[] {
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
  if (type === 'indeks') return '';
  if (type === 'komoditas') return '$';
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
  if (type === 'indeks') {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (type === 'komoditas') {
    if (price >= 1000) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
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

/** Type display label */
export function typeLabel(type: AssetType): string {
  const labels: Record<AssetType, string> = {
    crypto: 'Crypto',
    forex: 'Forex',
    saham: 'Saham',
    komoditas: 'Komoditas',
    indeks: 'Indeks',
  };
  return labels[type] || type;
}

/** Get all available type groups for display */
export function getAssetGroups(): Array<{ type: AssetType; label: string; icon: string; count: number }> {
  const types: AssetType[] = ['crypto', 'forex', 'komoditas', 'indeks', 'saham'];
  const icons: Record<AssetType, string> = {
    crypto: '🪙',
    forex: '💱',
    komoditas: '🏗️',
    indeks: '📊',
    saham: '📈',
  };
  return types.map((type) => ({
    type,
    label: typeLabel(type),
    icon: icons[type],
    count: ALL_ASSETS.filter((a) => a.type === type).length,
  }));
}
