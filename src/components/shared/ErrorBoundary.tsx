'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, ChevronDown, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

const ACCENT = '#BB86FC';

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, showDetails: false };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null, showDetails: false });
  };

  private toggleDetails = (): void => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-background relative overflow-hidden">
          {/* Ambient gradient glow */}
          <motion.div
            className="absolute pointer-events-none"
            style={{
              width: 400,
              height: 400,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${ACCENT}, #03DAC6)`,
              filter: 'blur(120px)',
              opacity: 0.07,
              top: '30%',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
            animate={{
              opacity: [0.04, 0.09, 0.04],
              scale: [1, 1.1, 1],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Error card */}
          <motion.div
            className="relative w-full max-w-md glass-premium rounded-2xl p-6 sm:p-8 shadow-premium-sm premium-card"
            style={{
              background: 'rgba(18, 18, 18, 0.75)',
              border: `1px solid rgba(255, 255, 255, 0.06)`,
            }}
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
          >
            {/* Radial gradient background */}
            <div
              className="absolute inset-0 pointer-events-none rounded-2xl"
              style={{
                background: `radial-gradient(ellipse at 50% 30%, ${ACCENT}0A 0%, transparent 70%)`,
              }}
            />

            {/* Icon */}
            <motion.div
              className="relative flex justify-center mb-5"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.4, ease: [0.2, 0, 0, 1] }}
            >
              <motion.div
                className="relative"
                animate={{ opacity: [0.85, 1, 0.85] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <motion.div
                  className="absolute -inset-2 rounded-2xl pointer-events-none"
                  style={{ border: `1.5px solid ${ACCENT}30` }}
                  animate={{
                    opacity: [0.3, 0.7, 0.3],
                    scale: [1, 1.05, 1],
                  }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />
                <div
                  className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl grid place-items-center relative"
                  style={{
                    background: `linear-gradient(135deg, ${ACCENT}22, ${ACCENT}0C)`,
                    border: `1px solid ${ACCENT}30`,
                    boxShadow: `0 0 24px ${ACCENT}15`,
                  }}
                >
                  <AlertTriangle
                    className="h-7 w-7 sm:h-8 sm:w-8"
                    style={{ color: ACCENT, opacity: 0.9 }}
                  />
                </div>
              </motion.div>
            </motion.div>

            {/* Title */}
            <motion.h2
              className="relative text-center text-lg sm:text-xl font-semibold mb-1.5"
              style={{ color: '#E6E1E5' }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.35 }}
            >
              Something went wrong
            </motion.h2>

            {/* Subtitle */}
            <motion.p
              className="relative text-center text-sm mb-6"
              style={{ color: '#9E9E9E' }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32, duration: 0.35 }}
            >
              An unexpected error occurred
            </motion.p>

            {/* Try Again button */}
            <motion.div
              className="relative flex justify-center mb-4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.35 }}
            >
              <motion.button
                onClick={this.handleReset}
                className={cn(
                  'flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold',
                  'transition-all duration-200 shadow-premium-sm',
                  'min-h-[44px] min-w-[44px]',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                  'focus-visible:ring-offset-background'
                )}
                style={{
                  background: `linear-gradient(135deg, ${ACCENT}30, ${ACCENT}18)`,
                  color: ACCENT,
                  border: `1px solid ${ACCENT}40`,
                }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                aria-label="Try again"
              >
                <RotateCcw className="h-4 w-4" />
                Try Again
              </motion.button>
            </motion.div>

            {/* Technical details toggle */}
            {this.state.error && (
              <motion.div
                className="relative"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.48, duration: 0.35 }}
              >
                <button
                  onClick={this.toggleDetails}
                  className={cn(
                    'flex items-center gap-1.5 mx-auto text-xs font-medium py-2 px-3',
                    'rounded-lg transition-colors duration-150',
                    'min-h-[44px] min-w-[44px]',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                    'focus-visible:ring-offset-background'
                  )}
                  style={{ color: '#757575' }}
                  aria-expanded={this.state.showDetails}
                  aria-controls="error-details"
                >
                  <span>Technical Details</span>
                  <motion.div
                    animate={{ rotate: this.state.showDetails ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {this.state.showDetails && (
                    <motion.div
                      id="error-details"
                      role="region"
                      aria-label="Error details"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
                      className="overflow-hidden"
                    >
                      <div
                        className="mt-2 p-3 sm:p-4 rounded-xl text-xs font-mono leading-relaxed overflow-x-auto max-h-48 overflow-y-auto"
                        style={{
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid rgba(255, 255, 255, 0.04)',
                          color: '#CF6679',
                        }}
                      >
                        <p className="whitespace-pre-wrap break-all">
                          {this.state.error.message}
                        </p>
                        {this.state.error.stack && (
                          <pre className="mt-2 pt-2 whitespace-pre-wrap break-all" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                            {this.state.error.stack}
                          </pre>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
