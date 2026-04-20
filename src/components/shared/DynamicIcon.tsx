'use client';

import React from 'react';
import { emojiToLucide } from '@/lib/emojiMap';
import {
  Wallet, Laptop, UtensilsCrossed, Car, ShoppingBag, Receipt, Gamepad2, PiggyBank,
  Briefcase, Home, Heart, Coffee, Plane, GraduationCap, Music, Dumbbell, BookOpen,
  Smartphone, Zap, Droplets, Flame, Leaf, Gift, Shirt, Pill, Landmark, Shield,
  CreditCard, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  CircleDollarSign, Banknote, Coins, Calculator, FileText, Lightbulb, Star,
  ArrowRight, ChevronRight, MoreHorizontal, Tag, FolderOpen, Package,
  Truck, Wrench, Hammer, Paintbrush, Utensils, Pizza, Beef, Apple,
  Bus, Train, Bike, Ship, Fuel, Building, Building2, Hotel, Store,
  Stethoscope, Syringe, Baby, Dog, Cat, Fish, TreePine, Flower2, Sun, Cloud, CloudRain,
  Snowflake, Umbrella, Tv, Monitor, Camera, Headphones, Speaker, Mic, Film,
  Trophy, Medal, Crown, Gem, Lock, Key, Bell, Clock, Calendar,
  MapPin, Compass, Globe, Wifi, Bluetooth, Battery, BatteryCharging,
  Download, Upload, Share2, Send, MessageCircle, Phone, Mail,
  User, Users, UserPlus, UserCheck, UserX, Settings, Menu,
  Search, Filter, Plus, Minus, X, Check, AlertCircle, AlertTriangle,
  Info, HelpCircle, Eye, EyeOff, Trash2, Edit, Copy, Clipboard,
  ExternalLink, Link, Image, Video, File, Folder, Archive,
  RefreshCw, RotateCcw, RotateCw, SkipForward, Play, Pause,
  Maximize, Minimize, Move, Layers, Grid, List, Layout,
  Thermometer, Gauge, Activity, BarChart2, PieChart, LineChart,
  Target, Crosshair, Hexagon, Octagon, Pentagon, Triangle,
  Circle, Diamond, ArrowUp, ArrowDown, ArrowLeft,
  ChevronUp, ChevronDown, ChevronLeft, MoreVertical,
  Rocket, Droplet, HandCoins, Tent, Sunrise, Sunset, Rainbow, Mountain, Waves, Palmtree,
} from 'lucide-react';

/**
 * Explicit icon map — avoids tree-shaking issues with `import *`.
 * Add new icons here as needed.
 */
const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Wallet, Laptop, UtensilsCrossed, Car, ShoppingBag, Receipt, Gamepad2, PiggyBank,
  Briefcase, Home, Heart, Coffee, Plane, GraduationCap, Music, Dumbbell, BookOpen,
  Smartphone, Zap, Droplets, Flame, Leaf, Gift, Shirt, Pill, Landmark, Shield,
  CreditCard, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  CircleDollarSign, Banknote, Coins, Calculator, FileText, Lightbulb, Star,
  ArrowRight, ChevronRight, MoreHorizontal, Tag, FolderOpen, Package,
  Truck, Wrench, Hammer, Paintbrush, Utensils, Pizza, Beef, Apple,
  Bus, Train, Bike, Ship, Fuel, Building, Building2, Hotel, Store,
  Stethoscope, Syringe, Baby, Dog, Cat, Fish, TreePine, Flower2, Sun, Cloud, CloudRain,
  Snowflake, Umbrella, Tv, Monitor, Camera, Headphones, Speaker, Mic, Film,
  Trophy, Medal, Crown, Gem, Lock, Key, Bell, Clock, Calendar,
  MapPin, Compass, Globe, Wifi, Bluetooth, Battery, BatteryCharging,
  Download, Upload, Share2, Send, MessageCircle, Phone, Mail,
  User, Users, UserPlus, UserCheck, UserX, Settings, Menu,
  Search, Filter, Plus, Minus, X, Check, AlertCircle, AlertTriangle,
  Info, HelpCircle, Eye, EyeOff, Trash2, Edit, Copy, Clipboard,
  ExternalLink, Link, Image, Video, File, Folder, Archive,
  RefreshCw, RotateCcw, RotateCw, SkipForward, Play, Pause,
  Maximize, Minimize, Move, Layers, Grid, List, Layout,
  Thermometer, Gauge, Activity, BarChart2, PieChart, LineChart,
  Target, Crosshair, Hexagon, Octagon, Pentagon, Triangle,
  Circle, Diamond, ArrowUp, ArrowDown, ArrowLeft,
  ChevronUp, ChevronDown, ChevronLeft, MoreVertical,
  Rocket, Droplet, HandCoins, Tent, Sunrise, Sunset, Rainbow, Mountain, Waves, Palmtree,
};

interface DynamicIconProps {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Check if a value looks like an emoji (contains non-ASCII characters).
 * Used to decide whether to render as text or fall back to a Tag icon.
 */
function isEmojiFallback(value: string): boolean {
  for (const char of value) {
    const code = char.codePointAt(0);
    if (code && code > 0x2600) return true;
  }
  return false;
}

/**
 * Dynamic icon component.
 * Resolves Lucide icon names (e.g. "Wallet", "Car") to actual SVG components.
 * Falls back to rendering text/emoji if not a valid Lucide name.
 */
export function DynamicIcon({ name, className, style }: DynamicIconProps) {
  if (!name) return null;

  // Auto-convert emoji → Lucide icon name (backward compat for old users)
  const resolvedName = emojiToLucide(name);

  const blockStyle: React.CSSProperties = {
    display: 'block',
    maxWidth: '100%',
    maxHeight: '100%',
    ...style,
  };

  const Component = ICON_MAP[resolvedName];
  if (Component) {
    return <Component className={className} style={blockStyle} />;
  }

  // Final fallback: render Tag icon for unknown icon names, or text for emojis
  if (isEmojiFallback(resolvedName)) {
    // It's likely an emoji string — render as text
    return (
      <div className={className} style={blockStyle}>
        {resolvedName}
      </div>
    );
  }
  // Unknown Lucide name — use Tag as fallback icon
  const FallbackIcon = ICON_MAP['Tag']!;
  return <FallbackIcon className={className} style={blockStyle} />;
}
