// ── Shared Asset Catalogue ──────────────────────────────────────────────────
// Single source of truth for all tradeable assets used across
// InvestmentLiveCharts, InvestmentPortfolio, and the search combobox.
//
// Totals: ~64 crypto · ~37 forex · ~17 komoditas · ~18 indeks · ~72 saham = ~208 assets

export type AssetType = 'crypto' | 'forex' | 'saham' | 'komoditas' | 'indeks';

export interface AssetDef {
  symbol: string;       // e.g. "BTCUSDT", "BBCA", "XAUUSD"
  type: AssetType;
  label: string;        // display label, e.g. "BTC", "BBCA", "XAU/USD"
  name?: string;        // full name, e.g. "Bitcoin", "Bank Central Asia"
  sector?: string;      // for saham
}

// ── Crypto (60+) ───────────────────────────────────────────────────────────

export const CRYPTO_ASSETS: AssetDef[] = [
  // Layer-1 / Major
  { symbol: 'BTCUSDT', type: 'crypto', label: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETHUSDT', type: 'crypto', label: 'ETH', name: 'Ethereum' },
  { symbol: 'BNBUSDT', type: 'crypto', label: 'BNB', name: 'Binance Coin' },
  { symbol: 'SOLUSDT', type: 'crypto', label: 'SOL', name: 'Solana' },
  { symbol: 'XRPUSDT', type: 'crypto', label: 'XRP', name: 'Ripple' },
  { symbol: 'ADAUSDT', type: 'crypto', label: 'ADA', name: 'Cardano' },
  { symbol: 'AVAXUSDT', type: 'crypto', label: 'AVAX', name: 'Avalanche' },
  { symbol: 'DOTUSDT', type: 'crypto', label: 'DOT', name: 'Polkadot' },
  { symbol: 'LINKUSDT', type: 'crypto', label: 'LINK', name: 'Chainlink' },
  { symbol: 'ATOMUSDT', type: 'crypto', label: 'ATOM', name: 'Cosmos' },
  { symbol: 'NEARUSDT', type: 'crypto', label: 'NEAR', name: 'NEAR Protocol' },
  { symbol: 'LTCUSDT', type: 'crypto', label: 'LTC', name: 'Litecoin' },
  { symbol: 'TRXUSDT', type: 'crypto', label: 'TRX', name: 'Tron' },
  { symbol: 'XLMUSDT', type: 'crypto', label: 'XLM', name: 'Stellar' },
  { symbol: 'ALGOUSDT', type: 'crypto', label: 'ALGO', name: 'Algorand' },
  { symbol: 'FILUSDT', type: 'crypto', label: 'FIL', name: 'Filecoin' },
  { symbol: 'TONUSDT', type: 'crypto', label: 'TON', name: 'Toncoin' },
  { symbol: 'APTUSDT', type: 'crypto', label: 'APT', name: 'Aptos' },
  { symbol: 'SUIUSDT', type: 'crypto', label: 'SUI', name: 'Sui' },
  // DeFi
  { symbol: 'UNIUSDT', type: 'crypto', label: 'UNI', name: 'Uniswap' },
  { symbol: 'AAVEUSDT', type: 'crypto', label: 'AAVE', name: 'Aave' },
  { symbol: 'MKRUSDT', type: 'crypto', label: 'MKR', name: 'Maker' },
  { symbol: 'SNXUSDT', type: 'crypto', label: 'SNX', name: 'Synthetix' },
  { symbol: 'CRVUSDT', type: 'crypto', label: 'CRV', name: 'Curve Finance' },
  { symbol: 'LDOUSDT', type: 'crypto', label: 'LDO', name: 'Lido DAO' },
  { symbol: 'PENDLEUSDT', type: 'crypto', label: 'PENDLE', name: 'Pendle' },
  { symbol: 'ONDOUSDT', type: 'crypto', label: 'ONDO', name: 'Ondo Finance' },
  // Layer-2
  { symbol: 'MATICUSDT', type: 'crypto', label: 'MATIC', name: 'Polygon' },
  { symbol: 'ARBUSDT', type: 'crypto', label: 'ARB', name: 'Arbitrum' },
  { symbol: 'OPUSDT', type: 'crypto', label: 'OP', name: 'Optimism' },
  { symbol: 'ZKUSDT', type: 'crypto', label: 'ZK', name: 'ZKsync' },
  { symbol: 'STRKUSDT', type: 'crypto', label: 'STRK', name: 'Starknet' },
  { symbol: 'ZROUSDT', type: 'crypto', label: 'ZRO', name: 'LayerZero' },
  { symbol: 'REZUSDT', type: 'crypto', label: 'REZ', name: 'Renzo' },
  // AI & Compute
  { symbol: 'FETUSDT', type: 'crypto', label: 'FET', name: 'Fetch.ai' },
  { symbol: 'RNDRUSDT', type: 'crypto', label: 'RNDR', name: 'Render' },
  { symbol: 'TAOUSDT', type: 'crypto', label: 'TAO', name: 'Bittensor' },
  { symbol: 'IOUSDT', type: 'crypto', label: 'IO', name: 'io.net' },
  { symbol: 'PYTHUSDT', type: 'crypto', label: 'PYTH', name: 'Pyth Network' },
  { symbol: 'GRTUSDT', type: 'crypto', label: 'GRT', name: 'The Graph' },
  { symbol: 'IMXUSDT', type: 'crypto', label: 'IMX', name: 'Immutable X' },
  // Interoperability & Infrastructure
  { symbol: 'WUSDT', type: 'crypto', label: 'W', name: 'Wormhole' },
  { symbol: 'JUPUSDT', type: 'crypto', label: 'JUP', name: 'Jupiter' },
  { symbol: 'RAYUSDT', type: 'crypto', label: 'RAY', name: 'Raydium' },
  { symbol: 'ORCAUSDT', type: 'crypto', label: 'ORCA', name: 'Orca' },
  { symbol: 'DRIFTUSDT', type: 'crypto', label: 'DRIFT', name: 'Drift Protocol' },
  { symbol: 'PORTALUSDT', type: 'crypto', label: 'PORTAL', name: 'Portal' },
  // Restaking & Liquid Staking
  { symbol: 'ENAUSDT', type: 'crypto', label: 'ENA', name: 'Ethena' },
  { symbol: 'JTOUSDT', type: 'crypto', label: 'JTO', name: 'Jito' },
  // Memecoins
  { symbol: 'DOGEUSDT', type: 'crypto', label: 'DOGE', name: 'Dogecoin' },
  { symbol: 'SHIBUSDT', type: 'crypto', label: 'SHIB', name: 'Shiba Inu' },
  { symbol: 'PEPEUSDT', type: 'crypto', label: 'PEPE', name: 'Pepe' },
  { symbol: 'BONKUSDT', type: 'crypto', label: 'BONK', name: 'Bonk' },
  { symbol: 'WIFUSDT', type: 'crypto', label: 'WIF', name: 'dogwifhat' },
  { symbol: 'FLOKIUSDT', type: 'crypto', label: 'FLOKI', name: 'Floki' },
  { symbol: 'NOTUSDT', type: 'crypto', label: 'NOT', name: 'Notcoin' },
  // Identity & Gaming
  { symbol: 'WLDUSDT', type: 'crypto', label: 'WLD', name: 'Worldcoin' },
  { symbol: 'PIXELSUSDT', type: 'crypto', label: 'PIXELS', name: 'Pixels' },
  { symbol: 'PUUSDT', type: 'crypto', label: 'PU', name: 'Pudgy Penguins' },
  // DeFi / Other
  { symbol: 'SEIUSDT', type: 'crypto', label: 'SEI', name: 'Sei' },
  { symbol: 'TIAUSDT', type: 'crypto', label: 'TIA', name: 'Celestia' },
  { symbol: 'INJUSDT', type: 'crypto', label: 'INJ', name: 'Injective' },
  { symbol: 'BBUSDT', type: 'crypto', label: 'BB', name: 'Bounce Bit' },
  { symbol: 'LISTAUSDT', type: 'crypto', label: 'LISTA', name: 'Lista DAO' },
  // Privacy & Security
  { symbol: 'XMRUSDT', type: 'crypto', label: 'XMR', name: 'Monero' },
  // Gaming & NFT
  { symbol: 'GALAUSDT', type: 'crypto', label: 'GALA', name: 'Gala Games' },
  { symbol: 'MANAUSDT', type: 'crypto', label: 'MANA', name: 'Decentraland' },
  { symbol: 'SANDUSDT', type: 'crypto', label: 'SAND', name: 'The Sandbox' },
  // Stablecoins (for reference)
  { symbol: 'USDTUSDT', type: 'crypto', label: 'USDT', name: 'Tether' },
  { symbol: 'BUSDUSDT', type: 'crypto', label: 'BUSD', name: 'Binance USD' },
  // Hot / Trending
  { symbol: 'TRUMPUSDT', type: 'crypto', label: 'TRUMP', name: 'Official Trump' },
  { symbol: 'HBARUSDT', type: 'crypto', label: 'HBAR', name: 'Hedera' },
  { symbol: 'VETUSDT', type: 'crypto', label: 'VET', name: 'VeChain' },
  { symbol: 'ICPUSDT', type: 'crypto', label: 'ICP', name: 'Internet Computer' },
  { symbol: 'FTMUSDT', type: 'crypto', label: 'FTM', name: 'Fantom' },
  { symbol: 'EIGENUSDT', type: 'crypto', label: 'EIGEN', name: 'EigenLayer' },
  { symbol: 'VERTUSDT', type: 'crypto', label: 'VERT', name: 'Vertex Protocol' },
  { symbol: 'KASUSDT', type: 'crypto', label: 'KAS', name: 'Kaspa' },
  { symbol: 'RUNEUSDT', type: 'crypto', label: 'RUNE', name: 'THORChain' },
  { symbol: 'ACEUSDT', type: 'crypto', label: 'ACE', name: 'Fusionist' },
];

// ── Forex (25+) ────────────────────────────────────────────────────────────

export const FOREX_ASSETS: AssetDef[] = [
  // Major Pairs
  { symbol: 'EURUSD', type: 'forex', label: 'EUR/USD', name: 'Euro / US Dollar' },
  { symbol: 'GBPUSD', type: 'forex', label: 'GBP/USD', name: 'British Pound / US Dollar' },
  { symbol: 'USDJPY', type: 'forex', label: 'USD/JPY', name: 'US Dollar / Japanese Yen' },
  { symbol: 'USDCHF', type: 'forex', label: 'USD/CHF', name: 'US Dollar / Swiss Franc' },
  { symbol: 'AUDUSD', type: 'forex', label: 'AUD/USD', name: 'Australian Dollar / US Dollar' },
  { symbol: 'USDCAD', type: 'forex', label: 'USD/CAD', name: 'US Dollar / Canadian Dollar' },
  { symbol: 'NZDUSD', type: 'forex', label: 'NZD/USD', name: 'New Zealand Dollar / US Dollar' },
  // Cross Pairs – EUR
  { symbol: 'EURGBP', type: 'forex', label: 'EUR/GBP', name: 'Euro / British Pound' },
  { symbol: 'EURJPY', type: 'forex', label: 'EUR/JPY', name: 'Euro / Japanese Yen' },
  { symbol: 'EURCHF', type: 'forex', label: 'EUR/CHF', name: 'Euro / Swiss Franc' },
  { symbol: 'EURAUD', type: 'forex', label: 'EUR/AUD', name: 'Euro / Australian Dollar' },
  { symbol: 'EURSGD', type: 'forex', label: 'EUR/SGD', name: 'Euro / Singapore Dollar' },
  { symbol: 'EURCNH', type: 'forex', label: 'EUR/CNH', name: 'Euro / Offshore Yuan' },
  // Cross Pairs – GBP
  { symbol: 'GBPJPY', type: 'forex', label: 'GBP/JPY', name: 'British Pound / Japanese Yen' },
  { symbol: 'GBPCHF', type: 'forex', label: 'GBP/CHF', name: 'British Pound / Swiss Franc' },
  { symbol: 'GBPAUD', type: 'forex', label: 'GBP/AUD', name: 'British Pound / Australian Dollar' },
  { symbol: 'GBPNZD', type: 'forex', label: 'GBP/NZD', name: 'British Pound / New Zealand Dollar' },
  { symbol: 'GBPCAD', type: 'forex', label: 'GBP/CAD', name: 'British Pound / Canadian Dollar' },
  { symbol: 'GBPSGD', type: 'forex', label: 'GBP/SGD', name: 'British Pound / Singapore Dollar' },
  { symbol: 'GBPCNH', type: 'forex', label: 'GBP/CNH', name: 'British Pound / Offshore Yuan' },
  // Cross Pairs – AUD / NZD / CAD / CHF / JPY
  { symbol: 'AUDJPY', type: 'forex', label: 'AUD/JPY', name: 'Australian Dollar / Japanese Yen' },
  { symbol: 'AUDNZD', type: 'forex', label: 'AUD/NZD', name: 'Australian Dollar / New Zealand Dollar' },
  { symbol: 'AUDCAD', type: 'forex', label: 'AUD/CAD', name: 'Australian Dollar / Canadian Dollar' },
  { symbol: 'AUDCHF', type: 'forex', label: 'AUD/CHF', name: 'Australian Dollar / Swiss Franc' },
  { symbol: 'NZDJPY', type: 'forex', label: 'NZD/JPY', name: 'New Zealand Dollar / Japanese Yen' },
  { symbol: 'NZDCHF', type: 'forex', label: 'NZD/CHF', name: 'New Zealand Dollar / Swiss Franc' },
  { symbol: 'NZDCAD', type: 'forex', label: 'NZD/CAD', name: 'New Zealand Dollar / Canadian Dollar' },
  { symbol: 'CADJPY', type: 'forex', label: 'CAD/JPY', name: 'Canadian Dollar / Japanese Yen' },
  { symbol: 'CADCHF', type: 'forex', label: 'CAD/CHF', name: 'Canadian Dollar / Swiss Franc' },
  { symbol: 'CHFJPY', type: 'forex', label: 'CHF/JPY', name: 'Swiss Franc / Japanese Yen' },
  // Asian & Exotic
  { symbol: 'USDIDR', type: 'forex', label: 'USD/IDR', name: 'US Dollar / Rupiah' },
  { symbol: 'USDSGD', type: 'forex', label: 'USD/SGD', name: 'US Dollar / Singapore Dollar' },
  { symbol: 'USDHKD', type: 'forex', label: 'USD/HKD', name: 'US Dollar / Hong Kong Dollar' },
  { symbol: 'USDCNH', type: 'forex', label: 'USD/CNH', name: 'US Dollar / Offshore Yuan' },
  { symbol: 'USDMXN', type: 'forex', label: 'USD/MXN', name: 'US Dollar / Mexican Peso' },
  { symbol: 'USDZAR', type: 'forex', label: 'USD/ZAR', name: 'US Dollar / South African Rand' },
  { symbol: 'USDTRY', type: 'forex', label: 'USD/TRY', name: 'US Dollar / Turkish Lira' },
  { symbol: 'USDTHB', type: 'forex', label: 'USD/THB', name: 'US Dollar / Thai Baht' },
  { symbol: 'USDPHP', type: 'forex', label: 'USD/PHP', name: 'US Dollar / Philippine Peso' },
  { symbol: 'USDKRW', type: 'forex', label: 'USD/KRW', name: 'US Dollar / Korean Won' },
  { symbol: 'USDTWD', type: 'forex', label: 'USD/TWD', name: 'US Dollar / Taiwan Dollar' },
  { symbol: 'USDSEK', type: 'forex', label: 'USD/SEK', name: 'US Dollar / Swedish Krona' },
  { symbol: 'USDNOK', type: 'forex', label: 'USD/NOK', name: 'US Dollar / Norwegian Krone' },
  { symbol: 'USDDKK', type: 'forex', label: 'USD/DKK', name: 'US Dollar / Danish Krone' },
  { symbol: 'USDPLN', type: 'forex', label: 'USD/PLN', name: 'US Dollar / Polish Zloty' },
  { symbol: 'USDINR', type: 'forex', label: 'USD/INR', name: 'US Dollar / Indian Rupee' },
  // Cross Pairs – Exotic
  { symbol: 'EURIDR', type: 'forex', label: 'EUR/IDR', name: 'Euro / Rupiah' },
  { symbol: 'SGDJPY', type: 'forex', label: 'SGD/JPY', name: 'Singapore Dollar / Japanese Yen' },
];

// ── Komoditas (12+) ───────────────────────────────────────────────────────

export const KOMODITAS_ASSETS: AssetDef[] = [
  // Metals
  { symbol: 'XAUUSD', type: 'komoditas', label: 'XAU/USD', name: 'Emas / Gold' },
  { symbol: 'XAGUSD', type: 'komoditas', label: 'XAG/USD', name: 'Perak / Silver' },
  { symbol: 'XPTUSD', type: 'komoditas', label: 'XPT/USD', name: 'Platinum / Platina' },
  { symbol: 'COPPER', type: 'komoditas', label: 'HG', name: 'Tembaga / Copper' },
  // Energy
  { symbol: 'WTIUSD', type: 'komoditas', label: 'WTI', name: 'Minyak Mentah WTI' },
  { symbol: 'BRENTUSD', type: 'komoditas', label: 'Brent', name: 'Minyak Mentah Brent' },
  { symbol: 'NGUSD', type: 'komoditas', label: 'NG', name: 'Gas Alam / Natural Gas' },
  // Grains & Agriculture
  { symbol: 'WHEATUSD', type: 'komoditas', label: 'Wheat', name: 'Gandum / Wheat' },
  { symbol: 'CORNUSD', type: 'komoditas', label: 'Corn', name: 'Jagung / Corn' },
  { symbol: 'SOYUSDT', type: 'komoditas', label: 'Soybean', name: 'Kedelai / Soybean' },
  { symbol: 'COFFEEUSD', type: 'komoditas', label: 'Coffee', name: 'Kopi / Coffee' },
  { symbol: 'COCOAUSD', type: 'komoditas', label: 'Cocoa', name: 'Kakao / Cocoa' },
  { symbol: 'SUGARUSD', type: 'komoditas', label: 'Sugar', name: 'Gula / Sugar' },
  { symbol: 'RICEUSD', type: 'komoditas', label: 'Rice', name: 'Beras / Rice' },
  // Softs & Others
  { symbol: 'RUBBERUSD', type: 'komoditas', label: 'Rubber', name: 'Karet / Rubber' },
  { symbol: 'PALMOILUSD', type: 'komoditas', label: 'CPO', name: 'Kelapa Sawit / Palm Oil' },
  { symbol: 'CATTLEUSD', type: 'komoditas', label: 'Live Cattle', name: 'Sapi Potong / Live Cattle' },
];

// ── Indeks (15+) ───────────────────────────────────────────────────────────

export const INDEKS_ASSETS: AssetDef[] = [
  // US
  { symbol: 'SPX500', type: 'indeks', label: 'S&P 500', name: 'S&P 500 Index' },
  { symbol: 'US100', type: 'indeks', label: 'NASDAQ 100', name: 'Nasdaq 100 Index' },
  { symbol: 'US30', type: 'indeks', label: 'Dow Jones 30', name: 'Dow Jones Industrial Average' },
  { symbol: 'US2000', type: 'indeks', label: 'Russell 2000', name: 'Russell 2000 Index' },
  { symbol: 'VIX', type: 'indeks', label: 'VIX', name: 'Volatility Index' },
  { symbol: 'DXY', type: 'indeks', label: 'DXY', name: 'US Dollar Index' },
  // Europe
  { symbol: 'FTSE100', type: 'indeks', label: 'FTSE 100', name: 'UK FTSE 100 Index' },
  { symbol: 'DAX40', type: 'indeks', label: 'DAX 40', name: 'German DAX 40 Index' },
  { symbol: 'STOXX600', type: 'indeks', label: 'STOXX 600', name: 'Europe STOXX 600 Index' },
  // Asia-Pacific
  { symbol: 'NIKKEI225', type: 'indeks', label: 'Nikkei 225', name: 'Japan Nikkei 225 Index' },
  { symbol: 'HSI50', type: 'indeks', label: 'Hang Seng', name: 'Hong Kong Hang Seng Index' },
  { symbol: 'SHCOMP', type: 'indeks', label: 'Shanghai Comp.', name: 'Shanghai Composite Index' },
  { symbol: 'KOSPI200', type: 'indeks', label: 'KOSPI 200', name: 'Korea KOSPI 200 Index' },
  { symbol: 'ASX200', type: 'indeks', label: 'ASX 200', name: 'Australia ASX 200 Index' },
  // Indonesia
  { symbol: 'IDXCOMPOSITE', type: 'indeks', label: 'IHSG', name: 'Indeks Harga Saham Gabungan (IHSG)' },
  { symbol: 'LQ45', type: 'indeks', label: 'LQ45', name: 'Indonesia LQ45 Index' },
  // Crypto Dominance (Pseudo-indices)
  { symbol: 'BTCDOM', type: 'indeks', label: 'BTC Dominance', name: 'Bitcoin Market Dominance' },
  { symbol: 'ETHDOM', type: 'indeks', label: 'ETH Dominance', name: 'Ethereum Market Dominance' },
];

// ── Saham Indonesia (IHSG Bluechips + LQ45) (70+) ─────────────────────────

export const SAHAM_ASSETS: AssetDef[] = [
  // ── Banking ─────────────────────────────────────────────────
  { symbol: 'BBCA', type: 'saham', label: 'BBCA', name: 'Bank Central Asia', sector: 'Perbankan' },
  { symbol: 'BBRI', type: 'saham', label: 'BBRI', name: 'Bank Rakyat Indonesia', sector: 'Perbankan' },
  { symbol: 'BMRI', type: 'saham', label: 'BMRI', name: 'Bank Mandiri', sector: 'Perbankan' },
  { symbol: 'BBNI', type: 'saham', label: 'BBNI', name: 'Bank Negara Indonesia', sector: 'Perbankan' },
  { symbol: 'BRIS', type: 'saham', label: 'BRIS', name: 'Bank Syariah Indonesia', sector: 'Perbankan' },
  { symbol: 'ARTO', type: 'saham', label: 'ARTO', name: 'Bank Jago', sector: 'Perbankan' },
  { symbol: 'MEGA', type: 'saham', label: 'MEGA', name: 'Bank Mega', sector: 'Perbankan' },
  { symbol: 'NISP', type: 'saham', label: 'NISP', name: 'OCBC NISP', sector: 'Perbankan' },
  { symbol: 'NAGA', type: 'saham', label: 'NAGA', name: 'Bank Naga', sector: 'Perbankan' },
  { symbol: 'BABP', type: 'saham', label: 'BABP', name: 'Bank Aladin Syariah', sector: 'Perbankan' },
  { symbol: 'BBTN', type: 'saham', label: 'BBTN', name: 'Bank Tabungan Negara', sector: 'Perbankan' },
  { symbol: 'BBNP', type: 'saham', label: 'BBNP', name: 'Bank Nationalnobu', sector: 'Perbankan' },

  // ── Telekomunikasi ──────────────────────────────────────────
  { symbol: 'TLKM', type: 'saham', label: 'TLKM', name: 'Telkom Indonesia', sector: 'Telekomunikasi' },
  { symbol: 'EXCL', type: 'saham', label: 'EXCL', name: 'XL Axiata', sector: 'Telekomunikasi' },
  { symbol: 'ISAT', type: 'saham', label: 'ISAT', name: 'Indosat Ooredoo', sector: 'Telekomunikasi' },
  { symbol: 'TOWR', type: 'saham', label: 'TOWR', name: 'Sarana Menara Nusantara', sector: 'Telekomunikasi' },

  // ── Technology & Media ──────────────────────────────────────
  { symbol: 'GOTO', type: 'saham', label: 'GOTO', name: 'GoTo Gojek Tokopedia', sector: 'Teknologi' },
  { symbol: 'BUKA', type: 'saham', label: 'BUKA', name: 'Bukalapak', sector: 'Teknologi' },
  { symbol: 'EMTK', type: 'saham', label: 'EMTK', name: 'Elang Mahkota Teknologi', sector: 'Teknologi' },
  { symbol: 'MNCN', type: 'saham', label: 'MNCN', name: 'Media Nusantara Citra', sector: 'Media' },

  // ── Consumer & Retail ───────────────────────────────────────
  { symbol: 'UNVR', type: 'saham', label: 'UNVR', name: 'Unilever Indonesia', sector: 'Consumer' },
  { symbol: 'ICBP', type: 'saham', label: 'ICBP', name: 'Indofood CBP', sector: 'Consumer' },
  { symbol: 'INDF', type: 'saham', label: 'INDF', name: 'Indofood Sukses Makmur', sector: 'Consumer' },
  { symbol: 'ACES', type: 'saham', label: 'ACES', name: 'Ace Hardware Indonesia', sector: 'Retail' },
  { symbol: 'MAPI', type: 'saham', label: 'MAPI', name: 'Mitra Adiperkasa', sector: 'Retail' },
  { symbol: 'MYOR', type: 'saham', label: 'MYOR', name: 'Mayora Indah', sector: 'Consumer' },
  { symbol: 'SKLT', type: 'saham', label: 'SKLT', name: 'Sekar Laut', sector: 'Consumer' },
  { symbol: 'AKPI', type: 'saham', label: 'AKPI', name: 'Arthaprima Persada', sector: 'Consumer' },
  { symbol: 'JPFA', type: 'saham', label: 'JPFA', name: 'Japfa Comfeed Indonesia', sector: 'Consumer' },
  { symbol: 'CPIN', type: 'saham', label: 'CPIN', name: 'Charoen Pokphand Indonesia', sector: 'Consumer' },
  { symbol: 'ERAA', type: 'saham', label: 'ERAA', name: 'Erajaya Swasembada', sector: 'Retail' },
  { symbol: 'FAST', type: 'saham', label: 'FAST', name: 'Fast Food Indonesia', sector: 'Retail' },
  { symbol: 'LPPF', type: 'saham', label: 'LPPF', name: 'Matahari Department Store', sector: 'Retail' },
  { symbol: 'AMRT', type: 'saham', label: 'AMRT', name: 'Sumber Alfaria Trijaya', sector: 'Retail' },

  // ── Conglomerate & Industrials ──────────────────────────────
  { symbol: 'ASII', type: 'saham', label: 'ASII', name: 'Astra International', sector: 'Konglomerat' },
  { symbol: 'UNTR', type: 'saham', label: 'UNTR', name: 'United Tractors', sector: 'Industri' },
  { symbol: 'GJTL', type: 'saham', label: 'GJTL', name: 'Gajah Tunggal', sector: 'Industri' },

  // ── Mining & Resources ──────────────────────────────────────
  { symbol: 'ANTM', type: 'saham', label: 'ANTM', name: 'Aneka Tambang', sector: 'Pertambangan' },
  { symbol: 'TINS', type: 'saham', label: 'TINS', name: 'Timah', sector: 'Pertambangan' },
  { symbol: 'INKP', type: 'saham', label: 'INKP', name: 'Indah Kiat Pulp & Paper', sector: 'Pertambangan' },
  { symbol: 'MDKA', type: 'saham', label: 'MDKA', name: 'Merdeka Copper Gold', sector: 'Pertambangan' },
  { symbol: 'BYAN', type: 'saham', label: 'BYAN', name: 'Bayan Resources', sector: 'Pertambangan' },
  { symbol: 'ITMG', type: 'saham', label: 'ITMG', name: 'Indo Tambangraya Megah', sector: 'Pertambangan' },
  { symbol: 'HRUM', type: 'saham', label: 'HRUM', name: 'Harum Energy', sector: 'Pertambangan' },
  { symbol: 'PTRO', type: 'saham', label: 'PTRO', name: 'Petrindo Jaya Kreasi', sector: 'Pertambangan' },
  { symbol: 'INCO', type: 'saham', label: 'INCO', name: 'Vale Indonesia', sector: 'Pertambangan' },
  { symbol: 'DEWA', type: 'saham', label: 'DEWA', name: 'Darma Henwa', sector: 'Pertambangan' },
  { symbol: 'MAGP', type: 'saham', label: 'MAGP', name: 'Merdeka Gold Mining', sector: 'Pertambangan' },
  { symbol: 'SRTT', type: 'saham', label: 'SRTT', name: 'Saraswati Griya Lestari', sector: 'Pertambangan' },

  // ── Energy & Plantation ─────────────────────────────────────
  { symbol: 'ADRO', type: 'saham', label: 'ADRO', name: 'Adaro Energy', sector: 'Energi' },
  { symbol: 'PTBA', type: 'saham', label: 'PTBA', name: 'Bukit Asam', sector: 'Energi' },
  { symbol: 'PGAS', type: 'saham', label: 'PGAS', name: 'Perusahaan Gas Negara', sector: 'Energi' },
  { symbol: 'MEDC', type: 'saham', label: 'MEDC', name: 'Medco Energi Internasional', sector: 'Energi' },
  { symbol: 'AKRA', type: 'saham', label: 'AKRA', name: 'AKR Corporindo', sector: 'Energi' },
  { symbol: 'BRPT', type: 'saham', label: 'BRPT', name: 'Barito Pacific', sector: 'Energi' },
  { symbol: 'ELSA', type: 'saham', label: 'ELSA', name: 'Elnusa', sector: 'Energi' },
  { symbol: 'AALI', type: 'saham', label: 'AALI', name: 'Astra Agro Lestari', sector: 'Perkebunan' },
  { symbol: 'SSMS', type: 'saham', label: 'SSMS', name: 'Sawit Sumbermas Sarana', sector: 'Perkebunan' },

  // ── Property & Infrastructure ───────────────────────────────
  { symbol: 'BSDE', type: 'saham', label: 'BSDE', name: 'Bumi Serpong Damai', sector: 'Properti' },
  { symbol: 'CTRA', type: 'saham', label: 'CTRA', name: 'Ciputra Development', sector: 'Properti' },
  { symbol: 'SMGR', type: 'saham', label: 'SMGR', name: 'Semen Indonesia', sector: 'Infrastruktur' },
  { symbol: 'WIKA', type: 'saham', label: 'WIKA', name: 'Wijaya Karya', sector: 'Infrastruktur' },
  { symbol: 'ADHI', type: 'saham', label: 'ADHI', name: 'Adhi Karya', sector: 'Infrastruktur' },
  { symbol: 'WSBP', type: 'saham', label: 'WSBP', name: 'Waskita Beton Precast', sector: 'Infrastruktur' },
  { symbol: 'PP', type: 'saham', label: 'PP', name: 'PP Properti', sector: 'Properti' },
  { symbol: 'INTA', type: 'saham', label: 'INTA', name: 'Intan Baruprana', sector: 'Properti' },
  { symbol: 'TBIG', type: 'saham', label: 'TBIG', name: 'Tower Bersama Infrastructure', sector: 'Infrastruktur' },

  // ── Healthcare & Pharma ─────────────────────────────────────
  { symbol: 'KLBF', type: 'saham', label: 'KLBF', name: 'Kalbe Farma', sector: 'Farmasi' },
  { symbol: 'HEAL', type: 'saham', label: 'HEAL', name: 'Medikaloka Hermifitra', sector: 'Kesehatan' },
  { symbol: 'MIKA', type: 'saham', label: 'MIKA', name: 'Mitra Keluarga Karyasehat', sector: 'Kesehatan' },
  { symbol: 'SIDO', type: 'saham', label: 'SIDO', name: 'Sido Muncul', sector: 'Farmasi' },

  // ── Petrokimia & Chemicals ──────────────────────────────────
  { symbol: 'TPIA', type: 'saham', label: 'TPIA', name: 'Chandra Asri Petrochemical', sector: 'Petrokimia' },
  // ── Sinar Mas Group ──────────────────────────────────────
  { symbol: 'BSIP', type: 'saham', label: 'BSIP', name: 'Bumi Serpong Damai', sector: 'Properti' },
  { symbol: 'DADA', type: 'saham', label: 'DADA', name: 'Dada Ayu Sentosa', sector: 'Konsumer' },
  // ── Tech / Fintech ────────────────────────────────────────
  { symbol: 'BSSR', type: 'saham', label: 'BSSR', name: 'Bank Syariah Bukopin', sector: 'Perbankan' },
  { symbol: 'MBTO', type: 'saham', label: 'MBTO', name: 'MNC Teknologi', sector: 'Teknologi' },
  { symbol: 'SMTM', type: 'saham', label: 'SMTM', name: 'Saraswati Griya Lestari', sector: 'Properti' },
  // ── Mining / Resources ───────────────────────────────────
  { symbol: 'DOID', type: 'saham', label: 'DOID', name: 'Danareksa Sekuritas', sector: 'Investasi' },
  { symbol: 'PTRO', type: 'saham', label: 'PTRO', name: 'Petrindo Jaya Kreasi', sector: 'Pertambangan' },
  // ── Consumer / Retail ────────────────────────────────────
  { symbol: 'MAPI', type: 'saham', label: 'MAPI', name: 'Mitra Adiperkasa', sector: 'Retail' },
  { symbol: 'ERAA', type: 'saham', label: 'ERAA', name: 'Erajaya Swasembada', sector: 'Retail' },
  // ── US Stocks (traded via global broker) ──────────────────
  { symbol: 'AAPL', type: 'saham', label: 'AAPL', name: 'Apple Inc.', sector: 'US Tech' },
  { symbol: 'MSFT', type: 'saham', label: 'MSFT', name: 'Microsoft Corp.', sector: 'US Tech' },
  { symbol: 'GOOGL', type: 'saham', label: 'GOOGL', name: 'Alphabet Inc.', sector: 'US Tech' },
  { symbol: 'AMZN', type: 'saham', label: 'AMZN', name: 'Amazon.com Inc.', sector: 'US Tech' },
  { symbol: 'NVDA', type: 'saham', label: 'NVDA', name: 'NVIDIA Corp.', sector: 'US Tech' },
  { symbol: 'TSLA', type: 'saham', label: 'TSLA', name: 'Tesla Inc.', sector: 'US Tech' },
  { symbol: 'META', type: 'saham', label: 'META', name: 'Meta Platforms', sector: 'US Tech' },
  { symbol: 'NFLX', type: 'saham', label: 'NFLX', name: 'Netflix Inc.', sector: 'US Tech' },
  { symbol: 'JPM', type: 'saham', label: 'JPM', name: 'JPMorgan Chase', sector: 'US Finance' },
  { symbol: 'V', type: 'saham', label: 'V', name: 'Visa Inc.', sector: 'US Finance' },
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

/** Get the native pricing currency for an asset */
export function getAssetNativeCurrency(type: AssetType, symbol: string): 'USD' | 'IDR' {
  if (type === 'crypto') return 'USD';
  if (type === 'komoditas') return 'USD';
  if (type === 'forex') return 'USD';
  if (type === 'indeks') {
    const idrIndices = ['IDXCOMPOSITE', 'LQ45'];
    if (idrIndices.includes(symbol.toUpperCase())) return 'IDR';
    return 'USD';
  }
  if (type === 'saham') {
    const usStocks = new Set([
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'NFLX', 'JPM', 'V',
    ]);
    if (usStocks.has(symbol.toUpperCase())) return 'USD';
    return 'IDR';
  }
  return 'USD';
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
export function formatAssetPrice(price: number, type: AssetType, symbol?: string): string {
  // US stocks (no .JK suffix) use USD formatting
  const usStocks = new Set(['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'NFLX', 'JPM', 'V']);
  if (type === 'saham' && symbol && usStocks.has(symbol.toUpperCase())) {
    if (price >= 1000) {
      return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
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
