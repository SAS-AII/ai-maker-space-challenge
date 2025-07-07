'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store/appStore';
import { useTypewriter } from '@/hooks/useTypewriter';

interface WelcomeBannerProps {
  /** Whether this is a new chat session (messages.length === 0) */
  isNewChat: boolean;
  /** Callback when animation completes */
  onAnimationComplete?: () => void;
}

/**
 * WelcomeBanner displays an animated greeting for new chat sessions
 * Features a typewriter effect for the welcome message followed by a subtitle
 */
export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  isNewChat,
  onAnimationComplete,
}) => {
  const { userName } = useAppStore();
  const [hasShown, setHasShown] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);

  const welcomeText = `Welcome to ${userName}'s Room`;
  const subtitleText = "How can I help you today? Ask me anything, and I'll do my best to assist you.";

  const { displayText: welcomeDisplay, isComplete: welcomeComplete } = useTypewriter({
    text: welcomeText,
    speed: 35,
    startDelay: 300,
  });

  // Show subtitle after welcome text completes
  useEffect(() => {
    if (welcomeComplete && !showSubtitle) {
      const timeout = setTimeout(() => {
        setShowSubtitle(true);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [welcomeComplete, showSubtitle]);

  // Track completion
  useEffect(() => {
    if (welcomeComplete && showSubtitle) {
      const timeout = setTimeout(() => {
        setHasShown(true);
        onAnimationComplete?.();
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [welcomeComplete, showSubtitle, onAnimationComplete]);

  // Reset state when switching to new chat
  useEffect(() => {
    if (!isNewChat) {
      setHasShown(false);
      setShowSubtitle(false);
    }
  }, [isNewChat]);

  // Only show for new chats and only once per session
  if (!isNewChat || hasShown) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center min-h-[40vh] px-6 text-center"
    >
      {/* Main Welcome Text with Typewriter */}
      <motion.h1 
        className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {welcomeDisplay}
        {!welcomeComplete && (
          <motion.span
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="inline-block w-0.5 h-8 bg-blue-500 ml-1"
          />
        )}
      </motion.h1>

      {/* Subtitle appears after main text */}
      {showSubtitle && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed"
        >
          {subtitleText}
        </motion.p>
      )}

      {/* Optional decorative element */}
      {showSubtitle && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-8 flex space-x-2"
        >
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
        </motion.div>
      )}
    </motion.div>
  );
}; 