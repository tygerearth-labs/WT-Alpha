'use client';

import React from 'react';
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
  Snowflake, Umbrella, Tv, Monitor, Camera, Headphones, Speaker, Mic,
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
  Snowflake, Umbrella, Tv, Monitor, Camera, Headphones, Speaker, Mic,
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
};

interface DynamicIconProps {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Dynamic icon component.
 * Resolves Lucide icon names (e.g. "Wallet", "Car") to actual SVG components.
 * Falls back to rendering text/emoji if not a valid Lucide name.
 */
export function DynamicIcon({ name, className, style }: DynamicIconProps) {
  if (!name) return null;

  const Component = ICON_MAP[name];
  if (Component) {
    // Force block display so flex/grid centering works correctly for SVG icons
    return <Component className={className} style={{ display: 'block', ...style }} />;
  }

  // Fallback: render as text (emoji or plain text)
  return (
    <span className={className} style={{ display: 'block', ...style }}>
      {name}
    </span>
  );
}
