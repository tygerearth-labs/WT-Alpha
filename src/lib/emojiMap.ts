/**
 * Emoji → Lucide icon name mapping.
 * Used for backward compatibility: old users have category icons stored as emojis.
 * This map transparently converts them to Lucide icon names at render time.
 *
 * Usage:
 *   import { emojiToLucide } from '@/lib/emojiMap';
 *   const iconName = emojiToLucide('🛒'); // → 'ShoppingBag'
 */

const EMOJI_LUCIDE_MAP: Record<string, string> = {
  // ── Finance ──
  '💰': 'Wallet',
  '💳': 'CreditCard',
  '💵': 'Banknote',
  '🪙': 'Coins',
  '💲': 'CircleDollarSign',
  '🐷': 'PiggyBank',
  '🧾': 'Receipt',
  '🧮': 'Calculator',
  '📈': 'TrendingUp',
  '📉': 'TrendingDown',
  '🏦': 'Landmark',
  '💸': 'ArrowDownRight',
  '📥': 'Download',
  '📤': 'Upload',
  '🏧': 'Banknote',
  '💎': 'Gem',
  '👑': 'Crown',

  // ── Makanan & Minuman ──
  '🍔': 'UtensilsCrossed',
  '🍕': 'Pizza',
  '🍜': 'Utensils',
  '🥩': 'Beef',
  '🍎': 'Apple',
  '🥤': 'Droplets',
  '☕': 'Coffee',
  '🍵': 'Coffee',
  '🧃': 'Droplets',
  '🍚': 'Utensils',
  '🍣': 'Fish',
  '🥗': 'Leaf',
  '🍩': 'Circle',
  '🍿': 'Flame',
  '🥛': 'Droplets',
  '🧋': 'Droplets',
  '🐟': 'Fish',

  // ── Belanja ──
  '🛒': 'ShoppingBag',
  '🛍️': 'ShoppingBag',
  '🛍': 'ShoppingBag',
  '🏷️': 'Tag',
  '🎁': 'Gift',
  '🏪': 'Store',
  '📦': 'Package',
  '👔': 'Shirt',
  '👗': 'Shirt',

  // ── Transportasi ──
  '🚗': 'Car',
  '🚙': 'Car',
  '🚌': 'Bus',
  '🚂': 'Train',
  '🚲': 'Bike',
  '✈️': 'Plane',
  '✈': 'Plane',
  '🚀': 'Rocket',
  '🚢': 'Ship',
  '⛽': 'Fuel',
  '🚛': 'Truck',
  '🏍️': 'Bike',
  '🛵': 'Bike',
  '🚕': 'Car',
  '🚑': 'Stethoscope',
  '🚒': 'Flame',
  '🛥️': 'Ship',
  '🛩️': 'Plane',

  // ── Rumah & Utilitas ──
  '🏠': 'Home',
  '🏡': 'Home',
  '🏢': 'Building2',
  '🏗️': 'Building2',
  '⚡': 'Zap',
  '💧': 'Droplets',
  '🔥': 'Flame',
  '📶': 'Wifi',
  '📱': 'Smartphone',
  '🔋': 'Battery',
  '🔌': 'Zap',
  '💡': 'Lightbulb',
  '🔑': 'Key',
  '🔒': 'Lock',
  '🖥️': 'Monitor',
  '💻': 'Laptop',
  '📞': 'Phone',
  '📪': 'Mail',

  // ── Kesehatan ──
  '❤️': 'Heart',
  '❤': 'Heart',
  '🩺': 'Stethoscope',
  '💊': 'Pill',
  '🏋️': 'Dumbbell',
  '🏋': 'Dumbbell',
  '💉': 'Syringe',
  '🌡️': 'Thermometer',
  '🏥': 'Stethoscope',
  '🩹': 'Shield',
  '🦷': 'Stethoscope',

  // ── Hiburan ──
  '🎮': 'Gamepad2',
  '🎵': 'Music',
  '🎶': 'Music',
  '📺': 'Tv',
  '📷': 'Camera',
  '🎧': 'Headphones',
  '🎬': 'Film',
  '🎤': 'Mic',
  '🎲': 'Gamepad2',
  '🃏': 'Gamepad2',
  '🎯': 'Target',
  '🎪': 'Star',
  '🎨': 'Paintbrush',
  '📸': 'Camera',
  '🔊': 'Speaker',

  // ── Pendidikan ──
  '🎓': 'GraduationCap',
  '📚': 'BookOpen',
  '📖': 'BookOpen',
  '📝': 'FileText',
  '🎒': 'Package',
  '🔭': 'Eye',

  // ── Travel ──
  '🏨': 'Hotel',
  '📍': 'MapPin',
  '🧭': 'Compass',
  '🌍': 'Globe',
  '🌎': 'Globe',
  '🌏': 'Globe',
  '☂️': 'Umbrella',
  '☔': 'Umbrella',
  '☀️': 'Sun',
  '🌤️': 'Sun',
  '⛅': 'Cloud',
  '🌧️': 'CloudRain',
  '❄️': 'Snowflake',
  '🏖️': 'Umbrella',
  '🏕️': 'TreePine',

  // ── Keluarga ──
  '👶': 'Baby',
  '🐶': 'Dog',
  '🐱': 'Cat',
  '👨‍👩‍👧': 'Users',
  '👨‍👩‍👦': 'Users',
  '👪': 'Users',
  '👫': 'Users',

  // ── Pekerjaan ──
  '💼': 'Briefcase',
  '📄': 'FileText',
  '📋': 'Clipboard',
  '⚙️': 'Settings',
  '🔧': 'Wrench',
  '🔨': 'Hammer',
  '🖌️': 'Paintbrush',

  // ── Lainnya ──
  '⭐': 'Star',
  '🌟': 'Star',
  '🏆': 'Trophy',
  '🏅': 'Medal',
  '🛡️': 'Shield',
  '🔔': 'Bell',
  '⏰': 'Clock',
  '📅': 'Calendar',
  '✉️': 'Mail',
  '📧': 'Mail',
  '💌': 'Mail',
  '🌿': 'Leaf',
  '🌳': 'TreePine',
  '🌸': 'Flower2',
  '🌺': 'Flower2',
  '🌷': 'Flower2',
  '🌻': 'Sun',
  '♻️': 'Leaf',
  '🧊': 'Snowflake',
  '🤖': 'Settings',
  '⚽': 'Activity',
  '🏀': 'Activity',
  '🎾': 'Activity',
};

/**
 * Convert emoji to Lucide icon name.
 * Returns the original value if no mapping exists (handles Lucide names passed through).
 */
export function emojiToLucide(value: string | null | undefined): string {
  if (!value) return 'Tag';

  // If it's already a Lucide icon name (starts with uppercase letter), return as-is
  if (/^[A-Z][a-zA-Z0-9]+$/.test(value)) {
    return value;
  }

  // Try to find an emoji mapping
  return EMOJI_LUCIDE_MAP[value] || value;
}

/**
 * Check if a value looks like an emoji (non-ASCII characters)
 */
export function isEmoji(value: string | null | undefined): boolean {
  if (!value) return false;
  // Check if value contains any emoji characters (code points > 0x2600)
  // and does NOT start with a regular ASCII letter
  for (const char of value) {
    const code = char.codePointAt(0);
    if (code && code > 0x2600) return true;
  }
  return false;
}

/** Export map for testing / external use */
export const EMOJI_MAP = EMOJI_LUCIDE_MAP;
