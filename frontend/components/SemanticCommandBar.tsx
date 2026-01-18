/**
 * SemanticCommandBar Component
 * 
 * Purpose:
 * A floating command bar that accepts natural language input and converts it
 * into workflow nodes using AI or pattern matching. Provides instant feedback
 * with sophisticated loading animations.
 * 
 * Features:
 * - Cmd+K / Ctrl+K keyboard shortcut to focus
 * - Natural language input with placeholder examples
 * - Beautiful loading animation while processing
 * - Smooth state transitions with framer-motion
 * - Integration with Gemini AI intent engine
 * - Error handling with user-friendly messages
 * 
 * UX Considerations:
 * - Minimum 800ms processing time for perceived sophistication
 * - Animated sparkles and pulsing effects during analysis
 * - Clear feedback at every stage
 * - Never shows blank/frozen state
 * 
 * Architecture:
 * - Standalone component that can be dropped into any page
 * - Communicates with parent via onWorkflowGenerated callback
 * - Uses intent-engine for parsing logic
 * - Fully keyboard accessible
 * 
 * Dependencies:
 * - framer-motion: Animations
 * - lucide-react: Icons
 * - @/lib/intent-engine: Intent parsing
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Command, Loader2, AlertCircle, Check } from 'lucide-react';
import { parseIntent, getExampleCommands, ParsedIntent } from '@/lib/intent-engine';

/**
 * Component props
 */
interface SemanticCommandBarProps {
  /** Callback when workflow is successfully generated */
  onWorkflowGenerated: (result: ParsedIntent) => void;
  /** Optional placeholder text */
  placeholder?: string;
  /** Whether the bar is initially visible */
  initialVisible?: boolean;
}

/**
 * Processing states for the command bar
 */
type ProcessingState = 'idle' | 'analyzing' | 'building' | 'success' | 'error';

/**
 * SemanticCommandBar Component
 * Floating command bar with AI-powered workflow generation
 */
