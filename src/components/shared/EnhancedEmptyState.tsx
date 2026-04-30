'use client';

import { type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface EnhancedEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  accentColor?: string;
}

const containerVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { stiffness: 300, damping: 24, duration: 0.4 },
  },
};

const childVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.15 + i * 0.08, stiffness: 300, damping: 24 },
  }),
};

export function EnhancedEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  accentColor = '#BB86FC',
}: EnhancedEmptyStateProps) {
  return (
    <motion.div
      className="rounded-xl p-6 sm:p-8 flex flex-col items-center justify-center text-center relative overflow-hidden glass-premium shadow-premium-sm premium-card premium-touch"
      style={{
        background: 'rgba(18, 18, 18, 0.6)',
        border: `1px solid rgba(255, 255, 255, 0.06)`,
      }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Animated gradient glow behind icon */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: 160,
          height: 160,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${accentColor}, #03DAC6)`,
          filter: 'blur(60px)',
          opacity: 0.1,
          top: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
        animate={{
          opacity: [0.06, 0.14, 0.06],
          scale: [1, 1.15, 1],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Radial gradient background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 40%, ${accentColor}08 0%, transparent 70%)`,
        }}
      />

      {/* Icon with gradient background + animated pulse ring */}
      <motion.div className="relative mb-4" custom={0} variants={childVariants} initial="hidden" animate="visible">
        {/* Animated pulse ring border */}
        <motion.div
          className="absolute -inset-2 rounded-2xl pointer-events-none"
          style={{
            border: `1.5px solid ${accentColor}30`,
          }}
          animate={{
            opacity: [0.3, 0.8, 0.3],
            scale: [1, 1.06, 1],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Subtle pulse on the icon container */}
        <motion.div
          animate={{ opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* Gradient icon background */}
          <div
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl grid place-items-center [&>*]:block leading-none relative"
            style={{
              background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}0C)`,
              border: `1px solid ${accentColor}30`,
              boxShadow: `0 0 20px ${accentColor}15`,
            }}
          >
            <Icon
              className="h-6 w-6 sm:h-7 sm:w-7"
              style={{ color: accentColor, opacity: 0.85 }}
            />
          </div>
        </motion.div>
        {/* Floating dots */}
        <motion.div
          className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
          style={{ background: `${accentColor}50` }}
          animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-1 -left-2 w-1.5 h-1.5 rounded-full"
          style={{ background: '#03DAC640' }}
          animate={{ y: [0, -3, 0], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        />
      </motion.div>

      {/* Title */}
      <motion.p
        className="relative text-[15px] sm:text-base font-semibold mb-1.5"
        style={{ color: '#E6E1E5' }}
        custom={1}
        variants={childVariants}
        initial="hidden"
        animate="visible"
      >
        {title}
      </motion.p>

      {/* Description */}
      <motion.p
        className="relative text-[13px] sm:text-sm max-w-[240px] leading-relaxed"
        style={{ color: '#9E9E9E' }}
        custom={2}
        variants={childVariants}
        initial="hidden"
        animate="visible"
      >
        {description}
      </motion.p>

      {/* Action button with gradient */}
      {actionLabel && onAction && (
        <motion.button
          onClick={onAction}
          className="relative mt-5 flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all duration-200 shadow-premium-sm"
          style={{
            background: `linear-gradient(135deg, ${accentColor}25, ${accentColor}12)`,
            color: accentColor,
            border: `1px solid ${accentColor}30`,
          }}
          custom={3}
          variants={childVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {actionLabel}
        </motion.button>
      )}
    </motion.div>
  );
}