export function SemanticCommandBar({
  onWorkflowGenerated,
  placeholder = "✨ Describe your workflow (e.g., 'Swap USDC to ETH if price drops')...",
  initialVisible = false,
}: SemanticCommandBarProps) {
  const [isVisible, setIsVisible] = useState(initialVisible);
  const [input, setInput] = useState('');
  const [state, setState] = useState<ProcessingState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [exampleIndex, setExampleIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const examples = getExampleCommands();

  /**
   * Handle Cmd+K / Ctrl+K keyboard shortcut
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsVisible(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      
      // Escape to close
      if (e.key === 'Escape' && isVisible) {
        setIsVisible(false);
        setState('idle');
        setInput('');
        setErrorMessage('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible]);

  /**
   * Rotate through example commands
   */
  useEffect(() => {
    if (state === 'idle' && !input) {
      const interval = setInterval(() => {
        setExampleIndex((prev) => (prev + 1) % examples.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [state, input, examples.length]);

  /**
   * Process the user's input command
   */
  const handleSubmit = useCallback(async () => {
    if (!input.trim() || state !== 'idle') return;

    setState('analyzing');
    setErrorMessage('');

    try {
      // Parse intent with AI or patterns
      const result = await parseIntent(input.trim());
      
      // Show building state briefly
      setState('building');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Show success state
      setState('success');
      
      // Notify parent component
      setTimeout(() => {
        onWorkflowGenerated(result);
        
        // Reset after success
        setTimeout(() => {
          setInput('');
          setState('idle');
          setIsVisible(false);
        }, 1000);
      }, 500);
      
    } catch (error) {
      setState('error');
      setErrorMessage(
        error instanceof Error 
          ? error.message 
          : 'Failed to parse workflow. Please try rephrasing your command.'
      );
      
      // Auto-reset error after 3 seconds
      setTimeout(() => {
        setState('idle');
        setErrorMessage('');
      }, 3000);
    }
  }, [input, state, onWorkflowGenerated]);

  /**
   * Handle input key press (Enter to submit)
   */
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  /**
   * Render loading animation based on state
   */
  const renderLoadingAnimation = () => {
    if (state === 'analyzing') {
      return (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mt-4 flex items-center gap-3 px-4 py-3 bg-[#39FF14]/10 border border-[#39FF14]/30"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Sparkles className="text-[#39FF14]" size={20} />
          </motion.div>
          <div className="flex-1">
            <div className="text-[#39FF14] font-mono text-sm font-bold">
              🧠 [ANALYZING_INTENT]
            </div>
            <div className="text-neutral-400 font-mono text-xs mt-1">
              Parsing your workflow description...
            </div>
          </div>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-[#39FF14]"
                animate={{
                  opacity: [0.3, 1, 0.3],
                  scale: [0.8, 1.2, 0.8],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        </motion.div>
      );
    }

    if (state === 'building') {
      return (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mt-4 flex items-center gap-3 px-4 py-3 bg-[#FFD700]/10 border border-[#FFD700]/30"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="text-[#FFD700]" size={20} />
          </motion.div>
          <div className="flex-1">
            <div className="text-[#FFD700] font-mono text-sm font-bold">
              ⚡ [BUILDING_WORKFLOW]
            </div>
            <div className="text-neutral-400 font-mono text-xs mt-1">
              Generating nodes and connections...
            </div>
          </div>
          <motion.div
            className="h-1 bg-[#FFD700]"
            initial={{ width: 0 }}
            animate={{ width: 100 }}
            transition={{ duration: 0.5 }}
          />
        </motion.div>
      );
    }

    if (state === 'success') {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="mt-4 flex items-center gap-3 px-4 py-3 bg-[#39FF14]/10 border border-[#39FF14]/30"
        >
          <Check className="text-[#39FF14]" size={20} />
          <div className="flex-1">
            <div className="text-[#39FF14] font-mono text-sm font-bold">
              ✓ [WORKFLOW_GENERATED]
            </div>
            <div className="text-neutral-400 font-mono text-xs mt-1">
              Adding nodes to canvas...
            </div>
          </div>
        </motion.div>
      );
    }

    if (state === 'error') {
      return (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mt-4 flex items-center gap-3 px-4 py-3 bg-[#FF4444]/10 border border-[#FF4444]/30"
        >
          <AlertCircle className="text-[#FF4444]" size={20} />
          <div className="flex-1">
            <div className="text-[#FF4444] font-mono text-sm font-bold">
              ✗ [ERROR]
            </div>
            <div className="text-neutral-400 font-mono text-xs mt-1">
              {errorMessage}
            </div>
          </div>
        </motion.div>
      );
    }

    return null;
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setIsVisible(false)}
          />

          {/* Command Bar */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-black border-2 border-[#39FF14] shadow-2xl">
              {/* Input Section */}
              <div className="flex items-center gap-3 p-4">
                <motion.div
                  animate={state === 'analyzing' || state === 'building' ? {
                    rotate: [0, 360],
                  } : {}}
                  transition={{
                    duration: 2,
                    repeat: state === 'analyzing' || state === 'building' ? Infinity : 0,
                    ease: 'linear',
                  }}
                >
                  <Sparkles className="text-[#39FF14]" size={24} />
                </motion.div>

                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={placeholder}
                  disabled={state !== 'idle'}
                  className="flex-1 bg-transparent border-none outline-none text-white font-mono text-sm placeholder:text-neutral-600 disabled:opacity-50"
                  autoFocus
                />

                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-neutral-900 border border-neutral-700 text-neutral-500 text-xs font-mono">
                    <Command size={12} className="inline" /> K
                  </kbd>
                  <button
                    onClick={handleSubmit}
                    disabled={state !== 'idle' || !input.trim()}
                    className="px-4 py-2 bg-[#39FF14] text-black font-mono text-sm font-bold hover:bg-[#39FF14]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    [EXECUTE]
                  </button>
                </div>
              </div>

              {/* Loading/Status Animation */}
              <AnimatePresence mode="wait">
                {renderLoadingAnimation()}
              </AnimatePresence>

              {/* Example Commands (only shown when idle and empty) */}
              {state === 'idle' && !input && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="border-t border-[#39FF14]/20 p-4"
                >
                  <div className="text-neutral-500 font-mono text-xs mb-2">
                    [EXAMPLES]
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={exampleIndex}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="text-neutral-400 font-mono text-xs cursor-pointer hover:text-[#39FF14] transition-colors"
                      onClick={() => setInput(examples[exampleIndex])}
                    >
                      → {examples[exampleIndex]}
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}

      {/* Floating trigger button (when bar is hidden) */}
      {!isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={() => setIsVisible(true)}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-30 px-6 py-3 bg-[#39FF14] text-black font-mono text-sm font-bold hover:bg-[#39FF14]/80 transition-all flex items-center gap-2 shadow-lg"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Sparkles size={20} />
          <span>[AI_WORKFLOW_BUILDER]</span>
          <kbd className="ml-2 px-2 py-1 bg-black/20 text-black text-xs">
            <Command size={10} className="inline" /> K
          </kbd>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
